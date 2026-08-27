# Contract: Quiz Engine

**Module**: `app/src/engine/` | **Consumers**: `app/src/state/quizReducer.ts` and the three screens

This is the contract Principle IV protects. Every function here is pure, synchronous, and free of
React, DOM, storage, and timer references. Anything that cannot be called from a bare Node process is
in the wrong file.

---

## Types

```ts
type Script    = 'hiragana' | 'katakana';
type Direction = 'kana-to-romaji' | 'romaji-to-kana';
type DirectionSetting = Direction | 'both';
type Rng = () => number;   // uniform in [0, 1), same shape as Math.random
```

---

## `pool.ts`

```ts
function buildPool(script: Script, selectedGroupIds: readonly GroupId[]): Kana[];
```

- Returns every kana of `script` whose `groupId` is in `selectedGroupIds`, in dataset order.
- Unknown group ids are ignored, never thrown on (stale preferences must not crash the app).
- Duplicate ids in the input produce no duplicate output.
- Returns `[]` for an empty selection — an empty pool is a validation concern, not an error here.

```ts
function validateConfiguration(config: QuizConfiguration): ValidationResult;

type ValidationResult =
  | { ok: true;  poolSize: number }
  | { ok: false; poolSize: number;
      error: 'NO_KANA_SELECTED' | 'CARD_COUNT_TOO_LOW'
           | 'CARD_COUNT_NOT_INTEGER' | 'CARD_COUNT_EXCEEDS_POOL' };
```

- The single source of truth for "can this quiz start?" — the configuration screen and `generateQuiz`
  both call it, so the UI cannot disagree with the engine (FR-012, FR-013).
- `poolSize` is always returned so the UI can name the maximum in its message.

---

## `generate.ts`

```ts
function generateQuiz(
  config: QuizConfiguration,
  rng: Rng = Math.random,
): QuizQuestion[];
```

**Guarantees**

1. Throws if `validateConfiguration(config)` fails — an invalid quiz is never silently truncated.
2. Returns exactly `config.cardCount` questions (FR-015).
3. Every question's kana comes from `buildPool(config.script, config.selectedGroupIds)` (FR-015).
4. No kana appears twice, whatever direction its card received (FR-016). Guaranteed structurally:
   Fisher–Yates shuffle of a copy of the pool, then `slice(0, cardCount)` — never a
   retry-until-unique loop.
5. Direction per question: for `'kana-to-romaji'` / `'romaji-to-kana'` every card gets that direction;
   for `'both'` each card draws independently from `rng` (FR-018).
6. `prompt` and `expectedAnswer` are derived from the card's own direction, never recomputed later.
7. Given the same `config` and the same seeded `rng`, output is identical — the property the tests
   rely on (Principle IV).
8. `rng` is the only source of nondeterminism. No `Date`, no `crypto`, no module-level state.

---

## `normalize.ts`

```ts
function normalizeAnswer(raw: string): string;
```

The one place input is cleaned. Applied to the learner's input and to the expected value alike, so the
two sides can never drift apart.

- Trims leading and trailing whitespace, including full-width space `U+3000` (FR-026).
- Lowercases (FR-025). Safe for kana: the operation leaves Japanese characters untouched.
- Applies Unicode NFC normalization, so a decomposed `が` typed by an IME equals the composed `が` in
  the dataset.
- Does **not** strip internal spaces, punctuation, or macrons, and does **not** translate between
  romanization systems (FR-005).

```ts
function isBlank(raw: string): boolean;   // true when normalizeAnswer(raw) === ''
```

---

## `validate.ts`

```ts
function checkAnswer(question: QuizQuestion, raw: string): boolean;
```

- Returns `normalizeAnswer(raw) === normalizeAnswer(question.expectedAnswer)`. One comparison, both
  directions, both scripts (FR-028).
- Callers must reject blanks via `isBlank` before calling; `checkAnswer('')` is simply `false` and
  must not be recorded as an answer (FR-023).
- Because romaji is unique per script (see [kana-dataset.md](./kana-dataset.md)), a Romaji → Kana card
  has exactly one accepted kana, and a Hiragana prompt is never satisfied by the Katakana character.

---

## `score.ts`

```ts
function pointsFor(record: AnswerRecord): number;
function isResolved(record: AnswerRecord, attemptsAllowed: number): boolean;
function scoreSession(session: QuizSession): SessionScore;

interface SessionScore {
  correctCount: number;  // cards eventually answered correctly
  incorrectCount: number;
  points: number;        // 1 / (attempts used) per correct card, 0 otherwise
  accuracy: number;      // whole percent, 0-100, from points; 0 when nothing is resolved
  byAttempt: number[];   // cards solved on attempt 1, 2, 3 … indexed from 0
  missedKana: Kana[];    // never-correct cards, in the order they appeared; [] on a perfect run
}
```

- Derived from `session.answers` on demand — never a stored counter that can drift from the records.
- **Only resolved records count.** `isResolved` is false while a card was answered wrongly but still
  has attempts left; such a card is neither correct nor incorrect and is excluded from the accuracy
  denominator (FR-047), so the running tally never calls a card a miss before the learner is done
  with it.
- `pointsFor` is the credit rule in one line: `1 / submissions.length` for a correct card. With one
  attempt allowed this collapses to 1 point per correct card, so scoring is unchanged from before the
  option existed (SC-011).
- `missedKana` is what the results screen lists (FR-033a); an empty array means the list is not
  rendered at all, rather than rendered empty.

---

## Test obligations

`tests/engine/` must cover, at minimum:

| Area | Assertion | Source |
|------|-----------|--------|
| Count | `generateQuiz` returns exactly `cardCount` questions across many pool sizes | FR-015, SC-002 |
| No repetition | Over ≥ 1,000 generated quizzes spanning all three direction settings, no kana repeats within a quiz | FR-016, SC-002 |
| Scope | Every generated kana belongs to a selected group; no kana from an unselected group ever appears | FR-015, SC-002 |
| Direction | Each setting produces the right prompts; `'both'` yields both kinds and varies per card | FR-014, FR-018 |
| Pool limit | `cardCount > poolSize` throws from `generateQuiz` and fails `validateConfiguration` | FR-012 |
| Single-kana pool | A pool of 1 produces a valid 1-card quiz | Edge case |
| Determinism | Same seed ⇒ identical output; different seeds ⇒ different order | Principle IV |
| Validation | `a` === `A`, `" a "` === `a`, full-width space trimmed, NFC-decomposed kana matches | FR-025, FR-026 |
| Rejection | Wrong answers, near misses (`si` for `shi`), and cross-script answers all return `false` | FR-005, FR-027 |
| Blank | `isBlank` catches `''`, `'   '`, and `'　'` | FR-023 |
| Scoring | Counts, rounded accuracy, and `missedKana` order; empty on a perfect run | FR-032, FR-033a |
| Partial credit | 1 / ½ / ⅓ per attempt; nothing for a never-correct card; a one-attempt quiz scores as a plain tally | FR-046, SC-011 |
| Open cards | A card with attempts left counts as neither correct nor incorrect and is out of the denominator | FR-047 |
| Attempt breakdown | `byAttempt` tallies cards solved on each attempt | FR-033b |
| Purity | No file in `app/src/engine/` imports from `react`, `../screens`, `../components`, or `../state` | Principle IV |
