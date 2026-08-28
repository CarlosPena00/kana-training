# Implementation Plan: Mistake History

**Branch**: `003-mistake-history` | **Date**: 2026-08-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-mistake-history/spec.md`

> ## ✅ Gates clear — cleared 2026-08-28
>
> Principle I was amended (**constitution 1.0.0 → 1.1.0**) to permit disposable local learning
> progress under three new constraints: bounded by the dataset, never off-device including cloud
> backup, and never promised to persist. All five gates now pass and implementation may proceed.
>
> **Accepted limitation**: FR-032 (excluded from platform cloud backup) is satisfied fully on
> Android and web, and **partially on iOS** — see [D4 decision](#d4-decision-ios-backup).

## Summary

Give the app a memory of the kana the learner gets wrong, a screen to look at it, and a practice
mode built from it that will not let a card go until the right answer has been typed.

The technical approach adds **one field, one flag, one module, and one screen**, and deliberately
avoids adding a second engine:

- `AnswerRecord` gains `firstSubmissionCorrect`, written once and never revised. This single field
  is what the mistake list reads, what the streak counts, and what a correction round is scored on —
  three requirements served by one fact, rather than three places re-deriving it.
- `QuizSession` gains `mode: 'standard' | 'correction'`. It changes exactly two behaviors: whether
  `continue` re-presents the current card or advances, and which scoring rule the results use.
- `app/src/state/mistakes.ts` stores the list in `localStorage` behind the same guarded wrapper
  `preferences.ts` already uses, and is the only new persistence in the app.
- A fourth screen, `HistoryScreen`, reachable from configuration and returning to it.

The existing generator is **extended, not duplicated**: `generateQuiz` is refactored so that pool
construction and question construction are separate, letting a correction round supply an explicit
mixed-script `Kana[]` pool through the same code path. Principle IV requires exactly one generator,
and this keeps that true.

## Technical Context

**Language/Version**: TypeScript 6.0.3, targeting ES2022; Node.js 24 LTS for the build toolchain only.
No change from feature 001.

**Primary Dependencies**: React 19.2, Vite 8, Capacitor 8, `vite-plugin-pwa` 1.3. **This feature adds
no runtime dependency.** No date library (one ISO string via `toISOString()`), no storage library, no
state library.

**Storage**: `localStorage`, second key `kana-training.mistakes`, behind the same guarded wrapper
pattern as `kana-training.preferences`. Cache-grade: absent, unreadable, or evicted storage is a
normal state, not an error (FR-035). Bounded above by 214 entries ≈ 12 KB of JSON.

**Testing**: Vitest for the store, the streak state machine, the mixed-script generator, and
correction-round scoring — all headless. Playwright for the forced-correction interaction and the
history screen's accessibility pass, which cannot be proven without a rendered input and a real
focus order.

**Target Platform**: Unchanged — Android 8.0+ (API 26), iOS 15+, evergreen browsers as an installable
PWA.

**Project Type**: Client-only cross-platform application — one web codebase, three delivery targets.

**Performance Goals**: The history screen renders within one frame at the worst case of 214 entries
(SC-007). A store read is a single `getItem` plus `JSON.parse` of ~12 KB; no indexing, no pagination,
no virtualization is warranted at this size and none is planned.

**Constraints**: Zero runtime network requests. The mistake list must additionally be excluded from
platform cloud backup (FR-032), which is a manifest change on Android and a file-attribute concern on
iOS. Storage writes must never throw into a quiz (FR-036). WCAG 2.1 AA and 44×44 pt targets apply to
the new screen exactly as to the existing three.

**Scale/Scope**: 4 screens (was 3), ~13 components, 214 kana, at most 214 mistake entries, 1 learner
per device, no concurrency.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Gate | Initial | Post-Design |
|---|-----------|------|---------|-------------|
| I | Client-Only, Zero Infrastructure (NON-NEGOTIABLE) | No backend/API/auth/monetization; offline; storage bounded, on-device, backup-excluded, cache-grade | PASS *(after 1.1.0)* | PASS |
| II | One Codebase, Three Targets | One codebase; no per-platform or per-script logic forks | PASS | PASS |
| III | Data Correctness Before Everything | Dataset separate from UI; canonical romanization; no invented entries | PASS | PASS |
| IV | Headless, Deterministic Quiz Engine (NON-NEGOTIABLE) | No UI imports; one generator/normalizer/validator; sample without replacement; injectable randomness; tested | PASS | PASS |
| V | Keep It Simple (KISS / YAGNI) | Navigation ≤ Config → Quiz → Results; no gamification; simplest state mechanism; dependencies justified | PASS *(with justifications)* | PASS *(with justifications)* |

### Gate I — how it was cleared

Principle I originally permitted local storage "for lightweight preferences only", and a mistake
list is learning progress, not a preference. Because Principle I is NON-NEGOTIABLE it could not be
waived, so the constitution was amended to 1.1.0 (text below). The feature meets all three of the
new constraints the amendment imposes: bounded by the dataset at 214 entries, never off-device
including cloud backup (FR-031, FR-032), and cache-grade with no durability promise (FR-030,
FR-034).

Every other clause of Principle I was honored throughout, and strictly:

- No backend, no API, no database, no account, no analytics, no monetization. Unchanged.
- No network request at runtime. The Android manifest still removes `INTERNET` entirely.
- The app is fully functional with the store empty, unreadable, or gone (FR-035, SC-008).
- The data never leaves the device — and this feature *tightens* that by disabling the cloud backup
  that currently carries the preferences off-device (FR-032).

The conflict was with the letter of one clause, not with the principle's purpose — but the
constitution is explicit that NON-NEGOTIABLE principles "MUST NOT be waived", so the amendment was
the only route. It is recorded below and has been applied.

### D4 decision: iOS backup

**Android and web**: FR-032 fully satisfied. `android:allowBackup="false"` stops Android Auto Backup
from copying WebView storage to the learner's Google account; `localStorage` is not browser-synced
on the web.

**iOS**: **knowingly partial, accepted 2026-08-28.** WKWebView's `localStorage` lives in the app
container and rides along in encrypted iCloud and local device backups. There is no supported way to
exclude it without moving to a Capacitor Filesystem store, which would make every read async and put
a loading state on every screen for one platform's benefit — a Principle V cost the threat does not
justify. The data is bounded, non-identifying, and travels only inside the learner's own encrypted
device backup.

This must be stated in the app's privacy copy rather than left implicit, since FR-032 is written as
an unqualified MUST.

### Gate IV — why it still passes

The risk was adding a second generator or a second validator for correction rounds. The design
avoids both:

- **One generator.** `generateQuiz` is split into `buildQuestions(pool, cardCount, direction, rng)`
  and a thin wrapper that builds the pool from a configuration. Correction rounds call the same
  `buildQuestions` with a different pool. Sampling stays shuffle-then-take.
- **One validator.** `checkAnswer` is untouched. FR-020d (ヌ is wrong for a ぬ card) already holds,
  because a question is validated against its own `expectedAnswer`. No new rule is written.
- **One normalizer.** Untouched.
- **Injectable randomness.** `buildQuestions` keeps the `rng` parameter, so correction rounds are
  as deterministic under test as ordinary quizzes.
- **Headless.** The store, the streak transition, and correction scoring are pure functions over
  plain data, tested without rendering. The forced-correction *advance rule* lives in the reducer,
  which is already tested headlessly in `tests/state/reducer.test.ts`.

### Gate V — three justifications

Recorded in full under [Complexity Tracking](#complexity-tracking): the fourth screen, the
mixed-script session, and the second storage key. All three are additions the feature cannot be
delivered without, and each is the smallest form of itself.

### Re-evaluation after Phase 1 design

No gate changed. The design added no service layer, no repository abstraction, no dependency, and no
per-platform fork. Gate I remains the single blocker, unchanged in nature by the design work: it is a
governance decision, not a technical one.

## Constitution Amendment — applied

Applied to `.specify/memory/constitution.md` on 2026-08-28, with the rationale recorded in that
file's Sync Impact Report.

**Version**: 1.0.0 → **1.1.0** (MINOR: materially expands guidance without redefining a principle)

Replaced, in Principle I:

> Local device/browser storage MAY be used for lightweight preferences only; the application MUST
> behave correctly when that storage is empty, unavailable, or cleared.

with:

> Local device/browser storage MAY be used for lightweight preferences and for disposable local
> learning progress. Any such data MUST be bounded in size by the bundled dataset, MUST remain on
> the device that created it — never transmitted, synchronized, or included in platform cloud
> backup — and MUST be treated as a cache: the application MUST behave correctly when that storage
> is empty, unavailable, evicted, or cleared, and MUST NOT promise the learner that it persists.

This keeps every constraint that gives Principle I its force, and adds three new ones (bounded,
backup-excluded, never promised) that the current wording does not impose on preferences either.

## Project Structure

### Documentation (this feature)

```text
specs/003-mistake-history/
├── plan.md              # This file (/speckit-plan command output)
├── spec.md              # Feature specification (/speckit-specify + /speckit-clarify)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── mistake-store.md
│   └── correction-round.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

Files this feature adds are marked `+`; files it modifies are marked `~`. Everything else is
untouched.

```text
app/
├── src/
│   ├── models/
│   │   └── types.ts                    ~ MistakeEntry, SessionMode; AnswerRecord.firstSubmissionCorrect
│   ├── data/                             (unchanged — no dataset change)
│   │   └── index.ts                    ~ add findKana(script, kana) lookup
│   ├── engine/
│   │   ├── generate.ts                 ~ split out buildQuestions(pool, …); mixed-script pool support
│   │   ├── pool.ts                     ~ validateCorrectionRound(poolSize, cardCount)
│   │   ├── score.ts                    ~ first-submission scoring for correction mode
│   │   ├── mistakes.ts                 + pure streak rules: applyAnswer, isCleared, sortEntries
│   │   ├── normalize.ts                  (unchanged)
│   │   ├── validate.ts                   (unchanged — FR-020d already holds)
│   │   └── rng.ts                        (unchanged)
│   ├── state/
│   │   ├── quizReducer.ts              ~ mode; correction advance rule; mistake side-effect hook
│   │   ├── QuizContext.tsx             ~ expose mistake list to screens
│   │   ├── preferences.ts                (unchanged)
│   │   └── mistakeStore.ts             + guarded localStorage read/write/clear
│   ├── screens/
│   │   ├── ConfigScreen.tsx            ~ entry point to the history screen
│   │   ├── HistoryScreen.tsx           + the mistake list and the correction-round launcher
│   │   ├── HistoryScreen.css           +
│   │   ├── QuizScreen.tsx              ~ script label on romaji prompts; correction-mode labels
│   │   └── ResultsScreen.tsx           ~ correction-round return path
│   ├── components/
│   │   ├── MistakeRow.tsx              + one entry: kana, reading, misses, streak pips
│   │   ├── MistakeRow.css              +
│   │   ├── FeedbackPanel.tsx           ~ keep the answer visible while retyping (FR-023a)
│   │   └── Flashcard.tsx               ~ optional script label (FR-020c)
│   └── App.tsx                         ~ 'history' status, back handling for the new screen
├── tests/
│   ├── engine/
│   │   ├── mistakes.test.ts            + streak transitions, clearing, return-to-list
│   │   ├── generate.test.ts            ~ mixed-script pool cases
│   │   └── score.test.ts               ~ correction-round scoring
│   ├── state/
│   │   ├── mistakeStore.test.ts        + corrupt/absent/version-mismatch/unknown-kana repair
│   │   └── reducer.test.ts             ~ forced-correction advance rule
│   └── e2e/
│       └── mistakes.spec.ts            + forced correction, history screen, a11y pass
└── android/app/src/main/AndroidManifest.xml   ~ allowBackup=false, dataExtractionRules (FR-032)
```

**Structure Decision**: The existing four-layer split — `data/` → `engine/` → `state/` → `screens/`
— is kept exactly. The new code lands in the layer that already owns its concern: streak *rules* go
in `engine/` as pure functions, storage *I/O* goes in `state/` beside `preferences.ts`, and the
screen goes in `screens/`. No new layer, no service abstraction, no repository.

The one deliberate placement decision: `engine/mistakes.ts` (rules) is separate from
`state/mistakeStore.ts` (persistence). Principle IV requires the rules to be testable without
storage, and the rule "three correct in a row clears an entry" is exactly the kind of logic that
becomes untestable once it is entangled with `localStorage`.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| **Storage beyond preferences** (Principle I, NON-NEGOTIABLE) | The feature *is* the memory; there is no version of it that stores nothing | Deriving the list from an in-memory session only would lose it on every app restart, which is the one thing the learner asked for. Resolved by the 1.1.0 amendment above rather than waived. |
| **A fourth screen** (Principle V) | The list must be viewable without starting a quiz (FR-014), and no existing screen can hold 214 rows without becoming something else | Putting the list on the results screen shows it only after a quiz, exactly when the learner is least likely to act on it. Putting it on the configuration screen buries the Start button under 214 rows. |
| **Mixed-script sessions** (Principle V) | A correction round draws the whole list (FR-020a), which spans both scripts | Two single-script rounds would force the learner to run the same drill twice and would make FR-021's empty-state rule incoherent. Cost is contained: `Kana` already carries `script`, so only pool construction changes. |
| **Second `localStorage` key** | Mistake data has a different lifecycle from preferences: it is written during a quiz, cleared independently, and excluded from backup | One combined key would couple a corrupt mistake list to the loss of preferences, and would make "delete my history" (FR-038) also reset the learner's script and card count. |

**Rejected outright**, and worth recording so they are not revisited: no IndexedDB (12 KB does not
need it), no date library, no per-entry timestamps beyond `lastMissedAt`, no answer log, no
migration framework (an unreadable store is discarded, per FR-035), and no virtualized list.

## Phase 0 — Research

See [research.md](./research.md). Eight decisions, the load-bearing ones being: where
`firstSubmissionCorrect` is computed, how the correction-round advance rule is expressed in the
existing reducer without a second state machine, and how FR-032 is satisfied on each platform.

## Phase 1 — Design

- [data-model.md](./data-model.md) — `MistakeEntry`, the stored envelope, the changed fields on
  `AnswerRecord` and `QuizSession`, and the entry lifecycle as an explicit state machine.
- [contracts/mistake-store.md](./contracts/mistake-store.md) — the persistence contract: stored
  shape, every repair path, and the guarantee that no call throws.
- [contracts/correction-round.md](./contracts/correction-round.md) — generation from a mixed-script
  pool, the advance rule, first-submission scoring, and the script-label rule.
- [quickstart.md](./quickstart.md) — how to run and prove the feature end to end.
