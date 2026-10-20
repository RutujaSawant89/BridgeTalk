jest.mock('../config', () => ({
  API_URL: 'https://proxy.test',
  APP_TOKEN: 'shared-token',
  GROQ_API_KEY: '',
  MODELS: { text: 'openai/gpt-oss-120b', speech: 'whisper-large-v3-turbo', vision: 'qwen/qwen3.8-27b' },
}));

import { renderHook, act } from '@testing-library/react-native';
import { chat } from '../api';
import { useServerWaking, warmUp, resetServerStatus } from '../serverStatus';

const reply = (content) => ({ ok: true, status: 200, text: async () => JSON.stringify({ choices: [{ message: { content } }] }) });

beforeEach(() => {
  resetServerStatus();
  global.fetch = jest.fn();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('app token', () => {
  it('sends X-App-Token to the proxy and never a Groq key', async () => {
    fetch.mockResolvedValueOnce(reply('hola'));
    await chat([{ role: 'user', content: 'hi' }]);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('https://proxy.test/api/chat/completions');
    expect(init.headers['X-App-Token']).toBe('shared-token');
    expect(init.headers.Authorization).toBeUndefined();
  });

  it('uses the server retry_after hint for rate limits', async () => {
    jest.useFakeTimers();
    fetch
      .mockResolvedValueOnce({ ok: false, status: 429, text: async () => JSON.stringify({ error: { message: 'Busy, try again in a moment.', retry_after: 3 } }) })
      .mockResolvedValueOnce(reply('hola'));
    const p = chat([{ role: 'user', content: 'hi' }]);
    await jest.advanceTimersByTimeAsync(3500);
    await expect(p).resolves.toBe('hola');
  });
});

describe('"Waking up the server…"', () => {
  it('shows once the first request has taken over 5 s, and clears when it answers', async () => {
    jest.useFakeTimers();
    let answer;
    fetch.mockImplementationOnce(() => new Promise((resolve) => (answer = resolve)));
    const { result } = renderHook(() => useServerWaking());
    const p = chat([{ role: 'user', content: 'hi' }]);

    await act(async () => jest.advanceTimersByTimeAsync(4000));
    expect(result.current).toBe(false); // not yet 5 s
    await act(async () => jest.advanceTimersByTimeAsync(1500));
    expect(result.current).toBe(true);

    await act(async () => answer(reply('hola')));
    await act(async () => p);
    expect(result.current).toBe(false);
  });

  it('does not show for slow requests once the server has answered (that is Groq, not a cold start)', async () => {
    jest.useFakeTimers();
    fetch.mockResolvedValueOnce(reply('first'));
    await chat([{ role: 'user', content: 'hi' }]);
    fetch.mockImplementationOnce(() => new Promise(() => {}));
    const { result } = renderHook(() => useServerWaking());
    chat([{ role: 'user', content: 'again' }]).catch(() => {});
    await act(async () => jest.advanceTimersByTimeAsync(6000));
    expect(result.current).toBe(false);
  });

  it('warmUp pings /health when the app opens', async () => {
    fetch.mockResolvedValueOnce({ ok: true, status: 200 });
    await warmUp();
    expect(fetch.mock.calls[0][0]).toBe('https://proxy.test/health');
    // after a successful ping the server is warm: later slow requests don't show the banner
    fetch.mockClear();
    await warmUp();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('warmUp never throws when the server is unreachable', async () => {
    fetch.mockRejectedValueOnce(new TypeError('Network request failed'));
    await expect(warmUp()).resolves.toBeUndefined();
  });
});
