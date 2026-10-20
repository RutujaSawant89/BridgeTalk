// BridgeTalk proxy: forwards the app's API calls to Groq so the API key never ships in the app.
const express = require('express');
const multer = require('multer');
const { rateLimit } = require('express-rate-limit');

const GROQ_URL = 'https://api.groq.com/openai/v1';
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const PORT = process.env.PORT || 3000;
// Mobile carriers put many users behind one IP (CGNAT), so this is generous; Groq's own limits are the real cap.
const RATE_LIMIT_PER_MIN = Number(process.env.RATE_LIMIT_PER_MIN) || 120;
// Shorter than the app's 30 s timeout, so the app gets a clean 504 instead of a dropped connection.
const UPSTREAM_TIMEOUT_MS = 28000;

// Keep in sync with MODELS in src/config.js
const ALLOWED_MODELS = new Set(['openai/gpt-oss-120b', 'whisper-large-v3-turbo', 'qwen/qwen3.8-27b']);
const TRANSCRIPTION_FIELDS = ['model', 'language', 'prompt', 'response_format', 'temperature'];

if (!GROQ_API_KEY) {
  console.error('GROQ_API_KEY is not set. Add it to the environment before starting the server.');
  process.exit(1);
}

const app = express();
// Render (and most hosts) sit behind one proxy; needed so the rate limit sees the real client IP.
app.set('trust proxy', Number(process.env.TRUST_PROXY ?? 1));
app.disable('x-powered-by');

const sendError = (res, status, message) => res.status(status).json({ error: { message } });

app.use(
  '/api',
  rateLimit({
    windowMs: 60 * 1000,
    limit: RATE_LIMIT_PER_MIN,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, res) => sendError(res, 429, 'Too many requests. Please wait a minute and try again.'),
  })
);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

function checkModel(model, res) {
  if (!ALLOWED_MODELS.has(model)) {
    sendError(res, 400, `Model "${model}" is not allowed.`);
    return false;
  }
  return true;
}

// Relays Groq's status and body back to the app unchanged.
async function relay(res, upstreamPromise) {
  let upstream;
  try {
    upstream = await upstreamPromise;
  } catch (e) {
    if (e.name === 'TimeoutError' || e.name === 'AbortError') {
      console.error('Groq request timed out');
      return sendError(res, 504, 'The AI service took too long to answer. Please try again.');
    }
    console.error('Groq request failed:', e.message);
    return sendError(res, 502, 'Could not reach the AI service. Please try again.');
  }
  const body = await upstream.text();
  res.status(upstream.status).type(upstream.headers.get('content-type') || 'application/json').send(body);
}

app.get('/', (req, res) => res.json({ ok: true, service: 'bridgetalk-server' }));

app.post('/api/chat/completions', express.json({ limit: '10mb' }), async (req, res) => {
  const body = req.body;
  if (!body || !Array.isArray(body.messages)) return sendError(res, 400, 'Request must include a messages array.');
  if (!checkModel(body.model, res)) return;

  await relay(
    res,
    fetch(`${GROQ_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({ ...body, stream: false }),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    })
  );
});

app.post('/api/audio/transcriptions', upload.single('file'), async (req, res) => {
  if (!req.file) return sendError(res, 400, 'Request must include an audio file in the "file" field.');
  if (!checkModel(req.body.model, res)) return;

  const form = new FormData();
  form.append(
    'file',
    new Blob([req.file.buffer], { type: req.file.mimetype || 'audio/m4a' }),
    req.file.originalname || 'recording.m4a'
  );
  for (const field of TRANSCRIPTION_FIELDS) {
    if (req.body[field] !== undefined && req.body[field] !== '') form.append(field, req.body[field]);
  }

  await relay(
    res,
    fetch(`${GROQ_URL}/audio/transcriptions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
      body: form,
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    })
  );
});

app.use((req, res) => sendError(res, 404, 'Not found.'));

// Bad JSON, oversized uploads and other errors come back in the same { error: { message } } shape.
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return sendError(res, 400, err.code === 'LIMIT_FILE_SIZE' ? 'Audio file is too large (max 25 MB).' : err.message);
  }
  if (err.type === 'entity.parse.failed') return sendError(res, 400, 'Invalid JSON body.');
  if (err.type === 'entity.too.large') return sendError(res, 413, 'Request is too large.');
  console.error(err);
  sendError(res, 500, 'Something went wrong on the server.');
});

app.listen(PORT, () => console.log(`BridgeTalk server listening on port ${PORT}`));
