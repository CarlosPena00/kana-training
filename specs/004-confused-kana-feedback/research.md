# Phase 0 Research: Confused Kana Feedback

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-08-28

Six decisions. D1–D3 decide whether three message types can coexist without ever contradicting each
other; D4 is the one verified against the real dataset rather than reasoned about.

---

## D1 — One function, one result

**Decision**: A single pure function returns at most one note:

```ts
diagnoseAnswer(question: QuizQuestion, raw: string, answerRevealed: boolean): AnswerNote | null
```

`AnswerNote` is a discriminated union of `kana-confusion`, `spelling`, and `script`.

**Rationale**: The risk this feature carries is not difficulty, it is *contradiction*. Three
messages mean an answer could plausibly produce two of them, and a learner told both "you confused
two characters" and "you used the wrong romanization" has been told something false either way. A
single function with a single return value makes two notes structurally impossible rather than
merely unlikely — there is no code path that can emit a second one.

Returning `null` for "nothing to say" keeps the common case — `zzz` — trivial at the call site.

**Alternatives considered**:

- *Three independent predicates the UI queries in turn.* Rejected: the ordering that guarantees
  exactly one note would live in a component, untested and easy to reorder by accident.
- *A list of notes.* Rejected: it invites rendering two, which FR-008a and FR-020d forbid. The type
  should not be able to express a state the spec prohibits.
- *Booleans on the existing answer record.* Rejected: notes are derived and ephemeral (FR-019), and
  putting them on a record would imply they are worth storing.

---

## D2 — The order the three checks run in

**Decision**: Kana confusion is checked first, then the direction-specific second check. Written as
one decision table per direction (full version in [data-model.md](./data-model.md)):

- **Kana → Romaji**: is the answer a canonical reading in this card's script? → *kana confusion*.
  Otherwise, is it a recognised alternate spelling? → *spelling note*. Otherwise nothing.
- **Romaji → Kana**: is the answer a kana in this card's script? → *kana confusion*. Otherwise, is it
  the other script's kana with the same reading the card wanted? → *script note*. Otherwise nothing.

**Rationale**: Kana confusion is both the most informative message and the one the user actually
asked for, so it wins any overlap. The two secondary checks cannot collide with each other because
each is possible in only one direction: a spelling note requires a romaji answer, a script note
requires a kana answer.

That asymmetry is worth stating plainly, because it is not obvious and it is what keeps the table
small: **each direction has exactly two possible notes, never three.**

**Alternatives considered**: checking alternates first (rejected — a learner who types `ru` for ろ
has confused two characters, and calling that a spelling problem would be wrong); scoring the
candidates and picking a best (rejected — unnecessary machinery for a case that cannot tie).

---

## D3 — Where retry suppression lives

**Decision**: `diagnoseAnswer` takes `answerRevealed` and returns `null` when a note would leak the
answer. Suppression is part of the diagnosis, not of the rendering.

While the answer is still hidden:

- a **kana confusion** is returned, but the caller renders only the "you wrote る" half (the note
  carries both sides; FR-015a governs what is shown)
- a **spelling note** is suppressed entirely when its canonical spelling equals the card's expected
  answer (FR-020b)
- a **script note** is suppressed entirely (FR-008c) — naming the other script's character and the
  wanted script together identifies the answer

**Rationale**: The leak is a logic property, not a styling one, and SC-005a asserts it in 100% of
retry cases. Deciding it inside a pure function means it is provable in a unit test; deciding it in
a component means it is provable only by driving a browser.

The asymmetry — kana confusion survives a retry, the other two do not — falls out of what each
message contains. Only the kana confusion has a half that says nothing about the answer.

**Alternatives considered**:

- *Let the component decide.* Rejected: the rule that matters most is the one hardest to test that
  way, and a future component refactor could silently drop it.
- *Suppress all notes during retries.* Rejected: it discards the answer to clarification Q2 and the
  feature's best teaching moment.
- *Redact inside the note.* Rejected: a note that carries the answer in a field the UI is trusted not
  to render is one careless change away from leaking it.

---

## D4 — The alternate-spelling table, verified against the dataset

**Decision**: 19 entries in `app/src/data/alternates.ts`, mapping a non-canonical spelling to this
dataset's canonical one:

```text
si→shi  ti→chi  tu→tsu  hu→fu  zi→ji
sya→sha  syu→shu  syo→sho
tya→cha  tyu→chu  tyo→cho
zya→ja   zyu→ju   zyo→jo
jya→ja   jyu→ju   jyo→jo
dzu→du   dji→di
```

**Verified, not assumed.** Checked against the actual dataset during planning:

- 107 readings per script, and the two scripts have **identical** reading sets
- **zero** proposed alternates collide with a canonical reading
- **every** target is itself a canonical reading

**Rationale**: FR-020a exists because a stock Kunrei-shiki table would break this dataset. `di` and
`du` are the *canonical* readings of ぢ and づ here — a generic table treats `di` as an alternate for
じ, which would tell a learner who correctly typed `di` for ぢ that they had spelled it wrong. The
table is therefore defined against this dataset's canon and asserted disjoint from it by a permanent
test, so the failure mode cannot return when someone extends the table later.

**Deliberately absent**: `ji` for ぢ and `zu` for づ. Both are already canonical readings of
*different* kana (じ, ず), so a learner typing them gets the more useful **kana confusion** — "you
wrote じ" — for free. Adding them as alternates would have shadowed a better message with a worse
one.

**Alternatives considered**: a transliteration library (rejected — a dependency for one small call
site, forbidden by Principle V, and ignorant of this dataset's conventions); generating alternates
by rule (rejected — the rules have exceptions, and 19 explicit entries are auditable in a way a
generator is not); a larger table covering `nn`, `oh`, macrons (rejected for now — YAGNI, and the
table is trivially extensible because it is data).

---

## D5 — What "the same reading" means for a script note

**Decision**: A script note fires only when the kana the learner wrote is the other script's
character with **the same reading the card wanted** — ロ for ろ. A wrong kana in the wrong script —
ル where ろ was wanted — produces **no note**.

**Rationale**: The spec covers "the correct kana in the wrong script" (FR-008) and requires silence
when an answer does not resolve within the card's script (FR-005); it says nothing about being wrong
on both axes at once. Silence is the honest default: a learner who wrote ル for ろ made two mistakes,
and a message naming only one of them would misdescribe what happened. Reporting both would need a
fourth message type for a rare case.

**Alternatives considered**: treating any other-script kana as a script note (rejected — it would
tell a learner who wrote the wrong character that their only problem was the alphabet); a combined
"wrong character and wrong script" note (rejected — a fourth message for a rare case, against
Principle V).

---

## D6 — Where the note renders

**Decision**: One `AnswerNote` component, used in two places: inside `FeedbackPanel` when the answer
is revealed, and inside `Flashcard` during a retry and during a correction round's inline reveal.

**Rationale**: FR-013 requires the feedback area not to grow enough to move the answer input, and
the card area is deliberately fixed-height so the soft keyboard stays put — a property feature 001
worked for and 003 preserved. Reusing one component in both hosts keeps the note's height rules in
one place instead of two.

Correction rounds (feature 003) already reveal the answer inline on the card rather than through the
feedback panel, which is why the second host exists at all.

**Alternatives considered**: a separate block below the card (rejected — it moves the input and
risks pushing "Leave correction round" under the keyboard, which the device testing of feature 003
showed is already tight); a tooltip or expandable (rejected — hides the teaching behind an
interaction, and fails the "user-friendly" requirement outright).

---

## Open items

None. All four clarifications were resolved before planning, and D4's disjointness was verified
against the dataset rather than left as an assumption.
