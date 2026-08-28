# Implementation Plan: Confused Kana Feedback

**Branch**: `004-confused-kana-feedback` | **Date**: 2026-08-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-confused-kana-feedback/spec.md`

> ## ✅ All gates pass, no amendment needed
>
> Unusually for this project, this feature asks nothing of the constitution. No new screen, no
> stored data, no dataset entry, no second validator. It reads data that already exists and changes
> only what is displayed after a wrong answer.

## Summary

Turn "wrong, the answer was `ro`" into "you wrote る — the answer was ろ".

The whole feature is **one pure function and one new reference table**. `diagnoseAnswer` looks at a
wrong answer and returns at most one of three notes — a kana confusion, a spelling note, or a script
note — or nothing at all. The screens render whatever it returns.

Three properties shape the design:

- **The dataset already makes it possible.** Romaji is unique within a script and the mapping
  inverts one-to-one, so "which kana is `ru`?" has exactly one answer per script. This is a reverse
  lookup over existing data, not new data.
- **Exactly one note, decided in one place.** Three message types is where this feature could go
  wrong — an answer that produced two notes, or the wrong one, would tell the learner something
  false. A single function with a single return value makes that structurally impossible.
- **The retry rule is part of the diagnosis, not the rendering.** A spelling note names the canonical
  spelling, which on a Kana → Romaji card *is* the answer. Deciding what may be shown belongs with
  the logic that can be tested headlessly, not in a component.

## Technical Context

**Language/Version**: TypeScript 6.0.3, ES2022. Unchanged.

**Primary Dependencies**: React 19.2, Vite 8, Capacitor 8. **This feature adds no dependency** — no
romanization library, no transliteration package. The alternate table is 19 entries of local data.

**Storage**: None. This is the only feature in the project so far that stores nothing (FR-019,
FR-022).

**Testing**: Vitest for the diagnosis function and the alternate-table invariants — the interesting
logic is entirely headless. Playwright for what only a rendered page can prove: that the two
characters are legible side by side, that the screen-reader announcement is one statement, and that
the retry never leaks the answer.

**Target Platform**: Unchanged — Android 8.0+, iOS 15+, evergreen browsers as an installable PWA.

**Project Type**: Client-only cross-platform application.

**Performance Goals**: Diagnosis is two map lookups. The existing budget — feedback rendered within
100 ms, currently ~2 ms — must not move (SC-004).

**Constraints**: No new stored data. No change to what is accepted as correct. WCAG 2.1 AA, and the
feedback area must not grow enough to move the answer input or push the quit control off screen —
a real risk given the card area is fixed-height by design.

**Scale/Scope**: 214 kana, 19 alternate spellings, 3 message types, 0 new screens.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Gate | Initial | Post-Design |
|---|-----------|------|---------|-------------|
| I | Client-Only, Zero Infrastructure (NON-NEGOTIABLE) | No backend/network; storage bounded, on-device, cache-grade | PASS | PASS |
| II | One Codebase, Three Targets | One codebase; no per-platform or per-script logic forks | PASS | PASS |
| III | Data Correctness Before Everything | Data separate from UI; one canonical romanization, alternatives not silently accepted | PASS | PASS |
| IV | Headless, Deterministic Quiz Engine (NON-NEGOTIABLE) | No UI imports; one validator; logic testable without rendering | PASS | PASS |
| V | Keep It Simple (KISS / YAGNI) | No new screen; no gamification; dependencies justified | PASS | PASS |

**Evidence**

- **I** — Nothing is stored and nothing is transmitted. The feature adds no I/O of any kind, which
  makes it the first here that touches Principle I not at all.
- **II** — One diagnosis function serves both scripts and both directions. Script is a parameter, not
  a branch: `hiragana` and `katakana` go through identical code.
- **III** — The alternate-spelling table is **data**, and lands in `app/src/data/` beside the kana,
  not inside the engine. Critically, the constitution requires that alternative romanization systems
  "MUST NOT be silently accepted" — this feature explains them and still rejects them, which is the
  opposite of silent acceptance. FR-020c holds the line, and `checkAnswer` is untouched.
- **IV** — `diagnoseAnswer` is pure, imports no React, and returns plain data. There is still exactly
  one validator: diagnosis *calls* `checkAnswer` to know an answer was wrong rather than
  re-implementing that judgement.
- **V** — No screen is added. The existing feedback area gains content; navigation is unchanged at
  four destinations.

**Re-evaluation after Phase 1 design**: unchanged. The design added one pure module, one data file,
and props on two existing components. Nothing was introduced that a later reviewer would have to
justify.

### A Principle III subtlety worth stating

Recognising `si` is one step from accepting `si`, and accepting it would violate the constitution.
The design keeps them apart structurally: the alternate table is consulted **only after**
`checkAnswer` has already returned false, and its output is a string to display, never a comparison
input. There is no code path in which a table entry can make an answer correct.

## Project Structure

### Documentation (this feature)

```text
specs/004-confused-kana-feedback/
├── plan.md              # This file (/speckit-plan command output)
├── spec.md              # Feature specification (/speckit-specify + /speckit-clarify)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── answer-diagnosis.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

`+` added, `~` modified. Everything else untouched.

```text
app/
├── src/
│   ├── models/
│   │   └── types.ts                    ~ AnswerNote discriminated union
│   ├── data/
│   │   ├── alternates.ts               + 19 non-canonical spellings -> canonical
│   │   └── index.ts                    ~ findByRomaji(script, romaji) lookup
│   ├── engine/
│   │   ├── diagnose.ts                 + diagnoseAnswer(question, raw, revealed)
│   │   ├── validate.ts                   (unchanged — what counts as correct does not move)
│   │   └── normalize.ts                  (unchanged — diagnosis reuses it)
│   ├── components/
│   │   ├── AnswerNote.tsx              + renders whichever note was returned
│   │   ├── AnswerNote.css              +
│   │   ├── FeedbackPanel.tsx           ~ render the note when the answer is revealed
│   │   └── Flashcard.tsx               ~ render the note during a retry / correction reveal
│   └── screens/
│       └── QuizScreen.tsx              ~ call diagnoseAnswer, pass the result down
└── tests/
    ├── data/
    │   └── dataset.test.ts             ~ alternate-table invariants (see below)
    ├── engine/
    │   └── diagnose.test.ts            + the decision table, both directions, retry suppression
    └── e2e/
        └── confusion.spec.ts           + legibility, a11y announcement, retry does not leak
```

**Structure Decision**: The existing `data/ → engine/ → state/ → screens/` split is kept exactly, and
this feature touches only three of those layers — it needs no state at all, which is what makes it
small.

The one placement decision worth defending: **the alternate-spelling table is data, not engine.**
Principle III requires data to live apart from logic and stay editable without touching the engine,
and this table is exactly the kind of thing that will be extended later when someone reports that
`nn` for ん or `oh` for おう should be recognised. Putting it in `data/` means that edit never
touches `diagnose.ts`.

## Complexity Tracking

No constitutional violations to justify. Two design costs are worth recording anyway, because they
are the places this feature could quietly grow:

| Cost | Why accepted | Cheaper alternative rejected because |
|------|--------------|--------------------------------------|
| **Three message types** | Each names a genuinely different mistake; conflating them would give false feedback (FR-008a, FR-020d) | Explaining only kana confusion leaves `si` — one of the most common beginner errors — with no explanation, which is the case the user explicitly asked to cover |
| **A hand-maintained alternate table** | 19 entries of stable reference data, verified disjoint from the canonical set by test | A transliteration library would be a dependency serving one small call site, which Principle V forbids outright, and would not know this dataset's `di`/`du` convention |

**Rejected outright**, so they are not revisited: no romanization library; no fuzzy or
edit-distance matching (a near-miss is not a confusion and guessing would teach the wrong lesson);
no recording of confusion pairs (FR-019); no new screen or modal.

## Phase 0 — Research

See [research.md](./research.md). Six decisions. The load-bearing ones are the shape of the
diagnosis result, the order the three checks run in, and how retry suppression is expressed so it
stays testable.

## Phase 1 — Design

- [data-model.md](./data-model.md) — the `AnswerNote` union, the alternate table's shape, and the
  full decision table for both directions.
- [contracts/answer-diagnosis.md](./contracts/answer-diagnosis.md) — the diagnosis contract, every
  case it must handle, and its test obligations.
- [quickstart.md](./quickstart.md) — how to run and prove the feature.
