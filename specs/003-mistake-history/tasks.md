---

description: "Task list for Mistake History"
---

# Tasks: Mistake History

**Input**: Design documents from `/specs/003-mistake-history/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/](./contracts/)

**Tests**: **Required, not optional.** The constitution states that a change to generation,
normalization, validation, or scoring MUST arrive with the test that covers it, and that engine
tests MUST pass before a change is considered complete. The numbered cases below map to the test
obligation tables in [contracts/mistake-store.md](./contracts/mistake-store.md) (store cases 1–18)
and [contracts/correction-round.md](./contracts/correction-round.md) (round cases 1–17).

**Organization**: Grouped by user story so each can be implemented, tested, and shipped on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel — different file, no dependency on an unfinished task
- **[Story]**: US1, US2, US3 — maps to the user stories in [spec.md](./spec.md)

## Path Conventions

This is a single web codebase wrapped for three targets. All application paths are under `app/`:
`app/src/{data,engine,state,screens,components}` and `app/tests/{data,engine,state,e2e}`. Native
shells live in `app/android/` and `app/ios/`.

---

## Phase 1: Setup

**Purpose**: Establish a known-good baseline and the one dataset lookup everything else needs.

- [X] T001 Run `./run.sh test` and `./run.sh e2e` from the repository root and record the result, so any later failure is attributable to this feature rather than to a pre-existing condition
- [X] T002 [P] Add `findKana(script: Script, kana: string): Kana | undefined` lookup to `app/src/data/index.ts`, alongside the existing `kanaForScript` and `isKnownGroupId` helpers
- [X] T003 [P] Add `findKana` cases to `app/tests/data/dataset.test.ts`: resolves both scripts, distinguishes ぬ from ヌ, returns undefined for an unknown character

**Checkpoint**: Baseline green, dataset lookup available.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The recording pipeline — types, the frozen first-submission fact, the pure rules for
*creating* a mistake, and the storage layer. Every user story depends on all of it.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T004 Add `MistakeEntry` and `SessionMode` types, add `firstSubmissionCorrect: boolean` to `AnswerRecord`, and add `mode: SessionMode` to `QuizSession`, all in `app/src/models/types.ts` per [data-model.md](./data-model.md)
- [X] T005 [P] Write failing tests for the wrong-answer paths of `applyAnswer` in `app/tests/engine/mistakes.test.ts` — store cases 13 (correct on absent entry does nothing), 15 (wrong resets streak and increments missCount), plus entry creation with `missCount 1`, `streak 0`, injected `lastMissedAt`
- [X] T006 [P] Write failing tests for the persistence layer in `app/tests/state/mistakeStore.test.ts` — store cases 1–12: absent key, throwing accessor, non-JSON, wrong version, unknown kana dropped, `streak` clamped to 2, bad `missCount` dropped, duplicates merged, invalid date substituted, `setItem` throwing, `clearMistakes` leaving preferences intact, ぬ and ヌ distinct
- [X] T007 Implement the wrong-answer half of `applyAnswer(list, kana, firstSubmissionCorrect, now)` in `app/src/engine/mistakes.ts` as a pure function taking `now` as a parameter — no clock, no storage (research D5)
- [X] T008 Implement `toPool(list)` in `app/src/engine/mistakes.ts`, resolving entries through `findKana` and silently omitting entries that no longer resolve (FR-037)
- [X] T009 Implement `loadMistakes`, `saveMistakes`, and `clearMistakes` in `app/src/state/mistakeStore.ts` under key `kana-training.mistakes`, every path wrapped in `try/catch` and every repair silent, following the pattern in `app/src/state/preferences.ts`
- [X] T010 Set `firstSubmissionCorrect` exactly once — when `submissions.length` becomes 1 — in the `submit` case of `app/src/state/quizReducer.ts`, and never revise it afterwards (research D1)
- [X] T011 Add a reducer test to `app/tests/state/reducer.test.ts` proving `firstSubmissionCorrect` stays `false` through any number of later correct retries, while `isCorrect` flips to `true`
- [X] T012 Persist the mistake list from an effect in `app/src/App.tsx` that watches resolved answers, mirroring how preferences are already saved — the reducer must stay pure and must never write storage (research D6)
- [X] T013 Expose the current mistake list and a refresh path to screens via `app/src/state/QuizContext.tsx`

**Checkpoint**: A wrong answer is recorded and survives a reload. Nothing displays it yet.

---

## Phase 3: User Story 1 - See what I keep getting wrong (Priority: P1) 🎯 MVP

**Goal**: The learner can open a screen showing every kana they have missed, with its reading, its
miss count, and its progress toward clearing — and it survives closing the app.

**Independent Test**: Answer one card wrong, finish the quiz, open the mistake list, confirm the kana
is listed with its correct reading. Reload the page and confirm it is still there.

### Tests for User Story 1

- [X] T014 [P] [US1] Write failing test for `sortEntries` in `app/tests/engine/mistakes.test.ts` — store case 18: most-missed first, most-recently-missed as tiebreak, dataset order as final tiebreak, and stable across repeated calls

### Implementation for User Story 1

- [X] T015 [US1] Implement `sortEntries` in `app/src/engine/mistakes.ts` (depends on T014)
- [X] T016 [P] [US1] Create `MistakeRow` in `app/src/components/MistakeRow.tsx` showing the kana, its reading, its miss count, its script, and progress toward clearing read from `entry.streak`
- [X] T017 [P] [US1] Create `app/src/components/MistakeRow.css` with 44×44 pt minimum interactive sizing and token-based colors only
- [X] T018 [P] [US1] Create `app/src/screens/HistoryScreen.css`
- [X] T019 [US1] Create `app/src/screens/HistoryScreen.tsx`: the sorted list, an empty state explaining how entries get there (FR-018), the ordering stated on screen rather than left to inference (FR-017), unambiguous script per entry (FR-016), and a way back to configuration (FR-019)
- [X] T020 [US1] Add `'history'` to `AppStatus` and the actions that open and close it in `app/src/state/quizReducer.ts`
- [X] T021 [US1] Render `HistoryScreen` and extend the `popstate` back handling to cover it in `app/src/App.tsx`
- [X] T022 [US1] Add the entry point to the mistake list on `app/src/screens/ConfigScreen.tsx`, reachable without starting a quiz (FR-014)
- [X] T023 [US1] Add "Delete my history" with an explicit irreversible-action confirmation to `app/src/screens/HistoryScreen.tsx`, calling `clearMistakes` and leaving preferences untouched (FR-038)
- [X] T024 [US1] End-to-end test in `app/tests/e2e/mistakes.spec.ts`: miss a card, open the list, see it with its reading; reload and confirm persistence; confirm the empty state on a fresh profile

**Checkpoint**: US1 is shippable on its own. Progress reads 0 for every entry until US3 lands.

---

## Phase 4: User Story 2 - Correct my mistakes until I get them right (Priority: P2)

**Goal**: A round drawn from the whole mistake list, across both scripts, that will not advance past
a card until the right answer has been typed — and that reports an honest score.

**Independent Test**: With three kana on the list, start a correction round, answer one wrong, and
confirm the round does not advance until that kana's reading is typed correctly, and that leaving is
available at every moment.

**Depends on US1** for the screen the round is launched from — the spec states this dependency
explicitly. Everything else in this phase is independent.

### Tests for User Story 2

- [X] T025 [P] [US2] Write failing tests for `buildQuestions` in `app/tests/engine/generate.test.ts` — round cases 1 (mixed-script pool, each card's script from its own kana), 2 (seeded rng is deterministic), 3 (pool of one)
- [X] T026 [P] [US2] Write failing tests for `validateCorrectionRound` in `app/tests/engine/pool.test.ts` — round cases 4 (`CARD_COUNT_EXCEEDS_POOL`), 5 (`NO_KANA_SELECTED` on an empty list), 6 (a Katakana-only list runs while Hiragana is selected)
- [X] T027 [P] [US2] Write failing tests for the correction advance rule in `app/tests/state/reducer.test.ts` — round cases 7 (wrong answer does not advance), 8 (five wrong then correct is one card, one record, six submissions), 9 (`attemptsAllowed: 1` is ignored in correction mode), 12 (abandon on a held card keeps recorded first submissions)
- [X] T028 [P] [US2] Write failing tests for correction scoring in `app/tests/engine/score.test.ts` — round cases 10 (six wrong first answers score 4/10, not 10/10) and 11 (standard mode keeps partial credit unchanged)

### Implementation for User Story 2

- [X] T029 [US2] Split `generateQuiz` in `app/src/engine/generate.ts` into `buildQuestions(pool, cardCount, direction, rng)` plus a thin configuration-driven wrapper, keeping shuffle-then-take sampling and the injectable `rng` (research D3)
- [X] T030 [US2] Add `validateCorrectionRound(poolSize, cardCount)` to `app/src/engine/pool.ts`, reusing the existing `ConfigurationError` values and never truncating or padding (FR-027)
- [X] T031 [US2] Set `mode` on session creation and add the start-correction-round action in `app/src/state/quizReducer.ts`, building the pool from the mistake list and ignoring the selected script (FR-020a)
- [X] T032 [US2] Implement the advance rule in the `continue` case of `app/src/state/quizReducer.ts`: in correction mode, hold `currentIndex` and return to `active` while the latest submission is wrong (depends on T031, same file)
- [X] T033 [US2] Branch `scoreSession` on `session.mode` in `app/src/engine/score.ts` — correction rounds score on `firstSubmissionCorrect` with no partial credit; standard rounds are untouched (FR-029a, FR-029c)
- [X] T034 [P] [US2] Add an optional `scriptLabel` prop to `app/src/components/Flashcard.tsx`, rendered inside the card and included in its accessible name so the script is announced with the prompt (research D8)
- [X] T035 [US2] Pass `scriptLabel` from `app/src/screens/QuizScreen.tsx` only when `session.mode === 'correction'` and the direction is `romaji-to-kana` (FR-020c, FR-020e)
- [X] T036 [US2] Keep the correct answer visible while the learner retypes it in `app/src/components/FeedbackPanel.tsx`, so a correction round is a copying drill and is always completable (FR-023a)
- [X] T037 [US2] Add the correction-round launcher to `app/src/screens/HistoryScreen.tsx` with a card-count control, disabled with an explanation when the whole list is empty (FR-020, FR-021)
- [X] T038 [US2] Return to the mistake list rather than the configuration screen after a correction round in `app/src/screens/ResultsScreen.tsx`, with no correction-specific summary added (FR-029b)
- [X] T039 [US2] End-to-end test in `app/tests/e2e/mistakes.spec.ts` — round cases 14 (answer stays visible while retyping), 15 (script named in the prompt and in its accessible name), 16 (quit reachable from a held card, including with the soft keyboard open)

**Checkpoint**: US1 and US2 both work independently.

---

## Phase 5: User Story 3 - Clear a kana by learning it (Priority: P3)

**Goal**: Three correct first answers in a row, in any quiz, remove a kana from the list — and
nothing else does.

**Independent Test**: Put one kana on the list, answer it correctly on the first try three times, and
confirm it disappears. Repeat with a wrong answer in the middle and confirm it does not.

### Tests for User Story 3

- [X] T040 [P] [US3] Write failing tests for the clearing rules in `app/tests/engine/mistakes.test.ts` — store cases 14 (`streak 2` plus correct removes the entry), 16 (a cleared kana returns at `missCount 1`, `streak 0`), and 17, the SC-004 regression: wrong-then-copy three times never clears an entry

### Implementation for User Story 3

- [X] T041 [US3] Implement the correct-answer half of `applyAnswer` in `app/src/engine/mistakes.ts`: advance `streak` on a correct first submission, delete the entry on reaching three, and leave a kana with no entry untouched (FR-009, FR-011, FR-012)
- [X] T042 [US3] Display live progress toward clearing on each row in `app/src/components/MistakeRow.tsx`, with a text equivalent rather than shape or color alone
- [X] T043 [US3] End-to-end test in `app/tests/e2e/mistakes.spec.ts`: clear a kana through ordinary quizzes without opening a correction round, and confirm a broken streak restarts from zero

**Checkpoint**: All three stories independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T044 [P] Set `android:allowBackup="false"` and reference `android:dataExtractionRules` in `app/android/app/src/main/AndroidManifest.xml` (FR-032)
- [X] T045 [P] Add the backup rules resource at `app/android/app/src/main/res/xml/data_extraction_rules.xml` excluding both `localStorage` keys from cloud and device-transfer backup
- [X] T046 [P] State the iOS backup limitation in the published privacy policy copy — an encrypted device backup does include the mistake list, per the accepted D4 decision; `app/store/README.md` already carries the note for the Play listing
- [X] T047 Add the accessibility pass for the history screen to `app/tests/e2e/mistakes.spec.ts` — round case 17: axe clean, visible focus in reading order, 44×44 pt targets, and a worst-case list of 214 entries rendering within a frame (SC-007)
- [X] T048 Add a regression assertion to `app/tests/e2e/mistakes.spec.ts` that no per-entry delete affordance exists anywhere — no swipe, no long-press, no row menu (FR-013a)
- [X] T049 Verify FR-041 by running the feature-001 suites unchanged — `app/tests/engine/`, `app/tests/state/`, and `app/tests/e2e/quiz.spec.ts` — confirming ordinary quizzes keep partial-credit scoring, single-script pools, and their existing feedback behavior
- [X] T050 Walk every scenario in [quickstart.md](./quickstart.md), scenarios 1 through 6, on the web target
- [ ] T051 Verify the feature on at least one mobile target as the constitution's definition of done requires — build via `./run.sh preview` then `npm run android:aab` from `app/` — paying attention to the soft keyboard during a forced correction in the Romaji → Kana direction **[BLOCKED: no device or emulator available in this environment. The Android app builds and the merged manifest carries allowBackup="false" (verified via `./gradlew assembleDebug` with JDK 21), but nothing has been run on a real device. The constitution's definition of done is not met until someone does this.]**
- [X] T052 Confirm no new runtime dependency entered `app/package.json` during implementation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies
- **Foundational (Phase 2)**: needs Setup — **blocks all three user stories**
- **US1 (Phase 3)**: needs Foundational
- **US2 (Phase 4)**: needs Foundational, and needs US1 for the screen it launches from
- **US3 (Phase 5)**: needs Foundational only — it can be built before or alongside US2
- **Polish (Phase 6)**: needs the stories it touches; T044–T046 have no story dependency and can be done at any point after Setup

### Why Foundational is so large here

`applyAnswer` is deliberately split across phases: its wrong-answer half is foundational because
every story needs mistakes to exist, while its correct-answer half is US3 because clearing is that
story's entire value. The same file is touched in both phases, which is why T007 and T041 are not
parallel with each other.

### Within each story

- Tests are written first and must fail before the implementation task that satisfies them
- Pure engine rules before state, state before screens
- `app/src/models/types.ts` (T004) precedes everything that references the new types

### Parallel Opportunities

- **T002, T003** — different files
- **T005, T006** — different test files
- **T014, T016, T017, T018** — one engine test plus three presentation files
- **T025, T026, T027, T028** — four different test files; the whole US2 test suite can be written at once
- **T034** runs parallel to the reducer and engine work in US2
- **T044, T045, T046** — manifest, resource, and documentation
- **US3 (Phase 5) can be built in parallel with US2 (Phase 4)** by a second person; they share only
  `mistakes.ts`, and T041 touches a different function from anything US2 changes

`app/tests/e2e/mistakes.spec.ts` is written by T024, T039, T043, T047, and T048. None of those are
marked `[P]` with each other — they append to one file.

---

## Parallel Example: User Story 2 tests

```bash
# All four US2 test files can be written simultaneously — they fail until T029–T033 land:
Task: "Failing tests for buildQuestions in app/tests/engine/generate.test.ts"
Task: "Failing tests for validateCorrectionRound in app/tests/engine/pool.test.ts"
Task: "Failing tests for the correction advance rule in app/tests/state/reducer.test.ts"
Task: "Failing tests for correction scoring in app/tests/engine/score.test.ts"
```

---

## Implementation Strategy

### MVP — Setup + Foundational + US1 (T001–T024)

Delivers a working memory: mistakes are recorded, persist across restarts, and the learner can see
them with readings and miss counts. No correction round, and progress shows 0 for everything because
nothing advances a streak yet. That is a coherent, useful product on its own — a learner who can see
"I have missed ぬ eleven times" knows what to study.

**Stop and validate here** before going further.

### Then, in either order

- **US3 (T040–T043, 4 tasks)** makes the list self-maintaining. It is the smaller of the two and
  turns the always-zero progress display into something real.
- **US2 (T025–T039, 15 tasks)** is the largest phase and carries all the engine risk — the generator
  split, the advance rule, and mixed-script rounds.

Doing **US3 before US2** is worth considering despite the priority order: it is a quarter of the work
and it closes the SC-004 loophole test (T040) before the correction round that could exploit it
exists.

### Riskiest tasks

- **T029** — splitting the generator. Everything in the app generates quizzes through it, so a
  mistake here breaks feature 001. T049 is the guard.
- **T032** — the advance rule. The only change to a state machine that already works.
- **T010** — if `firstSubmissionCorrect` is ever written twice, SC-004 silently fails and the mistake
  list becomes clearable by copying.
