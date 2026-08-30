# Kana Flashcards

A flashcard app for learning Japanese Hiragana and Katakana. Pick a script, choose the kana groups
you want to drill, and answer randomized cards in either direction with immediate feedback.

It runs on **Android, iOS, and the Web from one codebase**, works **completely offline**, and has no
backend, no database, no account, no tracking, and no monetization of any kind.

**▶ Try it: <https://carlospena.com.br/kana-training/>**

Published from `master` by [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) on every
push. It installs as a PWA and keeps working with the network off. The config screen shows the exact
build it is running — e.g. `Version 0.1.2 (abc1234)` — so a bug report can name it.

> Because it is offline-first, a browser that has opened it before serves its cached copy first and
> picks up a new release on a later visit. To be certain you are on the newest build, open it in a
> private window and check the version against the latest commit.

## What it does

- **Hiragana and Katakana** — the full standard inventory: 46 main kana (including を and ん),
  25 dakuten/handakuten, and 36 combination kana. 107 per script, 214 in total.
- **Practice what you're studying** — select by group (あ row, が row, きゃ family…), across all
  three sections at once. Your selection carries over when you switch script.
- **Either direction** — Kana → Romaji, Romaji → Kana, or both mixed, randomized per card.
- **No repeats** — a kana appears at most once per quiz, whichever direction its card gets.
- **Feedback that teaches** — a wrong answer shows the question, what you typed, and the correct
  answer, and stays on screen until you move on. The results screen lists the kana you missed.

## Why this stack

`TypeScript + React + Vite`, wrapped by **Capacitor** for Android and iOS, and shipped on the web as
an installable offline PWA.

The whole product is text in and text out — no camera, no maps, no gesture-heavy canvas — so a DOM
app is a complete implementation of it rather than a compromise. That matters most for the one
genuinely hard requirement: answering *Romaji → Kana* means typing かな with the device's own
Japanese IME. A real platform `<input>` inside a WebView gets correct IME composition, text
selection, and screen-reader semantics for free on every target. Frameworks that render text into a
canvas have to re-implement all three.

The same build output serves all three platforms: the web build is already an offline-capable PWA,
and Capacitor loads those exact assets from the app bundle. The quiz engine is plain TypeScript with
no UI imports, so it is tested in milliseconds without a browser, a simulator, or a device.

The alternatives considered and why they were rejected are in
[specs/001-kana-flashcards/research.md](specs/001-kana-flashcards/research.md).

## Requirements

| Tool | Version | Needed for |
|------|---------|-----------|
| Node.js | 24 LTS | everything |
| npm | 11+ | everything |
| Android Studio + SDK 26+ | latest | Android build |
| Xcode 15+ (macOS only) | latest | iOS build |

## Running it locally

```bash
./run.sh             # dev server with hot reload
./run.sh preview     # production build + preview, service worker active
./run.sh test        # unit tests, then lint
./run.sh e2e         # browser tests
```

`run.sh` installs dependencies on first use and prints a LAN address alongside the localhost one,
so you can open the app on a phone on the same Wi-Fi — which is how to try kana input with a real
Japanese keyboard.

The service worker only runs in `preview`. Load the page once there, turn off Wi-Fi, and reload to
see the offline behavior.

Or drive npm directly:

```bash
cd app
npm install
npm run dev          # http://localhost:5173
npm run build && npm run preview   # http://localhost:4173
```

## Tests

```bash
npm test             # engine, dataset, and state — no browser, ~600ms
npm run test:e2e     # Playwright: keyboard pass, 320px reachability, axe WCAG audit
npm run lint         # ESLint + tsc --noEmit
```

`npm test` is the gate that matters day to day. It covers quiz generation (including a
1,000-quiz no-repetition property check), answer validation, scoring, the session state machine,
preference repair, and every dataset invariant.

## Building each target

**Web**

```bash
cd app && npm run build      # -> app/dist/, deploy to any static host
```

**Android**

```bash
cd app
npm run build
npx cap sync android
npx cap open android         # or: cd android && ./gradlew assembleRelease
```

**iOS** (macOS only)

```bash
cd app
npm run build
npx cap sync ios
npx cap open ios             # then Run / Archive in Xcode
```

`cap sync` copies the same `dist/` into the native shells — the native projects hold no application
logic of their own.

## Project layout

```text
app/src/
├── models/types.ts     Domain types
├── data/               The kana datasets and group definitions — no UI, no logic
├── engine/             Pure quiz logic: pool, generate, normalize, validate, score
├── state/              Reducer, context, and preference persistence
├── screens/            Configuration, Quiz, Results
└── components/         Flashcard, answer input, feedback, group toggles…

app/tests/              engine/ · data/ · state/ (Vitest) and e2e/ (Playwright)
app/scripts/            One-off maintenance: dataset verification, font subset, icons
specs/001-kana-flashcards/   Specification, plan, research, data model, contracts
```

## Notes on the data

Romaji uses modified Hepburn with three deliberate departures: **ぢ = `di`**, **づ = `du`**, and
**を = `wo`**. Strict Hepburn spells the first two `ji` and `zu`, colliding with じ and ず — which
would leave a *Romaji → Kana* prompt with two correct answers. These spellings keep the kana↔romaji
mapping one-to-one, so every card has exactly one right answer.

All 214 entries are verified against the Unicode Standard's own character names by
`app/scripts/verify-dataset.py`, which is also baked into the test suite as a golden reference.

## Payload

The production build is **202 KB over the wire**, of which 93 KB is the Noto Sans JP subset —
kana glyphs only, bundled so the app never depends on the fonts installed on the device.
