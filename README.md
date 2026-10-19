# 🌐 BridgeTalk

BridgeTalk is an Expo / React Native app that translates between 24 Indian and world languages, in four different "vibes", and explains photos of medicines, bills, forms and signs in simple words in your own language. AI runs on [Groq](https://groq.com).

## 🚀 Features

- **Translate**: 24 languages (English, Hindi, Marathi, Gujarati, Bengali, Tamil, Telugu, Kannada, Malayalam, Punjabi, Urdu, Odia, Assamese, Spanish, French, German, Arabic, Chinese, Japanese, Korean, Portuguese, Russian, Italian, Turkish) with a searchable language picker and a swap button.
  - One request returns **all four vibes** at once, so switching vibes is instant.
  - Native-script translation plus a 🗣 romanised pronunciation.
  - 🔊 **Listen** (text-to-speech in the right locale) and 📤 **Share**.
  - 💡 **Culture bite**: a short fun fact about the language or phrase.
- **Scan**: take or pick a photo and get it explained in the language you choose.
  - 💊 **Medicine**: what it is, dose *only as printed* (never guessed), expiry, warnings, plus a reminder to check with a doctor or pharmacist.
  - 📄 **Bill / Form**: amount, deadline, next steps, and alerts for penalties or possible scams.
  - 🪧 **Sign / Menu** and 🔍 **Anything**.
  - "Read it to me" voice playback, and tips for a better photo when the image is unreadable.
- **Talk**: coming soon.
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

## 🛠️ Build & run

```bash
npm install
npx expo run:android          # build and run a dev client on a device/emulator
npx expo start                # start Metro for an existing dev client
```

The app uses native modules (expo-speech, expo-image-picker, expo-image-manipulator), so it needs a **dev client or a real build**. Expo Go will not cover everything, and you must rebuild after adding native packages.

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
├── App.js                     # Navigation root: Landing → Home (tabs)
├── app.json                   # Expo config (incl. camera/photos permission text)
├── eas.json                   # EAS build profiles (apk, development, …)
├── .env.example               # EXPO_PUBLIC_API_URL / EXPO_PUBLIC_GROQ_API_KEY
├── assets/                    # Icons, splash, Lottie landing animation
├── apk/                       # Prebuilt APK
├── server/                    # Express proxy to Groq (deploy to Render)
│   ├── server.js
│   └── package.json
└── src/
    ├── index.js               # Bottom tabs: Translate, Talk, Scan
    ├── landing.js             # Welcome screen
    ├── config.js              # Env vars + MODELS (text, speech, vision)
    ├── api.js                 # fetch client: chat, chatJSON, transcribe, askAboutImage
    ├── languages.js           # LANGUAGES and VIBES
    ├── translate.js           # translateAllVibes, translateOne
    ├── scan.js                # Scan modes + vision prompt
    ├── theme.js               # Colors, gradient, radii
    ├── components/
    │   ├── LanguagePicker.js  # Searchable bottom-sheet language picker
    │   ├── VibeChips.js
    │   └── GradientButton.js
    └── screens/
        ├── TranslateScreen.js
        ├── ScanScreen.js
        └── ComingSoonScreen.js
```

## 📦 Tech stack

React Native 0.79 · Expo SDK 53 · React Navigation (native stack + bottom tabs) · expo-speech · expo-image-picker · expo-image-manipulator · Lottie · Groq (`openai/gpt-oss-120b`, `whisper-large-v3-turbo`, `qwen/qwen3.8-27b`) · Express + multer proxy

> AI output can be wrong. Always double-check medicine doses with a doctor or pharmacist, and important bills or forms with the issuer.
