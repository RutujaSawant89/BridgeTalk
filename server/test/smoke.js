// Local end-to-end checks for server.js against a fake Groq (no real API calls, no credits used).
//   cd server && npm test
const { spawn } = require('node:child_process');
const http = require('node:http');
const assert = require('node:assert/strict');
const path = require('node:path');

const FAKE_PORT = 4911;
const SERVER_PORT = 4912;
const TOKEN = 'test-token-123';
const SECRET_USER_TEXT = 'my-private-sentence-42';
const BASE = `http://127.0.0.1:${SERVER_PORT}`;

// Fake Groq: behaviour is chosen by the user message so each test can ask for a scenario.
let calls = 0;
let rateShortServed = false; // the 'rate-short' scenario fails once, then succeeds
const fake = http.createServer((req, res) => {
  let raw = '';
  req.on('data', (c) => (raw += c));
  req.on('end', () => {
    calls++;
    const text = raw.includes('rate-short') && !rateShortServed ? 'rate-short-first' : raw;
    if (text === 'rate-short-first') rateShortServed = true;
    res.setHeader('content-type', 'application/json');
    if (text === 'rate-short-first') {
      res.statusCode = 429;
      res.setHeader('retry-after', '1');
      return res.end(JSON.stringify({ error: { message: 'Rate limit reached. Please try again in 1s.' } }));
    }
    if (raw.includes('rate-long')) {
      res.statusCode = 429;
      return res.end(JSON.stringify({ error: { message: 'Rate limit reached. Please try again in 45.2s.' } }));
    }
    if (raw.includes('slow-upstream')) return; // never answers: tests the 28 s upstream timeout path (skipped by default)
    res.end(JSON.stringify({ choices: [{ message: { content: '{"translation":"नमस्ते"}' } }], echoed: raw.length }));
  });
});

function startServer(env) {
  const child = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], {
    env: { ...process.env, PORT: String(SERVER_PORT), GROQ_API_KEY: 'fake-key', GROQ_BASE_URL: `http://127.0.0.1:${FAKE_PORT}`, TRUST_PROXY: '0', ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = '';
  child.stdout.on('data', (d) => (logs += d));
  child.stderr.on('data', (d) => (logs += d));
  return {
    child,
    logs: () => logs,
    ready: () =>
      new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error(`server did not start:\n${logs}`)), 8000);
        const check = setInterval(() => {
          if (logs.includes('"listening"')) {
            clearTimeout(t);
            clearInterval(check);
            resolve();
          }
        }, 50);
      }),
  };
}

const chat = (content, headers = { 'x-app-token': TOKEN }, extra = {}) =>
  fetch(`${BASE}/api/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify({ model: 'openai/gpt-oss-120b', messages: [{ role: 'user', content }], ...extra }),
  });

const results = [];
async function check(name, fn) {
  try {
    await fn();
    results.push(['PASS', name]);
  } catch (e) {
    results.push(['FAIL', `${name}: ${e.message}`]);
  }
}

(async () => {
  await new Promise((r) => fake.listen(FAKE_PORT, '127.0.0.1', r));
  const server = startServer({ APP_TOKEN: TOKEN, RATE_LIMIT_PER_MIN: '14', GLOBAL_LIMIT_PER_MIN: '1000' });
  await server.ready();

  await check('GET /health works without a token', async () => {
    const r = await fetch(`${BASE}/health`);
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.equal(j.ok, true);
    assert.ok('uptime' in j && 'version' in j);
  });
  await check('helmet security headers are set', async () => {
    const r = await fetch(`${BASE}/health`);
    assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(r.headers.get('x-powered-by'), null);
  });
  await check('missing app token -> 401 friendly JSON', async () => {
    const r = await chat('hello', {});
    assert.equal(r.status, 401);
    assert.match((await r.json()).error.message, /update BridgeTalk/);
  });
  await check('wrong app token -> 401', async () => {
    assert.equal((await chat('hello', { 'x-app-token': 'nope' })).status, 401);
  });
  await check('valid token -> relayed to Groq', async () => {
    const r = await chat(SECRET_USER_TEXT);
    assert.equal(r.status, 200);
    assert.equal((await r.json()).choices[0].message.content, '{"translation":"नमस्ते"}');
  });
  await check('model allowlist -> 400', async () => {
    const r = await chat('hi', undefined, { model: 'llama-expensive' });
    assert.equal(r.status, 400);
  });
  await check('Groq 429 with a short wait is retried once and succeeds', async () => {
    const before = calls;
    const r = await chat('rate-short');
    assert.equal(r.status, 200);
    assert.equal(calls - before, 2);
  });
  await check('Groq 429 with a long wait -> friendly "Busy" + retry_after', async () => {
    const r = await chat('rate-long');
    assert.equal(r.status, 429);
    const j = await r.json();
    assert.match(j.error.message, /^Busy, try again in a moment/);
    assert.equal(j.error.retry_after, 46);
    assert.equal(r.headers.get('retry-after'), '46');
  });
  await check('JSON body over 8 MB -> 413 JSON, server keeps running', async () => {
    const r = await chat('x'.repeat(9 * 1024 * 1024));
    assert.equal(r.status, 413);
    assert.equal((await fetch(`${BASE}/health`)).status, 200);
  });
  await check('broken JSON -> 400 JSON', async () => {
    const r = await fetch(`${BASE}/api/chat/completions`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-app-token': TOKEN }, body: '{oops' });
    assert.equal(r.status, 400);
    assert.match((await r.json()).error.message, /Invalid JSON/);
  });
  await check('audio over 10 MB -> 413 JSON', async () => {
    const form = new FormData();
    form.append('file', new Blob([Buffer.alloc(11 * 1024 * 1024)], { type: 'audio/m4a' }), 'big.m4a');
    form.append('model', 'whisper-large-v3-turbo');
    const r = await fetch(`${BASE}/api/audio/transcriptions`, { method: 'POST', headers: { 'x-app-token': TOKEN }, body: form });
    assert.equal(r.status, 413);
  });
  await check('browser origins are not allowed by CORS', async () => {
    const r = await fetch(`${BASE}/health`, { headers: { origin: 'https://evil.example' } });
    assert.equal(r.headers.get('access-control-allow-origin'), null);
  });
  await check('per-IP rate limit -> friendly 429 JSON', async () => {
    let last;
    for (let i = 0; i < 16; i++) last = await chat('hello again');
    assert.equal(last.status, 429);
    const j = await last.json();
    assert.match(j.error.message, /^Busy, try again in a moment/);
    assert.equal(j.error.code, 'proxy_rate_limited');
  });
  await check('logs are structured JSON and never contain user text', async () => {
    const lines = server.logs().trim().split('\n');
    for (const line of lines) JSON.parse(line); // every line is JSON
    assert.ok(lines.some((l) => l.includes('"route":"POST /api/chat/completions"') && l.includes('"ms":') && l.includes('"model":"openai/gpt-oss-120b"')));
    assert.ok(!server.logs().includes(SECRET_USER_TEXT), 'user text leaked into logs');
  });
  await check('SIGTERM shuts down cleanly with exit code 0', async () => {
    const code = await new Promise((resolve) => {
      server.child.on('exit', resolve);
      server.child.kill('SIGTERM');
      setTimeout(() => resolve('timeout'), 12000);
    });
    // Windows can't deliver SIGTERM to a child; it reports a forced kill (null) instead
    assert.ok(code === 0 || (process.platform === 'win32' && code === null), `exit code ${code}`);
  });

  // Without APP_TOKEN set, the API stays open (so current apps keep working until you add it)
  const open = startServer({ APP_TOKEN: '', RATE_LIMIT_PER_MIN: '100' });
  await open.ready();
  await check('no APP_TOKEN configured -> requests allowed, warning logged', async () => {
    assert.equal((await chat('hello', {})).status, 200);
    assert.match(open.logs(), /APP_TOKEN is not set/);
  });
  open.child.kill();
  fake.close();

  for (const [status, name] of results) console.log(`${status}  ${name}`);
  const failed = results.filter(([s]) => s === 'FAIL').length;
  console.log(`\n${results.length - failed}/${results.length} server checks passed`);
  process.exit(failed ? 1 : 0);
})();
