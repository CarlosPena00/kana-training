# Quickstart: Mistake History

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-08-28

How to run the feature and prove it works. Contract details live in
[contracts/](./contracts/); this file is the run guide.

> **Blocked before implementation**: Principle I must be amended first — see
> [plan.md](./plan.md#constitution-amendment-required). Nothing below can be executed until it is.

---

## Prerequisites

Node.js 24 (20 may work, 18 will not). No other setup — the app has no backend and no services to
start.

```bash
./run.sh dev        # dev server, hot reload
./run.sh test       # Vitest unit tests, then ESLint
./run.sh e2e        # Playwright browser tests
./run.sh preview    # production build + preview, service worker active
```

---

## Scenario 1 — A mistake is recorded (US1, FR-001, FR-006)

1. `./run.sh dev`, open the printed address.
2. Select one group (`あ` row), card count 5, direction **Kana → Romaji**, attempts **1**.
3. Start. Answer the first card **wrong** deliberately. Finish the quiz.
4. Return to configuration, open **Mistake list**.

**Expect**: the kana you missed is listed with its correct reading, `missed 1`, and progress 0 of 3.

**Then**: reload the page and reopen the list. The entry is still there (FR-030).

### 1b — Retries do not excuse a mistake (FR-006)

Repeat with attempts set to **3**. Answer one card wrong, then right on the second attempt.

**Expect**: it is still on the list. The card's *first* answer was wrong, and that is what counts.

---

## Scenario 2 — Forced correction (US2, FR-023a, FR-024, FR-025)

With at least 3 entries on the list, open it and start a **correction round**.

1. Answer a card **wrong**.

   **Expect**: the prompt, what you typed, and the correct answer are all shown; the round does
   **not** advance; the correct answer stays visible while you retype.

2. Type another wrong answer.

   **Expect**: the same card again. No attempt limit, no "out of tries".

3. Type the correct answer.

   **Expect**: now it advances.

4. On a later card, press **Quit** while held on a wrong answer.

   **Expect**: you leave immediately, without being forced to answer. Answers already given still
   count.

### 2b — Mixed scripts (FR-020a, FR-020c)

Get at least one Hiragana and one Katakana kana onto the list. Set direction to **Romaji → Kana**.
Switch the configuration screen to **Hiragana**. Start a correction round.

**Expect**: cards from **both** scripts appear, whichever script is selected. Every romaji prompt
names the script it wants ("nu — write in Katakana"). Answering ぬ on a ヌ card is **wrong**.

### 2c — The results tell the truth (FR-029a, SC-005a)

Run a 10-card correction round and get 6 wrong on the first try, correcting each as required.

**Expect**: results report **4 correct, 6 incorrect** — not 10 correct, despite every card having
been typed correctly before the round advanced.

---

## Scenario 3 — Clearing (US3, FR-009, FR-011, SC-004)

1. Note a kana on the list at progress 0 of 3.
2. Answer it correctly **on the first try** in an ordinary quiz. Reopen the list — progress 1 of 3.
   (An ordinary quiz counts; a correction round is not required.)
3. Do it twice more.

   **Expect**: after the third, the entry is gone.

4. Miss it again later.

   **Expect**: it returns at `missed 1`, progress 0 of 3 — its previous miss count is gone with it.

### 3b — The loophole must stay closed (SC-004)

Take an entry at progress 0. In a correction round, answer it **wrong**, then type the correction.
Repeat three times.

**Expect**: it never clears, and its progress never rises above 0. This is the single most important
regression test in the feature — if it fails, the mistake list can be emptied without learning
anything.

### 3c — A streak breaks (FR-008)

Get an entry to progress 2 of 3, then answer it wrong.

**Expect**: progress back to 0 of 3 — not 2, not 1. `missed` goes up by one.

---

## Scenario 4 — Storage is a cache (FR-032 – FR-035, SC-006b, SC-008)

| Do this | Expect |
|---------|--------|
| DevTools → Application → clear `kana-training.mistakes` | List is empty. No error, no warning. Quizzes work normally. |
| Set the value to `not json` | List is empty. App starts normally. |
| Set `version` to `2` | List is empty. No migration attempted. |
| Store an entry for a kana not in the dataset | That entry is dropped; the others survive. |
| Block storage entirely (Safari private mode) | Every existing quiz function still works (SC-008). |
| Use **Delete my history** in the app | Confirmation first; then the list is empty — and script, card count, and direction are unchanged. |

---

## Scenario 5 — Backup exclusion (FR-032)

**Android**: build a release, then

```bash
adb shell bmgr backupnow dev.kanatraining.flashcards
```

**Expect**: refused — the app opts out of backup. Verify `android:allowBackup="false"` in
`app/android/app/src/main/AndroidManifest.xml`.

**iOS**: known partial satisfaction. An encrypted device backup does contain the WebView store; see
D4 in [research.md](./research.md). This needs a decision, not a test.

---

## Scenario 6 — Accessibility (constitution, FR-014 – FR-019)

```bash
./run.sh e2e
```

The axe pass covers the history screen. Then check by hand what a scanner cannot:

- Tab through the list — visible focus on every row and control, in reading order.
- Every control is at least 44×44 pt.
- The empty state explains how entries get there, rather than showing a bare "0".
- The ordering is stated on screen, not left to be inferred.
- A screen reader announces a correction card's script **with** the prompt, not after it.
- No per-entry delete exists anywhere — no swipe, no long-press, no row menu (FR-013a).

---

## What "done" looks like

- `./run.sh test` and `./run.sh e2e` pass.
- All 18 store/rule cases in [contracts/mistake-store.md](./contracts/mistake-store.md) and all 17
  round cases in [contracts/correction-round.md](./contracts/correction-round.md) are covered.
- Scenario 3b passes — the wrong-then-copy loophole is closed.
- Ordinary quizzes behave exactly as before (FR-041): the existing 001 suites pass unchanged.
