# Quickstart: Confused Kana Feedback

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-08-28

How to run the feature and prove it works. Contract detail lives in
[contracts/answer-diagnosis.md](./contracts/answer-diagnosis.md); this is the run guide.

---

## Prerequisites

Node.js 24. Nothing else — no backend, no services, no new dependency for this feature.

```bash
./run.sh dev        # dev server, hot reload
./run.sh test       # Vitest, then ESLint
./run.sh e2e        # Playwright
./run.sh preview    # production build + preview
```

---

## Scenario 1 — The core case (US1, FR-001, FR-009)

1. `./run.sh dev`, open the printed address.
2. Script **Hiragana**, direction **Kana → Romaji**, attempts **1**.
3. Uncheck *All Main Kana*, select the **ら** row, card count **5**. Start.
4. When ろ appears, answer `ru`.

**Expect**: the feedback names ろ as the answer *and* names る as the character `ru` belongs to —
both shown together, each with its reading.

**Then** answer another card `zzz`.

**Expect**: today's feedback exactly — what you typed, the correct answer, and no note. No empty
space where one would have been.

### 1b — The other direction (FR-003)

Switch to **Romaji → Kana**. When the prompt is `ro`, write る.

**Expect**: the same pairing, presented the same way round.

### 1c — The card's script wins (FR-002)

Switch to **Katakana**. Answer ロ with `ru`.

**Expect**: **ル** is named, not る. The script you are practising is the script explained.

---

## Scenario 2 — Legible, not just correct (US2, FR-010 – FR-013)

With a confusion on screen, at a 320 px viewport:

| Check | Expect |
|-------|--------|
| Both characters | large enough to compare shapes, not buried in a sentence |
| Which is which | stated in words — not by colour, position, or order alone |
| Layout | nothing clipped, no sideways scrolling |
| The answer input | has **not** moved from where it was before the answer |
| Screen reader | one coherent statement, not loose characters |

The moved-input check matters more than it looks: the card area is fixed-height so the soft keyboard
stays put, and feature 003's device testing showed that space is already tight.

---

## Scenario 3 — The retry must not leak (FR-015a, FR-020b, SC-005a)

Enable **Allow 3 attempts per card**, direction **Kana → Romaji**.

1. On a ろ card, answer `ru` with attempts remaining.

   **Expect**: you are told you wrote る. You are **not** told the answer is ろ, and `ro` appears
   nowhere on screen.

2. Spend the remaining attempts.

   **Expect**: now both characters are shown together.

3. On a し card, answer `si` with attempts remaining.

   **Expect**: **no spelling note at all** — saying "this app uses `shi`" would hand you the answer.

4. On a ろ card, answer `si` with attempts remaining.

   **Expect**: the spelling note *does* appear — `shi` is not this card's answer, so nothing leaks.

---

## Scenario 4 — Romanization (FR-020, FR-020c, FR-020d)

Direction **Kana → Romaji**, attempts **1**.

| Answer | Expect |
|--------|--------|
| `si` on any non-し card | "this app uses `shi`" — a spelling note, naming no character |
| `tu`, `hu`, `zi`, `sya` | the same shape of note with the matching canonical spelling |
| `si` | still **marked wrong**. Explaining a spelling is not accepting it |
| `di` on a non-ぢ card | a **kana confusion** naming ぢ — `di` is canonical here, not an alternate |
| `ji` on a ぢ card | a **kana confusion** naming じ, which is more useful than a spelling note |

That `di` row is the one to watch. A stock Kunrei table treats `di` as an alternate for じ, which
would tell a learner who typed the canonical reading of ぢ that they had misspelled it.

---

## Scenario 5 — The wrong alphabet (FR-008)

Direction **Romaji → Kana**, script **Hiragana**, attempts **1**.

| Prompt | You write | Expect |
|--------|-----------|--------|
| `ro` | ロ | a script note: that is the Katakana character, this card wants Hiragana — and it is still wrong |
| `ro` | ル | **no note** — wrong character *and* wrong alphabet is not one nameable mistake |
| `ro` | ロ, attempts remaining | **no note** — it would identify the answer |

---

## Scenario 6 — Nothing else changed (FR-021, FR-022, SC-006)

```bash
./run.sh test && ./run.sh e2e
```

**Expect**: every existing suite passes unmodified. Specifically:

- the same answers are right and wrong as before — no score moves (SC-005)
- correction rounds still score on first submissions and still claim no partial credit
- **DevTools → Application → Local Storage** shows only `kana-training.preferences` and
  `kana-training.mistakes`. This feature adds no key and writes nothing.

---

## What "done" looks like

- `./run.sh test` and `./run.sh e2e` pass.
- All 31 cases in [contracts/answer-diagnosis.md](./contracts/answer-diagnosis.md) are covered.
- Scenario 3 passes — the retry never leaks, which is the one rule that silently ruins the
  three-attempt mode if it breaks.
- Scenario 4's `di` row passes — the guard against a plausible-looking table that would be wrong.
- No new key in browser storage.
