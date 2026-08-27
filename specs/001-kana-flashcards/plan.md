# Implementation Plan: Kana Flashcards

**Branch**: `001-kana-flashcards` | **Date**: 2026-08-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-kana-flashcards/spec.md`

## Summary

A completely client-side flashcard app for learning Japanese Hiragana and Katakana, delivered to
Android, iOS, and Web from one codebase. The learner picks a script, ticks the kana groups they want
to drill, chooses a card count and quiz direction, and answers randomized non-repeating cards with
immediate feedback and an end-of-quiz score that names the kana they missed.

The technical approach is a web-first application — TypeScript, React, and Vite — wrapped by
Capacitor for Android and iOS, and served as an installable offline PWA on the web. All quiz
behavior lives in a pure TypeScript engine (`app/src/engine/`) with an injected random source, so
generation, validation, and scoring are testable with Vitest without rendering a component. The
bundled kana dataset (107 entries per script, 27 groups) is plain typed data separate from all UI.
There is no backend, no database, and no runtime network request of any kind.

## Technical Context

**Language/Version**: TypeScript 6.0.3, targeting ES2022; Node.js 24 LTS for the build toolchain only.
(TypeScript 7 is released but `typescript-eslint` still peers at `<6.1.0`, so adopting 7 would mean no
lint on `.ts` files at all. Revisit when that peer range opens.)

**Primary Dependencies**: React 19.2 + React DOM (UI), Vite 8 (build), Capacitor 8 (Android/iOS
shells), `vite-plugin-pwa` 1.3 (offline precache + install manifest). No router, no state-management
library, no UI kit, no HTTP client.

**Storage**: `localStorage` for last-used preferences only, behind a guarded wrapper. No database. The
app is fully functional when storage is absent, unreadable, or cleared (FR-037).

**Testing**: Vitest 4 for the engine and dataset (unit); Playwright + `@axe-core/playwright` for one
web smoke pass covering keyboard operation, small-viewport reachability, and the WCAG 2.1 AA audit
(SC-005, SC-009).

**Target Platform**: Android 8.0+ (API 26), iOS 15+, and evergreen browsers (Chrome/Edge 111+,
Firefox 115+, Safari 16.4+) as an installable PWA.

**Project Type**: Client-only cross-platform application — one web codebase, three delivery targets.

**Performance Goals**: Answer feedback rendered within 100 ms of submission (SC-004), measured in the
page and asserted by `tests/e2e/scenarios.spec.ts` — currently ~6 ms. No other performance target is
carried here: a goal with no success criterion and no test behind it is a wish, not a plan.

**Constraints**: Zero runtime network requests; total initial web payload ≤ 300 KB over the wire
including the subset Japanese font (actual: 203 KB, of which the font is 93 KB); complete offline operation after first load (FR-035, FR-035a); WCAG 2.1 AA;
44×44 pt minimum touch targets; no accounts, no telemetry, no monetization.

**Scale/Scope**: 3 screens, ~10 components, 214 kana entries (107 per script), 27 selectable groups,
1 learner per device, no concurrency and no multi-user state.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Gate | Initial | Post-Design |
|---|-----------|------|---------|-------------|
| I | Client-Only, Zero Infrastructure (NON-NEGOTIABLE) | No backend, database, API, auth, or monetization; dataset bundled; everything works offline; storage optional | PASS | PASS |
| II | One Codebase, Three Targets | Single codebase for all three targets; framework named and justified; no per-platform or per-script logic forks | PASS | PASS |
| III | Data Correctness Before Everything | Dataset separate from UI, fully attributed, standard inventory, one canonical romanization | PASS | PASS |
| IV | Headless, Deterministic Quiz Engine (NON-NEGOTIABLE) | Engine has no UI imports; one generator/normalizer/validator; sample-without-replacement; injectable randomness; required test coverage | PASS | PASS |
| V | Keep It Simple (KISS / YAGNI) | Three screens; no accounts/social/sync; simplest workable state mechanism; every dependency justified | PASS | PASS |

**Evidence for the initial gate**

- **I** — The only runtime I/O is a guarded `localStorage` read/write. The service worker precaches
  the app's own assets and never reaches the network at runtime. No analytics, no crash reporting, no
  ads, no purchases.
- **II** — Capacitor runs the identical web build inside a native shell on Android and iOS, so there
  is exactly one implementation of every screen and every rule. Framework choice and the alternatives
  rejected are recorded in [research.md](./research.md).
- **III** — `app/src/data/` holds typed kana records with no UI imports. Dataset tests assert the
  entry counts, group membership, and that the kana↔romaji mapping is one-to-one in both directions.
- **IV** — `app/src/engine/` is pure TypeScript that imports nothing from React. `generateQuiz`
  accepts an `rng` parameter so tests run against a seeded generator. Sampling is shuffle-then-take.
- **V** — Three screens, no router (History API directly), no state library (`useReducer` + context),
  and four runtime dependencies. Two build/dev dependencies needed judgment; both are recorded under
  Complexity Tracking.

**Re-evaluation after Phase 1 design**: All five gates still pass. The design added no service, no
persistence layer beyond the guarded preferences wrapper, and no cross-platform code fork. The engine
contract in [contracts/quiz-engine.md](./contracts/quiz-engine.md) is expressed entirely in plain
functions over plain data, which is what keeps Principle IV enforceable rather than aspirational.

## Project Structure

### Documentation (this feature)

```text
specs/001-kana-flashcards/
├── plan.md              # This file (/speckit-plan command output)
├── spec.md              # Feature specification (/speckit-specify + /speckit-clarify)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── kana-dataset.md
│   ├── quiz-engine.md
│   └── preferences.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
app/                              # The entire application — one codebase, three targets
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts                # Vite + React + vite-plugin-pwa (precache, manifest)
├── vitest.config.ts
├── playwright.config.ts
├── capacitor.config.ts
├── public/
│   ├── icons/                    # PWA icons (generated by scripts/make-icons.py)
│   └── manifest.webmanifest      # Generated by vite-plugin-pwa
├── src/
│   ├── main.tsx                  # Entry point; mounts App
│   ├── App.tsx                   # Screen switch + History API back handling
│   ├── models/
│   │   └── types.ts              # Kana, KanaGroup, QuizConfiguration, QuizQuestion, QuizSession
│   ├── data/
│   │   ├── groups.ts             # 27 group definitions, shared by both scripts
│   │   ├── hiragana.ts           # 107 entries
│   │   ├── katakana.ts           # 107 entries
│   │   └── index.ts              # Lookup helpers (pool building only — no quiz logic)
│   ├── engine/                   # Pure TypeScript. No React imports. Principle IV.
│   │   ├── rng.ts                # mulberry32 seeded generator + default Math.random source
│   │   ├── pool.ts               # Selected groups → unique kana pool
│   │   ├── generate.ts           # Shuffle-then-take, direction assignment
│   │   ├── normalize.ts          # Single answer-normalization function
│   │   ├── validate.ts           # Single answer-comparison function
│   │   └── score.ts              # Correct/incorrect/accuracy, missed-kana list
│   ├── state/
│   │   ├── quizReducer.ts        # Session state machine (configuring → active → complete)
│   │   ├── QuizContext.tsx       # useReducer + context provider
│   │   └── preferences.ts        # Guarded localStorage load/save
│   ├── screens/
│   │   ├── ConfigScreen.tsx
│   │   ├── QuizScreen.tsx
│   │   └── ResultsScreen.tsx
│   ├── components/
│   │   ├── SegmentedControl.tsx  # Script chooser, direction chooser
│   │   ├── GroupSection.tsx      # Main / Dakuten / Combination with select-all
│   │   ├── GroupToggle.tsx
│   │   ├── CardCountPicker.tsx   # Presets + custom, with max enforcement
│   │   ├── Flashcard.tsx
│   │   ├── AnswerInput.tsx       # Enter-to-submit, IME-safe composition handling
│   │   ├── FeedbackPanel.tsx
│   │   └── ProgressBar.tsx
│   ├── styles/
│   │   ├── tokens.css            # Colors, spacing, type scale; light + dark
│   │   └── global.css
│   └── assets/fonts/
│       └── noto-sans-jp-kana.woff2   # Committed kana subset (93 KB)
├── scripts/                      # One-off maintenance, not part of any build
│   ├── verify-dataset.py         # Checks both datasets against Unicode character names
│   ├── fetch-font.py             # Regenerates the kana font subset
│   └── make-icons.py             # PWA icons + Android mipmaps + iOS app icon
├── tests/
│   ├── engine/                   # generate, normalize, validate, score, pool, purity
│   ├── data/                     # dataset integrity, plus the Unicode golden reference
│   ├── state/                    # reducer transitions and preference repair
│   └── e2e/                      # Playwright: quiz flows, offline, keyboard, axe audit
├── android/                      # Generated by `npx cap add android` — committed
└── ios/                          # Generated by `npx cap add ios` — committed
```

**Structure Decision**: A single `app/` directory at the repository root holds the whole application;
`android/` and `ios/` inside it are Capacitor-generated native shells that load the same built web
assets, so no application logic exists outside `app/src/`. This is the template's single-project
option, adapted: `models/` + `data/` + `engine/` are the data-and-logic layers, `screens/` +
`components/` are UI, and `tests/` mirrors the source layout. The existing `kana_training/` Python
package at the repository root is unrelated to the application — it holds the authoring prompts — and
is left untouched. The empty `src/` and `my-project/` directories at the root are leftovers from
scaffolding and are not used by this plan.

## Complexity Tracking

> Both rows below are dependency additions weighed against Principle V (Keep It Simple). Neither is a
> principle violation; they are recorded because each was a judgment call that a reviewer should be
> able to challenge.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| `vite-plugin-pwa` (build dependency) | FR-035a requires the web build to work offline after the browser is closed and to be installable to the home screen. That needs a service worker and a web manifest. | A hand-written service worker is fewer dependencies but more code we must keep correct — precache manifest generation, cache versioning, and update prompts are exactly the parts that silently break offline support. The plugin generates them from the build output. |
| Playwright + `@axe-core/playwright` (dev dependencies) | SC-005 and SC-009 are acceptance criteria: every screen keyboard-operable, nothing unreachable at 320 px, and an automated WCAG 2.1 AA audit with no critical violations. | Manual checking does not satisfy "automated audit" and regresses silently. These are dev-only, never shipped, and cover three success criteria with one small test file. |
