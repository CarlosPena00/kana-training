# Specification Quality Checklist: Mistake History

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-08-28
**Updated**: 2026-08-28 (after clarification session)
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

All 16 items pass, before and after the `/speckit-clarify` session. Eight clarifications are now
recorded in the spec — three from specification, five from clarification — and no markers remain.

### Decisions resolved by /speckit-clarify (2026-08-28)

- **A correction round draws from the entire mistake list, both scripts together** (FR-020a). It is
  not scoped by the selected script, and the correction option is unavailable only when the whole
  list is empty (FR-021).
- **A romaji prompt names the script it wants** (FR-020c), since "nu" is ambiguous between ぬ and ヌ
  once a round can mix scripts. Only the card's own script is accepted (FR-020d).
- **A correction round is a copying drill** (FR-023a): the correct answer stays visible while the
  learner retypes it, so a round is always completable. Unaided recall was considered and rejected.
- **Correction rounds are scored on first submissions** (FR-029a), so forced correction cannot report
  a round as 100% correct. No correction-specific summary is added (FR-029b), and ordinary quizzes
  keep their existing partial-credit scoring (FR-029c).
- **No per-entry deletion** (FR-013a). Entries are earned onto the list and earned off it; the
  whole-history wipe stays as the only manual removal.

### Consequences that needed new requirements

- The mixed-script decision broke an invariant the engine relies on — one script per round — and
  created a genuine correctness hole in the Romaji → Kana direction, where a romaji prompt no longer
  identifies a unique kana. Closed by FR-020b through FR-020e. Validation itself needs no change: a
  card is already checked against its own expected answer.
- Forced correction plus the existing scoring would have reported every correction round as perfect.
  Closed by FR-029a and SC-005a.

### Decisions resolved earlier, during specification

- **A wrong first answer records a mistake**, whatever the attempt limit and whatever happens after
  it (FR-006).
- **Any correct first answer, in any quiz, advances the streak** (FR-011) — an ordinary quiz clears
  entries just as a correction round does.
- **Correction rounds hold the learner on a wrong card** until the correct answer is typed, with
  leaving always available (FR-023 – FR-026).

### Conflict found and closed during validation

The two answered clarifications were not consistent on their own. A correction round forces every
card to end with a correct answer; if any correct answer advanced the streak, three correction rounds
of wrong-then-copy would clear an entire mistake list without the learner learning anything. Resolved
by scoring **only the first submission per card** (FR-006, FR-012), with SC-004 written as the
regression test for it. The reasoning is recorded in the spec's Clarifications section so the
decision is not silently reversed later.

### Storage semantics confirmed by the user (2026-08-28)

The mistake list is **cache-grade data**: it lives only on the learner's own device, it is never
stored or copied anywhere else, and clearing the app's data erases it completely. Captured as
FR-030 – FR-034, FR-040, and SC-006a/SC-006b. The app makes no durability promise and never asks the
learner to protect the list.

**Gap found while confirming this**: `android:allowBackup="true"` in the Android manifest (the
Capacitor default) lets Android Auto Backup copy app storage to the learner's cloud account, which
contradicts "never stored anywhere else". FR-032 now requires it to be disabled, and the equivalent
exclusion on iOS. This already affects the preferences the app stores today — it is a pre-existing
gap that this feature surfaces rather than creates. Recorded in Dependencies.

### Open interpretations — none remain

The reveal-versus-recall question left open after specification was answered: the correction round
reveals the answer (FR-023a). No design choice in this spec is now marked undecided.

### Deferred to /speckit-plan

Not ambiguities in the specification — decisions that belong to implementation:

- **How a mixed-script round is represented** in the session model (FR-020b). The spec states the
  requirement; the shape of the change is a planning question.
- **Where the script label sits** on a Romaji → Kana card (FR-020c), and how the mistake list view
  meets the constitution's accessibility bar — contrast, focus states, 44×44 targets, keyboard.
- **Correction-round card count defaults**, within the bound FR-027 sets.

### Constitutional impact — resolved 2026-08-28

- **Principle I amended, constitution 1.0.0 → 1.1.0.** The storage clause now permits disposable
  local learning progress, bounded by the dataset, never off-device including cloud backup, and
  never promised to persist. Amended rather than waived, as required for a NON-NEGOTIABLE principle.
- **Principle V justifications recorded** in `plan.md` under Complexity Tracking, covering the fourth
  screen, the mixed-script session model, and the second storage key.
- Principles II, III, and IV are satisfied rather than strained.

All five gates pass. See [plan.md](../plan.md).

### Accepted limitation

**FR-032 is knowingly partial on iOS.** An encrypted iOS device backup includes the WebView store and
therefore the mistake list; closing it would require an async filesystem store. Accepted 2026-08-28
and to be stated in the app's privacy copy. Android and web satisfy FR-032 in full.
