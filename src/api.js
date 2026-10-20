import { API_URL, GROQ_API_KEY, MODELS } from './config';

// With a proxy URL the server holds the key; otherwise call Groq directly.
const BASE_URL = API_URL ? `${API_URL.replace(/\/+$/, '')}/api` : 'https://api.groq.com/openai/v1';
const authHeaders = () => (API_URL ? {} : { Authorization: `Bearer ${GROQ_API_KEY}` });

const MAX_RETRY_WAIT_MS = 10000;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const apiError = (message, details) => Object.assign(new Error(message), details);

// Turns raw API failures into messages people can act on; keeps code/details for callers.
function toApiError(status, data) {
  const apiMessage =
    data?.error?.message || (typeof data?.error === 'string' ? data.error : null) || data?.message || '';
  const details = { status, code: data?.error?.code, failedGeneration: data?.error?.failed_generation };

  if (status === 429) {
    return apiError('Lots of people are translating right now. Please wait a few seconds and try again.', details);
  }
  if (details.code === 'json_validate_failed') {
    return apiError('The AI got confused by that one. Please try again, or try a shorter sentence.', details);
  }
  if (status >= 500 && !apiMessage) {
    // Render's free tier returns an HTML 502/503 page while the server is waking up
    return apiError('The server is waking up. Please try again in about 30 seconds.', details);
  }
  return apiError(apiMessage || `Request failed (${status})`, details);
}

// Groq rate-limit errors say "Please try again in 4.59s"
function retryDelayMs(data) {
  const match = /try again in ([d.]+)s/i.exec(data?.error?.message || '');
  return match ? Math.ceil(parseFloat(match[1]) * 1000) + 250 : null;
}

async function request(path, options, { retryOnRateLimit = true } = {}) {
  if (!API_URL && !GROQ_API_KEY) {
    throw new Error('No API configured. Set EXPO_PUBLIC_API_URL or EXPO_PUBLIC_GROQ_API_KEY in .env');
  }

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: { ...authHeaders(), ...options.headers },
    });
  } catch {
    throw new Error('Network error. Check your internet connection and try again.');
  }

  const raw = await response.text();
  let data = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    // non-JSON body (e.g. an HTML error page)
  }

  if (!response.ok) {
    // A short Groq rate-limit wait is retried once automatically instead of bothering the user
    const wait = response.status === 429 ? retryDelayMs(data) : null;
    if (retryOnRateLimit && wait && wait <= MAX_RETRY_WAIT_MS) {
      await sleep(wait);
      return request(path, options, { retryOnRateLimit: false });
    }
    throw toApiError(response.status, data);
  }
  if (data === null) throw new Error('Unexpected response from the server.');
  return data;
}

// Returns the assistant's reply text.
export async function chat(messages, { model = MODELS.text, temperature = 0.3, json = false, maxTokens = 1500 } = {}) {
  const body = { model, messages, temperature, max_tokens: maxTokens };
  if (json) body.response_format = { type: 'json_object' };
  // gpt-oss reasons before answering and that counts against max_tokens; at the default effort a
  // long input could use up the budget and cut the JSON off. Low effort is plenty for translation.
  if (model.startsWith('openai/gpt-oss')) body.reasoning_effort = 'low';

  const data = await request('/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return data.choices?.[0]?.message?.content ?? '';
}

// Pulls a JSON object out of a model reply, ignoring <think> blocks and ```json fences.
export function parseJSON(text) {
  const cleaned = String(text)
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/```(?:json)?/gi, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {}
    }
    throw new Error('The AI returned an unreadable response. Please try again.');
  }
}

export async function chatJSON(messages, options = {}) {
  try {
    return parseJSON(await chat(messages, { ...options, json: true }));
  } catch (e) {
    if (e.code !== 'json_validate_failed') throw e;
    // Groq rejected malformed JSON; its partial output is often still usable
    if (e.failedGeneration) {
      try {
        return parseJSON(e.failedGeneration);
      } catch {}
    }
    // Otherwise the reply was most likely cut off: retry once with more room
    return parseJSON(await chat(messages, { ...options, json: true, maxTokens: (options.maxTokens ?? 1500) * 2 }));
  }
}

// uri: local audio file from the recorder. languageCode: Whisper ISO code, or null to auto-detect.
export async function transcribe(uri, languageCode) {
  const form = new FormData();
  form.append('file', { uri, name: 'recording.m4a', type: 'audio/m4a' });
  form.append('model', MODELS.speech);
  if (languageCode) form.append('language', languageCode);

  // No Content-Type header: fetch sets the multipart boundary itself.
  const data = await request('/audio/transcriptions', { method: 'POST', body: form });
  return (data.text ?? '').trim();
}

export async function askAboutImage(base64, prompt) {
  const content = await chat(
    [
      {
        role: 'user',
        content: [
          { type: 'text', text: `${prompt}\n\nRespond with JSON only.` },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } },
        ],
      },
    ],
    { model: MODELS.vision, temperature: 0.2 }
  );
  return parseJSON(content);
}
