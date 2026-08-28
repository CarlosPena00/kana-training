# Feature Specification: Mistake History

**Feature Branch**: `003-mistake-history`

**Created**: 2026-08-28

**Status**: Draft

**Input**: User description: "Now I want to have and internal History in inch the user cann se the history of mistakes, - it should be option to re-pratices the mistakes - The 'mistake' is erased after correct the mistake 3 time in a row"

## Overview

Today a wrong answer is visible for exactly as long as the results screen is open. The learner sees
"you missed ぬ, ね, ま", starts another quiz, and the app forgets. The kana they are actually bad at
are drawn no more often than the ones they already know.

This feature gives the app a memory. Every kana the learner gets wrong is kept in a **mistake list**
they can look at, and that list can be practiced directly in a **correction round** — a quiz of
nothing but their own weak spots, where a card is not left behind until the correct answer has
actually been typed. A kana leaves the list once the learner has answered it correctly, first try,
**three times in a row** — so the list empties itself through practice rather than through a "clear"
button, and what remains on it is an honest picture of what they still do not know.

The list is personal and private: it never leaves the device, and it is not a score, a streak badge,
or a gamification system. It is a to-do list of kana that need work.

## Clarifications

### Session 2026-08-28

- Q: When a quiz allows 3 attempts, does a kana solved on the second try count as a mistake? →
  A: **Yes.** A wrong first answer in a regular quiz puts the kana on the list, whether or not a
  later attempt gets it right.
- Q: Which correct answers count toward the 3-in-a-row that clears a mistake? →
  A: **Any correct answer in any quiz**, not just answers given inside a correction round.
- Q: What happens on a wrong answer inside a correction round? →
  A: The learner **must type the correct value to continue**, or leave the round. The same card is
  presented again until they do.
- Q: Should a correction round draw from both scripts at once, or only the currently selected script? →
  A: **All mistakes the learner has.** A correction round is not scoped by script — it draws from the
  entire mistake list, Hiragana and Katakana together.
- Q: In a mixed-script round asked as Romaji → Kana, how does the learner know whether "nu" means
  ぬ or ヌ? → A: **The prompt names the script** ("nu — write in Katakana"), and only that script's
  kana is accepted.
- Q: On a wrong answer in a correction round, is the correct answer shown before the learner must
  type it, or must they recall it unaided? → A: **Shown first.** The correction round is a copying
  drill: the correct answer stays visible while the learner types it, so a round is always
  completable.
- Q: What does the results screen report after a correction round, when forced correction means every
  card ends correct? → A: **The same results screen, scored on first submissions only.** A card
  corrected after a wrong start counts as incorrect. No correction-specific summary is added.
- Q: Can a learner delete a single entry from the mistake list by hand? → A: **No.** Answering
  correctly three times in a row is the only way an entry leaves the list; deleting the entire
  history remains the only manual removal.

**Consequence of combining these** — recorded here because it is not obvious: since a correction
round forces every card to end correctly, and since any correct answer counts toward the streak, the
two rules together would let a learner clear their whole list by answering wrong and copying the
answer three rounds in a row. The specification therefore counts **only the first submission for
each card** (FR-006, FR-011). Everything typed after that first answer is practice, not assessment.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See what I keep getting wrong (Priority: P1)

A learner has done several quizzes over a few days. They open the mistake list and see the kana they
have missed — each one showing its reading and how close it is to being cleared — instead of having
to remember what the last results screen told them.

**Why this priority**: The memory is the feature. Without a persisted list there is nothing to
correct and nothing for a streak to clear, so both other stories depend on this one. On its own it
already delivers value: a learner who can see "I have missed ぬ eleven times" knows what to study
even if they drill it somewhere else.

**Independent Test**: Complete a quiz with at least one wrong answer, leave the results screen, open
the mistake list, and confirm the missed kana is listed with its reading. Close and reopen the app
and confirm it is still listed.

**Acceptance Scenarios**:

1. **Given** a learner has never answered anything incorrectly, **When** they open the mistake list,
   **Then** they see an explanation that the list is empty and fills as they make mistakes — not an
   error or a blank screen.
2. **Given** a learner answered ぬ incorrectly on their first try in a quiz, **When** they open the
   mistake list after the quiz ends, **Then** ぬ is listed together with its correct reading.
3. **Given** a quiz allowing three attempts, **When** the learner answers ぬ wrongly and then gets it
   right on the second attempt, **Then** ぬ is still added to the mistake list.
4. **Given** ぬ is already on the list, **When** the learner misses ぬ again in a later quiz, **Then**
   ぬ appears once, not twice, and the list reflects that it has now been missed twice.
5. **Given** the learner has missed kana in both Hiragana and Katakana, **When** they open the list,
   **Then** entries from both scripts are visible and it is unambiguous which script each belongs to.
6. **Given** the learner closes the app entirely and reopens it later, **When** they open the mistake
   list, **Then** the same entries and the same progress toward clearing are present.

---

### User Story 2 - Correct my mistakes until I get them right (Priority: P2)

The learner starts a round drawn only from the kana on their mistake list. When they get one wrong,
the app does not move on: it shows them the right answer and asks the same card again, and they have
to type it correctly before the round continues. If they do not want to, they can leave the round.

**Why this priority**: This is what turns the list from a report into a study tool, and it is the
reason the learner opens it at all. Forcing the correction is what makes it a drill rather than
another test — a card you got wrong and skipped past teaches nothing.

**Independent Test**: With three kana on the list, start a correction round, deliberately answer one
wrong, and confirm the round does not advance until that kana's reading is typed correctly — and
that leaving the round is still possible at any moment.

**Acceptance Scenarios**:

1. **Given** the learner has five kana on their mistake list, **When** they start a correction round,
   **Then** every card in the round is drawn from those five and no other kana appears.
1a. **Given** the learner has missed kana in both Hiragana and Katakana, **When** they start a
   correction round, **Then** entries from both scripts can appear in the same round, whichever
   script is selected on the configuration screen.
1b. **Given** the learner's mistake list contains only Katakana entries, **When** they are in
   Hiragana mode and start a correction round, **Then** the round runs on those Katakana entries
   rather than reporting an empty list.
1c. **Given** a Romaji → Kana card in a correction round for the entry ぬ, **When** the card is
   shown, **Then** the prompt states that Hiragana is wanted, and typing ヌ is marked wrong.
2. **Given** a card in a correction round, **When** the learner answers it incorrectly, **Then** they
   are shown the card, what they typed, and the correct answer, and the same card is presented again
   rather than the round advancing.
3. **Given** the learner has just answered a correction-round card incorrectly, **When** they type
   the correct answer, **Then** the round advances to the next card.
4. **Given** the learner has answered a correction-round card incorrectly, **When** they type another
   wrong answer, **Then** the same card is presented yet again, with no limit on how many times.
5. **Given** the learner is stuck on a card in a correction round, **When** they choose to leave the
   round, **Then** they exit to the mistake list without being forced to answer, and the answers they
   already gave still count.
6. **Given** the mistake list is empty, **When** the learner looks at the correction option, **Then**
   it is visibly unavailable with an explanation, rather than starting an empty round.
7. **Given** the learner asks for more cards than the mistake list contains, **When** they try to
   start, **Then** they are told the list is smaller than the count they asked for and the round is
   not silently padded with kana they have never missed.

---

### User Story 3 - Clear a kana by learning it (Priority: P3)

The learner answers a kana correctly, first try, three times in a row — in any quiz at all. It
disappears from the list, which they see the next time they open it.

**Why this priority**: The self-clearing rule is what keeps the list truthful over months of use,
but a list that only grows is still usable. This can therefore ship after the first two and improve
them.

**Independent Test**: Put one kana on the list, answer it correctly on the first try three times in
a row, and confirm it disappears; then repeat with a wrong answer inserted in the middle and confirm
it does not.

**Acceptance Scenarios**:

1. **Given** ぬ is on the list with no correct answers yet, **When** the learner answers it correctly
   on the first try three times in a row, **Then** ぬ is removed from the mistake list.
2. **Given** ぬ is on the list, **When** those three correct answers happen in ordinary quizzes the
   learner configured by group, **Then** ぬ is cleared just the same — the correction round is not
   required.
3. **Given** ぬ is on the list with two correct answers in a row, **When** the learner answers it
   incorrectly, **Then** ぬ stays on the list and its progress restarts from zero rather than
   continuing from two.
4. **Given** ぬ is on the list, **When** the learner answers it wrongly in a correction round and
   then types the correct answer as required to continue, **Then** ぬ's progress is reset to zero by
   the wrong first answer, and the forced correction does not advance it.
5. **Given** ぬ has been cleared from the list, **When** the learner misses ぬ in a later quiz,
   **Then** ぬ returns to the list starting from zero progress again.
6. **Given** a kana is on the list, **When** the learner views the list, **Then** they can see how
   many consecutive correct answers it currently has toward the three needed to clear it.
7. **Given** the learner clears the last kana on their list, **When** the round ends, **Then** the
   list is shown as empty and the correction option becomes unavailable again.
8. **Given** a correction round of ten cards where the learner's first answer was wrong on six of
   them, **When** the round ends, **Then** the results report four correct and six incorrect, not
   ten correct, despite every card having been typed correctly before the round advanced.

---

### Edge Cases

- **Storage unavailable or cleared**: The device refuses to store data, or the learner clears their
  browser data. Quizzes MUST continue to work exactly as before, and the mistake list MUST present
  itself as empty rather than as broken.
- **Stored data is unreadable or from an older version**: The app MUST fall back to an empty mistake
  list and carry on, never showing a parse error and never blocking a quiz from starting.
- **A stored kana no longer exists in the dataset**: If the kana inventory changes between releases,
  entries that no longer correspond to a real kana MUST be dropped silently.
- **Same kana, opposite directions**: The learner misses ぬ as Kana → Romaji and later as
  Romaji → Kana. This is one entry, consistent with a kana being one card regardless of direction.
- **Forced correction in the Romaji → Kana direction**: The learner must type かな with the device's
  own Japanese input. If they cannot, leaving the round MUST always remain available — a learner
  must never be trapped on a card they have no way to answer.
- **Ambiguous romaji across scripts**: "nu" maps to both ぬ and ヌ, and a correction round can contain
  either. A romaji prompt MUST name the script being asked for (FR-020c). The learner typing the
  right sound in the wrong script is wrong, not a near miss, and is recorded as such.
- **Script changes between consecutive cards**: A correction round may put ぬ immediately after ヌ.
  This is intentional and must read clearly rather than looking like a bug.
- **A card cleared mid-round**: A kana reaches its third consecutive correct answer during a round.
  Removal from the list must not disturb the round in progress.
- **The only entry is cleared mid-round**: The mistake list becomes empty while a correction round
  is still running. The round MUST finish normally rather than being cancelled underneath the
  learner.
- **Mistake list larger than a practical round**: With over a hundred entries, the learner must still
  be able to start a round of a sensible size rather than being forced through all of them.
- **A single entry left**: A correction round drawn from one kana must be startable, and the card
  must not be re-served as a *new* card within the round once it has been answered correctly.
- **Abandoned round**: The learner leaves a quiz half-finished. First answers already given MUST
  count toward the mistake list; cards never reached MUST NOT be recorded as either mistakes or
  successes.
- **Empty and whitespace-only answers**: These follow whatever the existing quiz already treats them
  as; this feature introduces no new answer semantics, in a correction round or anywhere else.

## Requirements *(mandatory)*

### Functional Requirements

#### Recording mistakes

- **FR-001**: The system MUST record a mistake entry when the learner answers a kana incorrectly,
  identified by the combination of script and kana.
- **FR-002**: The system MUST treat a kana as a single entry regardless of the direction in which it
  was answered, consistent with a kana being one card in either direction.
- **FR-003**: The system MUST record answers as they are given during a quiz, so that a quiz the
  learner abandons still contributes the answers they actually gave.
- **FR-004**: The system MUST keep, for each entry, the total number of times that kana has been
  missed, and the date it was most recently missed.
- **FR-005**: The system MUST NOT create a second entry for a kana that is already on the list;
  repeat mistakes update the existing entry.
- **FR-006**: The system MUST decide a card's effect on the mistake list from the learner's **first
  submission for that card only**. A wrong first submission records a mistake regardless of how many
  attempts the quiz allows, whether a later attempt was correct, or whether a correction round later
  required the right answer to be typed.

#### Clearing mistakes

- **FR-007**: The system MUST keep a count of consecutive correct answers for each entry on the list.
- **FR-008**: The system MUST reset that count to zero whenever the kana's first submission is wrong.
- **FR-009**: The system MUST remove an entry from the mistake list once its consecutive-correct
  count reaches three.
- **FR-010**: The system MUST allow a removed kana to return to the list, starting again from zero,
  if it is later missed.
- **FR-011**: The system MUST count toward the consecutive-correct total every correct first
  submission, in **any** quiz — ordinary quizzes configured by group as well as correction rounds.
- **FR-012**: The system MUST NOT advance the consecutive-correct total on any submission after the
  first for a given card, including the correct answer a correction round requires before advancing.
- **FR-013**: The system MUST NOT provide any way to raise or lower an entry's progress other than by
  answering the kana.
- **FR-013a**: The system MUST NOT offer per-entry removal. An entry leaves the list only by reaching
  three consecutive correct first answers (FR-009) or by the learner deleting the entire history
  (FR-038). There MUST be no swipe-to-delete, no per-row delete control, and no "mark as known".

#### Viewing the history

- **FR-014**: Learners MUST be able to open a view of their mistake list from the configuration
  screen without starting a quiz.
- **FR-015**: The view MUST show, for every entry: the kana, its correct reading, how many times it
  has been missed, and its current progress toward the three consecutive correct answers that clear
  it.
- **FR-016**: The view MUST make each entry's script unambiguous.
- **FR-017**: The view MUST order entries so the kana most in need of work are easiest to find, and
  the ordering MUST be stated to the learner rather than appearing arbitrary.
- **FR-018**: The view MUST show a clear empty state, explaining how entries get there, when there
  are no mistakes recorded.
- **FR-019**: Learners MUST be able to return from the mistake list to the configuration screen
  without starting a quiz.

#### Correction rounds

- **FR-020**: Learners MUST be able to start a quiz whose cards are drawn only from the kana
  currently on their mistake list.
- **FR-020a**: A correction round MUST draw from the learner's **entire** mistake list regardless of
  script. It MUST NOT be scoped by the script selected on the configuration screen, and Hiragana and
  Katakana entries MUST be able to appear in the same round.
- **FR-020b**: Each card in a correction round MUST carry its own script, rather than inheriting a
  single script from the round. Every place that displays or validates a card MUST use the card's
  own script.
- **FR-020c**: A Romaji → Kana card in a correction round MUST state which script the learner is
  being asked to write, so that a romaji prompt is never ambiguous between the two scripts.
- **FR-020d**: Only the card's own script MUST be accepted as correct. Answering ヌ to a card whose
  entry is ぬ MUST be treated as wrong, in a correction round exactly as anywhere else.
- **FR-020e**: A Kana → Romaji card MUST NOT need a script label, the character itself being
  unambiguous; the label required by FR-020c applies only where the prompt is romaji.
- **FR-021**: The system MUST make the correction option unavailable, with an explanation, only when
  the mistake list is empty in its entirety — never because the currently selected script happens to
  contribute no entries.
- **FR-022**: A correction round MUST present cards, accept answers, show progress, and report
  results the same way any other quiz does, except where FR-020a through FR-020e, FR-023 through
  FR-026, and FR-029a through FR-029c state otherwise.
- **FR-023**: On a wrong answer in a correction round, the system MUST show the card, what the
  learner typed, and the correct answer, and MUST present the same card again instead of advancing.
- **FR-023a**: The correct answer MUST remain visible while the learner types it. A correction round
  is a copying drill, not a second recall test, and MUST always be completable without the learner
  having to remember the answer.
- **FR-024**: A correction round MUST NOT advance past a card until the learner has entered the
  correct answer for it, with no limit on the number of tries.
- **FR-025**: Learners MUST be able to leave a correction round at any point, including while held on
  an unanswered card, without entering a correct answer.
- **FR-026**: The per-card attempt limit that ordinary quizzes offer MUST NOT apply in a correction
  round; attempts there are unlimited by definition.
- **FR-027**: The system MUST prevent a correction round from being started with more cards than the
  mistake list contains, with clear feedback, rather than silently truncating or padding it.
- **FR-028**: A kana MUST appear at most once as a card in a correction round, as in any other quiz;
  re-presenting a card under FR-023 is the same card, not a new one.
- **FR-029**: Answers given in a correction round MUST update the mistake list under the same
  first-submission rule as answers given anywhere else.
- **FR-029a**: A correction round MUST be scored on first submissions only: a card whose first answer
  was wrong counts as incorrect in the results, however many times the learner then retyped it. The
  results MUST NOT report a correction round as fully correct merely because forced correction
  guarantees every card ends right.
- **FR-029b**: A correction round MUST use the existing results screen and MUST NOT add a
  correction-specific summary. The learner sees what was cleared by looking at the mistake list.
- **FR-029c**: First-submission scoring MUST apply to correction rounds only. Ordinary quizzes keep
  the existing partial-credit scoring unchanged, as required by FR-041.

#### Storage and privacy

The mistake list is **cache-grade data**: a convenience the app keeps for the learner on their own
device, never an authoritative record. Losing it is a normal outcome, not a failure.

- **FR-030**: The mistake list MUST persist across app restarts and, on the web, across page reloads,
  on a best-effort basis. The system MUST NOT promise the learner that the list is permanent.
- **FR-031**: The mistake list MUST remain entirely on the learner's own device. It MUST NOT be
  transmitted, uploaded, synchronized, shared, or copied to any other device, account, or service.
- **FR-032**: The mistake list MUST be excluded from platform-level cloud backup, so that it is never
  copied off the device by the operating system's own backup mechanism. *Satisfied fully on Android
  and web. On iOS this is knowingly partial — an encrypted device backup includes the store, and the
  limitation is stated in the app's privacy copy rather than closed with an async filesystem store.
  Decided 2026-08-28; see D4 in [research.md](./research.md).*
- **FR-033**: Clearing the application's stored data by any means the platform offers MUST erase the
  mistake list completely, leaving nothing behind that could reconstruct it.
- **FR-034**: The system MUST treat the loss of the mistake list as ordinary. It MUST NOT warn about
  it, ask the learner to back it up, or offer to restore it.
- **FR-035**: The application MUST work correctly, with all existing functionality intact, when the
  stored mistake list is absent, unreadable, evicted by the platform, or written by an incompatible
  earlier version — in every such case it MUST be treated as empty.
- **FR-036**: A failure to save the mistake list MUST NOT interrupt or fail a quiz.
- **FR-037**: Entries referring to kana that are not in the current dataset MUST be discarded when
  the list is read.
- **FR-038**: Learners MUST be able to delete their entire mistake history deliberately from within
  the app, and MUST be warned that this cannot be undone before it happens.

#### Scope boundaries

- **FR-039**: The feature MUST NOT introduce accounts, synchronization, leaderboards, streak rewards,
  badges, notifications, or any other gamification beyond the plain counts described above.
- **FR-040**: The feature MUST NOT introduce export, import, sharing, or any other route by which the
  mistake list could leave the device.
- **FR-041**: The feature MUST NOT change how existing quizzes are configured, generated, validated,
  or scored.

### Key Entities

- **Mistake Entry**: One kana the learner has answered incorrectly and has not yet cleared.
  Identified by script plus kana. Carries the number of times it has been missed, the number of
  consecutive correct first answers so far (0–2; reaching 3 deletes the entry), and when it was last
  missed. Holds no text the learner typed and no information about any particular quiz.
- **Mistake List**: The learner's whole collection of Mistake Entries, at most one per kana per
  script and therefore bounded by the size of the kana dataset. Doubles as the card pool for a
  correction round.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After finishing a quiz, every kana whose first answer was wrong appears in the mistake
  list — 100% of them, and no kana the learner answered correctly first time.
- **SC-002**: A learner can go from the configuration screen to a correction round in at most two
  actions.
- **SC-003**: A kana answered correctly on the first try three consecutive times disappears from the
  list in 100% of cases, and a kana with any wrong first answer inside its last three disappears in
  0% of cases.
- **SC-004**: Answering wrongly and then typing the required correction advances an entry's progress
  in 0% of cases — repeated wrong-then-copy behavior can never clear an entry.
- **SC-005**: No card in a correction round can be passed without the correct answer being typed; the
  only way past an unanswered card is leaving the round, and leaving is available from every card.
- **SC-005a**: The correct count a correction round reports equals the number of cards answered
  correctly on the first try, in 100% of rounds — a round can report 100% only when the learner
  actually got every card right on sight.
- **SC-006**: The mistake list survives closing and reopening the app in 100% of cases where device
  storage is available and has not been cleared.
- **SC-006a**: Inspecting a full platform backup of the device reveals no trace of the mistake list,
  and inspecting all network traffic during any session shows the list is never transmitted.
- **SC-006b**: Clearing the app's data through the platform's own controls leaves the app behaving
  exactly as a fresh install would, with an empty mistake list and no warning or error.
- **SC-007**: Opening the mistake list is indistinguishable from instant to the learner, with a
  worst-case list containing every kana in the dataset.
- **SC-008**: With device storage unavailable or emptied, every existing quiz function continues to
  work, verified by the existing scenarios passing unchanged.
- **SC-009**: Over a two-week period of regular practice, a learner's mistake list shrinks for kana
  they have learned rather than growing without bound, so the list length reflects current weakness
  rather than lifetime error count.

## Assumptions

- **Only the first submission per card is assessed.** Everything typed after it — a retry in a
  three-attempt quiz, the forced correction in a correction round — is practice. This is what makes
  the two answered clarifications consistent with each other; see the note in Clarifications.
- **Mistake identity is script plus kana.** ぬ in Hiragana and ヌ in Katakana are separate entries;
  ぬ missed as Kana → Romaji and ぬ missed as Romaji → Kana are the same entry. This follows the
  project's existing rule that a kana is one card whichever way it is asked.
- **A correction round is a copying drill, by decision.** A wrong answer reveals the correct answer
  and keeps it visible while the learner types it, matching the existing rule that a wrong answer
  keeps question, answer, and correct answer on screen. Requiring unaided recall was considered and
  rejected: it can strand a learner on a card with no way forward but abandoning the round, and the
  entry does not advance from a copied answer anyway (FR-012), so nothing is won by hiding it.
- **The history is a study aid, not a record.** It stores counts and a date, not a log of every
  answer, not what the learner typed, and not per-quiz results. Quiz history, statistics over time,
  and charts are out of scope.
- **The history is a cache, and is treated as disposable.** It belongs to the learner and to nobody
  else, it exists only on the device that created it, and wiping the app's data wipes it entirely
  with nothing recoverable. The learner is never asked to protect it and is never told it is safe.
  This is a deliberate trade: a learner who reinstalls loses their list and starts over, which is
  acceptable for a free offline drill and is the price of storing nothing anywhere else.
- **Platform storage may evict it without anyone asking.** Mobile system WebViews and browsers both
  reclaim local storage under pressure or after long disuse. The design treats a list that has
  silently vanished as identical to a list that was never there.
- **The list is naturally small.** There are 214 kana in total, so a mistake list cannot exceed 214
  entries however long the app is used. No pruning, archiving, or size cap is needed.
- **Correction rounds ignore the selected script but reuse the learner's current direction setting**,
  and let them choose a card count as they do elsewhere. They do not introduce a separate
  configuration screen.
- **A correction round is the one place where a single round spans both scripts.** Ordinary quizzes
  remain single-script exactly as today; this is an additional capability of the session model, not
  a change to how existing quizzes behave.
- **Ordering defaults to most-missed first**, with the most recently missed breaking ties.
- **Removal is deletion.** A cleared kana leaves no "mastered" record behind, as the description says
  "erased".
- **The list is not curated by the learner.** Entries are earned onto it and earned off it. A stale
  entry for a kana the learner already knows costs almost nothing against the 214-entry ceiling, and
  is cleared the moment they answer it correctly three times. Allowing manual removal would turn an
  honest record of weakness into a list of what the learner is willing to admit to.
- **No migration is required**, since no mistake data exists today. An unreadable or unversioned
  stored list is treated as empty rather than migrated.
- **Existing storage behavior is the model**: the same tolerance the app already applies to stored
  preferences — repair or discard silently, never surface an error — applies here.

## Dependencies

- **Depends on the existing quiz engine** for generating rounds, validating answers, and scoring.
  This feature adds a new card pool, a listener for first submissions, and one new card-advance rule
  used only by correction rounds; it changes nothing about how ordinary quizzes behave.
- **Answer validation needs no change for FR-020d.** A card is already validated against its own
  expected answer, so ヌ is rejected for a ぬ card without any new rule. FR-020c is a presentation
  requirement, not a validation one.
- **Requires the session model to allow mixed-script rounds.** Today a round carries one script for
  all of its cards. FR-020a and FR-020b require a card to carry its own script instead. This is an
  extension of the existing model, not a change to ordinary quizzes, but it is the largest
  engine-side change the feature asks for and must be planned deliberately.
- **Depends on the existing kana dataset** to resolve stored entries back to readable kana.
- **Requires a change to the Android manifest.** `android:allowBackup` is currently `true`, the
  Capacitor default, which lets Android Auto Backup copy the app's stored data to the learner's cloud
  storage. FR-032 requires this to be turned off. The same applies to iOS, where WebView storage is
  included in device backups unless excluded. This gap already affects the preferences the app stores
  today; it is not introduced by this feature, but this feature is what makes it matter.
- **Requires two governance decisions before implementation** (see Constitutional Impact below).
  Neither blocks writing this specification, but both must be settled in the plan.

## Constitutional Impact

**Resolved 2026-08-28.** The constitution was amended to **1.1.0**, broadening Principle I's storage
clause to permit disposable local learning progress under three new constraints (bounded by the
dataset, never off-device including cloud backup, never promised to persist). All gates pass; see
[plan.md](./plan.md). The original analysis is kept below for the record.

Two points in this specification sat outside the project constitution (v1.0.0) as written and had to
be resolved — by amendment or by documented exception — before implementation:

1. **Principle I (Client-Only, Zero Infrastructure — NON-NEGOTIABLE)** permits local storage "for
   lightweight preferences only". A mistake list is learning-progress data, not a preference. The
   feature fully honors the principle's intent — no backend, no network, no account, no tracking,
   data never leaves the device, and the app works when storage is empty — and the stored data is
   genuinely lightweight, bounded above by 214 small entries. Treating the list as cache-grade and
   disposable (FR-030 – FR-034) narrows the gap further: nothing is promised, nothing is protected,
   and clearing the app's data restores the exact behavior the principle describes. Because the
   principle is marked NON-NEGOTIABLE, the constitution still requires an amendment (a MINOR version
   bump broadening the clause to "preferences and other disposable local data") rather than a waiver.
2. **Principle V (Keep It Simple)** states the navigation flow must not exceed
   Configuration → Quiz → Results, and that new screens require explicit justification. The mistake
   list is a fourth destination. Principle V is not marked NON-NEGOTIABLE, so a justification
   recorded in the implementation plan satisfies it. The plan MUST also justify the mixed-script
   session model (FR-020a, FR-020b) under the same principle, since it is added complexity in the
   engine rather than in the UI.

Principle II is **not** in tension: it requires Hiragana and Katakana to share one data structure and
one code path, and a correction round that draws from both through the same pool is that principle
working as intended rather than against it. Principle IV is likewise satisfied — the correction
round's advance rule and first-submission scoring belong in the headless engine, tested without
rendering, with no second implementation of generation, normalization, validation, or scoring.

A third point is worth noting but is not a conflict: the constitution's feedback rule (a wrong answer
keeps question, answer, and correct answer visible until the learner advances) is satisfied by
FR-023, which additionally holds the learner on the card until they type the answer.
