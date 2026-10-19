// Values come from .env (see .env.example). Expo inlines EXPO_PUBLIC_* vars at build time.
export const API_URL = process.env.EXPO_PUBLIC_API_URL || '';
export const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY || '';

export const MODELS = {
  text: 'openai/gpt-oss-120b',
  speech: 'whisper-large-v3-turbo',
  vision: 'qwen/qwen3.8-27b',
};
