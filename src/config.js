// Values come from .env (see .env.example). Expo inlines EXPO_PUBLIC_* vars at build time.
export const API_URL = process.env.EXPO_PUBLIC_API_URL || '';
// Shared token the proxy checks (APP_TOKEN on the server). It ships inside the app, so it keeps
// casual strangers out but isn't a secret: the server's rate limits are the real protection.
export const APP_TOKEN = process.env.EXPO_PUBLIC_APP_TOKEN || '';
// A direct Groq key is for local development only. In release builds this is always empty (and the
// minifier drops the env value entirely), so a key can never ship inside an APK.
export const GROQ_API_KEY = __DEV__ ? process.env.EXPO_PUBLIC_GROQ_API_KEY || '' : '';

export const MODELS = {
  text: 'openai/gpt-oss-120b',
  speech: 'whisper-large-v3-turbo',
  vision: 'qwen/qwen3.8-27b',
};
