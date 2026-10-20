jest.mock('../config', () => ({
  API_URL: 'https://proxy.test',
  GROQ_API_KEY: '',
  MODELS: { text: 'openai/gpt-oss-120b', speech: 'whisper-large-v3-turbo', vision: 'qwen/qwen3.8-27b' },
}));

import { chatJSON, askAboutImage } from '../api';
import { translateOne } from '../translate';

const reply = (content) => ({ ok: true, status: 200, text: async () => JSON.stringify({ choices: [{ message: { content } }] }) });
const failure = (status, error) => ({ ok: false, status, text: async () => JSON.stringify({ error }) });
const jsonValidateFailed = () =>
  failure(400, { message: 'Failed to validate JSON. Please adjust your prompt.', code: 'json_validate_failed' });
const sentBody = (call) => JSON.parse(global.fetch.mock.calls[call][1].body);

beforeEach(() => {
  global.fetch = jest.fn();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

const messages = [{ role: 'user', content: 'hi' }];

describe('chatJSON fallbacks', () => {
  it('uses JSON mode and low reasoning effort first', async () => {
    fetch.mockResolvedValueOnce(reply('{"translation":"hola"}'));
    await expect(chatJSON(messages)).resolves.toEqual({ translation: 'hola' });
    expect(sentBody(0)).toMatchObject({ response_format: { type: 'json_object' }, reasoning_effort: 'low' });
    expect(fetch.mock.calls[0][0]).toBe('https://proxy.test/api/chat/completions');
  });

  it('retries without response_format after json_validate_failed', async () => {
    fetch.mockResolvedValueOnce(jsonValidateFailed()).mockResolvedValueOnce(reply('```json\n{"translation":"你好"}\n```'));
    await expect(chatJSON(messages, { temperature: 0.5 })).resolves.toEqual({ translation: '你好' });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(sentBody(1).response_format).toBeUndefined();
    expect(sentBody(1).temperature).toBe(0.5);
  });

  it('then retries at temperature 0 if the plain reply is not JSON', async () => {
    fetch
      .mockResolvedValueOnce(jsonValidateFailed())
      .mockResolvedValueOnce(reply('Sorry, here you go: translation is 你好'))
      .mockResolvedValueOnce(reply('{"translation":"你好"}'));
    await expect(chatJSON(messages, { temperature: 0.5 })).resolves.toEqual({ translation: '你好' });
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(sentBody(2).temperature).toBe(0);
    expect(sentBody(2).response_format).toBeUndefined();
  });

  it('uses failed_generation when Groq includes usable JSON in it', async () => {
    fetch.mockResolvedValueOnce(
      failure(400, { message: 'Failed to validate JSON.', code: 'json_validate_failed', failed_generation: '{"translation":"ok"} trailing' })
    );
    await expect(chatJSON(messages)).resolves.toEqual({ translation: 'ok' });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('does not retry rate limits that ask for a long wait', async () => {
    fetch.mockResolvedValue(failure(429, { message: 'Rate limit reached. Please try again in 45.2s.' }));
    await expect(chatJSON(messages)).rejects.toMatchObject({ kind: 'rate_limit' });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('retries once after a network error', async () => {
    fetch.mockRejectedValueOnce(new TypeError('Network request failed')).mockResolvedValueOnce(reply('{"a":1}'));
    await expect(chatJSON(messages)).resolves.toEqual({ a: 1 });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('treats an HTML 502 from a sleeping server as warming up, retrying once', async () => {
    const html = { ok: false, status: 502, text: async () => '<html>Bad Gateway</html>' };
    fetch.mockResolvedValue(html);
    await expect(chatJSON(messages)).rejects.toMatchObject({ kind: 'warming' });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});

describe('translateOne', () => {
  it('falls back to a plain-text translation when every JSON attempt fails', async () => {
    fetch
      .mockResolvedValueOnce(jsonValidateFailed())
      .mockResolvedValueOnce(reply('not json'))
      .mockResolvedValueOnce(reply('still not json'))
      .mockResolvedValueOnce(reply('"नमस्ते दोस्त"'));
    await expect(translateOne('hello friend', 'English', 'Hindi', 'casual')).resolves.toEqual({
      translation: 'नमस्ते दोस्त',
      pronunciation: '',
    });
    expect(fetch).toHaveBeenCalledTimes(4);
    expect(sentBody(3).messages[0].content).toMatch(/Reply with only the translation/);
  });

  it('does not fall back on rate limits', async () => {
    fetch.mockResolvedValue(failure(429, { message: 'Too many requests.' }));
    await expect(translateOne('rate limited', 'English', 'Hindi')).rejects.toMatchObject({ kind: 'rate_limit' });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('rejects empty input without calling the API', async () => {
    expect(() => translateOne('   ', 'English', 'Hindi')).toThrow(expect.objectContaining({ kind: 'empty_input' }));
    expect(fetch).not.toHaveBeenCalled();
  });

  it('shares one request between identical calls within 2 seconds', async () => {
    fetch.mockResolvedValue(reply('{"translation":"bonjour","pronunciation":"bon-zhoor"}'));
    const [a, b] = await Promise.all([
      translateOne('good morning', 'English', 'French'),
      translateOne('good morning', 'English', 'French'),
    ]);
    expect(a).toEqual(b);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe('vision rate limits', () => {
  afterEach(() => jest.useRealTimers());

  it('Scan waits out a 17 s rate limit, reports the wait, then succeeds', async () => {
    jest.useFakeTimers();
    const onWait = jest.fn();
    fetch
      .mockResolvedValueOnce(failure(429, { message: 'Rate limit reached for model qwen. Please try again in 17.2s.' }))
      .mockResolvedValueOnce(reply('```json\n{"title":"Menu"}\n```'));
    const result = askAboutImage('aGVsbG8=', 'Explain', { onWait });
    await jest.advanceTimersByTimeAsync(18000);
    await expect(result).resolves.toEqual({ title: 'Menu' });
    expect(onWait).toHaveBeenCalledWith(18);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(sentBody(0)).toMatchObject({ model: 'qwen/qwen3.8-27b', max_tokens: 1200 });
  });

  it('text translation still gives up on waits over 10 s', async () => {
    fetch.mockResolvedValue(failure(429, { message: 'Please try again in 17.2s.' }));
    await expect(chatJSON(messages)).rejects.toMatchObject({ kind: 'rate_limit' });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
