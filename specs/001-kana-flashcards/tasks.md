---

description: "Task list for Kana Flashcards implementation"
---

# Tasks: Kana Flashcards

**Input**: Design documents from `/specs/001-kana-flashcards/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/)

**Tests**: Test tasks ARE included. Constitution Principle IV (NON-NEGOTIABLE) requires the quiz engine
to ship with tests, and [contracts/quiz-engine.md](./contracts/quiz-engine.md) enumerates the
obligations. Engine and dataset tests are written before the code they cover.

**Organization**: Tasks are grouped by user story so each story can be implemented, tested, and demoed
on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Paths are repository-relative; all application code lives under `app/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Stand up the one codebase that serves all three targets, and prove it reaches all three
before any feature work begins.

- [X] T001 Scaffold the Vite + React + TypeScript project in `app/` (`app/index.html`, `app/package.json`, `app/src/main.tsx`, `app/src/App.tsx`) and create the empty directory skeleton `app/src/{models,data,engine,state,screens,components,styles,assets/fonts}` and `app/tests/{engine,data,e2e}` per plan.md
- [X] T002 Install pinned dependencies in `app/package.json`: runtime `react@19.2`, `react-dom@19.2`, `@capacitor/core@8.5`; dev `vite@8.2`, `typescript@7.0`, `@vitejs/plugin-react`, `vitest@4.1`, `vite-plugin-pwa@1.3`, `@capacitor/cli@8.5`, `@capacitor/android@8.5`, `@capacitor/ios@8.5`, `@playwright/test`, `@axe-core/playwright`
- [X] T003 [P] Configure TypeScript strict mode in `app/tsconfig.json` (`strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `exactOptionalPropertyTypes`) — Constitution Development Workflow requires strong typing with justified escape hatches
- [X] T004 [P] Configure Vite and the PWA plugin in `app/vite.config.ts`: React plugin, `vite-plugin-pwa` in `generateSW` mode precaching all build assets, `manifest.webmanifest` with `display: standalone`, and service-worker registration skipped under Capacitor (research.md D2)
- [X] T005 [P] Configure Vitest in `app/vitest.config.ts` (node environment, `app/tests/engine` and `app/tests/data` included, `app/tests/e2e` excluded)
- [X] T006 [P] Configure Playwright in `app/playwright.config.ts` to run against `npm run preview`, with a 320 px-wide mobile project and a desktop project
- [X] T007 [P] Configure ESLint and Prettier in `app/eslint.config.js`, including a `no-restricted-imports` rule that forbids anything under `app/src/engine/` from importing `react`, `../screens`, `../components`, or `../state` — this is Constitution Principle IV enforced by tooling rather than by review
- [X] T008 [P] Add npm scripts to `app/package.json`: `dev`, `build`, `preview`, `test`, `test:watch`, `test:e2e`, `lint`
- [X] T009 [P] Generate and commit the kana font subset at `app/src/assets/fonts/noto-sans-jp-kana.woff2` using the `pyftsubset` command in quickstart.md (kana blocks + Basic Latin, ~20 KB)
- [X] T010 Initialize Capacitor: create `app/capacitor.config.ts` (appId, appName, `webDir: 'dist'`), then run `npx cap add android` and `npx cap add ios`
- [ ] T011 Smoke-verify the empty scaffold builds and launches on all three targets (`npm run build`, `npx cap sync`, run on an Android emulator and an iOS simulator) — this de-risks the Capacitor decision in research.md D1 before any feature code exists — **partial**: web builds and runs; `npx cap sync` succeeds for both native shells. Launching on an emulator/simulator was not possible in this environment (no Android SDK, and iOS needs macOS).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The dataset, the pure quiz engine, and the session state machine. Every user story
depends on these.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Data layer

- [X] T012 [P] Define core types in `app/src/models/types.ts`: `Script`, `Direction`, `DirectionSetting`, `GroupId`, `Section`, `Kana`, `KanaGroup`, `QuizConfiguration`, `QuizQuestion`, `AnswerRecord`, `QuizSession`, `SessionScore`, `ValidationResult` per data-model.md
- [X] T013 [P] Define all 27 groups in `app/src/data/groups.ts` (10 `main.*`, 5 `dakuten.*`, 12 `combo.*`) with per-script labels and display order per data-model.md
- [X] T014 [P] Write the 107 Hiragana entries in `app/src/data/hiragana.ts`, declared literally, with the canonical romaji from contracts/kana-dataset.md (`di` for ぢ, `du` for づ, `wo` for を)
- [X] T015 [P] Write the 107 Katakana entries in `app/src/data/katakana.ts`, declared literally — never derived from Hiragana by code-point arithmetic (contracts/kana-dataset.md)
- [X] T016 Add lookup helpers `kanaForScript` and `groupsForSection` in `app/src/data/index.ts` (depends on T013, T014, T015 — no quiz logic here)
- [X] T017 Write dataset invariant tests in `app/tests/data/dataset.test.ts` covering all 14 invariants in contracts/kana-dataset.md, especially #6 (romaji unique within a script) and #13 (`main.wa` = わ/を/ん)

### Quiz engine — tests first (Constitution Principle IV)

> Write these tests before the modules they cover and confirm they fail.

- [X] T018 [P] Write `app/tests/engine/normalize.test.ts`: trims ASCII and full-width `U+3000` whitespace, lowercases, NFC-normalizes, leaves internal spacing alone, `isBlank` catches `''`/`'   '`/`'　'`
- [X] T019 [P] Write `app/tests/engine/pool.test.ts`: pool contains only selected groups, unknown ids ignored without throwing, duplicates collapse, empty selection yields `[]`, and every `validateConfiguration` failure code fires with `poolSize` attached
- [X] T020 [P] Write `app/tests/engine/validate.test.ts`: `a` === `A`, `" a "` === `a`, NFC-decomposed kana matches, `si` rejected for `shi`, a Hiragana answer rejected for a Katakana prompt
- [X] T021 [P] Write `app/tests/engine/generate.test.ts`: exact card count, no kana repeats across ≥1,000 generated quizzes in all three direction settings, only selected kana appear, per-card direction independence in `both`, `cardCount > poolSize` throws, a 1-kana pool yields a valid 1-card quiz, same seed ⇒ identical output
- [X] T022 [P] Write `app/tests/engine/score.test.ts`: counts, accuracy rounded to a whole percent, `missedKana` in appearance order, `[]` on a perfect run
- [X] T023 [P] Write `app/tests/engine/purity.test.ts`: no file under `app/src/engine/` imports React, a screen, a component, or state

### Quiz engine — implementation

- [X] T024 [P] Implement `app/src/engine/rng.ts`: `Rng` type, default `Math.random` source, and a ~6-line seeded `mulberry32` for tests (research.md D5)
- [X] T025 [P] Implement `app/src/engine/normalize.ts`: `normalizeAnswer` and `isBlank` — the single normalization point for both the learner's input and the expected answer
- [X] T026 Implement `app/src/engine/pool.ts`: `buildPool` and `validateConfiguration` returning the typed `ValidationResult` (depends on T016)
- [X] T027 Implement `app/src/engine/validate.ts`: `checkAnswer` as one comparison serving both scripts and both directions (depends on T025)
- [X] T028 Implement `app/src/engine/generate.ts`: `generateQuiz(config, rng)` — validate, Fisher–Yates shuffle a copy of the pool, `slice(0, cardCount)`, assign per-card direction, derive `prompt`/`expectedAnswer` (depends on T024, T026)
- [X] T029 [P] Implement `app/src/engine/score.ts`: `scoreSession` deriving counts, accuracy, and `missedKana` from the answer records
- [X] T030 Run `npm test` and confirm every engine and dataset test from T017–T023 now passes

### State and shared UI

- [X] T031 [P] Write `app/tests/engine/reducer.test.ts` for the session state machine: every transition in data-model.md, blank submissions changing nothing, answered questions not re-answerable, abandon discarding the session
- [X] T032 Implement `app/src/state/quizReducer.ts`: the `configuring → active → awaiting-continue → complete` machine, refusing to start on a failed `validateConfiguration` (depends on T026, T028)
- [X] T033 Implement `app/src/state/QuizContext.tsx`: `useReducer` provider plus typed hooks — no state library (research.md D6)
- [X] T034 [P] Create `app/src/styles/tokens.css` (color, spacing, and type-scale tokens for light and dark, WCAG 2.1 AA contrast) and `app/src/styles/global.css` with the `@font-face` for the kana subset and a fallback stack
- [X] T035 [P] Implement the shared `app/src/components/SegmentedControl.tsx` primitive (keyboard-operable, 44×44 pt targets) — used by the script chooser in US2 and the direction chooser in US3, so neither story depends on the other
- [X] T036 Implement the `app/src/App.tsx` shell: render by session status, push one History API entry when a quiz starts, and handle `popstate` to leave a quiz — one handler covering browser back and the Android back gesture (FR-038, research.md D6)

**Checkpoint**: The engine is proven correct headlessly. User story work can begin.

---

## Phase 3: User Story 1 - Practice kana and learn from immediate feedback (Priority: P1) 🎯 MVP

**Goal**: A learner can start a quiz with the default configuration, answer every card, see explicit
feedback on each answer, and finish on a results screen that names the kana they missed.

**Independent Test**: Launch the app, press Start without changing anything, complete all 10 cards, and
confirm feedback on every answer plus a results screen — no configuration screen required.

- [X] T037 [P] [US1] Implement `app/src/components/Flashcard.tsx`: the prompt as the dominant visual element, large kana, scalable text (FR-020)
- [X] T038 [P] [US1] Implement `app/src/components/ProgressBar.tsx` showing `current / total` plus a progress indicator (FR-019, FR-032)
- [X] T039 [P] [US1] Implement `app/src/components/AnswerInput.tsx`: a single text input, Enter-to-submit, IME-safe composition handling so an in-progress kana conversion is never submitted early (FR-021, FR-022)
- [X] T040 [P] [US1] Implement `app/src/components/FeedbackPanel.tsx`: "Correct" with the kana↔romaji mapping; "Incorrect" with the prompt, the learner's answer as typed, and the correct answer — persisting until the learner continues (FR-029, FR-030, FR-031)
- [X] T041 [US1] Implement `app/src/screens/QuizScreen.tsx` wiring the components to the reducer: submit rejects blanks without advancing or scoring, answered cards cannot be re-answered, Continue advances or completes (FR-023, FR-024, depends on T037–T040)
- [X] T042 [US1] Implement `app/src/screens/ResultsScreen.tsx`: score, accuracy percentage, correct and incorrect counts, the missed-kana list with correct answers, and the list omitted entirely on a perfect run (FR-033, FR-033a)
- [X] T043 [US1] Add a minimal start placeholder in `app/src/screens/` that starts a quiz from `DEFAULT_CONFIGURATION` (Hiragana, all main kana, 10 cards, both directions) — replaced by the real configuration screen in US2 — **superseded**: the real ConfigScreen (T048) was built directly, so no throwaway placeholder was needed.
- [X] T044 [US1] Run quickstart.md scenario V1 and the relevant rows of V5 (uppercase, surrounding whitespace, empty answer, Enter key) on the web build — **automated** in `app/tests/e2e/quiz.spec.ts` and `scenarios.spec.ts` (V5 case/whitespace/empty/Enter rows).

**Checkpoint**: A complete, demoable learning app. This is the MVP.

---

## Phase 4: User Story 2 - Build a custom practice set (Priority: P2)

**Goal**: A learner can choose the script, tick exactly the groups they want, see how many unique kana
that is, pick a card count, and be stopped from starting an impossible quiz.

**Independent Test**: Select only か and さ in Hiragana, confirm the screen reports 10 unique kana, and
run a quiz whose every card comes from those two groups and nowhere else.

- [X] T045 [P] [US2] Implement `app/src/components/GroupToggle.tsx`: a selectable group tile showing its representative kana for the current script, 44×44 pt minimum, keyboard-operable with a visible focus state
- [X] T046 [US2] Implement `app/src/components/GroupSection.tsx`: a titled section (Main / Dakuten / Combination) with a select-all control reflecting all/none/partial state (FR-009, depends on T045)
- [X] T047 [P] [US2] Implement `app/src/components/CardCountPicker.tsx`: presets 5/10/20/30/50 plus a custom whole-number entry, with values above the current pool size unavailable rather than silently clamped (FR-011)
- [X] T048 [US2] Implement `app/src/screens/ConfigScreen.tsx` replacing the T043 placeholder: script chooser via `SegmentedControl` defaulting to Hiragana, the three group sections, the live unique-kana count, and the card-count picker (FR-007, FR-008, FR-010)
- [X] T049 [US2] Wire selection state in `app/src/state/quizReducer.ts` and `app/src/screens/ConfigScreen.tsx` so group selections are shared across scripts — switching script keeps the selection and re-renders the same groups in the other script (FR-009a)
- [X] T050 [US2] Block invalid starts in `app/src/screens/ConfigScreen.tsx` using `validateConfiguration`, surfacing a message that names the maximum for `CARD_COUNT_EXCEEDS_POOL` and asks for at least one kana for `NO_KANA_SELECTED` (FR-012, FR-013)
- [X] T051 [US2] Run quickstart.md scenarios V2 and V3 — **automated** in `app/tests/e2e/scenarios.spec.ts` (V2) and `quiz.spec.ts` (V3 script-switch).

**Checkpoint**: Targeted practice works; US1 still works unchanged.

---

## Phase 5: User Story 3 - Choose which way to be tested (Priority: P3)

**Goal**: A learner can be tested kana → romaji, romaji → kana, or both, with both as the default.

**Independent Test**: Run one quiz in each of the three settings and confirm the prompts match; in
Both, confirm directions vary per card and no kana appears twice under either direction.

- [X] T052 [US3] Add the direction chooser to `app/src/screens/ConfigScreen.tsx` using the shared `SegmentedControl` from T035, defaulting to Both (FR-014)
- [X] T053 [US3] Confirm `app/src/screens/QuizScreen.tsx` and `app/src/components/Flashcard.tsx` render romaji prompts and kana prompts identically well — the prompt is a string either way, with no direction-specific branch in the component (Constitution Principle II: no duplicated logic)
- [X] T054 [US3] Run quickstart.md scenario V4, including the cross-direction no-repetition check in Both mode — **automated** in `app/tests/e2e/scenarios.spec.ts` (V4), with cross-direction non-repetition also covered by the 1,000-quiz property test.

**Checkpoint**: All three directions work; US1 and US2 unaffected.

---

## Phase 6: User Story 4 - Repeat practice without reconfiguring (Priority: P4)

**Goal**: Finishing a quiz offers an immediate rerun with the same settings, and reopening the app
restores the last-used configuration.

**Independent Test**: Finish a quiz, press Practice Again and get the same configuration with freshly
shuffled cards; then reopen the app and find the configuration screen as you left it.

- [X] T055 [P] [US4] Write `app/tests/engine/preferences.test.ts` covering all 10 cases in contracts/preferences.md, including a throwing accessor on both read and write
- [X] T056 [US4] Implement `app/src/state/preferences.ts`: `DEFAULT_CONFIGURATION`, `loadPreferences` with `try/catch` and field-by-field repair (unknown group ids dropped, `cardCount` clamped to the current pool), `savePreferences` and `clearPreferences` that never throw (FR-037)
- [X] T057 [US4] Add Practice Again and Back to Home to `app/src/screens/ResultsScreen.tsx` — Practice Again reuses the stored configuration and regenerates the questions (FR-034)
- [X] T058 [US4] Load preferences on boot in `app/src/App.tsx` into `app/src/screens/ConfigScreen.tsx`, and call `savePreferences` when a quiz starts — never on every keystroke (contracts/preferences.md)
- [X] T059 [US4] Run quickstart.md scenario V7, including the cleared-storage case — **automated** in `app/tests/e2e/scenarios.spec.ts` (V7), including the cleared-storage case.

**Checkpoint**: All four user stories are independently functional.

---

## Phase 8: User Story 5 - Get another try before seeing the answer (Priority: P3)

**Goal**: An optional three attempts per card, with the answer stayed hidden until the last one is
spent, and partial credit for a later save.

**Independent Test**: Turn the toggle on, miss twice and land it on the third try, and confirm the
answer was never shown in between and the card scored ⅓ of a point.

**Added after the original plan**, on request. Delivered together rather than one task at a time.

- [X] T071 [US5] Add `AttemptsAllowed`, `attemptsAllowed` on `QuizConfiguration`, and per-question `submissions` on `AnswerRecord` in `app/src/models/types.ts`
- [X] T072 [US5] Implement partial credit in `app/src/engine/score.ts`: `pointsFor` (1 / attempts used), `isResolved`, points-based accuracy, and the `byAttempt` breakdown
- [X] T073 [US5] Extend `app/tests/engine/score.test.ts` for 1 / ½ / ⅓ credit, never-correct cards, the one-attempt equivalence, and cards still open for retries
- [X] T074 [US5] Handle retries in `app/src/state/quizReducer.ts`: accumulate submissions into one record per card, stay `active` while attempts remain, add the `set-attempts` action
- [X] T075 [US5] Extend `app/tests/state/reducer.test.ts` with the retry transitions, including blanks not spending an attempt and each card getting a fresh set
- [X] T076 [US5] Implement `app/src/components/RetryNotice.tsx` — wrong answer, attempts remaining, nothing revealed
- [X] T077 [US5] Show the attempt used and its credit in `app/src/components/FeedbackPanel.tsx`
- [X] T078 [US5] Add the "Allow 3 attempts per card" toggle to `app/src/screens/ConfigScreen.tsx`, off by default
- [X] T079 [US5] Wire the retry state into `app/src/screens/QuizScreen.tsx`, remounting `AnswerInput` per attempt so the field clears within the render rather than after it
- [X] T080 [US5] Show points, points-derived accuracy, and the per-attempt breakdown in `app/src/screens/ResultsScreen.tsx`
- [X] T081 [US5] Persist and repair `attemptsAllowed` in `app/src/state/preferences.ts`, with tests
- [X] T082 [US5] Add quickstart scenario V9 to `app/tests/e2e/scenarios.spec.ts`, covering both the three-attempt flow and the unchanged one-attempt default

**Checkpoint**: All five user stories work; the one-attempt default is unchanged.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: The requirements that span every screen — offline delivery, reach, accessibility, and the
build instructions the project owes its users.

- [X] T060 [P] Make all three screens in `app/src/screens/` responsive per FR-039 via `app/src/styles/global.css`: phone portrait down to 320 px, tablet, and desktop web with the flashcard centered rather than stretched
- [X] T061 [P] Accessibility pass across `app/src/screens/` and `app/src/components/`, with contrast tokens in `app/src/styles/tokens.css`: WCAG 2.1 AA contrast, text scaling, visible focus, semantic labels, 44×44 pt targets (FR-040, FR-041, FR-042)
- [X] T062 Write `app/tests/e2e/accessibility.spec.ts`: a full quiz completed by keyboard alone, the 320 px viewport check with the on-screen keyboard open, and an `@axe-core/playwright` audit asserting zero critical violations (SC-005, SC-009)
- [X] T063 Verify offline and installability on the web build: load once, go offline, fully close and reopen the browser, complete a quiz, and install to the home screen (FR-035a, SC-006, quickstart V6) — **automated**: offline reload after the service worker takes control, plus manifest `display`, name, and all icon URLs served. The physical home-screen install gesture still needs a device.
- [X] T083 Generate the Android launcher mipmaps and the iOS app icon in `app/scripts/make-icons.py`, replacing Capacitor's placeholder logo — verified for adaptive-icon safe zone and iOS opacity
- [X] T084 Measure SC-004 in `app/tests/e2e/scenarios.spec.ts`, timing submission to feedback inside the page (~6 ms against a 100 ms budget)
- [X] T085 Reconcile `plan.md`, `research.md`, and `quickstart.md` with what was actually built (TypeScript version, font size, test layout, maintenance scripts), and restate the untestable half of FR-017 in `spec.md`
- [ ] T064 Verify the app on physical Android and iOS builds: quickstart V1–V4 and V6, including answering Romaji → Kana cards with the system Japanese keyboard (FR-021) and leaving a quiz with the Android back gesture (FR-038) — **blocked here**: requires physical devices or an emulator/simulator; neither is available in this environment.
- [X] T065 [P] Check the production payload in `app/dist/` against the ≤ 300 KB gzipped budget from plan.md and record the actual figure in `README.md`
- [X] T066 [P] Confirm no runtime network request is made in any state — serve `app/dist/` via `npm run preview` and inspect the network panel across a full session with the service worker active (Constitution Principle I, FR-035)
- [X] T067 [P] Write `README.md` with the framework rationale from research.md D1 and the run/build instructions for web, Android, and iOS (project deliverables 13 and 14, Constitution Development Workflow)
- [X] T068 [P] Update `.gitignore` for `app/node_modules/`, `app/dist/`, Capacitor build output, and Playwright artifacts, while keeping `app/android/` and `app/ios/` committed
- [X] T069 Remove the unused empty `src/` and `my-project/` directories at the repository root, after confirming nothing references them
- [ ] T070 Run the complete quickstart.md validation (V1–V8) and confirm the Definition of Done at the end of that document — **partial**: V1–V7 are automated and passing; V8 is automated except the OS text-size check, and the device rows of V6 remain (see T064).

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup. **Blocks every user story.**
- **User Stories (Phases 3–6)**: All depend only on Foundational. They may then proceed in priority
  order, or in parallel if more than one person is working.
- **Polish (Phase 7)**: Depends on the user stories you intend to ship.

### User story dependencies

- **US1 (P1)**: Depends on Foundational only. No dependency on any other story.
- **US2 (P2)**: Depends on Foundational only. Replaces the US1 start placeholder (T043) but does not
  change US1's quiz, feedback, or results behavior.
- **US3 (P3)**: Depends on Foundational only. Uses `SegmentedControl` from T035, which is in
  Foundational precisely so US3 does not depend on US2. If US2 is already built, T052 adds a control to
  the existing configuration screen; if not, it adds it to the placeholder.
- **US4 (P4)**: Depends on Foundational, plus the results screen from US1 (T042) for the Practice Again
  button.

### Within each phase

- Engine tests (T018–T023) are written before the engine modules (T024–T029) and must fail first.
- Types (T012) before the data files; data files before `data/index.ts` (T016); `data/index.ts` before
  `pool.ts` (T026).
- Components before the screens that compose them.
- `quizReducer` (T032) before any screen that dispatches to it.

### Parallel opportunities

- **Setup**: T003–T009 are all different files — run them together after T001 and T002.
- **Foundational data**: T012, T013, T014, T015 in parallel; T014 and T015 are the two largest tasks in
  the project and are fully independent of each other.
- **Foundational engine tests**: T018–T023 in parallel; then T024, T025, T029 in parallel.
- **US1**: T037–T040 are four independent component files.
- **US2**: T045 and T047 in parallel.
- **Polish**: T060, T061, T065, T066, T067, T068 are independent.
- **Across stories**: once Phase 2 is checkpointed, US1, US2, and US3 can be built by three people
  simultaneously.

---

## Parallel Example: Foundational engine

```bash
# Write all engine tests together (they should all fail):
Task: "Write app/tests/engine/normalize.test.ts"
Task: "Write app/tests/engine/pool.test.ts"
Task: "Write app/tests/engine/validate.test.ts"
Task: "Write app/tests/engine/generate.test.ts"
Task: "Write app/tests/engine/score.test.ts"
Task: "Write app/tests/engine/purity.test.ts"

# Then the independent engine modules together:
Task: "Implement app/src/engine/rng.ts"
Task: "Implement app/src/engine/normalize.ts"
Task: "Implement app/src/engine/score.ts"
```

## Parallel Example: User Story 1

```bash
# All four quiz components are separate files:
Task: "Implement app/src/components/Flashcard.tsx"
Task: "Implement app/src/components/ProgressBar.tsx"
Task: "Implement app/src/components/AnswerInput.tsx"
Task: "Implement app/src/components/FeedbackPanel.tsx"
```

---

## Implementation Strategy

### MVP first (User Story 1 only)

1. Phase 1: Setup — including T011, which proves all three targets work before feature code exists.
2. Phase 2: Foundational — the dataset and the proven engine. This is the bulk of the correctness work.
3. Phase 3: User Story 1.
4. **Stop and validate**: run quickstart V1 and V5. You now have a usable kana trainer.

### Incremental delivery

1. Setup + Foundational → engine proven headlessly, nothing user-visible yet.
2. + US1 → **MVP**: practice the default set with feedback and a score.
3. + US2 → practice any subset you choose.
4. + US3 → practice in either direction.
5. + US4 → rerun instantly, and settings survive a restart.
6. + Polish → offline, installable, accessible, and documented on all three targets.

Each step leaves the previous ones working.

### Parallel team strategy

Everyone builds Setup + Foundational together — it is the shared contract, and splitting it invites the
duplicated logic Principle II forbids. After the Phase 2 checkpoint: one person on US1 (the largest
story), one on US2 + US3 (both configuration-screen work), one starting Polish tasks T060, T061, T067
that do not depend on story completion.

---

## Notes

- **The riskiest tasks are T014 and T015** — the datasets. Every downstream test depends on them being
  right, and Constitution Principle III puts data correctness above all other work. Check them against a
  published reference character by character; T017 catches structural errors but cannot tell you that
  `ki` is paired with the wrong glyph.
- T021's ≥1,000-quiz assertion is SC-002 and the direct check of the non-repetition requirement that the
  source description singled out.
- [P] tasks are different files with no incomplete dependencies.
- Commit after each task or logical group; keep engine and data changes together with their tests, as
  the constitution requires.
- Stop at any checkpoint to validate a story independently.
