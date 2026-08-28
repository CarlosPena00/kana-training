---

description: "Task list for Confused Kana Feedback"
---

# Tasks: Confused Kana Feedback

**Input**: Design documents from `/specs/004-confused-kana-feedback/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/](./contracts/)

**Tests**: **Required, not optional.** The constitution requires engine logic to ship with the tests
that cover it. Numbered cases below map to the obligation tables in
[contracts/answer-diagnosis.md](./contracts/answer-diagnosis.md) — cases 1–19 headless, 20–24
dataset invariants, 25–31 end-to-end.

**Organization**: Grouped by user story so each can be implemented, tested, and shipped on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel — different file, no dependency on an unfinished task
- **[Story]**: US1, US2, US3 — maps to the user stories in [spec.md](./spec.md)

## Path Conventions

One web codebase under `app/`: `app/src/{data,engine,components,screens}` and
`app/tests/{data,engine,e2e}`. This feature touches no state layer and adds no screen.

---

## Phase 1: Setup

**Purpose**: A known-good baseline and the one dataset lookup the diagnosis depends on.

- [X] T001 Run `./run.sh test` and `./run.sh e2e` from the repository root and record the result, so any later failure is attributable to this feature
- [X] T002 [P] Add `findByRomaji(script: Script, romaji: string): Kana | undefined` to `app/src/data/index.ts`, mirroring the existing `findKana` and relying on romaji being unique within a script
- [X] T003 [P] Add `findByRomaji` cases to `app/tests/data/dataset.test.ts` — contract cases 23–24: resolves every entry in both scripts, round-trips against `findKana`, returns undefined for an unknown reading without throwing

**Checkpoint**: Baseline green, reverse lookup available.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The note type, the alternate-spelling data, and the diagnosis skeleton. Every story
builds on all of it.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T004 Add the `AnswerNote` discriminated union to `app/src/models/types.ts` per [data-model.md](./data-model.md), with the three kinds `kana-confusion`, `spelling`, and `script` — modelled so that two notes at once is not a state the type can express
- [X] T005 [P] Create `app/src/data/alternates.ts` with the 19 verified entries from [data-model.md](./data-model.md), as reference data beside the kana rather than inside the engine
- [X] T006 Add alternate-table invariants to `app/tests/data/dataset.test.ts` — contract cases 20–22: **no key is a canonical reading** (the FR-020a guard that keeps `di` and `du` working), every value **is** a canonical reading, and all keys are lowercase and trimmed
- [X] T007 Create `app/src/engine/diagnose.ts` with the `diagnoseAnswer(question, raw, answerRevealed)` signature and preconditions only: blank returns null, a correct answer returns null, and the answer is normalized once through the existing `normalizeAnswer` so diagnosis and grading agree
- [X] T008 Add precondition tests to `app/tests/engine/diagnose.test.ts` — contract cases 11–13: a correct answer in either direction, blank and whitespace-only, and junk such as `zzz`, `123`, an emoji

**Checkpoint**: A wrong answer can be diagnosed; nothing yet has anything to say about it.

---

## Phase 3: User Story 1 - Tell me which kana I actually wrote (Priority: P1) 🎯 MVP

**Goal**: A wrong answer that is itself a real reading names the character it belongs to, and a
wrong answer in another romanization system names the spelling this app uses.

**Independent Test**: Answer a ろ card with `ru` and confirm the feedback names る alongside the
correct answer. Answer with `zzz` and confirm nothing extra appears.

### Tests for User Story 1

- [X] T009 [US1] Write failing kana-confusion tests in `app/tests/engine/diagnose.test.ts` — contract cases 1–3, 10, 14–17: both directions, the card's script winning over the other, `di` producing a confusion naming ぢ rather than a spelling note, case and whitespace equivalence, decomposed versus composed kana, `kya` as one entry, and `ruro` producing nothing
- [X] T010 [US1] Add failing spelling-note tests to `app/tests/engine/diagnose.test.ts` — contract cases 7–9: `si` on an unrelated card, `si` on a し card once the answer is revealed, and the same card with attempts remaining producing **nothing** because the note would state the answer

### Implementation for User Story 1

- [X] T011 [US1] Implement the kana-confusion path in `app/src/engine/diagnose.ts` for both directions, resolving within the card's own script via `findByRomaji` and `findKana`
- [X] T012 [US1] Implement the spelling-note path in `app/src/engine/diagnose.ts`, consulted only after `checkAnswer` has already returned false, returning a display string and never a comparison input — and suppressed while attempts remain if its canonical form is this card's answer (FR-020b)
- [X] T013 [US1] Render the note as a plain sentence in `app/src/components/FeedbackPanel.tsx`, enough to deliver the value before User Story 2 makes it comparable
- [X] T014 [US1] Call `diagnoseAnswer` from `app/src/screens/QuizScreen.tsx` and pass the result down, deriving `answerRevealed` from the existing session state rather than recomputing it
- [X] T015 [US1] End-to-end test in `app/tests/e2e/confusion.spec.ts` — contract cases 25 and 31: answering ろ with `ru` names る, and answering `zzz` leaves the feedback exactly as it is today with no empty space where a note would be

**Checkpoint**: US1 is shippable. The explanation is correct but plain.

---

## Phase 4: User Story 2 - Show me the two characters (Priority: P2)

**Goal**: The two kana appear side by side, large enough to compare, each labelled in words — the
"user-friendly" half of the request.

**Independent Test**: Trigger a confusion at 320 px and confirm both characters are legible, clearly
labelled as wanted versus written, and that the answer input has not moved.

**Depends on US1** for something to render.

### Implementation for User Story 2

- [X] T016 [P] [US2] Create `app/src/components/AnswerNote.tsx` rendering whichever note kind it is given: two characters side by side with their readings for a confusion, a spelling line for a spelling note, and each labelled in words rather than by colour or position
- [X] T017 [P] [US2] Create `app/src/components/AnswerNote.css` using existing tokens only, sized so the note cannot grow the feedback area enough to move the answer input (FR-013)
- [X] T018 [US2] Replace the plain sentence in `app/src/components/FeedbackPanel.tsx` with `AnswerNote`, and give the note a single accessible announcement rather than loose characters (FR-012)
- [X] T019 [US2] Render only the "you wrote る" half while attempts remain, in `app/src/components/AnswerNote.tsx` — the correct character and its reading must not appear anywhere on screen (FR-015a)
- [X] T020 [US2] End-to-end test in `app/tests/e2e/confusion.spec.ts` — contract case 26: at 320 px nothing is clipped, the page does not scroll sideways, and the answer input occupies the same position it did before the answer was submitted
- [X] T021 [US2] End-to-end accessibility test in `app/tests/e2e/confusion.spec.ts` — contract case 30: axe clean, and the note announced as one statement

**Checkpoint**: US1 and US2 both work; the explanation now teaches at a glance.

---

## Phase 5: User Story 3 - The same help wherever I am corrected (Priority: P3)

**Goal**: The script note exists, and every surface that reveals an answer shows notes the same way
— ordinary quiz, retry, and the correction round's inline reveal.

**Independent Test**: Trigger the same confusion in an ordinary quiz and in a correction round and
confirm the explanation matches; write ロ where ろ was wanted and confirm the script is named.

### Tests for User Story 3

- [X] T022 [US3] Write failing script-note tests in `app/tests/engine/diagnose.test.ts` — contract cases 4–6: ロ for ろ once revealed produces a script note, the same with attempts remaining produces nothing (FR-008c), and ル for ろ produces nothing at all because that is wrong on both axes

### Implementation for User Story 3

- [X] T023 [US3] Implement the script-note path in `app/src/engine/diagnose.ts`, firing only when the other script's kana carries the reading the card wanted, and never presented as a confusion between two characters (FR-008a)
- [X] T024 [US3] Render the note during a correction round's inline reveal in `app/src/components/Flashcard.tsx`, reusing `AnswerNote` so the height rules live in one place
- [X] T025 [US3] End-to-end test in `app/tests/e2e/confusion.spec.ts` — contract case 29: in a mixed-script correction round the kana named belongs to the card, not to the script selected on the configuration screen
- [X] T026 [US3] End-to-end retry-leak test in `app/tests/e2e/confusion.spec.ts` — contract cases 27–28: with attempts remaining, る is named while ろ and `ro` appear nowhere on screen, and a `si` answer on a し card produces no note at all

**Checkpoint**: All three stories independently functional; all three message types exist.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T027 Add the exhaustive sweep to `app/tests/engine/diagnose.test.ts` — contract cases 18–19: every canonical reading in both scripts and both directions never throws and never returns a note whose `wanted` differs from the card, and every alternate-table key with the answer hidden returns no note containing the card's expected answer
- [X] T028 Confirm no new browser-storage key appears — `kana-training.preferences` and `kana-training.mistakes` remain the only two (FR-022), asserted in `app/tests/e2e/confusion.spec.ts`
- [X] T029 Verify FR-021 by running the feature-001 and feature-003 suites unchanged — `app/tests/engine/`, `app/tests/state/`, `app/tests/e2e/quiz.spec.ts`, `app/tests/e2e/mistakes.spec.ts` — confirming no score moved and correction rounds still behave as they did
- [X] T030 Walk every scenario in [quickstart.md](./quickstart.md), scenarios 1 through 6, on the web target
- [ ] T031 Verify on a connected Android device as the constitution's definition of done requires — install with `adb install -r` after `./gradlew assembleDebug` (JDK 21) — checking that the note does not push the quit control under the soft keyboard, which device testing of feature 003 showed is already tight **[BLOCKED: no device connected. The web target is fully verified across both viewports, including the FR-013 input-position check at 320 px, but nothing has run on a phone. The soft-keyboard interaction this task exists to check is unverified.]**
- [X] T032 Confirm no runtime dependency entered `app/package.json`: no transliteration or romanization library

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies
- **Foundational (Phase 2)**: needs Setup — **blocks all three user stories**
- **US1 (Phase 3)**: needs Foundational
- **US2 (Phase 4)**: needs US1 — it replaces US1's plain rendering
- **US3 (Phase 5)**: needs Foundational; independent of US2 except that T024 reuses the component US2 builds
- **Polish (Phase 6)**: needs the stories it touches; T032 can be checked at any point

### Why the message types are split across phases

`diagnose.ts` grows one path per story: kana confusion and spelling notes in US1 (T011, T012), the
script note in US3 (T023). They land in the same file, so those three tasks are strictly sequential.
The split is deliberate — each path is separately valuable, and a reviewer can see one message type
arrive at a time rather than three at once.

### Within each story

- Tests are written first and must fail before the implementation task that satisfies them
- Engine before components, components before screens
- `app/src/models/types.ts` (T004) precedes everything referencing `AnswerNote`

### Parallel Opportunities

- **T002, T003** — lookup and its tests, different files
- **T005** runs parallel to T004's type work
- **T016, T017** — component and stylesheet
- **US3 (Phase 5) can proceed alongside US2 (Phase 4)** by a second person, up to T024, which needs
  `AnswerNote` to exist

Single-writer files, so no `[P]` among them: `app/src/engine/diagnose.ts` (T007, T011, T012, T023),
`app/tests/engine/diagnose.test.ts` (T008, T009, T010, T022, T027),
`app/tests/e2e/confusion.spec.ts` (T015, T020, T021, T025, T026, T028), and
`app/tests/data/dataset.test.ts` (T003, T006).

---

## Parallel Example: Phase 2 start

```bash
# The type and the reference data are independent files:
Task: "Add the AnswerNote union in app/src/models/types.ts"
Task: "Create app/src/data/alternates.ts with the 19 verified entries"
```

---

## Implementation Strategy

### MVP — Setup + Foundational + US1 (T001–T015)

Delivers the whole idea: a wrong answer that is a real reading names the character it belongs to,
and a wrong romanization names the spelling this app uses. The presentation is a plain sentence, which
the spec itself says is enough to carry the value.

**Stop and validate here.** If the explanation does not feel useful in plain text, no amount of
side-by-side layout will save it.

### Then

- **US2 (T016–T021, 6 tasks)** turns the sentence into a comparison. This is where the "user-friendly"
  requirement is actually met.
- **US3 (T022–T026, 5 tasks)** adds the third message type and the correction-round surface.

### Riskiest tasks

- **T012** — the spelling note is the one that can leak a hidden answer. FR-020b is the guard and
  T010 is the test; if that suppression is wrong, the three-attempt mode quietly stops working as
  designed and nothing else fails.
- **T006** — the alternate-table invariant. Without it, a later well-meaning extension adding `di`
  or `zu` would tell learners that correct answers are misspelled.
- **T019** — rendering only half a note during a retry. The note carries both sides by design, so
  the restraint lives in the component and is easy to lose in a refactor.
