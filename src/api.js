import { API_URL, GROQ_API_KEY, MODELS } from './config';

// With a proxy URL the server holds the key; otherwise call Groq directly.
const BASE_URL = API_URL ? `${API_URL.replace(/\/+$/, '')}/api` : 'https://api.groq.com/openai/v1';
const authHeaders = () => (API_URL ? {} : { Authorization: `Bearer ${GROQ_API_KEY}` });

async function request(path, options) {
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
    const message =
      data?.error?.message ||
      (typeof data?.error === 'string' ? data.error : null) ||
      data?.message ||
      `Request failed (${response.status})`;
    throw new Error(message);
  }
  if (data === null) throw new Error('Unexpected response from the server.');
  return data;
}

// Returns the assistant's reply text.
export async function chat(messages, { model = MODELS.text, temperature = 0.3, json = false, maxTokens = 1500 } = {}) {
  const body = { model, messages, temperature, max_tokens: maxTokens };
  if (json) body.response_format = { type: 'json_object' };

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
  return parseJSON(await chat(messages, { ...options, json: true }));
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
