# Publishing to Google Play

Everything in this folder is generated: `python3 scripts/make-store-assets.py` for the graphics,
and the screenshots come from a Playwright run documented below. Regenerate rather than edit.

## What you need before you start

| Thing | Notes |
|---|---|
| Play Console account | One-off **$25 USD** registration. Choose **personal** or **organisation** carefully — see the testing requirement below. |
| An upload key | You create it; it never leaves your machine. Losing it means you can never update the listing again. |
| A privacy policy URL | Required for every app, even one that collects nothing. A single static page is fine. |

### The requirement that catches people out

If you register a **personal** developer account, Google requires a **closed test with at least 12
testers who stay opted in for 14 continuous days** before you may apply for production access.
Twelve real Google accounts, opted in and staying opted in — the clock restarts if you drop below
twelve. **Organisation** accounts (which need a D-U-N-S number) are exempt.

Plan for this. It is usually the longest part of shipping a small app.

## 1. Create your upload key

```bash
keytool -genkeypair -v \
  -keystore ~/kana-flashcards-upload.jks \
  -alias upload -keyalg RSA -keysize 4096 -validity 10000
```

Then copy `android/keystore.properties.example` to `android/keystore.properties` and fill in the
path and passwords. That file is gitignored, as are `*.jks` and `*.keystore`.

Back up the `.jks` and its passwords somewhere you will still have them in five years. Google's
Play App Signing holds the *app* signing key, but the *upload* key is yours alone, and there is a
recovery process you do not want to need.

## 2. Build the bundle

Play requires an Android App Bundle, not an APK:

```bash
npm run android:aab
# -> android/app/build/outputs/bundle/release/app-release.aab
```

Bump `versionCode` (an integer, must increase every upload) and `versionName` in
`android/app/build.gradle` before each release.

## 3. Listing assets

| Asset | Requirement | Where |
|---|---|---|
| App icon | 512x512 PNG, no transparency, no rounded corners | `play-icon-512.png` |
| Feature graphic | 1024x500 PNG | `play-feature-graphic.png` |
| Phone screenshots | 2-8, 16:9 or 9:16, 320-3840px | `screenshots/` (4 provided) |

Regenerate the screenshots by re-adding `tests/e2e/_store.spec.ts` from git history, or capture
from a device with `adb exec-out screencap -p > shot.png`.

## 4. The forms

**Data safety** — this app makes it easy, and the manifest backs it up: it requests **no Android
permissions at all** (the `INTERNET` permission Capacitor adds by default is explicitly removed),
so it *cannot* reach the network even in principle.

- Does your app collect or share any user data? **No**
- Is all user data encrypted in transit? Not applicable — no data leaves the device
- Data deletion request mechanism? Not applicable
- The only stored value is a quiz preference in the WebView's local storage, on the device, never transmitted

**Content rating** — answer the questionnaire honestly; an educational flashcard app with no ads,
no purchases, no user content and no communication features rates **Everyone / PEGI 3**.

**Ads** — declare **no ads**.

**Target audience** — if you select an age band under 13 you opt into Families policy and extra
review. This app has no ads, no data collection and no external links, so it can qualify, but
choosing 13+ is the simpler path unless you specifically want the younger band.

**App access** — no login required; say so, or reviewers will ask.

## 5. Suggested listing copy

**App name** (30 chars max)

```
Kana Flashcards
```

**Short description** (80 chars max)

```
Learn Hiragana and Katakana. Works offline. No ads, no accounts, no tracking.
```

**Full description** (4000 chars max)

```
Kana Flashcards is a focused way to learn the two Japanese syllabaries: Hiragana and Katakana.

Choose what you want to practise, how many cards, and which direction you are tested in. Answer,
get told immediately whether you were right, and see exactly which kana you missed at the end.

WHAT YOU CAN PRACTISE
• The complete standard inventory — 46 main kana including を and ん, 25 dakuten and handakuten, and 36 combination kana
• Both scripts, organised identically, so a selection means the same thing in either
• Pick by group — the か row, the が row, the きゃ family — or select whole sections at once

HOW YOU ARE TESTED
• Kana to romaji, romaji to kana, or both mixed together
• 5 to 50 cards, or a custom number
• A kana never appears twice in the same quiz, whichever direction its card takes
• Optional three attempts per card: a wrong answer lets you try again instead of revealing the answer

WHAT YOU GET BACK
• Immediate feedback on every answer, with the correct answer shown and kept on screen
• Your score, accuracy, and a list of exactly the kana to review

BUILT TO STAY OUT OF YOUR WAY
• Works completely offline — every kana is bundled in the app
• No account, no sign-up, no cloud sync
• No ads, no purchases, no subscriptions
• No analytics and no tracking of any kind
• Requests no Android permissions whatsoever

Free, and free of everything else.
```

Note: *Romaji to kana* cards need a Japanese keyboard installed on the device. Kana to romaji
needs no special keyboard. Worth stating in the description so nobody is surprised.

## 6. Before you submit

- [ ] `versionCode` incremented
- [ ] Release build installed on a real device and opened once
- [ ] Privacy policy URL live and reachable
- [ ] Screenshots reflect the current UI
- [ ] `keystore.properties` and the `.jks` backed up off this machine
