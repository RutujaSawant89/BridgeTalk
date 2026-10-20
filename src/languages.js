// whisper: ISO-639-1 code for Whisper speech-to-text (null = Whisper can't transcribe it)
// tts: BCP-47 locale for text-to-speech
export const LANGUAGES = [
  { name: 'English', native: 'English', whisper: 'en', tts: 'en-US', flag: '🇺🇸' },
  { name: 'Hindi', native: 'हिन्दी', whisper: 'hi', tts: 'hi-IN', flag: '🇮🇳' },
  { name: 'Marathi', native: 'मराठी', whisper: 'mr', tts: 'mr-IN', flag: '🇮🇳' },
  { name: 'Gujarati', native: 'ગુજરાતી', whisper: 'gu', tts: 'gu-IN', flag: '🇮🇳' },
  { name: 'Bengali', native: 'বাংলা', whisper: 'bn', tts: 'bn-IN', flag: '🇮🇳' },
  { name: 'Tamil', native: 'தமிழ்', whisper: 'ta', tts: 'ta-IN', flag: '🇮🇳' },
  { name: 'Telugu', native: 'తెలుగు', whisper: 'te', tts: 'te-IN', flag: '🇮🇳' },
  { name: 'Kannada', native: 'ಕನ್ನಡ', whisper: 'kn', tts: 'kn-IN', flag: '🇮🇳' },
  { name: 'Malayalam', native: 'മലയാളം', whisper: 'ml', tts: 'ml-IN', flag: '🇮🇳' },
  { name: 'Punjabi', native: 'ਪੰਜਾਬੀ', whisper: 'pa', tts: 'pa-IN', flag: '🇮🇳' },
  { name: 'Urdu', native: 'اردو', whisper: 'ur', tts: 'ur-PK', flag: '🇵🇰' },
  { name: 'Odia', native: 'ଓଡ଼ିଆ', whisper: null, tts: 'or-IN', flag: '🇮🇳' },
  { name: 'Assamese', native: 'অসমীয়া', whisper: 'as', tts: 'as-IN', flag: '🇮🇳' },
  { name: 'Spanish', native: 'Español', whisper: 'es', tts: 'es-ES', flag: '🇪🇸' },
  { name: 'French', native: 'Français', whisper: 'fr', tts: 'fr-FR', flag: '🇫🇷' },
  { name: 'German', native: 'Deutsch', whisper: 'de', tts: 'de-DE', flag: '🇩🇪' },
  { name: 'Arabic', native: 'العربية', whisper: 'ar', tts: 'ar-SA', flag: '🇸🇦' },
  { name: 'Chinese', native: '中文', whisper: 'zh', tts: 'zh-CN', flag: '🇨🇳' },
  { name: 'Japanese', native: '日本語', whisper: 'ja', tts: 'ja-JP', flag: '🇯🇵' },
  { name: 'Korean', native: '한국어', whisper: 'ko', tts: 'ko-KR', flag: '🇰🇷' },
  { name: 'Portuguese', native: 'Português', whisper: 'pt', tts: 'pt-BR', flag: '🇧🇷' },
  { name: 'Russian', native: 'Русский', whisper: 'ru', tts: 'ru-RU', flag: '🇷🇺' },
  { name: 'Italian', native: 'Italiano', whisper: 'it', tts: 'it-IT', flag: '🇮🇹' },
  { name: 'Turkish', native: 'Türkçe', whisper: 'tr', tts: 'tr-TR', flag: '🇹🇷' },
  { name: 'Thai', native: 'ไทย', whisper: 'th', tts: 'th-TH', flag: '🇹🇭' },
  { name: 'Vietnamese', native: 'Tiếng Việt', whisper: 'vi', tts: 'vi-VN', flag: '🇻🇳' },
  { name: 'Indonesian', native: 'Bahasa Indonesia', whisper: 'id', tts: 'id-ID', flag: '🇮🇩' },
  { name: 'Dutch', native: 'Nederlands', whisper: 'nl', tts: 'nl-NL', flag: '🇳🇱' },
  { name: 'Greek', native: 'Ελληνικά', whisper: 'el', tts: 'el-GR', flag: '🇬🇷' },
  { name: 'Polish', native: 'Polski', whisper: 'pl', tts: 'pl-PL', flag: '🇵🇱' },
  { name: 'Swahili', native: 'Kiswahili', whisper: 'sw', tts: 'sw-KE', flag: '🇰🇪' },
  { name: 'Hebrew', native: 'עברית', whisper: 'he', tts: 'he-IL', flag: '🇮🇱' },
  { name: 'Malay', native: 'Bahasa Melayu', whisper: 'ms', tts: 'ms-MY', flag: '🇲🇾' },
  // Whisper calls Filipino by its base language, Tagalog
  { name: 'Filipino', native: 'Filipino', whisper: 'tl', tts: 'fil-PH', flag: '🇵🇭' },
];

export const getLanguage = (name) => LANGUAGES.find((l) => l.name === name);

export const VIBES = [
  {
    id: 'formal',
    label: 'Formal',
    emoji: '🎩',
    color: '#5029FB',
    instruction:
      'Polite, respectful and grammatically correct, as used with elders, officials or in writing. Use honorific forms where the language has them (e.g. "aap" in Hindi).',
  },
  {
    id: 'casual',
    label: 'Casual',
    emoji: '😎',
    color: '#1FB57A',
    instruction:
      'Relaxed, everyday conversational tone, as spoken with friends. Natural contractions and informal pronouns where appropriate.',
  },
  {
    id: 'local',
    label: 'Like a local',
    emoji: '🛺',
    color: '#F2A93B',
    instruction:
      'Sound like a real local on the street: use genuine regional slang and the code-mixing people actually speak (e.g. Hinglish, Bambaiya, Tanglish, Manglish), mixing in common English words the way locals do. Keep it friendly and never offensive, vulgar or abusive.',
  },
  {
    id: 'filmy',
    label: 'Filmy',
    emoji: '🎬',
    color: '#E5486D',
    instruction:
      'Dramatic, over-the-top Bollywood-dialogue style, as if delivered by a movie hero with full emotion and flair. Keep it family-friendly and keep the original meaning recognisable.',
  },
];
