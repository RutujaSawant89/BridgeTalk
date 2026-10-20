import { AppError } from './errors';

// Pulls a JSON object out of a model reply, ignoring <think> blocks, ```json fences and
// any chatter before or after the object.
export function parseJSON(text) {
  const cleaned = String(text ?? '')
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<think>[\s\S]*$/i, '') // unterminated think block (reply was cut off)
    .replace(/```(?:json)?/gi, '')
    .trim();

  try {
    const value = JSON.parse(cleaned);
    if (value && typeof value === 'object') return value;
  } catch {}

  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch {}
  }
  throw new AppError('bad_response', `Could not parse JSON from model reply: ${cleaned.slice(0, 200)}`);
}
