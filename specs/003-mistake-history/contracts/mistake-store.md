# Contract: Mistake Store

**Rules module**: `app/src/engine/mistakes.ts` (pure) ·
**Persistence module**: `app/src/state/mistakeStore.ts` (guarded I/O) ·
**Storage**: `localStorage`, key `kana-training.mistakes`

The split is deliberate and required by Principle IV: the rule "three correct in a row clears an
entry" must be executable and testable without touching storage.

The mistake list is **cache-grade** (FR-030). Every path through this module has a working answer
that does not involve stored data, and no function here throws.

---

## Stored shape

```ts
interface StoredMistakes {
  version: 1;
  entries: Array<{
    script: 'hiragana' | 'katakana';
    kana: string;
    missCount: number;    // integer ≥ 1
    streak: 0 | 1 | 2;
    lastMissedAt: string; // ISO 8601
  }>;
}
```

Serialized as JSON. Nothing else is ever written: no submitted text, no direction, no per-quiz
results, no device or user identifier, no session id (FR-039).

---

## Rules API — `engine/mistakes.ts`

```ts
function applyAnswer(
  list: readonly MistakeEntry[],
  kana: Kana,
  firstSubmissionCorrect: boolean,
  now: string,
): MistakeEntry[];

function sortEntries(list: readonly MistakeEntry[]): MistakeEntry[];

function toPool(list: readonly MistakeEntry[]): Kana[];
```

### `applyAnswer`

Pure. Returns a new list; never mutates its input. Implements the lifecycle table in
[data-model.md](../data-model.md) exactly:

- **Correct, entry absent** → unchanged. A kana never missed is never tracked.
- **Correct, `streak < 2`** → `streak + 1`. `missCount` and `lastMissedAt` untouched.
- **Correct, `streak === 2`** → entry removed (FR-009).
- **Wrong, entry absent** → entry created: `missCount 1`, `streak 0`, `lastMissedAt = now`.
- **Wrong, entry present** → `missCount + 1`, `streak = 0`, `lastMissedAt = now` (FR-008).

`now` is a parameter, never read from a clock inside the function — the same discipline the reducer
already applies to the quiz timer, and what makes these transitions deterministic under test.

**Called once per card, with the first submission only.** Passing a later submission is a caller
error and the single most likely way to reintroduce the SC-004 loophole.

### `sortEntries`

`missCount` descending → `lastMissedAt` descending → dataset order ascending (D7). The final
tiebreak is not decoration: without it, equal-count entries can reorder between renders.

### `toPool`

Resolves entries to `Kana` via the dataset. Entries that do not resolve are **omitted silently**
(FR-037). Order is not meaningful — the generator shuffles.

---

## Persistence API — `state/mistakeStore.ts`

```ts
function loadMistakes(): MistakeEntry[];              // always returns a usable list
function saveMistakes(list: readonly MistakeEntry[]): void;   // never throws
function clearMistakes(): void;                        // never throws
```

### `loadMistakes`

Returns a valid list in every circumstance. Returns `[]` — never `null`, never a thrown error.

1. Read inside `try/catch`. **A `try/catch` is required, not a null check** — Safari private mode,
   storage-blocking settings, and preview contexts make the accessor itself *throw*. Same reasoning
   as `preferences.ts`.
2. Missing, unparseable, not an object, or `version !== 1` ⇒ return `[]` (FR-035). No migration is
   attempted: there is no prior version to migrate from, and an unreadable store is discarded rather
   than repaired.
3. `entries` not an array ⇒ return `[]`.
4. Entry-by-entry validation. A malformed entry is **dropped**; it never invalidates the whole list:
   - `script` must be one of the two literals.
   - `kana` must be a non-empty string that resolves against the dataset — unknown kana dropped
     (FR-037), exactly as `loadPreferences` drops unknown group ids.
   - `missCount` must be an integer ≥ 1; otherwise drop the entry.
   - `streak` must be 0, 1, or 2. **A stored 3 or more is clamped to 2, not dropped** — a 3 means a
     write was interrupted between advancing and deleting, and the learner should keep their
     progress rather than lose the entry.
   - `lastMissedAt` must be a string parsing to a valid date; otherwise substitute the epoch. A bad
     timestamp is a display-order problem, never a reason to lose a real mistake.
5. De-duplicate by `(script, kana)`, keeping the entry with the higher `missCount` (FR-005).

**Repair is never surfaced to the learner** (FR-034). No toast, no warning, no "we recovered your
data" message.

### `saveMistakes`

Serializes and writes inside `try/catch`. A failure — quota exceeded, storage disabled, private
mode — is swallowed (FR-036). A failed write must never interrupt the quiz in progress, and the
learner is never asked to do anything about it.

### `clearMistakes`

Removes the key inside `try/catch`. Backs FR-038. Does **not** touch
`kana-training.preferences` — deleting history must not reset the learner's script or card count.

---

## Backup exclusion (FR-032)

**Android**: `android:allowBackup="false"` plus `android:dataExtractionRules` in
`AndroidManifest.xml`. Currently `true` (the Capacitor default), which lets Android Auto Backup copy
WebView storage to the learner's Google account. Removing `INTERNET` does **not** prevent this — the
backup transport is Play services, not the app.

This also fixes the same pre-existing exposure for `kana-training.preferences`.

**iOS**: not fully satisfiable without an async filesystem store. See D4 in
[research.md](../research.md) — recommendation is to accept and document that an encrypted device
backup contains the list. **Requires the user's agreement**, since it knowingly satisfies FR-032 in
part.

**Web**: `localStorage` is not synced by the browser. Nothing to do.

---

## Test obligations

Headless, in `tests/state/mistakeStore.test.ts` and `tests/engine/mistakes.test.ts`:

| # | Case | Expected |
|---|------|----------|
| 1 | Key absent | `[]`, no throw |
| 2 | `getItem` throws | `[]`, no throw |
| 3 | Not JSON | `[]` |
| 4 | `version: 2` | `[]` |
| 5 | One valid entry, one with unknown kana | valid entry only |
| 6 | Stored `streak: 5` | clamped to 2, entry kept |
| 7 | `missCount: 0` or non-integer | entry dropped |
| 8 | Duplicate `(script, kana)` | one entry, higher `missCount` |
| 9 | Invalid `lastMissedAt` | entry kept, epoch substituted |
| 10 | `setItem` throws | `saveMistakes` returns normally |
| 11 | `clearMistakes` | mistakes key gone, preferences key intact |
| 12 | ぬ and ヌ both stored | two distinct entries |
| 13 | Correct on absent entry | list unchanged, no entry created |
| 14 | `streak 2` + correct | entry removed |
| 15 | `streak 2` + wrong | `streak 0`, `missCount + 1` |
| 16 | Cleared kana missed again | returns at `missCount 1`, `streak 0` |
| 17 | Wrong-then-copy ×3 (SC-004) | entry never clears |
| 18 | `sortEntries` with equal counts | stable across repeated calls |
