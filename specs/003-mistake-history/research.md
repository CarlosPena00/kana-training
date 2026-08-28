# Phase 0 Research: Mistake History

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-08-28

Eight decisions. D1–D3 are the load-bearing ones: they decide whether this feature adds a second
state machine to the app or extends the one that exists.

---

## D1 — Where `firstSubmissionCorrect` is computed

**Decision**: Store it on `AnswerRecord`, written exactly once, at the moment the first submission
for a card is graded in the reducer. Never recomputed, never revised.

**Rationale**: Three separate requirements need the same fact — FR-006 (does this become a mistake),
FR-011 (does the streak advance), FR-029a (how is a correction round scored). Deriving it in three
places is three chances to disagree. Deriving it *once, later* is worse still: after a correction
round the record's `submissions[0]` would have to be re-validated against the question, which means
`score.ts` importing `validate.ts` and re-running normalization on data that was already graded.

The existing reducer already knows the answer at exactly the right moment: `submissions.length === 1`
in the `submit` case is, by construction, the first submission.

**Alternatives considered**:

- *Re-check `submissions[0]` on demand.* Rejected: couples scoring to validation, and re-normalizes
  input that was already normalized once. Also fragile — it silently breaks if a future change ever
  rewrites `submissions`.
- *A separate `firstAttempts` map on the session.* Rejected: a parallel structure keyed by question
  index that must be kept in step with `answers` is exactly the drift the single field avoids.
- *Infer from `submissions.length === 1 && isCorrect`.* Rejected: this is true only while the card is
  still on its first submission. After a forced correction, `submissions.length` is 2+ and `isCorrect`
  is `true`, and the expression silently reports the wrong thing — the precise bug SC-004 exists to
  catch.

---

## D2 — How the correction-round advance rule is expressed

**Decision**: Add `mode: 'standard' | 'correction'` to `QuizSession`. In the reducer's `continue`
case, when `mode === 'correction'` and the current record's most recent submission was wrong, return
to `status: 'active'` on the **same** `currentIndex` instead of advancing. No other case changes.

**Rationale**: The existing three-state session machine (`active` → `awaiting-continue` → advance)
already models everything needed. A wrong answer in a correction round is not a new state — it is
the existing `awaiting-continue` state with a different successor. Expressing it as a branch in one
`switch` case keeps a single state machine, which Principle IV requires and which
`tests/state/reducer.test.ts` already covers headlessly.

The card being re-presented is the same card (FR-028): `currentIndex` never moves, so the question is
literally the same object and the record keeps accumulating submissions.

**Alternatives considered**:

- *A second reducer for correction rounds.* Rejected outright: two implementations of card
  progression is precisely what Principle IV forbids.
- *A `mustCorrect` flag on the question.* Rejected: it is a property of the round, not the card, and
  putting it on every question invites per-card divergence that nothing needs.
- *Re-queue the failed card at the end of the round.* Rejected: it contradicts FR-024 (the round must
  not advance past the card) and would make a round's length unpredictable.
- *`attemptsAllowed: Infinity` instead of a mode.* Rejected: it would make the card behave correctly
  but leaves scoring wrong — the results would still report the eventual correct answer as correct,
  which is the failure FR-029a exists to prevent. Mode is needed regardless, so the flag would be
  redundant.

---

## D3 — Mixed-script generation without a second generator

**Decision**: Split `generateQuiz` into two functions in the same module:

```ts
buildQuestions(pool: readonly Kana[], cardCount: number, direction: DirectionSetting, rng: Rng): QuizQuestion[]
generateQuiz(config: QuizConfiguration, rng?: Rng): QuizQuestion[]   // builds the pool, then delegates
```

A correction round calls `buildQuestions` with a pool assembled from mistake entries, which may
contain both scripts. Ordinary quizzes are unchanged in behavior and still go through
`generateQuiz`.

**Rationale**: `Kana` already carries `script`, and `QuizQuestion` already holds the whole `Kana`
object — so a question in a mixed round already knows which script it belongs to with no type change
at all. The only thing tying a round to one script is *pool construction*, which is the one thing
being factored out. Sampling stays shuffle-then-take, so FR-028 (a kana at most once) remains
structural rather than enforced.

This is the smallest change that satisfies FR-020a and FR-020b, and it leaves exactly one generator
standing.

**Alternatives considered**:

- *`QuizConfiguration.script: Script | 'both'`.* Rejected: it pushes a correction-round concern into
  the type that preferences are persisted from, and would require `loadPreferences` to defend against
  a value ordinary quizzes must never have.
- *Two rounds run back to back, one per script.* Rejected: doubles the learner's work and makes
  FR-021's "unavailable only when the whole list is empty" incoherent.
- *Tag each question with a script at generation time.* Rejected as redundant — `question.kana.script`
  is already that tag.

---

## D4 — Satisfying FR-032 (excluded from platform cloud backup)

**Decision**: On Android, set `android:allowBackup="false"` and `android:dataExtractionRules` in
`AndroidManifest.xml`. On iOS, no per-file exclusion is available for WebView `localStorage`, so the
honest position is recorded rather than a fix invented: see the caveat below.

**Rationale**: `allowBackup` is currently `true`, the Capacitor default, which lets Android Auto
Backup copy the WebView's storage to the learner's Google account. Removing `INTERNET` does not
prevent this — the backup transport is Play services, not the app. Turning it off is a one-line
change and is the whole fix on Android.

**iOS caveat, stated plainly**: WKWebView's `localStorage` lives inside the app's `Library/` container
and is carried in iCloud and encrypted local backups. There is no supported API to exclude just that
storage while keeping the WebView working. Options are (a) accept that an iOS device backup contains
the mistake list, or (b) move the store to a file the app writes itself and mark it with
`NSURLIsExcludedFromBackupKey`, which means a Capacitor Filesystem dependency and an async store.

**Resolved 2026-08-28**: (a) accepted. The data is bounded, non-identifying, and travels only inside
the learner's own encrypted device backup — a materially different thing from Android's per-app cloud
upload. Taking on an async storage dependency to close it would violate Principle V for a threat the
spec does not name. FR-032 is therefore satisfied fully on Android and web, and knowingly in part on
iOS; the limitation is stated in the app's privacy copy rather than left implicit.

**Alternatives considered**: shipping a Capacitor Filesystem-backed store on both platforms
(rejected — turns every read into a promise and every screen into a loading state, for one
platform's benefit); encrypting the store (rejected — the key would have to live beside it, so it
protects nothing and only obscures).

---

## D5 — Where the streak rules live

**Decision**: `app/src/engine/mistakes.ts`, as pure functions over plain data:

```ts
applyAnswer(list: MistakeList, kana: Kana, firstSubmissionCorrect: boolean, now: string): MistakeList
sortEntries(list: MistakeList): MistakeEntry[]
```

No `localStorage`, no `Date.now()` — the timestamp is passed in, exactly as `now` is already passed
into the reducer for the quiz clock.

**Rationale**: "Three correct in a row clears an entry" is the rule the feature lives or dies on, and
Principle IV requires it to be executable and testable without rendering or storage. Injecting `now`
follows the precedent the reducer already sets and keeps the function deterministic under test.

**Alternatives considered**: putting the rules inside the store module (rejected — the rule becomes
untestable without stubbing `localStorage`); putting them in the reducer (rejected — the reducer
would then own both progression and streak arithmetic, and the streak could not be tested apart from
a whole session).

---

## D6 — When the store is written

**Decision**: Write on every resolved first submission, from the same effect layer that already
persists preferences — not from inside the reducer.

**Rationale**: FR-003 requires an abandoned quiz to still contribute the answers actually given, so
end-of-round writing is not an option. The reducer must stay pure (Principle IV), so it cannot write
storage itself; `App.tsx` already demonstrates the established pattern, persisting preferences from an
effect that watches reducer state.

At most one small write per card, and a failed write is swallowed (FR-036).

**Alternatives considered**: writing inside the reducer (rejected — makes it impure and untestable);
debouncing writes (rejected — YAGNI at this volume, and it would lose data on an abrupt exit, which
is the case FR-003 is about); writing only at round end (rejected — violates FR-003 outright).

---

## D7 — Ordering on the history screen

**Decision**: Most-missed first; ties broken by most recently missed; final tie broken by dataset
order for stability. The ordering is stated on screen (FR-017).

**Rationale**: The list is a to-do list, so the kana costing the learner most should be at the top. A
stable final tiebreak matters more than it looks: without it, two entries with equal counts can swap
places between renders, which reads as a glitch and breaks any test asserting order.

**Alternatives considered**: most-recent-first (rejected — surfaces a single unlucky slip above a
chronic weakness); closest-to-clearing-first (rejected — optimizes for emptying the list rather than
for learning, and rewards the learner for avoiding hard kana); learner-selectable sort (rejected —
YAGNI for a list of at most 214 rows).

---

## D8 — Where the script label goes (FR-020c)

**Decision**: `Flashcard` takes an optional `scriptLabel?: string`. `QuizScreen` passes it only when
`session.mode === 'correction'` and `question.direction === 'romaji-to-kana'`. It renders as a short
line under the romaji prompt ("write in Katakana"), inside the card, and is part of the card's
accessible name so a screen reader announces the script with the prompt rather than after it.

**Rationale**: FR-020e says a kana prompt needs no label, and FR-041 says ordinary quizzes must not
change — so the label must be conditional on both mode and direction. Putting it inside `Flashcard`
rather than beside it keeps the prompt and its qualifier together for assistive technology, which is
the whole point of the requirement.

**Alternatives considered**: always showing it in correction rounds regardless of direction (rejected
— redundant on a kana prompt, and FR-020e says so); a persistent header for the round (rejected — a
round is mixed, so a single header would be wrong for half the cards); colour-coding the two scripts
(rejected — fails WCAG 1.4.1, colour as the only carrier of meaning).

---

## Open items

None. D4's iOS position — the only item that was open — was decided on 2026-08-28: accept that an
encrypted iOS device backup contains the list, and document it, rather than take on an async
filesystem store.
