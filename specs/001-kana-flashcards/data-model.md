# Phase 1 Data Model: Kana Flashcards

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-08-27

All types live in `app/src/models/types.ts`. The data itself lives in `app/src/data/` and imports
nothing from React, the engine, or any screen — Principle III.

---

## Entity: Kana

One character in one script. The atomic unit a quiz draws from.

| Field | Type | Notes |
|-------|------|-------|
| `kana` | `string` | The character(s) — one code point for main/dakuten, two for combination kana (e.g. `きゃ`). |
| `romaji` | `string` | Canonical romanization, lowercase. Unique within a script (see D4 in [research.md](./research.md)). |
| `script` | `'hiragana' \| 'katakana'` | Which script this entry belongs to. |
| `groupId` | `GroupId` | The group that owns it. Identical group ids across both scripts. |

**Rules**

- `kana` is unique within a script (FR-016 treats it as the card's identity).
- `romaji` is unique within a script, so `romaji → kana` inverts unambiguously (FR-005, FR-027).
- `romaji` is stored lowercase; case-insensitivity is a comparison concern, not a storage one (FR-025).
- No entry exists outside a group, and no group is empty (FR-001a).

---

## Entity: KanaGroup

A selectable row or family. Groups are **script-independent**: the same 27 ids describe Hiragana and
Katakana, which is what makes FR-009a (selection survives a script switch) a non-event.

| Field | Type | Notes |
|-------|------|-------|
| `id` | `GroupId` | Stable string id, e.g. `main.ka`, `dakuten.ga`, `combo.kya`. Persisted in preferences. |
| `section` | `'main' \| 'dakuten' \| 'combination'` | Which section of the configuration screen it renders in. |
| `label` | `Record<Script, string>` | The representative kana shown on the toggle, per script (`か` / `カ`). |
| `order` | `number` | Display order within the section. |

### The 27 groups

**Main — 10 groups, 46 kana**

| Group id | Hiragana | Katakana | Romaji |
|----------|----------|----------|--------|
| `main.a` | あいうえお | アイウエオ | a i u e o |
| `main.ka` | かきくけこ | カキクケコ | ka ki ku ke ko |
| `main.sa` | さしすせそ | サシスセソ | sa shi su se so |
| `main.ta` | たちつてと | タチツテト | ta chi tsu te to |
| `main.na` | なにぬねの | ナニヌネノ | na ni nu ne no |
| `main.ha` | はひふへほ | ハヒフヘホ | ha hi fu he ho |
| `main.ma` | まみむめも | マミムメモ | ma mi mu me mo |
| `main.ya` | やゆよ | ヤユヨ | ya yu yo |
| `main.ra` | らりるれろ | ラリルレロ | ra ri ru re ro |
| `main.wa` | わをん | ワヲン | wa wo n |

**Dakuten / Handakuten — 5 groups, 25 kana**

| Group id | Hiragana | Katakana | Romaji |
|----------|----------|----------|--------|
| `dakuten.ga` | がぎぐげご | ガギグゲゴ | ga gi gu ge go |
| `dakuten.za` | ざじずぜぞ | ザジズゼゾ | za ji zu ze zo |
| `dakuten.da` | だぢづでど | ダヂヅデド | da di du de do |
| `dakuten.ba` | ばびぶべぼ | バビブベボ | ba bi bu be bo |
| `dakuten.pa` | ぱぴぷぺぽ | パピプペポ | pa pi pu pe po |

**Combination (yōon) — 12 groups, 36 kana**

| Group id | Hiragana | Katakana | Romaji |
|----------|----------|----------|--------|
| `combo.kya` | きゃ きゅ きょ | キャ キュ キョ | kya kyu kyo |
| `combo.sha` | しゃ しゅ しょ | シャ シュ ショ | sha shu sho |
| `combo.cha` | ちゃ ちゅ ちょ | チャ チュ チョ | cha chu cho |
| `combo.nya` | にゃ にゅ にょ | ニャ ニュ ニョ | nya nyu nyo |
| `combo.hya` | ひゃ ひゅ ひょ | ヒャ ヒュ ヒョ | hya hyu hyo |
| `combo.mya` | みゃ みゅ みょ | ミャ ミュ ミョ | mya myu myo |
| `combo.rya` | りゃ りゅ りょ | リャ リュ リョ | rya ryu ryo |
| `combo.gya` | ぎゃ ぎゅ ぎょ | ギャ ギュ ギョ | gya gyu gyo |
| `combo.ja` | じゃ じゅ じょ | ジャ ジュ ジョ | ja ju jo |
| `combo.dya` | ぢゃ ぢゅ ぢょ | ヂャ ヂュ ヂョ | dya dyu dyo |
| `combo.bya` | びゃ びゅ びょ | ビャ ビュ ビョ | bya byu byo |
| `combo.pya` | ぴゃ ぴゅ ぴょ | ピャ ピュ ピョ | pya pyu pyo |

**Totals**: 107 kana per script, 214 entries overall. The largest possible pool is therefore 107, so
every card-count preset up to 50 is reachable with a full selection.

**Excluded deliberately** (spec Assumptions): ゐ/ゑ/ヰ/ヱ (obsolete), っ/ッ (sokuon — not a syllable
with its own reading), ヴ and extended katakana (ファ, ティ…), and long-vowel notation.

---

## Entity: QuizConfiguration

What the learner chose before starting. Persisted verbatim (see [contracts/preferences.md](./contracts/preferences.md)).

| Field | Type | Notes |
|-------|------|-------|
| `script` | `Script` | Default `'hiragana'` (FR-007). |
| `selectedGroupIds` | `GroupId[]` | Shared across scripts (FR-009a). Default: the 10 `main.*` ids. |
| `cardCount` | `number` | Integer ≥ 1. Default `10`. |
| `direction` | `'kana-to-romaji' \| 'romaji-to-kana' \| 'both'` | Default `'both'` (FR-014). |
| `attemptsAllowed` | `1 \| 3` | Tries per card before the answer is revealed. Default `1` (FR-043). |

**Derived, never stored**: `pool` — the unique kana produced by resolving `selectedGroupIds` against
`script`. `poolSize` is what the UI displays (FR-010) and what bounds `cardCount`.

**Validation** (one function, `validateConfiguration`, used by both the UI and the generator):

| Rule | Source | Failure |
|------|--------|---------|
| `selectedGroupIds` is non-empty | FR-013 | `NO_KANA_SELECTED` |
| `cardCount >= 1` | FR-011 | `CARD_COUNT_TOO_LOW` |
| `cardCount` is an integer | Assumptions | `CARD_COUNT_NOT_INTEGER` |
| `cardCount <= poolSize` | FR-012 | `CARD_COUNT_EXCEEDS_POOL` (carries `poolSize` so the UI can name the maximum) |
| every `groupId` is known | FR-037 (stale prefs) | Unknown ids are dropped on load, not reported as an error |

---

## Entity: QuizQuestion

One generated card. Immutable once generated.

| Field | Type | Notes |
|-------|------|-------|
| `kana` | `Kana` | The underlying entry. Its `kana` value is the card's identity for FR-016. |
| `direction` | `'kana-to-romaji' \| 'romaji-to-kana'` | Concrete — never `'both'`. Assigned per card (FR-018). |
| `prompt` | `string` | `kana.kana` or `kana.romaji` depending on `direction`. |
| `expectedAnswer` | `string` | The other one. Exactly one correct answer per card. |

---

## Entity: QuizSession

One run through a generated set.

| Field | Type | Notes |
|-------|------|-------|
| `configuration` | `QuizConfiguration` | The snapshot the session was generated from; reused verbatim by "Practice Again" (FR-034). |
| `questions` | `QuizQuestion[]` | Length `=== configuration.cardCount` (FR-015). |
| `currentIndex` | `number` | 0-based. `currentIndex + 1` is shown to the learner (FR-019). |
| `answers` | `AnswerRecord[]` | One per answered question, in order. Retained for the whole session so results can list misses (FR-033a). |
| `status` | `'configuring' \| 'active' \| 'awaiting-continue' \| 'complete'` | See transitions below. |
| `startedAt` | `number` | Epoch ms, stamped when the quiz starts (FR-048). |
| `completedAt` | `number \| null` | Epoch ms, stamped when the last card is answered; null until then. |

### AnswerRecord

One record **per question**, not per submission: a card can take several tries and the record
accumulates them.

| Field | Type | Notes |
|-------|------|-------|
| `questionIndex` | `number` | Index into `questions`. |
| `submissions` | `string[]` | Every answer given for this card, raw and in order, kept as typed so incorrect feedback can echo the last one (FR-031). |
| `isCorrect` | `boolean` | Whether any submission was correct. |

A record is **resolved** when `isCorrect` is true or `submissions.length >= attemptsAllowed`.
An unresolved record is a card still open for retries: it counts as neither correct nor incorrect
and stays out of the accuracy denominator (FR-047).

### Derived score (computed, never stored)

Computed from the **resolved** records only:

- `correctCount` / `incorrectCount` — cards eventually answered correctly, and cards never answered
  correctly.
- `points` — credit earned, `1 / submissions.length` per correct card, `0` otherwise (FR-046).
- `accuracy` — `points / resolved` as a whole percent. Identical to a plain tally when
  `attemptsAllowed` is 1.
- `byAttempt` — how many cards were solved on attempt 1, 2, 3 … indexed from 0 (FR-033b).
- `missedKana` — the `Kana` entries whose records are `isCorrect: false`, in the order they appeared
  (FR-033a).
- `elapsedMs` / `msPerCard` — wall-clock total and its average across every card; both `null` until
  the session completes, since a part-finished quiz has no total (FR-049).

### State transitions

```text
configuring ──start (valid config)──▶ active
active ──submit wrong answer, attempts remain──▶ active (same card, empty input)
active ──submit correct answer, or spend the last attempt──▶ awaiting-continue
awaiting-continue ──continue, more cards remain──▶ active (currentIndex + 1)
awaiting-continue ──continue, last card answered──▶ complete
complete ──practice again──▶ active (same configuration, regenerated questions)
complete ──back to home──▶ configuring
active | awaiting-continue ──platform back / abandon──▶ configuring (session discarded)
```

**Transition rules**

- `configuring → active` is refused unless `validateConfiguration` passes (FR-012, FR-013).
- An empty or whitespace-only submission is not a transition at all: the session stays `active` and no
  `AnswerRecord` is written (FR-023).
- `awaiting-continue` exists so feedback cannot be skipped past or auto-dismissed — it is what makes
  "the correct answer stays visible until the learner advances" (FR-031) a state, not a timer.
- A question whose record is **resolved** cannot be re-answered (FR-024). While attempts remain, the
  same record is updated in place rather than a second record being appended.
- Abandoning discards the session; nothing is persisted mid-quiz (spec Assumptions, FR-038).

---

## Entity: Preferences (stored)

The only thing that outlives the session. Full schema and failure handling in
[contracts/preferences.md](./contracts/preferences.md).

| Field | Type | Notes |
|-------|------|-------|
| `version` | `1` | Bumped when the shape changes; a mismatch discards the stored value. |
| `script` | `Script` | |
| `selectedGroupIds` | `GroupId[]` | Unknown ids dropped on load. |
| `cardCount` | `number` | Clamped to the current pool on load. |
| `direction` | `Direction` | |

No quiz results, no history, no per-kana statistics, and no identifiers of any kind are stored
(FR-036, spec Assumptions).
