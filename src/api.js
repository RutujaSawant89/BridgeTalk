import { API_URL, GROQ_API_KEY, MODELS } from './config';
import { AppError } from './errors';
import { parseJSON } from './json';

export { parseJSON };

// With a proxy URL the server holds the key; otherwise call Groq directly.
const BASE_URL = API_URL ? `${API_URL.replace(/\/+$/, '')}/api` : 'https://api.groq.com/openai/v1';
const authHeaders = () => (API_URL ? {} : { Authorization: `Bearer ${GROQ_API_KEY}` });

const TIMEOUT_MS = 30000;
const MAX_RATE_LIMIT_WAIT_MS = 10000;
const RETRY_DELAY_MS = 1500;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (e) {
    if (e?.name === 'AbortError') throw new AppError('timeout', `No response after ${TIMEOUT_MS / 1000}s: ${url}`);
    throw new AppError('network', e?.message || 'Network request failed');
  } finally {
    clearTimeout(timer);
  }
}

// Groq rate-limit errors say "Please try again in 4.59s"
function rateLimitWaitMs(data) {
  const match = /try again in ([\d.]+)s/i.exec(data?.error?.message || '');
  return match ? Math.ceil(parseFloat(match[1]) * 1000) + 250 : null;
}

function toAppError(path, status, data, raw) {
  const message =
    data?.error?.message || (typeof data?.error === 'string' ? data.error : null) || data?.message || '';
  const extra = { status, code: data?.error?.code, failedGeneration: data?.error?.failed_generation };
  const detail = `${path} -> HTTP ${status}: ${message || String(raw).slice(0, 200)}`;

  if (status === 429) return new AppError('rate_limit', detail, extra);
  if (status === 413 || /too large/i.test(message)) return new AppError('too_large', detail, extra);
  if (extra.code === 'json_validate_failed') return new AppError('json_failed', detail, extra);
  // Render returns an HTML 502/503 page (no JSON) while the free server is waking up
  if (status >= 500) return new AppError(data ? 'server' : 'warming', detail, extra);
  if (path.startsWith('/audio/') && status === 400) return new AppError('audio_unclear', detail, extra);
  return new AppError(status === 400 ? 'bad_request' : 'api', detail, extra);
}

const isRetryable = (e) => ['network', 'timeout', 'warming', 'server'].includes(e.kind);

// One automatic retry for network drops, timeouts, cold starts, 5xx and short rate-limit waits.
async function request(path, options, attempt = 0) {
  if (!API_URL && !GROQ_API_KEY) {
    throw new AppError('config', 'No API configured. Set EXPO_PUBLIC_API_URL or EXPO_PUBLIC_GROQ_API_KEY in .env');
  }

  let error;
  try {
    const response = await fetchWithTimeout(`${BASE_URL}${path}`, {
      ...options,
      headers: { ...authHeaders(), ...options.headers },
    });
    const raw = await response.text();
    let data = null;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      // non-JSON body, e.g. an HTML error page
    }

    if (response.ok) {
      if (data !== null) return data;
      error = new AppError('warming', `${path} -> HTTP ${response.status} with a non-JSON body`);
    } else {
      error = toAppError(path, response.status, data, raw);
      const wait = error.kind === 'rate_limit' ? rateLimitWaitMs(data) : null;
      if (attempt === 0 && wait && wait <= MAX_RATE_LIMIT_WAIT_MS) {
        await sleep(wait);
        return request(path, options, 1);
      }
    }
  } catch (e) {
    error = e instanceof AppError ? e : new AppError('network', e?.message);
  }

  if (attempt === 0 && isRetryable(error)) {
    console.warn(`[BridgeTalk] retrying ${path} after ${error.kind}: ${error.message}`);
    await sleep(RETRY_DELAY_MS);
    return request(path, options, 1);
  }
  throw error;
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
  const content = data.choices?.[0]?.message?.content ?? '';
  if (!content.trim()) throw new AppError('bad_response', 'Model returned an empty reply');
  return content;
}

const isJsonProblem = (e) => e?.kind === 'json_failed' || e?.kind === 'bad_response';

// JSON reply with fallbacks: Groq's JSON mode can reject valid-looking output
// ("Failed to validate JSON"), so retry without it, then once more at temperature 0.
export async function chatJSON(messages, options = {}) {
  try {
    return parseJSON(await chat(messages, { ...options, json: true }));
  } catch (e) {
    if (!isJsonProblem(e)) throw e;
    console.warn('[BridgeTalk] JSON mode failed, retrying without response_format:', e.message);
    if (e.failedGeneration) {
      try {
        return parseJSON(e.failedGeneration);
      } catch {}
    }
  }

  try {
    return parseJSON(await chat(messages, { ...options, json: false }));
  } catch (e) {
    if (!isJsonProblem(e)) throw e;
    console.warn('[BridgeTalk] plain reply was not JSON, retrying at temperature 0:', e.message);
  }

  return parseJSON(await chat(messages, { ...options, json: false, temperature: 0 }));
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
  const messages = [
    {
      role: 'user',
      content: [
        { type: 'text', text: `${prompt}\n\nRespond with JSON only.` },
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } },
      ],
    },
  ];
  try {
    return parseJSON(await chat(messages, { model: MODELS.vision, temperature: 0.2 }));
  } catch (e) {
    if (!isJsonProblem(e)) throw e;
    console.warn('[BridgeTalk] vision reply was not JSON, retrying at temperature 0:', e.message);
    return parseJSON(await chat(messages, { model: MODELS.vision, temperature: 0 }));
  }
}
