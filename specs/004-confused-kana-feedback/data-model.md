# Phase 1 Data Model: Confused Kana Feedback

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-08-28

Nothing here is persisted. Every value below is derived from the answer in front of the learner and
discarded when the card advances (FR-019, FR-022). The kana dataset is **unchanged**.

---

## Entity: AnswerNote

At most one note per wrong answer. Modelled as a discriminated union so that "two notes at once" is
not a state the type can express — the property FR-008a and FR-020d depend on.

```ts
export type AnswerNote =
  | { readonly kind: 'kana-confusion'; readonly wrote: Kana; readonly wanted: Kana }
  | { readonly kind: 'spelling'; readonly typed: string; readonly canonical: string }
  | { readonly kind: 'script'; readonly wrote: Kana; readonly wanted: Kana };
```

| Kind | Means | Carries |
|------|-------|---------|
| `kana-confusion` | You wrote a different character | both kana, each with its reading |
| `spelling` | You used a different romanization system | what was typed, and the spelling this app uses |
| `script` | Right character, wrong alphabet | both kana — same reading, different scripts |

**Rules**

- Exactly one note, or none. `diagnoseAnswer` returns a single value or `null`.
- A `spelling` note **never** carries a `Kana` (FR-020d). Naming a character is what makes a note a
  confusion, and a learner who typed `si` did not pick the wrong character.
- A `script` note's two kana always share a reading. If they do not, it is not a script note and no
  note is produced (research D5).
- A `kana-confusion`'s two kana always belong to the same script — the card's (FR-002).
- Notes are never produced for a correct answer (FR-014) or a blank one.

**Why `wanted` is on the note at all**, given a retry must not reveal it: the note is a complete
description of what happened, and the caller decides how much of it to render. Splitting it into two
types by visibility would double the union for a rendering concern. The suppression rules that
matter — the ones that could leak the answer — are enforced in the engine before the note is
returned (research D3).

---

## Reference data: alternate spellings

`app/src/data/alternates.ts`. Reference data, so it sits beside the kana dataset rather than inside
the engine (Principle III).

```ts
export const ALTERNATE_SPELLINGS: Readonly<Record<string, string>>;
```

Nineteen entries, non-canonical spelling → this dataset's canonical spelling:

| Typed | This app uses | | Typed | This app uses |
|-------|---------------|---|-------|---------------|
| `si` | `shi` | | `zya` | `ja` |
| `ti` | `chi` | | `zyu` | `ju` |
| `tu` | `tsu` | | `zyo` | `jo` |
| `hu` | `fu` | | `jya` | `ja` |
| `zi` | `ji` | | `jyu` | `ju` |
| `sya` | `sha` | | `jyo` | `jo` |
| `syu` | `shu` | | `dzu` | `du` |
| `syo` | `sho` | | `dji` | `di` |
| `tya` | `cha` | | | |
| `tyu` | `chu` | | | |
| `tyo` | `cho` | | | |

**Invariants**, asserted permanently in `tests/data/dataset.test.ts`:

1. **No key is a canonical reading.** Verified during planning: zero collisions. This is the
   invariant FR-020a exists for — `di` and `du` are the canonical readings of ぢ and づ in this
   dataset, so a stock Kunrei table would tell a learner who correctly typed `di` that they had
   misspelled it.
2. **Every value is a canonical reading.** Verified: all 19 targets resolve. A note must never point
   at a spelling the app would itself reject.
3. **Keys are lowercase and trimmed**, matching what normalization produces.

**Deliberately absent**: `ji` for ぢ and `zu` for づ. Both are canonical readings of *other* kana
(じ, ず), so a learner typing them receives the more useful kana confusion — "you wrote じ" — instead.
Listing them as alternates would shadow a better message with a worse one.

---

## The decision table

`diagnoseAnswer(question, raw, answerRevealed)`. Read top to bottom; the first row that matches wins.

**Preconditions** — these produce `null` before any lookup:

| Condition | Result |
|-----------|--------|
| The answer is blank | `null` |
| The answer is correct | `null` (FR-014) |

**Kana → Romaji** — the learner should have typed a reading:

| The normalized answer is… | Result |
|---------------------------|--------|
| a canonical reading in the card's script, of a different kana | `kana-confusion` |
| a recognised alternate spelling, and the answer is revealed | `spelling` |
| a recognised alternate spelling whose canonical form **is** this card's answer, and the answer is hidden | `null` — it would state the answer (FR-020b) |
| a recognised alternate spelling whose canonical form is *not* this card's answer, and the answer is hidden | `spelling` |
| anything else | `null` |

**Romaji → Kana** — the learner should have written a character:

| The normalized answer is… | Result |
|---------------------------|--------|
| a kana in the card's script, other than the one wanted | `kana-confusion` |
| the other script's kana **with the reading the card wanted**, and the answer is revealed | `script` |
| the other script's kana with the reading the card wanted, and the answer is hidden | `null` (FR-008c) |
| the other script's kana with some other reading | `null` (research D5) |
| anything else | `null` |

**Consequences worth stating**

- **A spelling note is only possible in Kana → Romaji**, and a **script note only in Romaji → Kana**.
  Neither direction can produce all three, which is what keeps the table small.
- **A kana confusion survives a retry; the other two do not.** Only a kana confusion has a half —
  "you wrote る" — that says nothing about the answer.
- **A script note cannot occur in Kana → Romaji.** Both scripts share readings, so answering `ro` to
  ろ is simply correct.

---

## Rendering contract

What the caller may show, by state. The engine has already suppressed anything that would leak.

| Note | Answer hidden (retry) | Answer revealed |
|------|-----------------------|-----------------|
| `kana-confusion` | `wrote` only — its character and reading | both, side by side, labelled |
| `spelling` | the note as returned (never states this card's answer) | the note as returned |
| `script` | never returned | both characters, with their scripts named |

**Presentation rules that are requirements, not styling** (FR-010 – FR-013):

- Both characters are shown at a size comparable to the card, not inline in a sentence.
- Which one was wanted and which was written is stated **in words** — never by colour or position
  alone (WCAG 1.4.1).
- The note is announced to assistive technology as one statement, not as loose characters.
- The note must not grow the feedback area enough to move the answer input or the control beneath
  it. Feature 003's device testing showed that space is already tight with a soft keyboard open.

---

## Derived, never stored

| Value | Derived from | Why not stored |
|-------|--------------|----------------|
| The note | the current question and the raw answer | It is a description of one moment; FR-019 forbids keeping it |
| The kana a reading belongs to | dataset reverse lookup | The dataset is the source of truth; a copy could drift |
| Whether the answer is revealed | existing session state | Already known — attempts spent, or a correction round |

No new field is added to `AnswerRecord`, `QuizSession`, or the mistake list. This feature reads and
displays; it writes nothing.
