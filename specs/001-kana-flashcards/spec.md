# Feature Specification: Kana Flashcards

**Feature Branch**: `001-kana-flashcards`

**Created**: 2026-08-27

**Status**: Draft

**Input**: User description: "@kana_training/prompts/project.md — a cross-platform (Android, iOS, Web) offline flashcard app for learning Japanese Hiragana and Katakana, with group-based practice-set selection, configurable card count and quiz direction, non-repeating randomized cards, automatic answer validation, per-answer feedback, and an end-of-quiz results screen."

## Clarifications

### Session 2026-08-27

- Q: When the learner switches between Hiragana and Katakana on the configuration screen, should their group selections carry over, or reset to nothing? → A: Shared — switching script keeps the same groups selected and re-renders them in the other script.
- Q: At the end of a quiz, should the results screen list the kana the learner got wrong, or show only the score and accuracy? → A: Score plus a list of the missed kana with their correct answers; the list is omitted on a perfect score.
- Q: Which selectable group should を and ん belong to, given the reference layout only offers the ten main rows? → A: The わ group contains わ, を, ん — ten main groups, matching the reference layout.
- Q: FR-017 required that repeating a configuration "does not reproduce the same sequence", which is untestable and false for a one-kana pool. → A: Restated as the uniform shuffle itself, which is what the implementation and its tests actually guarantee.
- Q: On the web, must the app keep working offline after the tab is closed and reopened, and be installable to the home screen? → A: Full parity — the web build works offline after the first visit and is installable to the home screen or desktop.

### Session 2026-08-27 (retry attempts)

- Q: If a learner gets the answer right on their 2nd or 3rd attempt, how should that card score? → A: Partial credit — 1 point on the first attempt, ½ on the second, ⅓ on the third, i.e. 1 / (attempts used). A card never answered correctly scores nothing.
- Q: How should the attempts option appear on the configuration screen? → A: A single on/off toggle, "Allow 3 attempts per card", off by default.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Practice kana and learn from immediate feedback (Priority: P1)

A learner opens the app, starts a quiz, and is shown one kana at a time. For each card they type the
answer, submit it, and immediately see whether they were right along with the correct mapping. After
the last card they see how they scored.

**Why this priority**: This is the product. Without the answer-and-feedback loop there is nothing to
learn from; every other story only shapes what this loop practices.

**Independent Test**: Launch the app with its default configuration, complete a full quiz, and
confirm that every card can be answered, that feedback is shown for each answer, and that a score
appears at the end — no configuration changes required.

**Acceptance Scenarios**:

1. **Given** a quiz has started, **When** the learner submits the correct answer for the displayed
   card, **Then** the app states the answer was correct and shows the kana/romaji mapping before the
   learner advances.
2. **Given** a quiz has started, **When** the learner submits a wrong answer, **Then** the app states
   the answer was incorrect and shows the question, the submitted answer, and the correct answer,
   all of which remain visible until the learner chooses to advance.
3. **Given** the learner is on the last card, **When** they submit an answer and advance, **Then** the
   results screen appears with the number correct, number incorrect, and accuracy percentage.
4. **Given** the learner answered 3 of 10 cards incorrectly, **When** the results screen appears,
   **Then** those 3 kana are listed with their correct answers; **and given** all 10 were correct,
   **Then** no missed-kana list is shown.
5. **Given** a quiz is in progress, **When** the learner looks at the screen, **Then** the current
   card position and total card count are visible.

---

### User Story 2 - Build a custom practice set (Priority: P2)

A learner who is working through a textbook chapter wants to drill only the rows they are currently
studying. Before starting, they pick the script, tick the kana groups they want, and choose how many
cards to practice.

**Why this priority**: Targeted practice is what makes the app useful beyond a single session, but a
learner can still practice without it as long as a default set exists.

**Independent Test**: Select a small subset (for example, only the か and さ groups in Hiragana),
start a quiz, and confirm that every card shown comes from that subset and no other.

**Acceptance Scenarios**:

1. **Given** the learner has selected the か and さ groups in Hiragana, **When** they switch to
   Katakana, **Then** the same two groups remain selected and are shown as カ and サ.
2. **Given** the configuration screen, **When** the learner activates "All Main Kana", **Then** every
   main kana group becomes selected, and deselecting it clears them.
3. **Given** the learner has selected groups from the main, dakuten, and combination sections at the
   same time, **When** they start the quiz, **Then** cards are drawn from the union of those groups.
4. **Given** the learner has selected groups containing 10 unique kana, **When** they try to start a
   20-card quiz, **Then** the app prevents the start and explains that at most 10 cards are available.
5. **Given** no kana groups are selected, **When** the learner tries to start a quiz, **Then** the app
   prevents the start and explains that at least one kana must be selected.

---

### User Story 3 - Choose which way to be tested (Priority: P3)

A learner who can already read kana wants to practice producing it, so they switch the quiz from
"Kana → Romaji" to "Romaji → Kana", or leave it on the mixed default to be tested both ways.

**Why this priority**: Recognition and recall are different skills, but a learner gets real value from
the default mixed mode alone, so directional control can follow the core loop.

**Independent Test**: Run one quiz in each of the three direction settings and confirm that the
prompts match the chosen direction, and that the mixed setting produces both kinds of prompt within a
single quiz.

**Acceptance Scenarios**:

1. **Given** the direction is "Kana → Romaji", **When** the quiz runs, **Then** every prompt is a kana
   character and every expected answer is romaji.
2. **Given** the direction is "Romaji → Kana", **When** the quiz runs, **Then** every prompt is romaji
   and every expected answer is a kana character.
3. **Given** the direction is "Both" and a quiz of at least 10 cards, **When** the quiz runs, **Then**
   the direction of each card is decided independently, and a kana that already appeared as a
   kana-prompt card does not reappear as a romaji-prompt card.

---

### User Story 4 - Repeat practice without reconfiguring (Priority: P4)

A learner who just finished a set wants to run it again immediately, and when they come back the next
day they want the app to still be set up the way they left it.

**Why this priority**: Pure convenience. It shortens the path back into practice but adds no new
learning capability.

**Independent Test**: Finish a quiz, choose "Practice Again", and confirm a fresh quiz starts with the
same script, groups, count, and direction; then reopen the app and confirm the configuration screen
reflects the last-used settings.

**Acceptance Scenarios**:

1. **Given** the results screen, **When** the learner chooses "Practice Again", **Then** a new quiz
   starts with the same configuration and a newly randomized set of cards.
2. **Given** the learner previously configured a quiz, **When** they reopen the app, **Then** the
   configuration screen shows their last-used script, groups, card count, and direction.
3. **Given** stored preferences are unavailable or have been cleared, **When** the learner opens the
   app, **Then** the configuration screen loads with documented defaults and the app works normally.

---

### User Story 5 - Get another try before seeing the answer (Priority: P3)

A learner who mistypes, or who nearly knows a kana, wants a second chance rather than being shown
the answer straight away. They turn on three attempts, and a wrong answer sends them back to the
input with the answer still hidden.

**Why this priority**: It changes practice from testing to learning, and it is what a learner asks
for after their first few sessions. It sits alongside direction control rather than above it,
because the app is already usable without it.

**Independent Test**: Turn on three attempts, answer a card wrongly twice and correctly on the
third try, and confirm the answer was never revealed in between and the card scores ⅓ of a point.

**Acceptance Scenarios**:

1. **Given** three attempts are allowed, **When** the learner answers wrongly with attempts left,
   **Then** the app says the answer was wrong and how many attempts remain, keeps the correct answer
   hidden, and returns the learner to an empty input on the same card.
2. **Given** the learner is on their final allowed attempt, **When** they answer wrongly, **Then**
   the correct answer is revealed exactly as it is in one-attempt mode.
3. **Given** the learner answers correctly on the second attempt, **When** the feedback appears,
   **Then** the card counts as correct and is credited ½ a point.
4. **Given** a card is still open with attempts remaining, **When** the learner looks at the running
   tally, **Then** the card is counted as neither correct nor incorrect yet.
5. **Given** the toggle is off, **When** the learner answers wrongly, **Then** the correct answer is
   revealed immediately, exactly as before the option existed.

---

### Edge Cases

- **No kana selected**: starting is blocked with a clear explanation; the start action communicates
  why it is unavailable rather than failing silently.
- **More cards requested than available**: blocked before the quiz starts, with the available maximum
  stated. Counts are computed from unique kana, not from group count.
- **Only one kana available**: a one-card quiz runs and completes normally.
- **Empty answer submitted**: rejected without advancing and without scoring; the learner stays on the
  card.
- **Uppercase romaji and surrounding whitespace**: `A`, ` a `, and `a` are all accepted for `あ`.
- **Answer for a kana that shares a romaji spelling**: only the kana matching the prompted script is
  accepted (a Katakana prompt is not satisfied by the Hiragana character, and vice versa).
- **Last card answered**: the app moves to results and does not offer another card.
- **Restart after finishing**: a new quiz reuses the configuration but reshuffles; the previous score
  is cleared.
- **Configuration changed after a quiz**: the next quiz uses the new configuration, and any stale
  card-count selection that is now invalid is corrected or blocked before starting.
- **Page refresh during configuration**: the learner returns to a usable configuration screen; at
  worst, unsaved selections revert to the last-saved or default state.
- **Back navigation during a quiz** (browser back or Android back gesture): the learner leaves the
  quiz cleanly and returns to configuration; the abandoned quiz is discarded rather than resumed in a
  partial state.
- **Very small screens**: the prompt, input, and submit action all remain reachable without the layout
  overflowing or the card being clipped.
- **On-screen keyboard opens on mobile**: the prompt and the answer input remain visible while typing.
- **No Japanese keyboard installed**: Romaji → Kana cards cannot be answered, so the app must not
  present this as a fault of the learner's answer — the configuration screen makes clear that
  Kana → Romaji requires no special keyboard, and that direction stays fully usable.
- **Enter key on a keyboard**: submits the current answer, and on the feedback state advances to the
  next card.
- **No network connection**: every part of the experience continues to work.
- **Blank submission during a retry**: rejected without spending an attempt.
- **Card still open for retries**: counted as neither correct nor incorrect in the running tally and
  left out of the accuracy denominator until it resolves one way or the other.
- **Attempts setting changed mid-configuration**: applies to the next quiz started; a quiz in
  progress keeps the setting it began with.

## Requirements *(mandatory)*

### Functional Requirements

**Kana content**

- **FR-001**: The app MUST include a complete bundled dataset for both Hiragana and Katakana, covering
  main kana (including を/ヲ and ん/ン), dakuten and handakuten kana, and combination (yōon) kana.
- **FR-001a**: The Main section MUST expose exactly ten groups — あ, か, さ, た, な, は, ま, や, ら, わ —
  with を and ん belonging to the わ group. Selecting all main groups MUST therefore make every main
  kana reachable, with none left outside the group structure.
- **FR-002**: Every kana entry MUST carry the kana character, its romaji, its script, and the group it
  belongs to.
- **FR-003**: Hiragana and Katakana MUST use the same group structure so that any practice selection
  available for one script is available for the other.
- **FR-004**: The dataset MUST exclude obsolete and non-standard kana combinations unless they are
  deliberately and visibly supported.
- **FR-005**: Romaji MUST follow one canonical romanization throughout (`shi`, `chi`, `tsu`, `fu`,
  `ja`, `ju`, `jo`, `dya`/`dyu`/`dyo`); alternative romanizations MUST NOT be silently accepted as
  correct.
- **FR-006**: Kana characters MUST display correctly on every supported platform regardless of which
  fonts the user's device has installed.

**Configuration**

- **FR-007**: Users MUST be able to choose between Hiragana and Katakana, with Hiragana selected by
  default.
- **FR-008**: Users MUST be able to select kana to practice by group, organized into Main, Dakuten, and
  Combination sections.
- **FR-009**: Users MUST be able to select or deselect a whole section at once, select individual
  groups, and hold selections across multiple sections simultaneously.
- **FR-009a**: Group selections MUST be shared across scripts — switching between Hiragana and
  Katakana MUST preserve the current selection and re-render the same groups in the newly selected
  script.
- **FR-010**: The configuration screen MUST show how many unique kana the current selection contains.
- **FR-011**: Users MUST be able to choose the number of cards from preset values (5, 10, 20, 30, 50)
  or enter a custom number.
- **FR-012**: The app MUST prevent starting a quiz whose requested card count exceeds the number of
  unique kana selected, and MUST tell the user the maximum available.
- **FR-013**: The app MUST prevent starting a quiz when no kana are selected, and MUST say so.
- **FR-014**: Users MUST be able to choose the quiz direction from Kana → Romaji, Romaji → Kana, or
  Both, with Both selected by default.

**Quiz generation**

- **FR-015**: Starting a quiz MUST produce exactly the requested number of cards, drawn only from the
  selected kana.
- **FR-016**: A given kana MUST NOT appear more than once in a single quiz, regardless of the direction
  assigned to its card — `あ → a` and `a → あ` count as the same card.
- **FR-017**: Card order MUST be randomized independently for each quiz by drawing a uniform shuffle
  over the selected pool. (The requirement is the shuffle, not a guarantee that two quizzes differ:
  with a one-kana pool the sequence necessarily repeats.)
- **FR-018**: In Both mode, each card's direction MUST be decided independently of the other cards.

**Answering**

- **FR-019**: The quiz screen MUST show the current card's position and the total number of cards.
- **FR-020**: The quiz screen MUST present the prompt as the dominant visual element, with a single
  free-text answer input and a submit action.
- **FR-021**: For Romaji → Kana cards, kana MUST be entered through the platform's standard text
  input using the learner's own Japanese keyboard or IME; the app MUST NOT ship its own on-screen
  kana keyboard.
- **FR-022**: Submitting an answer MUST be possible both by activating the submit control and by
  pressing Enter when a keyboard is available.
- **FR-023**: Submitting an empty or whitespace-only answer MUST NOT advance the quiz and MUST NOT be
  recorded as an answer.
- **FR-024**: A card MUST NOT be answerable once it is resolved — that is, once it has been answered
  correctly or its allowed attempts are spent.
- **FR-043**: Users MUST be able to turn on three attempts per card with a single toggle on the
  configuration screen. It MUST be off by default, so a quiz allows one attempt unless asked
  otherwise.
- **FR-044**: With attempts remaining, a wrong answer MUST keep the learner on the same card with an
  empty input, MUST say how many attempts remain, and MUST NOT reveal the correct answer or any part
  of it.
- **FR-045**: When the final allowed attempt is wrong, the app MUST reveal the correct answer exactly
  as it does in one-attempt mode.
- **FR-046**: A card answered correctly MUST be credited 1 / (attempts used) — 1 point on the first
  attempt, ½ on the second, ⅓ on the third — and a card never answered correctly MUST score nothing.
  Accuracy MUST be derived from these points, so a one-attempt quiz scores exactly as a plain
  correct/incorrect tally.
- **FR-047**: A card still open for retries MUST count as neither correct nor incorrect, and MUST be
  excluded from the accuracy denominator until it resolves.

**Validation**

- **FR-025**: Romaji answers MUST be compared case-insensitively.
- **FR-026**: Leading and trailing whitespace MUST be removed from an answer before it is compared.
- **FR-027**: Kana answers MUST be compared against the exact expected kana character for the prompted
  script.
- **FR-028**: The same validation rules MUST apply to both scripts and all three directions.

**Feedback and results**

- **FR-029**: After each submission the app MUST state explicitly whether the answer was correct.
- **FR-030**: A correct answer MUST show the kana/romaji mapping for the card.
- **FR-031**: An incorrect answer MUST show the prompt, the learner's answer, and the correct answer,
  and MUST keep them visible until the learner chooses to advance.
- **FR-032**: The app MUST track correct answers, incorrect answers, and accuracy for the session and
  make progress visible during the quiz.
- **FR-033**: After the final card the app MUST show a results screen with the score, accuracy
  percentage, and the correct and incorrect counts.
- **FR-033a**: The results screen MUST list every kana the learner answered incorrectly together with
  its correct answer. When every answer was correct, the list MUST be omitted rather than shown empty.
- **FR-033b**: When more than one attempt was allowed, the results screen MUST show how many cards
  were solved on each attempt, so a fractional score is explainable rather than surprising.
- **FR-034**: The results screen MUST offer restarting with the same configuration and returning to the
  configuration screen.

**Availability and privacy**

- **FR-035**: After the app is installed or first loaded, all functionality — configuration, quiz
  generation, validation, scoring, and navigation — MUST work with no network connection.
- **FR-035a**: On the web this parity MUST survive closing the browser: once a learner has visited
  once, reopening the app with no connection MUST load the full experience, and the app MUST be
  installable to the home screen or desktop and launchable as a standalone app.
- **FR-036**: The app MUST NOT require an account, MUST NOT collect personal data, and MUST NOT contain
  advertising, purchases, subscriptions, premium tiers, or advertising-related tracking.
- **FR-037**: The app MAY remember the last-used script, groups, card count, and direction locally, and
  MUST remain fully functional when that stored information is missing, unreadable, or cleared.
- **FR-038**: Leaving a quiz through platform back navigation MUST return the learner to the
  configuration screen in a usable state rather than a partially rendered quiz.

**Reach and accessibility**

- **FR-039**: The same experience MUST be usable on phone portrait screens, tablets, and desktop web,
  with the flashcard remaining the visual focus and not stretched across a wide desktop viewport.
- **FR-040**: The app MUST meet WCAG 2.1 AA for text contrast, MUST respect the user's text-size
  settings, MUST expose visible focus indicators, and MUST label interactive controls for assistive
  technology.
- **FR-041**: Every interactive control MUST be reachable and operable by keyboard alone on the web.
- **FR-042**: Touch targets MUST be at least 44×44 points so that group selection and answering are
  reliable on a phone.

### Key Entities

- **Kana Entry**: One character in one script — its kana, its canonical romaji, its script (Hiragana or
  Katakana), and its group. The smallest unit a quiz draws from.
- **Kana Group**: A named row or family of kana (for example the か row, the が row, the きゃ family)
  belonging to a section (Main, Dakuten, Combination). The unit the learner selects.
- **Quiz Configuration**: The learner's choices before starting — script, selected groups, resulting
  kana pool, card count, direction, and how many attempts each card allows.
- **Quiz Question**: One card in a session — the kana it is based on, the direction assigned to it, the
  prompt shown, and the expected answer.
- **Quiz Session**: One run through a generated set of questions — the questions, current position,
  one answer record per question holding every submission made against it, per-question outcomes
  retained until the session ends (so the results screen can list the misses), correct and incorrect
  counts, and whether it is in progress or complete.
- **Saved Preferences**: The optional locally stored copy of the last-used configuration.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time learner can go from opening the app to answering their first card in under
  30 seconds without reading instructions.
- **SC-002**: 100% of generated quizzes contain exactly the requested number of cards, all drawn from
  the selected kana, with no kana repeated — verified across at least 1,000 generated quizzes spanning
  every direction setting and a range of pool sizes.
- **SC-003**: Every kana in the standard Hiragana and Katakana inventories is reachable through group
  selection, and every kana/romaji pair in the bundled data matches a published reference with zero
  errors.
- **SC-004**: Answer feedback appears within 100 ms of submission, measured in the page from the
  submitting keystroke to the feedback being in the DOM, so the interaction feels instantaneous.
- **SC-005**: A learner completing a 10-card quiz never encounters a state where the prompt, the input,
  or the submit action is hidden or unreachable — verified on a 320 px-wide phone screen with the
  on-screen keyboard open, on a tablet, and on desktop web.
- **SC-006**: The complete experience works with the device in airplane mode, from configuration
  through results, with zero functionality lost — verified on all three targets, including a web
  visit made offline after the browser has been fully closed and reopened.
- **SC-007**: 95% of learners in usability testing correctly interpret the feedback for a wrong answer
  — that is, they can say what the correct answer was after seeing the feedback.
- **SC-008**: An invalid configuration (no kana selected, or more cards than available) is never able to
  start a quiz, and in every such case the learner is told what to change.
- **SC-010**: In three-attempt mode, the correct answer is never visible before the final allowed
  attempt is spent — verified for every direction setting.
- **SC-011**: A one-attempt quiz produces exactly the same score it produced before the attempts
  option existed, for the same answers.
- **SC-009**: The app passes an automated WCAG 2.1 AA audit with no critical violations, and every
  screen can be completed using only a keyboard.

## Assumptions

- **Romanization**: The canonical system is Hepburn as spelled out in the source description, with
  `dya`/`dyu`/`dyo` for the ぢゃ family as explicitly listed there. Variants such as `si`, `ti`, `tu`,
  `hu`, `zya` (Kunrei-shiki/Nihon-shiki) are treated as incorrect answers.
- **Inventory**: The main-kana section includes を/ヲ and ん/ン, both grouped under わ. Obsolete kana (ゐ/ゑ and their Katakana forms)
  and the small tsu (っ/ッ) are excluded, as are non-standard combinations, since they are not part of
  the standard practice inventory described.
- **Default configuration**: Hiragana, all main kana selected, 10 cards, Both directions — chosen so
  that a first-time learner can start immediately (SC-001) without configuring anything.
- **Custom card count**: The custom value accepts whole numbers from 1 up to the number of unique kana
  currently selected.
- **Forward-only quizzes**: A learner cannot go back to a previous card or skip ahead within a quiz;
  each card is answered once, in order. Abandoning a quiz discards it rather than saving it for later
  resumption.
- **No history**: Results exist only for the session just completed. Streaks, per-kana statistics, and
  long-term progress tracking are out of scope, consistent with the no-accounts, no-tracking
  constraint.
- **Single learner per device**: There are no profiles; stored preferences belong to whoever is using
  the device.
- **Answer scope**: Each card has exactly one correct answer. Alternative accepted spellings for a
  single kana are not supported in this scope.
- **Kana input**: Learners answering Romaji → Kana cards supply their own Japanese keyboard or IME
  (standard on iOS and Android once enabled in system settings, and available on every desktop OS).
  Building an in-app kana keyboard is out of scope; a learner without one can still practice using the
  Kana → Romaji direction.
- **Attempts granularity**: The option is one attempt or three, not an arbitrary number. Three is the
  familiar convention and keeps the credit fractions (1, ½, ⅓) legible on the results screen.
- **Credit is per card, not per quiz**: Partial credit changes the score, never the correct/incorrect
  counts — a card solved on the third try is still a card the learner got right.
- **Content language**: The interface is in English; the learning content is Japanese kana.
