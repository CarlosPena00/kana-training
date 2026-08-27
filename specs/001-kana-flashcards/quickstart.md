# Quickstart & Validation Guide: Kana Flashcards

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-08-27

How to run the app, run its tests, build all three targets, and verify by hand that the acceptance
criteria hold. The `app/` directory is created during implementation (`/speckit-tasks` →
`/speckit-implement`); this guide describes the project as planned.

---

## Prerequisites

| Tool | Version | Needed for |
|------|---------|-----------|
| Node.js | 24 LTS (verified locally: 24.19.0) | Everything |
| npm | 11+ (verified locally: 11.17.0) | Everything |
| Android Studio | Latest, with SDK 26+ | Android build only |
| Xcode | 15+, macOS only | iOS build only |
| CocoaPods | Latest | iOS build only |

Nothing else. No database, no server, no account, no API key — there is nothing to configure.

---

## Setup

```bash
cd app
npm install
```

---

## Run locally (web)

```bash
npm run dev            # Vite dev server, http://localhost:5173
```

The service worker is disabled in dev. To exercise the real offline behavior, build and preview:

```bash
npm run build
npm run preview        # serves dist/ with the service worker active
```

---

## Tests

```bash
npm test               # Vitest: engine + dataset (fast, no browser)
npm run test:watch     # Vitest in watch mode
npm run test:e2e       # Playwright: keyboard pass, 320px viewport, axe WCAG audit
```

`npm test` is the gate that matters day to day — it is the engine and dataset suite described in
[contracts/quiz-engine.md](./contracts/quiz-engine.md) and
[contracts/kana-dataset.md](./contracts/kana-dataset.md), and it runs without a browser.

---

## Build for each target

**Web (PWA)**

```bash
npm run build          # → app/dist/, including manifest.webmanifest and the service worker
```

Deploy `dist/` to any static host. There is no server component to deploy alongside it.

**Android**

```bash
npm run build
npx cap sync android
npx cap open android   # then Run, or: cd android && ./gradlew assembleRelease
```

**iOS** (macOS only)

```bash
npm run build
npx cap sync ios
npx cap open ios       # then Run / Archive in Xcode
```

`cap sync` copies the same `dist/` into the native shells — the native projects contain no application
logic of their own.

---

## Regenerating assets (rare)

Both the font subset and the icons are committed, so a normal build never needs these.

```bash
cd app
python3 scripts/verify-dataset.py   # check both datasets against Unicode character names
python3 scripts/fetch-font.py       # rebuild the kana font subset (~93 KB)
python3 scripts/make-icons.py       # PWA icons, Android mipmaps, iOS app icon (needs Pillow)
```

Run `fetch-font.py` after a dataset change that adds characters outside the current subset, then
confirm the payload still fits the budget in [plan.md](./plan.md).

## Manual validation scenarios

Each scenario maps to the user stories and success criteria in the spec. Run them against
`npm run preview` (so the service worker is live), then repeat 1–4 on a phone.

### V1 — Core loop (User Story 1, SC-001, SC-004)

1. Open the app cold. Without changing anything, press **Start Quiz**.
2. **Expect**: Hiragana, main kana, 10 cards, mixed direction — a card is on screen within seconds.
3. Answer one card correctly.
   **Expect**: "Correct", the kana↔romaji mapping shown, feedback appearing instantly.
4. Answer one card wrongly.
   **Expect**: "Incorrect", plus the prompt, your answer, and the correct answer — all still visible
   until you press Continue.
5. Finish all 10.
   **Expect**: results with correct count, incorrect count, accuracy, and a list of exactly the kana
   you missed. Get a perfect score once and confirm no missed-kana list appears at all.

### V2 — Custom practice set (User Story 2)

1. Select only `main.ka` and `main.sa`. **Expect**: the screen reports 10 unique kana.
2. Try to start a 20-card quiz. **Expect**: blocked, with a message naming 10 as the maximum.
3. Deselect everything. **Expect**: starting is blocked with a message asking for at least one kana.
4. Start a 10-card quiz. **Expect**: every card is from か or さ — no others, none repeated.
5. Press **All Main Kana**, start, and confirm ん and を can appear (clarification 2026-08-27).

### V3 — Script switching keeps the selection (FR-009a)

1. In Hiragana, select `main.ka` and `main.sa`.
2. Switch to Katakana. **Expect**: カ and サ still selected — the selection carried over.
3. Start a quiz. **Expect**: only Katakana characters appear.

### V4 — Direction (User Story 3)

1. Run one quiz in each direction setting.
2. **Expect**: Kana → Romaji shows only kana prompts; Romaji → Kana shows only romaji prompts; Both
   mixes them within a single quiz and still never repeats a kana.
3. In Both mode, confirm a kana that appeared as a kana prompt never returns as a romaji prompt.

### V5 — Validation and edge cases

| Do this | Expect |
|---------|--------|
| Answer `A` for あ | Correct |
| Answer `  a  ` for あ | Correct |
| Submit an empty answer | Nothing happens — no advance, no score change |
| Press Enter with an answer typed | Submits, exactly as the button does |
| Answer `si` for し | Incorrect; correct answer shown as `shi` |
| Answer a Hiragana character to a Katakana prompt | Incorrect |
| Select one group of 3 kana and run a 1-card quiz | Runs and completes normally |

### V6 — Offline and installability (FR-035a, SC-006)

1. Load the app once, then turn on airplane mode.
2. Fully close the browser and reopen the app.
   **Expect**: the whole experience loads and a complete quiz can be run offline.
3. **Expect**: the browser offers to install the app; installed, it launches in its own window.
4. Repeat on the Android build with the device in airplane mode.

### V7 — Interruption and persistence (User Story 4, FR-037, FR-038)

1. Start a quiz, then press browser back (or the Android back gesture).
   **Expect**: you land on the configuration screen intact — no half-rendered quiz.
2. Finish a quiz and press **Practice Again**.
   **Expect**: same configuration, freshly shuffled cards, score reset.
3. Change the configuration, start a quiz, close the app, reopen it.
   **Expect**: your last-used settings are shown.
4. Clear site data and reopen. **Expect**: defaults, no error.

### V9 — Three attempts per card (User Story 5, FR-043 – FR-047)

1. On the configuration screen, tick **Allow 3 attempts per card**.
2. Start a quiz and answer a card wrongly.
   **Expect**: "Not quite", the answer you gave struck through, and "2 attempts left" — with the
   correct answer nowhere on screen, and the input cleared and refocused on the same card.
3. Answer wrongly again, then correctly.
   **Expect**: "✓ Correct" plus "On the third attempt — ⅓ point". The running tally counts it as
   correct, not as a miss.
4. On the next card, answer wrongly three times.
   **Expect**: the correct answer is revealed exactly as it is in one-attempt mode, with
   "All 3 attempts used".
5. While a card is still open with attempts left, check the tally.
   **Expect**: it counts as neither ✓ nor ✕ yet.
6. Finish the quiz.
   **Expect**: the score reads in points (e.g. `5 / 10 points`), accuracy is derived from those
   points, and a breakdown shows how many cards were solved on each try.
7. Turn the toggle back off and run a quiz.
   **Expect**: a wrong answer reveals the correct answer immediately, and the score reads
   `n / total correct` exactly as before.

### V8 — Reach and accessibility (SC-005, SC-009)

1. At a 320 px-wide viewport with the on-screen keyboard open, confirm the prompt, the input, and the
   submit control are all visible and reachable.
2. Complete a full quiz using only the keyboard, with visible focus at every step.
3. `npm run test:e2e` — **expect** zero critical axe violations.
4. Raise the OS text size to its largest setting and confirm nothing is clipped or overlapped.

---

## Definition of done for this feature

- `npm test` passes, including every obligation listed in the two data/engine contracts.
- `npm run test:e2e` passes with no critical accessibility violations.
- V1–V9 pass on web, and V1–V4 plus V6 pass on at least one physical mobile target.
- `npm run build` output stays within the 300 KB gzipped budget.
- No file in `app/src/engine/` imports React, a screen, or a component.
