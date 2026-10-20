jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('../config', () => ({
  API_URL: 'https://proxy.test',
  GROQ_API_KEY: '',
  MODELS: { text: 'openai/gpt-oss-120b', speech: 'whisper-large-v3-turbo', vision: 'qwen/qwen3.8-27b' },
}));

import { cleanText, isMeaningful, base64Bytes, MAX_INPUT_CHARS } from '../text';
import { sanitizePrefs } from '../prefs';
import { sanitizeHistory } from '../history';
import { translateAllVibes, translateOne } from '../translate';
import { friendlyMessage } from '../errors';

const reply = (content) => ({ ok: true, status: 200, text: async () => JSON.stringify({ choices: [{ message: { content } }] }) });
const failure = (status, error) => ({ ok: false, status, text: async () => JSON.stringify({ error }) });
const html = (status) => ({ ok: false, status, text: async () => '<html><body>Bad Gateway</body></html>' });
const ALL_VIBES = JSON.stringify({
  formal: { translation: 'Buenos días', pronunciation: 'BWEH-nohs' },
  casual: { translation: 'Hola', pronunciation: 'OH-lah' },
  local: { translation: 'Qué onda', pronunciation: 'keh ON-dah' },
  filmy: { translation: '¡Buenos días, mundo!', pronunciation: 'mun-doh' },
  culture_tip: 'Spaniards greet with two kisses.',
});

// A fetch that never answers on its own, but rejects like the real one when aborted.
const hangingFetch = () =>
  jest.fn((url, { signal }) => new Promise((_, reject) => {
    signal.addEventListener('abort', () => reject(Object.assign(new Error('Aborted'), { name: 'AbortError' })));
  }));

let counter = 0;
const unique = (text) => `${text} #${++counter}`; // avoid the 2-second request cache between tests

beforeEach(() => {
  global.fetch = jest.fn();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('cleanText', () => {
  it.each([
    ['plain text', 'Hola amigo', 'Hola amigo'],
    ['surrounding whitespace', '  Hola  \n', 'Hola'],
    ['a Translation: label', 'Translation: Bonjour', 'Bonjour'],
    ['wrapping quotes', '"नमस्ते दोस्त"', 'नमस्ते दोस्त'],
    ['curly quotes', '“你好”', '你好'],
    ['guillemets', '«Bonjour»', 'Bonjour'],
    ['think blocks', '<think>user wants Hindi</think>नमस्ते', 'नमस्ते'],
    ['an unterminated think block', 'Hola<think>and then', 'Hola'],
    ['code fences', '```\nこんにちは\n```', 'こんにちは'],
  ])('handles %s', (_name, input, expected) => {
    expect(cleanText(input)).toBe(expected);
  });
  it('keeps quotes inside the sentence', () => {
    expect(cleanText('He said "hi" to me')).toBe('He said "hi" to me');
  });
  it.each([null, undefined, ''])('returns an empty string for %p', (input) => {
    expect(cleanText(input)).toBe('');
  });
});

describe('isMeaningful (Talk transcripts)', () => {
  it.each(['Hello there', 'नमस्ते', 'ok', '好', '是', 'はい'])('accepts %p', (t) => expect(isMeaningful(t)).toBe(true));
  it.each(['', '.', ' . ', '…', 'a', '!', null])('rejects %p', (t) => expect(isMeaningful(t)).toBe(false));
});

describe('base64Bytes (Scan upload size)', () => {
  it('converts base64 length to bytes', () => {
    expect(base64Bytes('aGVsbG8=')).toBe(6); // "hello" plus 1 byte of padding rounding
    expect(base64Bytes('A'.repeat(1_400_000))).toBe(1_050_000);
    expect(base64Bytes(undefined)).toBe(0);
  });
});

describe('sanitizePrefs', () => {
  it.each([['a string', 'oops'], ['an array', [1, 2]], ['null', null], ['a number', 42]])('falls back to defaults for %s', (_n, saved) => {
    expect(sanitizePrefs(saved)).toMatchObject({ onboarded: false, myLanguage: 'English', travelLanguage: 'Spanish', allergies: '', address: '' });
  });
  it('keeps valid values and fixes invalid ones', () => {
    const p = sanitizePrefs({ onboarded: true, myLanguage: 'Hindi', travelLanguage: 'Klingon', allergies: 7, address: 'x'.repeat(900), streak: { count: 'lots' } });
    expect(p).toMatchObject({ onboarded: true, myLanguage: 'Hindi', travelLanguage: 'Spanish', allergies: '' });
    expect(p.address).toHaveLength(400);
    expect(p.streak).toEqual({ count: 0, last: null });
  });
});

describe('sanitizeHistory', () => {
  it('drops broken items and fills in missing fields', () => {
    const items = sanitizeHistory([
      { id: 'a', translation: 'Hola', original: 'Hi', at: 5, starred: true },
      { id: 'b', translation: '' },
      { translation: 'no id' },
      null,
      'junk',
      { id: 'c', translation: 'Ciao', kind: 'weird' },
    ]);
    expect(items.map((i) => i.id)).toEqual(['a', 'c']);
    expect(items[1]).toMatchObject({ kind: 'translate', original: '', starred: false });
    expect(Number.isFinite(items[1].at)).toBe(true);
  });
  it('returns [] for non-arrays', () => {
    expect(sanitizeHistory({ broken: true })).toEqual([]);
  });
});

describe('translate functions against the API', () => {
  it('success: translateAllVibes returns all four vibes and the tip', async () => {
    fetch.mockResolvedValueOnce(reply(ALL_VIBES));
    const r = await translateAllVibes(unique('Good morning'), 'English', 'Spanish');
    expect(r.casual).toEqual({ translation: 'Hola', pronunciation: 'OH-lah' });
    expect(r.culture_tip).toBe('Spaniards greet with two kisses.');
  });

  it('success: translateOne returns one vibe', async () => {
    fetch.mockResolvedValueOnce(reply('{"translation":"Hola","pronunciation":"OH-lah"}'));
    await expect(translateOne(unique('Hello'), 'English', 'Spanish')).resolves.toEqual({ translation: 'Hola', pronunciation: 'OH-lah' });
  });

  it('invalid JSON: translateOne ends with the plain-text fallback', async () => {
    fetch
      .mockResolvedValueOnce(reply('not json'))
      .mockResolvedValueOnce(reply('still not json'))
      .mockResolvedValueOnce(reply('nope'))
      .mockResolvedValueOnce(reply('Translation: "Hola"'));
    await expect(translateOne(unique('Hello'), 'English', 'Spanish')).resolves.toEqual({ translation: 'Hola', pronunciation: '' });
  });

  it('invalid JSON: translateAllVibes gives up with a friendly message, never the raw reply', async () => {
    fetch.mockResolvedValue(reply('I am not JSON at all'));
    const e = await translateAllVibes(unique('Hello'), 'English', 'Spanish').catch((x) => x);
    expect(e.kind).toBe('bad_response');
    expect(friendlyMessage(e, 'translate')).toBe('Something went wrong. Please try again.');
    expect(fetch).toHaveBeenCalledTimes(3); // JSON mode, no format, temperature 0
  });

  it('401 (bad server key): no retry, friendly message', async () => {
    fetch.mockResolvedValue(failure(401, { message: 'Invalid API Key', code: 'invalid_api_key' }));
    const e = await translateOne(unique('Hello'), 'English', 'Spanish').catch((x) => x);
    expect(fetch).toHaveBeenCalledTimes(1);
    const msg = friendlyMessage(e, 'translate');
    expect(msg).not.toMatch(/API Key/i);
    expect(msg).toBe('Something went wrong. Please try again.');
  });

  it('429 with a long wait: rate-limit message, no long blocking retry', async () => {
    fetch.mockResolvedValue(failure(429, { message: 'Rate limit reached. Please try again in 40s.' }));
    const e = await translateOne(unique('Hello'), 'English', 'Spanish').catch((x) => x);
    expect(e.kind).toBe('rate_limit');
    expect(friendlyMessage(e, 'translate')).toMatch(/busy right now/);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('429 with a short wait: retried automatically and succeeds', async () => {
    jest.useFakeTimers();
    fetch
      .mockResolvedValueOnce(failure(429, { message: 'Please try again in 2.5s.' }))
      .mockResolvedValueOnce(reply('{"translation":"Hola","pronunciation":"OH-lah"}'));
    const p = translateOne(unique('Hello'), 'English', 'Spanish');
    await jest.advanceTimersByTimeAsync(3000);
    await expect(p).resolves.toMatchObject({ translation: 'Hola' });
  });

  it('500: retried once, then a friendly message', async () => {
    jest.useFakeTimers();
    fetch.mockResolvedValue(failure(500, { message: 'Internal error' }));
    const p = translateOne(unique('Hello'), 'English', 'Spanish').catch((x) => x);
    await jest.advanceTimersByTimeAsync(2000);
    const e = await p;
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(e.kind).toBe('server');
    expect(friendlyMessage(e, 'translate')).toBe('Something went wrong. Please try again.');
  });

  it('502 HTML from a sleeping server: retried, then "warming up"', async () => {
    jest.useFakeTimers();
    fetch.mockResolvedValue(html(502));
    const p = translateOne(unique('Hello'), 'English', 'Spanish').catch((x) => x);
    await jest.advanceTimersByTimeAsync(2000);
    expect(friendlyMessage(await p, 'translate')).toBe('Warming up, try again in a few seconds.');
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('timeout: gives up after 30 s (plus one retry) with "warming up"', async () => {
    jest.useFakeTimers();
    global.fetch = hangingFetch();
    const p = translateOne(unique('Hello'), 'English', 'Spanish').catch((x) => x);
    await jest.advanceTimersByTimeAsync(30000 + 1500 + 30000 + 100);
    const e = await p;
    expect(e.kind).toBe('timeout');
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(friendlyMessage(e, 'translate')).toBe('Warming up, try again in a few seconds.');
  });

  it('timeout also covers a response whose body never arrives', async () => {
    jest.useFakeTimers();
    global.fetch = jest.fn(async (url, { signal }) => ({
      ok: true,
      status: 200,
      text: () => new Promise((_, reject) => signal.addEventListener('abort', () => reject(Object.assign(new Error('Aborted'), { name: 'AbortError' })))),
    }));
    const p = translateOne(unique('Hello'), 'English', 'Spanish').catch((x) => x);
    await jest.advanceTimersByTimeAsync(62000);
    expect((await p).kind).toBe('timeout');
  });

  it('offline: retried once, then "You\'re offline"', async () => {
    jest.useFakeTimers();
    fetch.mockRejectedValue(new TypeError('Network request failed'));
    const p = translateOne(unique('Hello'), 'English', 'Spanish').catch((x) => x);
    await jest.advanceTimersByTimeAsync(2000);
    const e = await p;
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(friendlyMessage(e, 'talk')).toBe("You're offline. Check your internet connection and try again.");
  });

  it('input over 2,000 characters is rejected before any request', () => {
    expect(() => translateAllVibes('x'.repeat(MAX_INPUT_CHARS + 1), 'English', 'Spanish')).toThrow(expect.objectContaining({ kind: 'too_long' }));
    expect(fetch).not.toHaveBeenCalled();
    expect(friendlyMessage({ kind: 'too_long' })).toMatch(/2,000 characters/);
  });

  it('empty input is rejected before any request', () => {
    expect(() => translateOne('   ', 'English', 'Spanish')).toThrow(expect.objectContaining({ kind: 'empty_input' }));
    expect(fetch).not.toHaveBeenCalled();
  });
});
