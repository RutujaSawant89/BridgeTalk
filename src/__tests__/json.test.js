import { parseJSON } from '../json';
import { AppError, friendlyMessage } from '../errors';

describe('parseJSON', () => {
  it('parses plain JSON', () => {
    expect(parseJSON('{"translation":"hola","pronunciation":"oh-la"}')).toEqual({
      translation: 'hola',
      pronunciation: 'oh-la',
    });
  });

  it('strips ```json fences', () => {
    const reply = '```json\n{"translation": "bonjour", "pronunciation": "bon-zhoor"}\n```';
    expect(parseJSON(reply)).toEqual({ translation: 'bonjour', pronunciation: 'bon-zhoor' });
  });

  it('strips bare ``` fences', () => {
    expect(parseJSON('```\n{"a": 1}\n```')).toEqual({ a: 1 });
  });

  it('ignores <think> blocks, including braces inside them', () => {
    const reply = '<think>The user wants {"translation": ...}. Let me think.</think>\n{"translation":"ciao"}';
    expect(parseJSON(reply)).toEqual({ translation: 'ciao' });
  });

  it('ignores an unterminated <think> block after the JSON', () => {
    expect(parseJSON('{"translation":"hallo"}\n<think>and then the reply was cut')).toEqual({ translation: 'hallo' });
  });

  it('extracts JSON surrounded by extra text', () => {
    const reply = 'Sure! Here is the translation:\n{"translation":"obrigado","pronunciation":"oh-bree-gah-doo"}\nHope that helps!';
    expect(parseJSON(reply)).toEqual({ translation: 'obrigado', pronunciation: 'oh-bree-gah-doo' });
  });

  it('keeps nested objects intact', () => {
    const reply = 'Result: {"formal":{"translation":"a"},"casual":{"translation":"b"},"culture_tip":"c"} done';
    expect(parseJSON(reply)).toEqual({ formal: { translation: 'a' }, casual: { translation: 'b' }, culture_tip: 'c' });
  });

  it.each([
    ['Hindi', '{"translation":"मुझे भूख लगी है","pronunciation":"mujhe bhookh lagi hai"}', 'मुझे भूख लगी है'],
    ['Chinese', '{"translation":"你好，你叫什么名字？","pronunciation":"nǐ hǎo, nǐ jiào shénme míngzi?"}', '你好，你叫什么名字？'],
    ['Arabic', '{"translation":"كم سعر هذا؟","pronunciation":"kam si\'r hādhā?"}', 'كم سعر هذا؟'],
    ['Tamil', '{"translation":"அவன் \\"நான் வருவேன்\\" என்றான்","pronunciation":"avan naan varuven endraan"}', 'அவன் "நான் வருவேன்" என்றான்'],
    ['Japanese + emoji', '```json\n{"translation":"好きだよ ❤️","pronunciation":"suki da yo"}\n```', '好きだよ ❤️'],
  ])('handles non-Latin script: %s', (_name, reply, expected) => {
    expect(parseJSON(reply).translation).toBe(expected);
  });

  it.each([
    ['empty string', ''],
    ['plain text with no JSON', 'I cannot translate that.'],
    ['truncated JSON', '{"translation":"नमस्ते","pronunciation":"nam'],
    ['broken JSON', '{translation: नमस्ते}'],
    ['a JSON string, not an object', '"just a string"'],
    ['null', null],
  ])('throws a bad_response AppError for invalid input: %s', (_name, reply) => {
    expect(() => parseJSON(reply)).toThrow(AppError);
    try {
      parseJSON(reply);
    } catch (e) {
      expect(e.kind).toBe('bad_response');
    }
  });
});

describe('friendlyMessage', () => {
  beforeEach(() => jest.spyOn(console, 'warn').mockImplementation(() => {}));
  afterEach(() => jest.restoreAllMocks());

  it('never shows the raw API text', () => {
    const raw = "Failed to validate JSON. Please adjust your prompt. See 'failed_generation' for more details.";
    const message = friendlyMessage(new AppError('json_failed', raw, { code: 'json_validate_failed' }), 'talk');
    expect(message).not.toContain('failed_generation');
    expect(message).toBe('Something went wrong. Please try again.');
  });

  it('logs the technical detail to the console', () => {
    friendlyMessage(new AppError('rate_limit', 'HTTP 429: Rate limit reached for model'), 'translate');
    expect(console.warn).toHaveBeenCalledWith(
      '[BridgeTalk:translate] rate_limit',
      expect.objectContaining({ message: 'HTTP 429: Rate limit reached for model' })
    );
  });

  it.each([
    ['network', 'translate', "You're offline. Check your internet connection and try again."],
    ['timeout', 'translate', 'Warming up, try again in a few seconds.'],
    ['warming', 'scan', 'Warming up, try again in a few seconds.'],
    ['rate_limit', 'talk', 'Lots of people are using BridgeTalk right now. Please wait a few seconds and try again.'],
    ['too_large', 'talk', 'That recording is too long. Try saying it in shorter parts.'],
    ['bad_response', 'scan', expect.stringContaining("couldn't read that photo")],
    ['audio_unclear', 'talk', expect.stringContaining("Didn't catch that")],
    ['something_unexpected', 'translate', 'Something went wrong. Please try again.'],
  ])('maps %s on %s to a plain-English message', (kind, context, expected) => {
    expect(friendlyMessage(new AppError(kind, 'technical detail'), context)).toEqual(expected);
  });

  it('handles non-AppError values', () => {
    expect(friendlyMessage(new TypeError('undefined is not a function'))).toBe('Something went wrong. Please try again.');
    expect(friendlyMessage(undefined)).toBe('Something went wrong. Please try again.');
  });
});
