// Longest text the app sends for translation. Longer input would blow past Groq's per-minute
// token budget (shared by every user) and fail with a confusing "busy" error.
export const MAX_INPUT_CHARS = 2000;

// Tidies a plain-text model reply that should contain only a translation: drops <think> blocks,
// ```fences, a leading "Translation:" label and quotes wrapped around the whole reply.
export function cleanText(reply) {
  return String(reply ?? '')
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<think>[\s\S]*$/i, '')
    .replace(/```[a-z]*\n?|```/gi, '')
    .trim()
    .replace(/^\s*translation\s*:\s*/i, '')
    .trim()
    .replace(/^["“'«](.*)["”'»]$/s, '$1')
    .trim();
}

const CJK = /[\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/;

// Whisper returns "." or "you" for silence; one CJK character (好, 是) is a real answer.
export function isMeaningful(text) {
  const core = String(text ?? '').replace(/[\s.,!?…。、！？]/g, '');
  return core.length >= 2 || (core.length === 1 && CJK.test(core));
}

// base64 is 4 characters per 3 bytes
export const base64Bytes = (b64) => Math.floor((String(b64 ?? '').length * 3) / 4);
