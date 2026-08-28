# Phase 1 Data Model: Mistake History

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-08-28

New and changed types live in `app/src/models/types.ts` alongside the existing domain types. The
kana dataset is **unchanged** — this feature adds no entry, no field, and no group.

---

## Entity: MistakeEntry

One kana the learner has answered incorrectly and has not yet cleared.

| Field | Type | Notes |
|-------|------|-------|
| `script` | `Script` | Which script this entry belongs to. Half of the identity. |
| `kana` | `string` | The character(s). The other half of the identity. |
| `missCount` | `number` | Total times missed, ≥ 1. Never decreases while the entry exists. |
| `streak` | `0 \| 1 \| 2` | Consecutive correct first answers. Reaching 3 deletes the entry, so 3 is never stored. |
| `lastMissedAt` | `string` | ISO 8601 date-time, UTC. The only timestamp kept. |

**Rules**

- Identity is `(script, kana)` — FR-001. Direction is deliberately **not** part of it (FR-002), so
  ぬ missed as Kana → Romaji and ぬ missed as Romaji → Kana are one entry.
- ぬ and ヌ are **different** entries: same romaji, different script.
- At most one entry per identity (FR-005).
- `streak` is never 3 in a stored entry: reaching 3 is the deletion (FR-009), not a state.
- No text the learner typed is stored, no per-quiz data, no direction, no device or user identifier
  (FR-039, and the same restraint `contracts/preferences.md` already applies to preferences).

**Why `missCount` never decreases**: it answers "how much has this kana cost me", which stays true
after a clear-and-return. `streak` answers "how close am I now", and resets. Two different questions,
two fields — collapsing them into one would make the list unable to distinguish a kana missed once
from a kana missed eleven times and recently half-learned.

---

## Entity: MistakeList

The learner's whole collection. Modeled as `readonly MistakeEntry[]`, not a map.

**Rules**

- At most 214 entries — one per kana per script — so it is bounded by the dataset, not by usage
  (FR-030's "lightweight" claim rests on this).
- Order in storage is not meaningful; display order is imposed by `sortEntries` (D7).
- Doubles as the card pool for a correction round (FR-020).

**Why an array, not a `Map`**: it is at most 214 items, it serializes to JSON directly, and every
operation on it is a full pass anyway (sort, filter to pool, find one entry). A `Map` would buy a
faster lookup that no code path is waiting on, and would need converting on both sides of storage.

---

## Entry lifecycle

The whole feature, as a state machine. `first` is `firstSubmissionCorrect` for one answered card.

```text
                    first = wrong
   (no entry) ─────────────────────────────► streak 0
        ▲                                   ┌──┴───┐
        │                       first=wrong │      │ first=right
        │                                   │      ▼
        │                                   │   streak 1
        │                                   │   ┌──┴───┐
        │                       first=wrong │   │      │ first=right
        │                                   │   │      ▼
        │                                   │   │   streak 2
        │                                   │   │   ┌──┴───┐
        │                       first=wrong │   │   │      │ first=right
        │                                   ▼   ▼   ▼      ▼
        └───────────────────────────────  streak 0      (deleted)
              first = right, 3rd in a row
```

Read as rules:

| Current state | `first = right` | `first = wrong` |
|---------------|-----------------|-----------------|
| No entry | no change — a kana never missed is not tracked | create entry, `missCount 1`, `streak 0` |
| `streak 0` | → `streak 1` | `missCount + 1`, `streak 0`, update `lastMissedAt` |
| `streak 1` | → `streak 2` | `missCount + 1`, `streak 0`, update `lastMissedAt` |
| `streak 2` | **delete the entry** (FR-009) | `missCount + 1`, `streak 0`, update `lastMissedAt` |

**Consequences worth stating explicitly**

- A correct answer on a kana with no entry does nothing (FR-011 only advances entries that exist).
  Getting あ right forever never creates an あ record.
- A deleted entry can return, starting from `streak 0` and `missCount 1` — the previous `missCount`
  is gone with the entry (FR-010). The list measures current weakness, not lifetime error count
  (SC-009).
- Only the first submission drives any transition (FR-006, FR-012). The forced correction typed in a
  correction round is not an input to this machine at all.
- There is no transition triggered by the learner: no per-entry delete (FR-013a), no manual progress
  change (FR-013). The only non-answer removal is deleting the whole list (FR-038).

---

## Changed: `AnswerRecord`

```ts
export interface AnswerRecord {
  readonly questionIndex: number;
  readonly submissions: readonly string[];
  readonly isCorrect: boolean;
  readonly firstSubmissionCorrect: boolean;   // NEW
}
```

`firstSubmissionCorrect` is written when `submissions.length` becomes 1 and is never revised (D1).

**It is not the same as `isCorrect`.** `isCorrect` tracks the most recent submission and can flip
from `false` to `true` as the learner retries. `firstSubmissionCorrect` is frozen. In a correction
round `isCorrect` ends `true` for every card by construction — which is exactly why scoring one on
the other would report every round as perfect.

---

## Changed: `QuizSession`

```ts
export type SessionMode = 'standard' | 'correction';   // NEW

export interface QuizSession {
  // …existing fields unchanged…
  readonly mode: SessionMode;   // NEW
}
```

`mode` changes exactly two behaviors, and nothing else:

1. **Advance rule** — in `correction`, `continue` re-presents the current card while its latest
   submission is wrong, instead of advancing (FR-024, D2).
2. **Scoring** — in `correction`, results are computed from `firstSubmissionCorrect` (FR-029a).

A `correction` session's `configuration.script` is **not** meaningful: the pool spans both scripts
and each card's script comes from `question.kana.script` (FR-020b). Nothing may read
`configuration.script` while `mode === 'correction'`.

---

## Stored envelope

```ts
interface StoredMistakes {
  version: 1;
  entries: Array<{
    script: 'hiragana' | 'katakana';
    kana: string;
    missCount: number;
    streak: 0 | 1 | 2;
    lastMissedAt: string;
  }>;
}
```

Key: `kana-training.mistakes`. Separate from `kana-training.preferences` so that a corrupt mistake
list cannot cost the learner their settings, and so "delete my history" does not reset their script
and card count.

Worst case ≈ 214 entries × ~55 bytes ≈ 12 KB of JSON. Every repair path is specified in
[contracts/mistake-store.md](./contracts/mistake-store.md).

---

## Derived, never stored

| Value | Derived from | Why not stored |
|-------|--------------|----------------|
| Correction-round pool | entries → `findKana(script, kana)` | The dataset is the source of truth for readings; a stored reading could drift from it. |
| Display order | `sortEntries(list)` | A stored order would have to be maintained on every write and could contradict the counts. |
| "Cleared just now" | absence of a previously present entry | Storing it would be a second record of the same fact, and FR-029b adds no summary that needs it. |
| Reading (`romaji`) | `findKana(...).romaji` | Same reason as the pool — Principle III keeps the dataset authoritative. |

An entry whose `(script, kana)` no longer resolves against the dataset is dropped on read (FR-037),
the same way `loadPreferences` already drops unknown group ids.
