# Specification Quality Checklist: Confused Kana Feedback

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-08-28
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

All 16 items pass. Four clarifications were asked and answered in the 2026-08-28 session; no markers
remain.

### Decisions resolved by /speckit-clarify (2026-08-28)

- **Nothing is stored** (FR-019, FR-022). The feature is presentation only — no new browser storage,
  no extension of the mistake history. Recording confusion pairs was considered and declined; the
  lookup it would need is the same one this feature builds, so that option stays open at no cost.
- **The explanation appears during retries** (FR-015), naming only what the learner wrote. The
  correct answer stays withheld until the attempts are spent (FR-015a).
- **Non-canonical romanization is covered** (FR-020) as a *spelling note* — "this app uses `shi`" —
  which never names a kana (FR-020d) and never makes the spelling acceptable (FR-020c).
- **The right character in the wrong script gets a script note** (FR-008), not a confusion, because
  the learner picked the right character.

### Conflicts found and closed during clarification

- **A spelling note can leak the answer.** On a Kana → Romaji card for し, telling the learner "this
  app uses `shi`" states the very answer the retry is withholding. Closed by FR-020b, with FR-008c
  applying the same guard to script notes and SC-005a as the regression criterion. Recorded in the
  spec's Clarifications section so the reasoning is not lost.
- **The alternate-spelling set cannot be a generic Kunrei table.** This dataset uses `di` and `du` as
  the canonical readings of ぢ and づ, so neither may be treated as an alternate spelling of anything
  else. Closed by FR-020a.

### Scope grew, deliberately

The feature now carries three distinct messages — kana confusion, spelling note, script note — where
the original description implied one. Each was chosen explicitly, and FR-008a and the Assumptions
section require them to stay separate: telling a learner they confused two characters when they
actually used the wrong romanization system would be false feedback.

### Resolved without asking

- **Script scoping** (FR-002): the card's own script.
- **Multi-kana answers** (FR-006): not explained.

### Constitutional impact: none

No new screen (Principle V), no stored data (Principle I), no dataset change (Principle III), and no
second implementation of validation or scoring (Principle IV) — the feature reads existing data and
changes only what is displayed. FR-020c and FR-021 keep Principle III's single-romanization rule
intact: an alternate spelling is explained, never accepted.
