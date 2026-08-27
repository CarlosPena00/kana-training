# Contract: Stored Preferences

**Module**: `app/src/state/preferences.ts` | **Storage**: `localStorage`, key
`kana-training.preferences`

Preferences are a convenience, never a dependency. FR-037 requires the app to be fully functional when
this storage is missing, unreadable, or cleared, so every path through this module has a working
answer that does not involve stored data.

---

## Stored shape

```ts
interface StoredPreferences {
  version: 1;
  script: 'hiragana' | 'katakana';
  selectedGroupIds: string[];
  cardCount: number;
  direction: 'kana-to-romaji' | 'romaji-to-kana' | 'both';
  attemptsAllowed: 1 | 3;
}
```

Serialized as JSON. Nothing else is ever written: no results, no history, no per-kana statistics, no
device or user identifier, no timestamps (FR-036).

---

## API

```ts
function loadPreferences(): QuizConfiguration;   // always returns a usable configuration
function savePreferences(config: QuizConfiguration): void;   // never throws
function clearPreferences(): void;               // never throws
```

### `loadPreferences`

Returns a valid `QuizConfiguration` in every circumstance. The sequence:

1. Read the key inside `try/catch`. **A `try/catch` is required, not a null check** — Safari private
   mode, storage-blocking settings, and thumbnail/preview contexts make the accessor *throw* rather
   than return `null`.
2. Missing, unparseable, not an object, or `version !== 1` ⇒ return `DEFAULT_CONFIGURATION`.
3. Field-by-field validation, each falling back to its default independently:
   - `script` must be one of the two literals.
   - `selectedGroupIds` must be an array; unknown ids are **dropped silently** (a dataset change must
     not resurrect a group that no longer exists). If dropping leaves it empty, fall back to the
     default main-kana selection.
   - `direction` must be one of the three literals.
   - `attemptsAllowed` must be exactly `1` or `3`; anything else falls back to `1`.
   - `cardCount` must be a positive integer; it is then clamped to the current pool size so a stored
     count can never produce an unstartable configuration (FR-012).
4. Return the repaired configuration. Repair is never surfaced to the learner as an error — they see a
   working configuration screen, which is the whole point of FR-037.

### `DEFAULT_CONFIGURATION`

```ts
{
  script: 'hiragana',
  selectedGroupIds: [ /* the ten main.* ids */ ],
  cardCount: 10,
  direction: 'both',
  attemptsAllowed: 1,
}
```

Chosen so a first-time learner can press Start immediately (SC-001).

### `savePreferences`

- Called when the learner starts a quiz — the moment the configuration is known to be valid and
  intentional. Not called on every keystroke.
- The entire body is wrapped in `try/catch`; a quota, permission, or serialization failure is swallowed
  silently. A failed save must never interrupt a quiz that is about to start.

---

## Test obligations

| Case | Expected |
|------|----------|
| Nothing stored | Defaults returned |
| Malformed JSON | Defaults returned, no throw |
| `version: 0` or missing version | Defaults returned |
| Unknown group ids mixed with valid ones | Unknown dropped, valid kept |
| All group ids unknown | Falls back to default selection, not an empty pool |
| `cardCount` above the current pool size | Clamped to pool size |
| `cardCount` of `0`, `-1`, `2.5`, or `"10"` | Default `10` |
| Accessor throws on read | Defaults returned, no throw |
| Accessor throws on write | `savePreferences` returns normally |
| Stored `attemptsAllowed` of `7` or `'3'` | Falls back to `1` |
| Round trip | `save` then `load` reproduces the configuration |
