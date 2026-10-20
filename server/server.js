// BridgeTalk proxy: forwards the app's API calls to Groq so the API key never ships in the app.
const crypto = require('node:crypto');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const multer = require('multer');
const { rateLimit } = require('express-rate-limit');

const GROQ_URL = process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1'; // overridable for local tests
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const APP_TOKEN = process.env.APP_TOKEN || '';
const PORT = process.env.PORT || 3000;
const VERSION = require('./package.json').version;

// Per-IP limit. Mobile carriers can put many users behind one IP (CGNAT); raise this if real users hit it.
const RATE_LIMIT_PER_MIN = Number(process.env.RATE_LIMIT_PER_MIN) || 30;
// Whole-server limit, a backstop so a flood from many IPs can't burn through the Groq quota.
const GLOBAL_LIMIT_PER_MIN = Number(process.env.GLOBAL_LIMIT_PER_MIN) || 300;
// Shorter than the app's 30 s timeout, so the app gets a clean 504 instead of a dropped connection.
const UPSTREAM_TIMEOUT_MS = 28000;
// Wait out a Groq rate limit server-side only when it's short; longer waits go back to the app.
const MAX_GROQ_RETRY_WAIT_MS = 8000;
const JSON_LIMIT = '8mb';
const AUDIO_LIMIT_BYTES = 10 * 1024 * 1024;
// Browser origins allowed to call the API (comma-separated). The app itself sends no Origin header.
const CORS_ORIGINS = (process.env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);

// Keep in sync with MODELS in src/config.js
const ALLOWED_MODELS = new Set(['openai/gpt-oss-120b', 'whisper-large-v3-turbo', 'qwen/qwen3.8-27b']);
const TRANSCRIPTION_FIELDS = ['model', 'language', 'prompt', 'response_format', 'temperature'];

// Structured, one-line JSON logs. Never log request or response bodies: they contain user text.
const log = (level, fields) => {
  const line = JSON.stringify({ t: new Date().toISOString(), level, ...fields });
  if (level === 'error') console.error(line);
  else console.log(line);
};

if (!GROQ_API_KEY) {
  log('error', { msg: 'GROQ_API_KEY is not set. Add it to the environment before starting the server.' });
  process.exit(1);
}
if (!APP_TOKEN) log('warn', { msg: 'APP_TOKEN is not set: the API is open to anyone with the URL.' });

const app = express();
// Render (and most hosts) sit behind one proxy; needed so rate limits see the real client IP.
app.set('trust proxy', Number(process.env.TRUST_PROXY ?? 1));
app.use(helmet());
app.use(
  cors({
    // No Origin header = the mobile app or a server-side script; browsers must be allow-listed.
    origin: (origin, done) => done(null, !origin || CORS_ORIGINS.includes(origin)),
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'X-App-Token'],
  })
);

const sendError = (res, status, message, extra = {}) => res.status(status).json({ error: { message, ...extra } });

// Request log: route, status, latency and model only.
app.use((req, res, next) => {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    log(res.statusCode >= 500 ? 'error' : 'info', {
      route: `${req.method} ${req.originalUrl.split('?')[0]}`,
      status: res.statusCode,
      ms: Number((process.hrtime.bigint() - start) / 1000000n),
      model: res.locals.model,
      groq: res.locals.groqStatus,
    });
  });
  next();
});

app.get('/health', (req, res) => res.json({ ok: true, service: 'bridgetalk-server', version: VERSION, uptime: Math.round(process.uptime()) }));
app.get('/', (req, res) => res.json({ ok: true, service: 'bridgetalk-server' }));

// Shared app token. Constant-time comparison so the token can't be guessed byte by byte.
function checkToken(req, res, next) {
  if (!APP_TOKEN) return next();
  const given = Buffer.from(String(req.get('x-app-token') || ''));
  const expected = Buffer.from(APP_TOKEN);
  if (given.length === expected.length && crypto.timingSafeEqual(given, expected)) return next();
  return sendError(res, 401, 'This app version is not allowed to use the server. Please update BridgeTalk.');
}

const limiter = (options) =>
  rateLimit({
    windowMs: 60 * 1000,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, res) => sendError(res, 429, 'Busy, try again in a moment.', { code: 'proxy_rate_limited', retry_after: 30 }),
    ...options,
  });

app.use('/api', limiter({ limit: GLOBAL_LIMIT_PER_MIN, keyGenerator: () => 'global' }));
app.use('/api', limiter({ limit: RATE_LIMIT_PER_MIN }));
app.use('/api', checkToken);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: AUDIO_LIMIT_BYTES, files: 1 } });

function checkModel(model, res) {
  if (!ALLOWED_MODELS.has(model)) {
    sendError(res, 400, `Model "${model}" is not allowed.`);
    return false;
  }
  return true;
}

// Groq rate-limit responses carry retry-after (seconds) and/or "Please try again in 4.59s"
function groqRetryAfterMs(upstream, body) {
  const header = Number(upstream.headers.get('retry-after'));
  if (Number.isFinite(header) && header > 0) return header * 1000;
  const match = /try again in ([\d.]+)s/i.exec(body);
  return match ? Math.ceil(parseFloat(match[1]) * 1000) : null;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Calls Groq, retries once after a short rate-limit wait, and relays the result to the app.
async function relay(res, makeRequest) {
  let upstream;
  let body;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      upstream = await makeRequest();
      body = await upstream.text();
    } catch (e) {
      if (e.name === 'TimeoutError' || e.name === 'AbortError') {
        return sendError(res, 504, 'The AI service took too long to answer. Please try again.');
      }
      log('error', { msg: 'Groq request failed', error: e.message });
      return sendError(res, 502, 'Could not reach the AI service. Please try again.');
    }
    res.locals.groqStatus = upstream.status;
    if (upstream.status !== 429) break;

    const wait = groqRetryAfterMs(upstream, body);
    if (attempt === 0 && wait && wait <= MAX_GROQ_RETRY_WAIT_MS) {
      await sleep(wait + 250);
      continue;
    }
    // Tell the app how long to wait, so screens that can (Scan) wait it out themselves.
    const seconds = wait ? Math.ceil(wait / 1000) : 30;
    res.set('Retry-After', String(seconds));
    return sendError(res, 429, `Busy, try again in a moment. Please try again in ${seconds}s.`, { code: 'groq_rate_limited', retry_after: seconds });
  }
  res.status(upstream.status).type(upstream.headers.get('content-type') || 'application/json').send(body);
}

app.post('/api/chat/completions', express.json({ limit: JSON_LIMIT }), async (req, res) => {
  const body = req.body;
  if (!body || !Array.isArray(body.messages)) return sendError(res, 400, 'Request must include a messages array.');
  if (!checkModel(body.model, res)) return;
  res.locals.model = body.model;

  await relay(res, () =>
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
  res.locals.model = req.body.model;

  await relay(res, () => {
    // A fresh FormData per attempt: a request body can only be sent once.
    const form = new FormData();
    form.append('file', new Blob([req.file.buffer], { type: req.file.mimetype || 'audio/m4a' }), req.file.originalname || 'recording.m4a');
    for (const field of TRANSCRIPTION_FIELDS) {
      if (req.body[field] !== undefined && req.body[field] !== '') form.append(field, req.body[field]);
    }
    return fetch(`${GROQ_URL}/audio/transcriptions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
      body: form,
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  });
});

// User reports of bad AI output (Play's AI-generated content policy). The one place user-chosen
// content is logged: only the reported AI result and the optional note, never the user's original
// input, IP address or any identifier. Review them in the Render log by searching for "report".
const REPORT_REASONS = new Set(['offensive', 'wrong_translation', 'other']);
const REPORT_FEATURES = new Set(['translate', 'talk', 'scan']);
const clip = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

app.post('/api/report', express.json({ limit: '32kb' }), (req, res) => {
  const body = req.body || {};
  if (!REPORT_REASONS.has(body.reason)) return sendError(res, 400, 'Unknown report reason.');
  const result = clip(body.result, 2000);
  if (!result) return sendError(res, 400, 'Nothing to report.');
  log('report', {
    report: {
      reason: body.reason,
      feature: REPORT_FEATURES.has(body.feature) ? body.feature : 'other',
      from: clip(body.from, 40),
      to: clip(body.to, 40),
      vibe: clip(body.vibe, 20),
      result,
      note: clip(body.note, 500),
    },
  });
  res.json({ ok: true });
});

app.use((req, res) => sendError(res, 404, 'Not found.'));

// Bad JSON, oversized uploads and anything unexpected come back as { error: { message } }.
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  if (err instanceof multer.MulterError) {
    return sendError(res, err.code === 'LIMIT_FILE_SIZE' ? 413 : 400, err.code === 'LIMIT_FILE_SIZE' ? 'Audio file is too large (max 10 MB).' : 'Invalid upload.');
  }
  if (err.type === 'entity.parse.failed') return sendError(res, 400, 'Invalid JSON body.');
  if (err.type === 'entity.too.large') return sendError(res, 413, 'Request is too large.');
  log('error', { msg: 'Unhandled route error', error: err.message, route: `${req.method} ${req.path}` });
  sendError(res, 500, 'Something went wrong on the server.');
});

// Never let one bad request take the whole process down.
process.on('unhandledRejection', (reason) => log('error', { msg: 'Unhandled rejection', error: String(reason?.message ?? reason) }));
process.on('uncaughtException', (err) => log('error', { msg: 'Uncaught exception', error: err.message }));

const server = app.listen(PORT, () => log('info', { msg: 'listening', port: Number(PORT), version: VERSION, tokenRequired: Boolean(APP_TOKEN) }));
// Render sends SIGTERM before replacing an instance: finish in-flight requests, then exit.
function shutdown(signal) {
  log('info', { msg: 'shutting down', signal });
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 10000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = { app, server };
