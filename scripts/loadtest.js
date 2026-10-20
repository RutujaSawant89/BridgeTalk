#!/usr/bin/env node
// Load test for the BridgeTalk proxy.
//
//   node scripts/loadtest.js                       # live server
//   TARGET=http://localhost:3000 node scripts/loadtest.js
//   APP_TOKEN=... node scripts/loadtest.js         # when the server requires the app token
//   HEALTH_SECONDS=60 CHAT_SECONDS=30 node scripts/loadtest.js
//
// Phase 1: 50 concurrent connections on GET /health (server capacity, no Groq calls).
// Phase 2: 20 concurrent connections on POST /api/chat/completions with a short translation
//          (shows how the proxy's limits and Groq's quota behave under a burst).
//
// Every request is from one IP (this machine), so the proxy's per-IP limit applies to all of them:
// 429s are split into "proxy" (our own limiter) and "groq" (Groq's quota) to tell them apart.

const autocannon = require('autocannon');

const TARGET = (process.env.TARGET || 'https://bridgetalk-o0xs.onrender.com').replace(/\/+$/, '');
const APP_TOKEN = process.env.APP_TOKEN || '';
const HEALTH_SECONDS = Number(process.env.HEALTH_SECONDS) || 60;
const CHAT_SECONDS = Number(process.env.CHAT_SECONDS) || 30;

const chatBody = JSON.stringify({
  model: 'openai/gpt-oss-120b',
  reasoning_effort: 'low',
  temperature: 0.3,
  max_tokens: 60,
  messages: [
    { role: 'system', content: 'Translate the user text from English to Hindi. Reply with only the translation.' },
    { role: 'user', content: 'Where is the station?' },
  ],
});

// Runs one autocannon phase and counts responses by HTTP status.
function run(opts) {
  return new Promise((resolve, reject) => {
    const statuses = {};
    const times = []; // every response time, for exact percentiles (autocannon has no p95)
    const instance = autocannon(opts, (err, result) => (err ? reject(err) : resolve({ result, statuses, times })));
    instance.on('response', (client, statusCode, resBytes, responseTime) => {
      statuses[statusCode] = (statuses[statusCode] || 0) + 1;
      times.push(responseTime);
    });
  });
}

// autocannon doesn't hand us response bodies, so right after the chat phase (while the rate-limit
// window is still active) one sample request shows whose 429 it is.
async function classify429() {
  try {
    const r = await fetch(`${TARGET}/api/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(APP_TOKEN ? { 'X-App-Token': APP_TOKEN } : {}) },
      body: chatBody,
    });
    const text = await r.text();
    if (r.status !== 429) return `status ${r.status}`;
    if (/Too many requests|proxy_rate_limited/i.test(text)) return 'proxy rate limit (our server)';
    if (/groq_rate_limited|Rate limit reached|tokens per minute/i.test(text)) return 'Groq rate limit (tokens per minute)';
    return `429: ${text.slice(0, 120)}`;
  } catch (e) {
    return `request failed: ${e.message}`;
  }
}

const percentile = (sorted, p) => (sorted.length ? Math.round(sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))]) : null);

function summary(name, { result, statuses, times }) {
  const sorted = [...times].sort((a, b) => a - b);
  const total = Object.values(statuses).reduce((a, b) => a + b, 0) || result.requests.total;
  const ok = Object.entries(statuses).filter(([s]) => s.startsWith('2')).reduce((a, [, n]) => a + n, 0);
  const errors = result.errors + result.timeouts + (total - ok);
  return {
    phase: name,
    requests: total,
    'req/s': Math.round(result.requests.average),
    'p50 ms': percentile(sorted, 50),
    'p95 ms': percentile(sorted, 95),
    'max ms': sorted.length ? Math.round(sorted[sorted.length - 1]) : null,
    statuses: JSON.stringify(statuses),
    timeouts: result.timeouts,
    'error rate': `${((errors / Math.max(total, 1)) * 100).toFixed(1)}%`,
  };
}

(async () => {
  console.log(`Target: ${TARGET}`);
  console.log('Warming up (Render free plan may need ~60 s)…');
  const t = Date.now();
  try {
    const r = await fetch(`${TARGET}/health`);
    console.log(`  /health: HTTP ${r.status} after ${((Date.now() - t) / 1000).toFixed(1)} s`);
  } catch (e) {
    console.log(`  /health failed: ${e.message}`);
  }

  console.log(`\nPhase 1: 50 connections × ${HEALTH_SECONDS}s on GET /health`);
  const health = await run({ url: `${TARGET}/health`, connections: 50, duration: HEALTH_SECONDS, timeout: 30 });

  console.log(`Phase 2: 20 connections × ${CHAT_SECONDS}s on POST /api/chat/completions`);
  const chat = await run({
    url: `${TARGET}/api/chat/completions`,
    method: 'POST',
    connections: 20,
    duration: CHAT_SECONDS,
    timeout: 35,
    headers: { 'content-type': 'application/json', ...(APP_TOKEN ? { 'x-app-token': APP_TOKEN } : {}) },
    body: chatBody,
  });
  const why = chat.statuses[429] ? await classify429() : 'no 429s';

  console.table([summary('GET /health (50 conn)', health), summary('POST chat (20 conn)', chat)]);
  console.log(`429s in the chat phase come from: ${why}`);
})();
