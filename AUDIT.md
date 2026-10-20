# BridgeTalk production audit

Pre-release audit for a Google Play launch to ~50 users. Every file in `App.js`, `src/**`, `server/**`, `app.json`, `eas.json` and `package.json` was read; `npx expo-doctor` and `npx expo install --check` were run. No new features: problems only.

Severity: **critical** = blocks release or is a privacy/security problem · **high** = users will hit it · **medium** = real but rarer, or polish needed for a store release · **low** = minor.

## Issues

| ID | Severity | Where | Problem | Fix |
|---|---|---|---|---|
| C1 | critical | `app.json:7`, `:11`, `:20`; `assets/icon.png`, `adaptive-icon.png`, `splash-icon.png` | All three "PNG" files are really JPGs, and they're 736×552 instead of square (expo-doctor fails). The Play Store icon and the Android adaptive icon would be rejected or come out stretched. | Make real square 1024×1024 PNGs from the existing bubble artwork. |
| C2 | critical | `src/screens/TalkScreen.js:146` | Bottom tabs keep screens mounted, so switching tabs (or backgrounding the app) while recording **keeps the microphone recording** and speech playing. Cleanup only runs on unmount. This is a privacy problem. | Stop and discard the recording and speech on tab blur and when the app goes to the background. |
| C3 | critical | `src/config.js:3`; git history `4996fd2`, `9632c47` | Old Groq keys are in git history (the current tree is clean). Also, any build made while `EXPO_PUBLIC_GROQ_API_KEY` is set bakes that key into the APK. | Only read the direct key in development builds (`__DEV__`), so release bundles can never contain one. **You:** revoke the old keys in the Groq console (history can't be cleaned without a force-push). |
| H1 | high | `src/api.js:17` | The 30 s timeout is cleared once headers arrive; reading the body (`response.text()`) has no timeout, so a stalled response hangs forever. | Keep the AbortController timer running until the body has been read. |
| H2 | high | `src/screens/ProfileScreen.js:55`, `TranslateScreen.js:125`, `PhrasebookScreen.js`, `SavedScreen.js`, `components/LanguagePicker.js:51` | Edge-to-edge (on by default in SDK 53) disables Android's `adjustResize` (confirmed in the react-native-edge-to-edge README). The keyboard covers the hotel-address field, the Translate button and lower search results. Settings only avoids the keyboard on iOS. | Use `KeyboardAvoidingView` with `padding` on Android too, for every screen and sheet with an input; hide the tab bar while typing. |
| H3 | high | `src/screens/TalkScreen.js:171` | Recordings under 0.5 s are sent to Whisper (accidental taps cost an API call and return junk). There's no maximum, so a forgotten recording keeps growing. | Ignore recordings under 0.5 s, and auto-stop after 60 s. |
| H4 | high | `src/screens/TalkScreen.js:109` | A long translation in a Talk half has no scroll and overflows over the mic button. | Put the message area in a `ScrollView`. |
| H5 | high | `src/screens/TranslateScreen.js:139`, Settings inputs | No input length limit. A huge paste exceeds Groq's per-minute token budget and shows a misleading "busy" error. | `maxLength` 2,000 on Translate with a counter, a matching check in `translate.js` with a friendly "too long" message, and limits on the allergy and address fields. |
| H6 | high | `src/errors.js:52`, `src/api.js:93/130/142/178`, `src/translate.js:113/116`, `SOSScreen.js:76` | Logs run in production, and some include model output, i.e. the user's own text. | Route app logging through a dev-only logger (`__DEV__`). |
| H7 | high | `app.json:8`, `:13`, `:21` | `userInterfaceStyle: light` and a white splash on a dark app give a white flash at launch and light system dialogs. | Dark UI style; splash and adaptive-icon background `#0E0D14`. |
| H8 | high | `package.json` (expo-doctor) | `expo` 53.0.13 (expected ~53.0.27), `react-native` 0.79.4 (0.79.6), `expo-dev-client` 5.2.2 (~5.2.4); `@expo/config-plugins` and `@expo/metro-config` mismatched. | `npx expo install --fix`. |
| M1 | medium | `package.json` | Unused native packages: `react-native-linear-gradient`, `react-native-vector-icons`, `react-native-pager-view`, `react-native-reanimated`, `react-native-gesture-handler`; `@react-navigation/routers` is only a transitive dependency. They add APK size and native build surface. | Remove them. |
| M2 | medium | `app.json` (android) | The release manifest has `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE` and `SYSTEM_ALERT_WINDOW`, none of which are used. Play's review flags unneeded permissions. | `android.blockedPermissions`. |
| M3 | medium | `TalkScreen.js:160`, `ScanScreen.js:78` | If camera or microphone permission was permanently denied, the user is told to "allow it in Settings" with no way to get there. | Add an "Open Settings" action (`Linking.openSettings`). |
| M4 | medium | `src/screens/ScanScreen.js:20` | Nothing guarantees the upload is under 1 MB. | Re-compress (0.8, then 0.6, then 0.45) until it's under 1 MB. |
| M5 | medium | `ScanScreen.js:62`, `PhrasebookScreen.js:41`, `SavedScreen.js:40`, `TranslateScreen.js` | Speech only stops on unmount, which never happens in tabs, so Read-aloud and Listen keep talking after you leave the screen. | Stop speech on screen blur. |
| M6 | medium | `src/theme.js:86` and big-text styles | Fixed line heights of 1.3–1.4× are tight for scripts with tall marks (Tamil, Malayalam, Thai, Devanagari, Arabic); Android can clip the top line. | `scriptFont(text, weight, size)` returns a script-aware line height (1.6× for these scripts). |
| M7 | medium | `src/components/VibeChips.js:26` | On 360 px phones the grid label "Like a local" is cut off (one line). | Allow two lines in the grid. |
| M8 | medium | `src/prefs.js:36`, `src/history.js:39` | Corrupt or old saved data is trusted: a non-object gets spread into prefs, unknown language names are kept, history items without `id`, `at` or `translation` render as "NaN". | Sanitize prefs and history on load. |
| M9 | medium | `server/server.js:69`, `:93` | Upstream Groq calls have no timeout; a hung connection holds the request open. | `AbortSignal.timeout(28 s)`, returning a 504. |
| M10 | medium | `server/server.js:30` | 40 requests/min per IP. Mobile carriers put many users behind one IP (CGNAT), so 50 users could block each other. Groq's own limits are the real cap. | Raise to 120/min (configurable with `RATE_LIMIT_PER_MIN`). |
| M11 | medium | `src/screens/ScanScreen.js:20` | A photo that can't be decoded (corrupt or unusual format) shows a generic error instead of the "better photo" tips. | Wrap image-preparation failures so Scan shows the unreadable-photo message. |
| M12 | medium | `src/fonts.js` (found while verifying) | Importing from each Google Fonts package index bundles **every weight and italic**: 187 asset files, 36 MB of fonts in the APK. | Import only the 14 weights the app uses, from per-weight subpaths. |
| M13 | medium | `package.json` (found while testing) | After the dependency cleanup, `expo-asset` (required by `expo-font`) was only nested under `expo/`, so the font loader could not resolve it, which breaks the bundle. | Install `expo-asset` as a direct dependency. |
| L1 | low | `src/screens/TalkScreen.js:188` | The "too short" check rejects valid one-character answers in Chinese or Japanese (好, 是). | Count CJK characters as long enough. |
| L2 | low | `src/translate.js:136` | Plain-text reply cleanup is inline and untested. | Extract `cleanText()` and test it. |
| L3 | low | `src/screens/OnboardingScreen.js:55` | A double tap on "Let's go" calls `navigation.replace` twice. | Guard with a ref. |
| L4 | low | `eas.json:17` | `production` relies on the default build type. | Set `"buildType": "app-bundle"` explicitly (AAB for Play). |

## Checked and already OK

- **Crash screen:** an `ErrorBoundary` with a Restart screen wraps the whole app.
- **JSON parsing:** every `JSON.parse` is inside `try/catch` (`api.js:71`, `json.js`, `storage.js`).
- **API resilience:** every API call goes through one `request()` with a 30 s timeout, one retry for network, timeout, cold-start and 5xx errors, and short rate-limit waits.
- **JSON fallbacks:** `json_validate_failed` is retried without `response_format`, then at temperature 0, then as plain text (Talk).
- **Friendly errors:** every screen error goes through `friendlyMessage()`; no raw API text reaches the UI.
- **Double taps:** Translate, Scan and Talk ignore taps while a request runs (refs plus disabled buttons). Identical requests within 2 s share one call.
- **Talk basics:** only one person can record at a time, the audio mode is reset after errors, and the recorder hook releases on unmount.
- **Scan basics:** camera denial and cancel are handled, the unreadable-photo path exists, and images are resized to 1,400 px.
- **Navigation:** every modal handles Android back (`onRequestClose`), and the Home stack exits the app correctly.
- **Secrets:** no keys in tracked files, `.env` is git-ignored, and the server keeps the key server-side.
- **Builds:** `production` builds an AAB with `autoIncrement` versionCode (remote version source).

## Not fixed (accepted)

- **npm audit: 68 advisories in the app's `node_modules`.** All are in build and test tooling (Expo CLI, Metro, Jest, glob, braces, xmldom, node-forge) that runs on the developer's PC and is not part of the app bundle. `npm audit fix --force` would downgrade or break the Expo SDK. The server has **0** advisories.
- **Old keys in git history** (part of C3). They can only be removed by rewriting history and force-pushing; revoking them in the Groq console makes them useless, which is the real fix.

## Status

| ID | Fixed? | How it was verified |
|---|---|---|
| C1 | ✅ | expo-doctor 18/18 (it failed the icon/splash checks before); the files start with the PNG magic bytes `89504E47` and are 1024×1024 |
| C2 | ✅ | Test: start recording, navigate away → `recorder.stop`, `Speech.stop`, audio mode reset, nothing sent |
| C3 | ✅ code / ⚠️ you | `GROQ_API_KEY` is `__DEV__`-only; grep found 0 `gsk_` keys in tracked files and in the exported release bundle. **Revoke the old keys in the Groq console.** |
| H1 | ✅ | Test: headers arrive but the body never does → `timeout` after 30 s |
| H2 | ✅ | `KeyboardAvoidingView behavior="padding"` on Translate, Phrases, Saved, Settings and the language sheet; tab bar hides on keyboard. Needs a quick look on a phone. |
| H3 | ✅ | Test: a 0.2 s recording → stopped, nothing sent to Whisper; 60 s auto-stop timer |
| H4 | ✅ | Talk message area is now a `ScrollView` (code review; needs a quick look on a phone) |
| H5 | ✅ | Tests: `maxLength` 2000 on Translate (200/400 on the SOS fields); a 2,001-char input is rejected before any request with a friendly message |
| H6 | ✅ | grep: no direct `console.*` calls left in `src/`; all go through `devWarn`/`devError` (`__DEV__` only) |
| H7 | ✅ | `app.json`: `userInterfaceStyle: dark`, splash and adaptive-icon background `#0E0D14` |
| H8 | ✅ | `npx expo install --check`: "Dependencies are up to date"; expo-doctor 18/18 |
| M1 | ✅ | Removed 5 unused native packages and `@react-navigation/routers`; bundle exports, all tests pass |
| M2 | ✅ | `android.blockedPermissions` for READ/WRITE_EXTERNAL_STORAGE and SYSTEM_ALERT_WINDOW |
| M3 | ✅ | `permissionAlert()` offers "Open Settings" when Android won't ask again (Talk mic, Scan camera) |
| M4 | ✅ | Re-compress 0.8 → 0.6 → 0.45 until under 1 MB (`base64Bytes` unit-tested) |
| M5 | ✅ | `useOnLeave` stops speech on blur/background in Translate, Talk, Scan, Phrases and Saved |
| M6 | ✅ | `scriptFont(text, weight, size)` gives 1.6× line height for Indic, Thai, Arabic and Hebrew; unit-tested font choice. Needs a quick look on a phone. |
| M7 | ✅ | Grid labels may wrap to two lines |
| M8 | ✅ | Tests: corrupt prefs/history are sanitized; the app still opens with corrupt storage |
| M9 | ✅ | `AbortSignal.timeout(28 s)` → 504; `node --check` passes |
| M10 | ✅ | `RATE_LIMIT_PER_MIN` (default 120) |
| M11 | ✅ | Test: an image that can't be prepared shows the "couldn't read that photo" tips, with no API call |
| M12 | ✅ | Export assets went from 187 files / 36 MB to 67 files / 9.5 MB |
| M13 | ✅ | `expo-asset` is in `package.json`; the App render tests load fonts again |
| L1 | ✅ | Tests: 好 and 是 accepted; ".", "a" and "…" rejected |
| L2 | ✅ | `cleanText()` in `src/text.js`, 12 unit tests |
| L3 | ✅ | A ref guard on "Let's go" |
| L4 | ✅ | `eas.json` production: `"buildType": "app-bundle"` |

**Test suite:** 149 tests in 5 suites (`npx jest`), including Testing Library render tests for every screen and the disabled-while-loading checks.
