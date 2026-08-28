# Contract: Correction Round

**Modules**: `app/src/engine/generate.ts` · `app/src/engine/pool.ts` · `app/src/engine/score.ts` ·
`app/src/state/quizReducer.ts`

A correction round is an ordinary quiz with two behavioral differences and one presentation
difference. It uses the same generator, the same normalizer, and the same validator — Principle IV
permits exactly one of each.

---

## Generation

`generateQuiz` is split so that pool construction and question construction are separable:

```ts
function buildQuestions(
  pool: readonly Kana[],
  cardCount: number,
  direction: DirectionSetting,
  rng: Rng,
): QuizQuestion[];

function generateQuiz(config: QuizConfiguration, rng?: Rng): QuizQuestion[];   // unchanged behavior
```

`generateQuiz` builds its pool from `config.script` + `selectedGroupIds` and delegates. A correction
round calls `buildQuestions` directly with `toPool(mistakeList)`, which may contain both scripts.

**Invariants that must not regress**

- Sampling stays **shuffle-then-take**, never retry-until-unique, so "a kana at most once" (FR-028)
  is structural rather than probabilistic.
- `rng` stays injectable, so a correction round is as deterministic under test as any other.
- `direction: 'both'` still randomizes per card, drawing from the same `rng`.
- A pool entry is a `Kana`, which already carries `script` — so a mixed-script round needs **no type
  change** to `QuizQuestion` (FR-020b).

### Validation before starting

```ts
function validateCorrectionRound(poolSize: number, cardCount: number): ValidationResult;
```

Reuses the existing `ConfigurationError` values. `NO_KANA_SELECTED` when the list is empty (FR-021),
`CARD_COUNT_EXCEEDS_POOL` when the learner asks for more cards than entries (FR-027). Never silently
truncates or pads — the constitution requires invalid configurations to be refused at the UI with
clear feedback.

The list being empty **for the current script** is not a reason to refuse: a correction round ignores
the selected script entirely (FR-020a).

---

## The advance rule

The only change to the session state machine. In the reducer's `continue` case:

```text
mode === 'standard'                                → advance (unchanged)
mode === 'correction' AND last submission wrong    → stay on currentIndex, status 'active'
mode === 'correction' AND last submission correct  → advance
```

`currentIndex` does not move while a card is uncorrected, so the re-presented card is literally the
same question object and the same `AnswerRecord` keeps accumulating submissions (FR-028: it is the
same card, not a new one).

**Consequences**

- No attempt limit applies (FR-026). `configuration.attemptsAllowed` is not read when
  `mode === 'correction'`.
- There is no upper bound on submissions for one card (FR-024).
- The round cannot end with an uncorrected card except by abandoning it (FR-025). `abandon` remains
  available from every card and is unchanged.
- `firstSubmissionCorrect` is already frozen by the time any of this runs, so no amount of retrying
  alters what the mistake list records (FR-012).

---

## Scoring

```ts
function scoreSession(session: QuizSession): SessionScore;   // branches on session.mode
```

| Mode | Correct means |
|------|---------------|
| `standard` | `record.isCorrect` — unchanged, partial credit by attempt (1, ½, ⅓) |
| `correction` | `record.firstSubmissionCorrect` — binary, no partial credit |

In `correction`, `points === correctCount` and `accuracy` is the plain percentage of cards answered
right on sight. `byAttempt` is not meaningful and is not shown.

**Why this matters**: forced correction guarantees `isCorrect === true` for every card in a
correction round. Scoring on `isCorrect` would report every round as 100%, contradicting the mistake
list the learner sees seconds later. This is the failure SC-005a exists to catch.

First-submission scoring applies to correction rounds **only** — ordinary quizzes keep partial credit
(FR-029c, FR-041).

The results screen itself is unchanged: no correction-specific summary is added (FR-029b). What was
cleared is seen by opening the mistake list.

---

## Presentation

### Script label (FR-020c)

`Flashcard` gains an optional `scriptLabel?: string`. `QuizScreen` supplies it only when **both**
hold:

- `session.mode === 'correction'`, and
- `question.direction === 'romaji-to-kana'`

Rendered inside the card, below the romaji prompt, and included in the card's accessible name so a
screen reader announces "nu, write in Katakana" as one unit rather than two.

A Kana → Romaji card gets no label — the character is unambiguous on its own (FR-020e). An ordinary
quiz gets no label in any direction (FR-041).

### Feedback panel (FR-023a)

On a wrong answer in a correction round the panel shows the prompt, what the learner typed, and the
correct answer — and **keeps the correct answer visible while they retype it**. A correction round is
a copying drill, not a second recall test, and must always be completable.

The existing panel already shows all three on a wrong answer; the change is that it persists through
the retry instead of being replaced by a bare prompt.

---

## Test obligations

Headless (`tests/engine/`, `tests/state/`):

| # | Case | Expected |
|---|------|----------|
| 1 | Pool with both scripts | round contains cards of both; each card's script comes from its own kana |
| 2 | Seeded `rng`, mixed pool | identical output across runs |
| 3 | Pool of 1, `cardCount 1` | round starts; one card |
| 4 | `cardCount > poolSize` | `CARD_COUNT_EXCEEDS_POOL`; nothing generated |
| 5 | Empty list | `NO_KANA_SELECTED` |
| 6 | Katakana-only list while script is Hiragana | round runs on the Katakana entries |
| 7 | Wrong answer, `continue` | `currentIndex` unchanged, status `active` |
| 8 | Wrong ×5 then correct | still one card, one record, 6 submissions, then advances |
| 9 | `attemptsAllowed: 1`, wrong answer | still does not advance — attempts ignored in correction |
| 10 | 10 cards, 6 wrong first | score reports 4 correct / 6 incorrect, not 10 |
| 11 | Same session in `standard` mode | partial credit unchanged |
| 12 | `abandon` on an uncorrected card | leaves the round; recorded first submissions persist |
| 13 | ぬ card, answer ヌ | wrong (FR-020d) — no new validator rule needed |

End-to-end (`tests/e2e/mistakes.spec.ts`), for what only a rendered page can prove:

| # | Case | Expected |
|---|------|----------|
| 14 | Wrong answer in correction round | correct answer stays visible while retyping |
| 15 | Romaji → Kana correction card | script named in the prompt and in its accessible name |
| 16 | Quit from a held card | always reachable, including with the soft keyboard open |
| 17 | History screen, 214 entries | renders within a frame; axe pass; 44×44 targets; focus order |
