# 🌐 BridgeTalk

BridgeTalk is a travel companion for tourists anywhere in the world. It translates between 34 languages in four different "vibes", runs face-to-face conversations, explains photos of menus, signs, bills and medicines in your own language, and keeps an offline phrasebook and SOS card for when there's no signal. AI runs on [Groq](https://groq.com).

## 🚀 Features

- **Onboarding**: three swipeable intro screens, then "I speak ___" and "I'm travelling to ___". Both are saved and used as defaults on every screen, and can be changed in Settings.
- **Translate**: 34 languages (English, Hindi, Marathi, Gujarati, Bengali, Tamil, Telugu, Kannada, Malayalam, Punjabi, Urdu, Odia, Assamese, Spanish, French, German, Arabic, Chinese, Japanese, Korean, Portuguese, Russian, Italian, Turkish, Thai, Vietnamese, Indonesian, Dutch, Greek, Polish, Swahili, Hebrew, Malay, Filipino) with a searchable language picker and a swap button.
  - One request returns **all four vibes** at once, so switching vibes is instant.
  - Native-script translation plus a 🗣 romanised pronunciation.
  - 🔊 **Listen** (text-to-speech in the right locale), ⭐ **Save**, and 🖼️ **Share** as an image card with "Translated with BridgeTalk" at the bottom.
  - 💡 **Culture bite**: a short fun fact about the language or phrase.
  - 🗓️ **Phrase of the day** in your travel language, with a 🔥 daily streak.
- **Scan**: take or pick a photo and get it explained in the language you choose.
  - 💊 **Medicine**: what it is, dose *only as printed* (never guessed), expiry, warnings, plus a reminder to check with a doctor or pharmacist.
  - 📄 **Bill / Form**: amount, deadline, next steps, and alerts for penalties or possible scams.
  - 🪧 **Sign / Menu** and 🔍 **Anything**.
  - "Read it to me" voice playback, and tips for a better photo when the image is unreadable.
- **Talk**: face-to-face voice translator for a phone lying flat between two people. Each person gets their own half of the screen (the top half is upside down for the person opposite), taps the mic, speaks, and the other person hears and reads the translation in the chosen vibe. 💬 history keeps the whole conversation.
- **Phrasebook** (works offline): 40 essential phrases in 6 categories (Greetings, Food, Transport, Shopping, Hotel, Emergency) for 12 top travel languages (Spanish, French, Italian, German, Portuguese, Japanese, Chinese, Korean, Thai, Arabic, Turkish, Hindi). Each comes with pronunciation, 🔊 Listen, and a 📢 "Show to local" full-screen big-text mode.
- **🆘 SOS card**: a full-screen red card saying "I need help", "Please call an ambulance", your allergies and your hotel address in the local language. It works offline for the 12 phrasebook languages; other languages and your allergy list are translated once when you're online, then cached.
- **Saved & History**: star any translation and search your last 200 translations and conversations (starred ones are never dropped).
- **Haptics** on mic start/stop and successful translations; an offline banner; loading skeletons and empty states; accessibility labels on every button.
- **Proxy server** (`server/`) so the Groq API key never has to ship inside the app.

## 🎭 Vibes

| Vibe | Style | Example (English → Hindi, "I am very hungry") |
| --- | --- | --- |
| 🎩 Formal | Polite and respectful, with honorifics, for elders, officials and writing | मैं बहुत भूखा हूँ। |
| 😎 Casual | Relaxed, everyday talk with friends | मैं बहुत भूखा हूँ यार। |
| 🛺 Like a local | Real street slang and code-mixing (Hinglish, Bambaiya, Tanglish…), never offensive | यार, मैं बहुत hungry हूँ। |
| 🎬 Filmy | Dramatic Bollywood-dialogue style, family-friendly | मैं बहुत भूखा हूँ, जैसे महाकाव्य में लड़ता नायक! |

## 🔑 API key setup

The app reads two variables (see [.env.example](.env.example)). Set **one** of them.

### Option A: Proxy on Render (recommended for any build you share)

The key stays on the server; the app only knows the server's URL.

1. Push this repo to GitHub, then on [Render](https://render.com) create a **Web Service** from it.
2. Settings:
   - **Root directory:** `server`
   - **Build command:** `npm install`
   - **Start command:** `npm start`
   - **Environment variable:** `GROQ_API_KEY` = your Groq key
3. Once it's live, open `https://<your-service>.onrender.com/` and you should see `{"ok":true,...}`.
4. Point the app at it:
   ```
   EXPO_PUBLIC_API_URL=https://<your-service>.onrender.com
   ```

The proxy exposes `POST /api/chat/completions` and `POST /api/audio/transcriptions`, only allows the three models in [src/config.js](src/config.js), and limits each IP to 40 requests per minute.

> Render's free tier sleeps when idle, so the first request after a while can take ~30 seconds.

### Option B: Local `.env` (development only)

```bash
cp .env.example .env
```

Then set `EXPO_PUBLIC_GROQ_API_KEY=gsk_...` in `.env` and leave `EXPO_PUBLIC_API_URL` empty. `.env` is git-ignored.

> ⚠️ Every `EXPO_PUBLIC_*` value is baked into the app bundle, and anyone with the APK can extract it. Only use a direct key for local testing.

### Running the proxy locally

```bash
cd server
npm install
GROQ_API_KEY=gsk_... npm start
```

It listens on port 3000 (or `PORT`). On a real phone use your computer's LAN IP, e.g. `EXPO_PUBLIC_API_URL=http://192.168.1.10:3000`.

## 🧪 Tests & reliability

```bash
npm test
```

Jest covers `parseJSON` (fences, `<think>` tags, extra text, non-Latin scripts, invalid JSON), the friendly error messages, and the API fallback chain.

How the app stays usable when things go wrong:

- **JSON fallbacks:** if Groq's JSON mode rejects a reply, the app retries without JSON mode, then at temperature 0. In Talk, a plain-text translation is the last resort.
- **Network:** 30-second timeout, one automatic retry for drops, timeouts, cold starts and 5xx errors, and an offline banner.
- **Friendly errors:** screens never show raw API errors (see [src/errors.js](src/errors.js)); technical details go to the console.
- **Crash screen:** an `ErrorBoundary` shows a Restart screen instead of a blank app.
- **Double taps:** identical requests within 2 seconds share one call, and buttons are disabled while a request runs.

## 🛠️ Build & run

```bash
npm install
npx expo run:android          # build and run a dev client on a device/emulator
npx expo start                # start Metro for an existing dev client
```

The app uses native modules (expo-audio, @react-native-community/netinfo, AsyncStorage, expo-haptics, expo-sharing, react-native-view-shot, expo-speech, expo-image-picker, expo-image-manipulator), so it needs a **dev client or a real build**. Expo Go will not cover everything, and you must rebuild after adding native packages.

### Installable APK with EAS

```bash
npm install -g eas-cli
eas login
eas build --profile apk -p android
```

EAS builds in the cloud and does **not** upload your git-ignored `.env`. Give the build its variables in one of two ways: with `eas env:create` (environment variables on expo.dev), or by adding them to the `apk` profile in [eas.json](eas.json):

```json
"apk": {
  "android": { "buildType": "apk" },
  "distribution": "internal",
  "env": { "EXPO_PUBLIC_API_URL": "https://<your-service>.onrender.com" }
}
```

Use the proxy URL here, never a raw Groq key.

## 📁 Project structure

```
├── App.js                     # Providers + root stack: Onboarding / Landing → Home (tabs), SOS, Settings
├── app.json                   # Expo config (incl. camera/photos permission text)
├── eas.json                   # EAS build profiles (apk, development, …)
├── .env.example               # EXPO_PUBLIC_API_URL / EXPO_PUBLIC_GROQ_API_KEY
├── assets/                    # Icons, splash, Lottie landing animation
├── server/                    # Express proxy to Groq (deploy to Render)
│   ├── server.js
│   └── package.json
└── src/
    ├── index.js               # Bottom tabs: Translate, Talk, Scan, Phrases, Saved
    ├── landing.js             # Welcome screen
    ├── config.js              # Env vars + MODELS (text, speech, vision)
    ├── api.js                 # fetch client: chat, chatJSON, transcribe, askAboutImage
    ├── languages.js           # LANGUAGES and VIBES
    ├── translate.js           # translateAllVibes, translateOne
    ├── scan.js                # Scan modes + vision prompt
    ├── errors.js / json.js    # Friendly error messages, robust JSON parsing
    ├── prefs.js               # Saved languages, SOS details, streak (AsyncStorage)
    ├── history.js             # Saved & history, max 200 items (AsyncStorage)
    ├── phrasebook.js          # Offline phrasebook, phrase of the day, SOS text
    ├── data/phrasebook.json   # 40 phrases × 12 languages, bundled with the app
    ├── haptics.js
    ├── theme.js               # Colors, gradient, radii, spacing
    ├── components/
    │   ├── LanguagePicker.js  # Searchable bottom-sheet language picker
    │   ├── VibeChips.js, GradientButton.js, ActionButton.js
    │   ├── ShareCardModal.js  # Pretty image card (view-shot + expo-sharing)
    │   ├── ShowToLocalModal.js, PhraseOfTheDay.js
    │   ├── Skeleton.js, EmptyState.js
    │   └── ErrorBoundary.js, OfflineBanner.js
    ├── screens/
    │   ├── OnboardingScreen.js, TranslateScreen.js, TalkScreen.js, ScanScreen.js
    │   ├── PhrasebookScreen.js, SOSScreen.js, SavedScreen.js, ProfileScreen.js
    └── __tests__/             # Jest: parsing, errors, API fallbacks, travel logic, screen smoke tests
```

## 📦 Tech stack

React Native 0.79 · Expo SDK 53 · React Navigation (native stack + bottom tabs) · expo-audio · expo-speech · expo-image-picker · expo-image-manipulator · expo-haptics · expo-sharing · react-native-view-shot · AsyncStorage · NetInfo · Lottie · Groq (`openai/gpt-oss-120b`, `whisper-large-v3-turbo`, `qwen/qwen3.8-27b`) · Express + multer proxy

> AI output can be wrong. Always double-check medicine doses with a doctor or pharmacist, and important bills or forms with the issuer.
