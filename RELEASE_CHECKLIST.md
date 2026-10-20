# BridgeTalk release checklist (Google Play, ~50 users)

Tick these off in order. Anything marked **(you)** needs your accounts or a decision; everything else is already done in the repo.

## 0. Before the first release build

- [ ] **(you)** Generate the shared app token on your PC (keep the output private):
  ```bash
  node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
  ```
- [ ] **(you)** Give it to EAS builds, as a *sensitive* variable, so it never goes into git:
  ```bash
  eas env:create --name EXPO_PUBLIC_APP_TOKEN --value <token> --environment production --visibility sensitive
  eas env:create --name EXPO_PUBLIC_APP_TOKEN --value <token> --environment preview --visibility sensitive
  eas env:create --name EXPO_PUBLIC_APP_TOKEN --value <token> --environment development --visibility sensitive
  ```
  Also add `EXPO_PUBLIC_APP_TOKEN=<token>` to your local `.env` (it's git-ignored).
- [ ] **(you)** Turn the check on in Render: **Environment → add `APP_TOKEN` = the same token → Save**. Do this *after* the build with the token is installed on your phone. The server accepts requests without a token until `APP_TOKEN` is set, so the order matters only if older builds should keep working.
  > The token is inside the APK, so it stops casual misuse of the URL but isn't a true secret. The per-IP (30/min) and global (300/min) limits and the model allowlist are what protect your Groq quota.
- [x] **Report offensive AI output** (required by Play's AI-generated content policy): a flag button on every Translate result, Talk history bubble and Scan result opens a sheet (Offensive / Wrong translation / Other, plus an optional note) that sends to `POST /api/report`. Review reports in the Render log by searching for `"level":"report"`. Mention this feature in the Play Console AI-content questions.
- [ ] **(you, recommended)** Upgrade Render to a paid instance (Starter) so the server doesn't sleep. On the free plan, the first request after ~15 idle minutes waits 30–60 s (the app now shows "Waking up the server…").
- [ ] **(you, recommended)** Move Groq to the Dev tier before inviting testers. The free tier's per-minute limits are shared by every user (see the load test below).

## 1. Build the release (AAB)

```bash
eas build --profile production -p android
```

- The `production` profile builds an **Android App Bundle (.aab)** (`eas.json`).
- **versionCode** is managed by EAS (`appVersionSource: remote`, `autoIncrement: true`), so every production build gets a higher versionCode automatically. Check it with `eas build:version:get -p android`.
- **version** (`1.0.0` in `app.json`) is what users see. Bump it for each public update (`1.0.1`, `1.1.0`, …).
- Upload the `.aab` in Play Console, or use `eas submit -p android --latest` after creating the app once by hand.

## 2. Play Console: app content

### Privacy policy URL (required)
Host a short page (GitHub Pages, a public Google Doc or Notion) and paste its URL in **App content → Privacy policy**. It must say:
- **What's sent off the phone:** text you translate, voice recordings (Talk), photos (Scan), and your allergy list (only when the SOS card translates it). These go to the BridgeTalk server and Groq, only to produce the translation or explanation.
- **What's kept:** nothing is stored on the server, and logs hold no user text, **except reports**: when you tap Report, the reported AI result, the reason, the language pair and your optional note are logged so they can be reviewed. Your own input, IP address and identifiers are not. History, saved items and settings (languages, allergies, hotel address) stay **on the phone** and can be deleted in the app (Settings → Clear history, or by uninstalling).
- **What there isn't:** no accounts, ads, analytics or tracking.
- **Who to contact:** your email address.

### Data safety form
| Question | Answer |
|---|---|
| Does the app collect or share user data? | **Yes** (collected; sent to a service provider to process) |
| Encrypted in transit? | **Yes** (HTTPS) |
| Can users request deletion? | Data isn't stored on servers; on-device data is deleted in the app or by uninstalling |
| **Audio → Voice or sound recordings** | Collected · processed ephemerally · optional · purpose: App functionality |
| **Photos and videos → Photos** | Collected · processed ephemerally · optional · App functionality |
| **App activity → Other user-generated content** (typed text) | Collected · processed ephemerally · optional · App functionality |
| **Health and fitness → Health info** (allergies, SOS card) | Collected · processed ephemerally · optional · App functionality |
| Location, contacts, financial info, identifiers | **Not collected** |
| Shared with third parties? | **No** (Groq processes data on your behalf as a service provider, which Play doesn't count as "sharing") |

### Content rating questionnaire
Category **Utility / Productivity / Communication / Other**. No violence, sexual content, gambling or drugs. Users don't interact with each other, share content publicly or share their location. The app contains AI-generated content (answer what the form asks about it). Expected rating: **Everyone / PEGI 3**.

### Other declarations
- **Target audience:** 13+ or 18+ (not designed for children; avoids the Families policy).
- **Ads:** No ads.
- **Permissions:** camera and microphone only. Storage and overlay permissions are blocked in `app.json`. No special declarations are needed.

## 3. Store listing

| Asset | Spec | Status |
|---|---|---|
| App name | ≤ 30 chars | **BridgeTalk: Travel Translator** |
| Short description | ≤ 80 chars | **Translate, talk and scan in 34 languages, with an offline phrasebook and SOS card.** |
| Full description | ≤ 4,000 chars | Draft below |
| App icon | 512×512 PNG | ✅ `store-assets/icon-512.png` |
| Feature graphic | 1024×500 PNG/JPG | ✅ `store-assets/feature-graphic.png` (check you like it) |
| Phone screenshots | 2–8, 9:16, ≥ 1080 px tall | **(you)** take 8 on your phone: Translate (result with vibes), Talk (both halves), Scan (a menu result), Phrases, Show to local, SOS card, Saved, Onboarding |

**Full description (draft):**

> BridgeTalk is your travel companion for talking to anyone, anywhere.
>
> 🌐 TRANSLATE WITH A VIBE: 34 languages, each translation in four styles: formal, casual, like a local (real slang and code-mixing like Hinglish) and filmy, plus pronunciation so you can say it right.
> 🎙️ TALK FACE TO FACE: put the phone between you and a local. Each person taps a mic and BridgeTalk speaks the translation out loud.
> 📷 SCAN AND UNDERSTAND: point the camera at a menu, sign, bill or medicine and get it explained in your own language, in simple words.
> 📖 OFFLINE PHRASEBOOK: 40 essential phrases in 12 top travel languages, with no internet needed. Show them full-screen to a local.
> 🆘 SOS CARD: "I need help", "Call an ambulance", your allergies and your hotel address in the local language.
> ⭐ SAVED AND HISTORY: keep the phrases you need, plus a phrase of the day.
>
> No account, no ads. Your history stays on your phone.
>
> AI translations can be wrong. Always confirm medicine doses with a doctor or pharmacist.

## 4. Closed testing (required for new personal developer accounts)

New personal Play Console accounts must run a **closed test with at least 12 testers, opted in for 14 days in a row**, before they can apply for production access.

- [ ] **(you)** Play Console → Testing → **Closed testing** → create a track and upload the `.aab`.
- [ ] **(you)** Add testers with a Google Group or an email list. Invite 15–20 people, since some won't opt in.
- [ ] **(you)** Share the opt-in link. Each tester must accept **and install** the app.
- [ ] **(you)** Keep at least 12 testers opted in for **14 continuous days**. Ask them to use it a few times; Google asks about tester engagement.
- [ ] **(you)** After day 14: Dashboard → **Apply for production**, then answer the questionnaire (what you tested, the feedback you got, what changed).

## 5. Manual test script

Run this on a real phone before each release. Languages: **Hindi** (Devanagari), **Tamil** (tall Indic script), **Arabic** (right to left), **Japanese** (CJK), **Spanish** (Latin). For each screen, test every language in **Normal**; test **Offline**, **Slow** and **Permission denied** once each in any one language.

- **Offline:** airplane mode.
- **Slow:** Developer options → network throttling, or a weak signal.
- **Permission denied:** deny the camera or microphone, then deny with "Don't ask again".

| Screen | Normal (5 languages) | Offline | Slow network | Permission denied |
|---|---|---|---|---|
| **Onboarding** (Settings → Show the intro again) | Swipe 3 slides, pick languages, "Let's go" | Works | Works | n/a |
| **Translate** | All 4 vibes appear; switching vibes is instant; Listen speaks the right language; Save; Share image; text isn't clipped; 2,000-character limit | Offline banner; friendly error on Translate | "Waking up the server…" on a cold start; result arrives | n/a |
| **Talk** | Each mic records and translates; the other mic is disabled while one records; a quick tap (< 0.5 s) is ignored; long text scrolls; switching tab mid-recording stops the mic | Friendly error | Busy state, then result | Mic denied → explanation; "Don't ask again" → **Open Settings** works |
| **Scan** | Menu, sign, bill and medicine photos; "Read it to me"; the medicine note appears | Friendly error | "Busy right now, trying again in N s…" | Camera denied → can still use Gallery; **Open Settings** works |
| **Phrases** | Switch languages and categories; search; Listen; Show to local | **Works fully** | Works | n/a |
| **SOS** | Lines in the local language; allergies and address shown; Read aloud | **Works** for the 12 phrasebook languages | Translates other languages, then caches | n/a |
| **Saved** | Starred items; search; delete; share | Works | Works | n/a |
| **Settings** | Change languages (other screens follow); allergies and address save; the keyboard never covers the fields | Works | Works | n/a |
| **Android back** | Closes sheets and modals first, then goes back; exits from Home | | | |
| **Small phone** (360 px wide) | Vibe grid labels readable; nothing cut off | | | |

## 6. Server: load test results

See `scripts/loadtest.js` (`node scripts/loadtest.js`). Results from the live server are below.

**Run on 2026-10-20 against the live Render server running 1.2.0, from one machine (one IP).** `APP_TOKEN` wasn't active on the server yet, so no token was needed. Re-run any time with `node scripts/loadtest.js` (add `APP_TOKEN=<token>` once the check is on).

| Test | Requests | Throughput | p50 | p95 | Max | Result |
|---|---|---|---|---|---|---|
| 50 connections × 60 s, `GET /health` | 10,310 | 172 req/s | 282 ms | 329 ms | 1.35 s | **all 200, 0% errors, 0 timeouts** |
| 20 connections × 30 s, chat | 1,556 | 52 req/s | 284 ms | 749 ms | 2.97 s | 37 × 200, 1,519 × 429 from the **proxy's per-IP limit** (by design: one IP), 0 timeouts |
| 10 translations spaced 3 s apart | 10 | n/a | **638 ms** | **1.10 s** | 1.10 s | 10/10 OK |
| Local 1.2.0 + fake Groq, 50 conn `/health` | 3,600 / 5 s | 720 req/s | 55 ms | n/a | 317 ms | 0 errors |

**What it means for ~50 users**

- **The server isn't the bottleneck.** The free Render instance handled 172 req/s at 50 concurrent connections with no timeouts and no crashes. Most of the 280 ms is the network round trip to Render's region.
- **Groq's free tier is the limit for real users.** In this test every request came from one IP, so the proxy's 30/min per-IP limit stopped the burst first (friendly 429 JSON, no crashes). With real users on different IPs, the cap is Groq's account-wide free tier for `openai/gpt-oss-120b`: about 30 requests/min and 8,000 tokens/min shared by everyone. An earlier run against the old server hit exactly that ceiling.
- **A real translation takes about 0.6 s (p50) to 1.3 s (p95)** when not rate-limited.
- **Cold start:** after about 15 idle minutes the first request waits 30–60 s. The app now pings `/health` on launch and shows "Waking up the server…".

**What to change**

1. **Upgrade Groq to the Dev tier** before testers arrive. This is the one change that matters: it raises the limits from tens to thousands of requests per minute. On the free tier, 50 active users at the same moment would mostly see "BridgeTalk is busy right now".
2. **Render Starter (paid)** removes cold starts (and gives more CPU). Optional for a 14-day closed test, recommended for production.
3. Keep **30/min per IP**. If testers on the same mobile carrier report "busy" errors, raise `RATE_LIMIT_PER_MIN` in Render.
