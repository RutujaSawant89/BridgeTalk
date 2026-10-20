import { useEffect, useState } from 'react';
import { API_URL } from './config';

// Render's free plan sleeps when idle and takes ~30-60 s to wake. This module pings the server
// when the app opens and tells the UI when a request is slow before the server has answered once.

const SLOW_MS = 5000;
const HEALTH_TIMEOUT_MS = 70000;

let warm = false; // the server has answered at least once this session
let slowCount = 0; // requests currently past SLOW_MS while the server isn't known to be warm
const listeners = new Set();

const notify = () => listeners.forEach((fn) => fn(slowCount > 0 && !warm));

export function markWarm() {
  if (warm) return;
  warm = true;
  notify();
}

// Wrap a request: if it is still running after 5 s and the server hasn't answered yet this
// session, the "Waking up the server…" banner shows until it settles.
export async function trackRequest(promise) {
  if (!API_URL || warm) return promise;
  let counted = false;
  const timer = setTimeout(() => {
    counted = true;
    slowCount++;
    notify();
  }, SLOW_MS);
  try {
    return await promise;
  } finally {
    clearTimeout(timer);
    if (counted) {
      slowCount--;
      notify();
    }
  }
}

// Fire-and-forget ping on app open, so the server is awake by the time it's needed.
export function warmUp() {
  if (!API_URL || warm) return Promise.resolve();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
  return trackRequest(fetch(`${API_URL.replace(/\/+$/, '')}/health`, { signal: controller.signal }))
    .then((r) => {
      if (r.ok) markWarm();
    })
    .catch(() => {})
    .finally(() => clearTimeout(timer));
}

export function useServerWaking() {
  const [waking, setWaking] = useState(slowCount > 0 && !warm);
  useEffect(() => {
    listeners.add(setWaking);
    return () => listeners.delete(setWaking);
  }, []);
  return waking;
}

// For tests
export function resetServerStatus() {
  warm = false;
  slowCount = 0;
  notify();
}
