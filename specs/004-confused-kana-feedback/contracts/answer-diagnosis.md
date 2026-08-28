# Contract: Answer Diagnosis

**Module**: `app/src/engine/diagnose.ts` (pure) ·
**Reference data**: `app/src/data/alternates.ts` ·
**Lookup**: `app/src/data/index.ts`

One function decides what — if anything — to tell a learner about a wrong answer. It returns at most
one note, so two contradictory messages cannot reach the screen.

This module **reads**. It never writes, never stores, and never changes what counts as correct.

---

## API

```ts
function diagnoseAnswer(
  question: QuizQuestion,
  raw: string,
  answerRevealed: boolean,
): AnswerNote | null;
```

```ts
// app/src/data/index.ts
function findByRomaji(script: Script, romaji: string): Kana | undefined;
```

`findByRomaji` mirrors the existing `findKana` and is unambiguous because romaji is unique within a
script — the guarantee feature 001 established and `tests/data/dataset.test.ts` asserts.

### Guarantees

- **At most one note.** A single return value; the union cannot express two.
- **Pure.** No clock, no storage, no React. Same inputs, same output, always.
- **Never authoritative about correctness.** `diagnoseAnswer` calls `checkAnswer` to learn that the
  answer was wrong; it does not re-implement that judgement. There remains exactly one validator
  (Principle IV).
- **Never widens what is accepted.** The alternate table is consulted only after `checkAnswer` has
  returned false, and its output is a string to display, never a comparison input. No path exists in
  which a table entry makes an answer correct (Principle III, FR-020c).
- **Never leaks a hidden answer.** With `answerRevealed: false`, no returned note contains this
  card's expected answer in a field the caller is expected to render.

### Order of evaluation

1. Blank answer → `null`.
2. `checkAnswer(question, raw)` is true → `null`. The feature never comments on a right answer.
3. Normalize once, with the existing `normalizeAnswer`, so diagnosis and grading agree about what
   was typed (FR-004).
4. Apply the direction's decision table from [data-model.md](../data-model.md).

Kana confusion is checked before the direction-specific note, so it wins any overlap (research D2).

---

## Behaviour by case

**Kana → Romaji** (card shows a character, learner types a reading)

| Card | Typed | Result |
|------|-------|--------|
| ろ | `ru` | `kana-confusion` — wrote る, wanted ろ |
| ロ | `ru` | `kana-confusion` — wrote ル, wanted ロ (card's script, not Hiragana) |
| ろ | `si` | `spelling` — this app uses `shi` |
| し | `si`, answer revealed | `spelling` — this app uses `shi` |
| し | `si`, attempts remain | `null` — the note would state the answer (FR-020b) |
| ろ | `zzz` | `null` |
| ろ | `ro` | `null` — correct |
| ろ | `di` | `kana-confusion` — wrote ぢ. `di` is canonical here, not an alternate |

**Romaji → Kana** (card shows a reading, learner writes a character)

| Card wants | Typed | Result |
|------------|-------|--------|
| ろ | る | `kana-confusion` — wrote る, wanted ろ |
| ろ | ロ, answer revealed | `script` — ロ is Katakana, this card wants Hiragana |
| ろ | ロ, attempts remain | `null` (FR-008c) |
| ろ | ル | `null` — wrong character *and* wrong script (research D5) |
| ろ | `zzz` | `null` |
| ろ | ろ | `null` — correct |

**Both directions**

| Typed | Result |
|-------|--------|
| `RU`, ` ru `, `ru` | identical — normalization is shared with grading |
| a decomposed kana from an IME | identical to its composed form |
| `kya` | `kana-confusion` naming きゃ — a single dataset entry, not two kana |
| `ruro`, `るろ` | `null` — several kana is not one confusion (FR-006) |
| `` (blank) | `null` |

---

## Test obligations

Headless, in `tests/engine/diagnose.test.ts`:

| # | Case | Expected |
|---|------|----------|
| 1 | ろ card, `ru` | kana-confusion, wrote る |
| 2 | Katakana ロ card, `ru` | wrote ル — the card's script, never Hiragana |
| 3 | Romaji → Kana wanting ろ, answer る | kana-confusion |
| 4 | Romaji → Kana wanting ろ, answer ロ, revealed | script note |
| 5 | Same, attempts remain | `null` |
| 6 | Romaji → Kana wanting ろ, answer ル | `null` |
| 7 | ろ card, `si` | spelling note, canonical `shi` |
| 8 | し card, `si`, revealed | spelling note |
| 9 | し card, `si`, attempts remain | `null` |
| 10 | ろ card, `di` | kana-confusion naming ぢ, never a spelling note |
| 11 | Correct answer, either direction | `null` |
| 12 | Blank, whitespace-only | `null` |
| 13 | `zzz`, `123`, an emoji | `null` |
| 14 | `RU`, ` ru `, `ru` | identical results |
| 15 | Decomposed vs composed kana | identical results |
| 16 | `kya` on a きゃ-family card | one confusion naming きゃ |
| 17 | `ruro` and `るろ` | `null` |
| 18 | Every canonical reading, both scripts, both directions | never throws; never returns a note whose `wanted` differs from the card |
| 19 | Every alternate-table key, answer hidden | no returned note contains the card's expected answer |

Dataset invariants, in `tests/data/dataset.test.ts`:

| # | Case | Expected |
|---|------|----------|
| 20 | No alternate key is a canonical reading | zero collisions — the FR-020a guard |
| 21 | Every alternate value is a canonical reading | all resolve |
| 22 | Keys are lowercase and trimmed | match what normalization produces |
| 23 | `findByRomaji` resolves every entry, both scripts | round-trips with `findKana` |
| 24 | `findByRomaji` returns undefined for an unknown reading | no throw |

End-to-end, in `tests/e2e/confusion.spec.ts`:

| # | Case | Expected |
|---|------|----------|
| 25 | Answer ろ with `ru` | both characters visible, each with its reading, labelled in words |
| 26 | The same, at 320 px | nothing clipped, no sideways scroll, input has not moved |
| 27 | Three-attempt card, tries remaining | る named; ろ and `ro` nowhere on screen (SC-005a) |
| 28 | し card, `si`, tries remaining | no spelling note at all |
| 29 | Correction round, Katakana card | the kana named belongs to the card, not the selected script |
| 30 | Screen reader | announced as one statement, not loose characters |
| 31 | Answer `zzz` | feedback identical to today, no empty space where a note would be |
