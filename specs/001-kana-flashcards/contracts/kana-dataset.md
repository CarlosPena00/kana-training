# Contract: Kana Dataset

**Module**: `app/src/data/` | **Consumers**: the engine's `buildPool`, and the configuration screen's
group toggles

The dataset is the product's foundation (Principle III). It is plain typed data with no imports from
React, the engine, or any screen, and it must be editable by someone who knows Japanese but not
TypeScript.

---

## Shape

```ts
// app/src/data/groups.ts
export const GROUPS: readonly KanaGroup[];        // exactly 27, ordered for display

// app/src/data/hiragana.ts / katakana.ts
export const HIRAGANA: readonly Kana[];           // exactly 107
export const KATAKANA: readonly Kana[];           // exactly 107

// app/src/data/index.ts — lookup only, no quiz logic
export function kanaForScript(script: Script): readonly Kana[];
export function groupsForSection(section: Section): readonly KanaGroup[];
```

Each entry is a flat record — `{ kana, romaji, script, groupId }` — declared literally, not generated
by transforming one script into the other. Katakana is written out in full rather than derived from
Hiragana by code-point arithmetic: a derivation would silently produce the wrong result for the
combination kana and would make a single-character correction impossible to express.

---

## Invariants (enforced by `tests/data/`)

| # | Invariant | Why |
|---|-----------|-----|
| 1 | `HIRAGANA.length === 107` and `KATAKANA.length === 107` | FR-001 completeness |
| 2 | `GROUPS.length === 27` — 10 main, 5 dakuten, 12 combination | FR-001a |
| 3 | Every entry's `groupId` exists in `GROUPS`; every group has ≥ 1 entry in each script | FR-001a — no kana outside the selection structure |
| 4 | The two scripts have identical group membership counts, group for group | FR-003 — same structure, so a selection means the same thing in both |
| 5 | `kana` values are unique within a script | FR-016 card identity |
| 6 | `romaji` values are unique within a script | FR-005, and Romaji → Kana must be unambiguous |
| 7 | Both scripts use the identical set of 107 romaji values | FR-003, FR-028 — one validation rule for both |
| 8 | Every `romaji` matches `/^[a-z]+$/` | Canonical lowercase ASCII (D4) |
| 9 | Every Hiragana `kana` is in U+3040–U+309F; every Katakana `kana` in U+30A0–U+30FF | Guards against a pasted wrong-script character |
| 10 | Main = 46 per script, dakuten = 25, combination = 36 | FR-001 inventory |
| 11 | Every `kana` string is NFC-normalized | Matches what `normalizeAnswer` produces |
| 12 | No excluded character appears: ゐ ゑ ヰ ヱ っ ッ ヴ | Spec Assumptions |
| 13 | `main.wa` contains exactly わ/ワ, を/ヲ, ん/ン | Clarification 2026-08-27 |
| 14 | ぢ/ヂ is `di`, づ/ヅ is `du`, を/ヲ is `wo` | D4 — the choices that keep invariant 6 true |

Invariant 6 is the load-bearing one: it is what lets `checkAnswer` accept exactly one kana for a
romaji prompt. If a future edit gives two kana the same romaji, that test must fail loudly rather than
the quiz becoming unanswerable.

---

## Canonical romaji reference

The full mapping is enumerated in [data-model.md](../data-model.md#the-27-groups). The spellings that
are deliberate choices rather than obvious ones:

| Kana | Romaji | Note |
|------|--------|------|
| し / シ | `shi` | Hepburn, per the source description |
| ち / チ | `chi` | Hepburn |
| つ / ツ | `tsu` | Hepburn |
| ふ / フ | `fu` | Hepburn |
| じ / ジ | `ji` | Hepburn |
| ぢ / ヂ | `di` | Not Hepburn (`ji`) — avoids colliding with じ |
| づ / ヅ | `du` | Not Hepburn (`zu`) — avoids colliding with ず |
| を / ヲ | `wo` | Distinguishes it from お (`o`) |
| ん / ン | `n` | |
| じゃ じゅ じょ | `ja` `ju` `jo` | Per the source description |
| ぢゃ ぢゅ ぢょ | `dya` `dyu` `dyo` | Per the source description; consistent with `di`/`du` |

Alternative systems (`si`, `ti`, `tu`, `hu`, `zya`, `zi`) are **incorrect answers**, not accepted
variants (FR-005).

---

## Extending the dataset later

Adding extended katakana (ファ, ティ, ヴ…) or obsolete kana means: add the entries, add a group to
`GROUPS` if they need their own toggle, update the counts in invariants 1, 2, and 10, and confirm
invariant 6 still holds for the new romaji. No engine, screen, or component change is required — which
is the property Principle III is asking for.
