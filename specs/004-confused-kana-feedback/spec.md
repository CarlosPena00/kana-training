# Feature Specification: Confused Kana Feedback

**Feature Branch**: `004-confused-kana-feedback`

**Created**: 2026-08-28

**Status**: Draft

**Input**: User description: "When the learner answers with something that is itself a valid kana reading, tell them which kana they actually typed, so they can see they are confusing two kana. Show the correct answer, what the user typed, and the kana that their answer corresponds to. For example if the card is ろ (ro) and they type 'ru', show that ろ is the correct answer and that 'ru' is る — so they learn they are mixing up ろ and る. Make it user-friendly."

## Overview

Today a wrong answer says: **your answer was `ru`, the correct answer is `ro`**. That is accurate and
almost useless. It tells the learner they were wrong without telling them *what went wrong*.

Most wrong answers in this app are not random. The learner did not fail to produce a sound — they
produced the sound of a **different kana**, because ろ and る look alike. Typing `ru` for ろ is not
noise; it is a specific, nameable confusion, and it is the single most common way early kana study
goes wrong.

This feature names it. When the learner's answer is itself a real kana reading, the feedback shows
both characters together and says plainly: *you wrote る, the answer was ろ*. The learner stops
seeing a wrong answer and starts seeing the pair they need to tell apart.

It changes nothing about what counts as correct. It is feedback, not grading.

## Clarifications

### Session 2026-08-28

- Q: Is this presentation only, or is the confusion also recorded? → A: **Presentation only.**
  Nothing is stored. The pairing exists for as long as the feedback is on screen and is then gone.
- Q: Does the explanation appear during a retry, before the answer is revealed? → A: **Yes.** The
  kana the learner wrote is named while attempts remain; the correct answer stays hidden until the
  retries are spent.
- Q: Does this cover romanization mistakes as well as kana confusion? → A: **Yes.** A recognised
  non-canonical spelling such as `si` or `tu` is explained by naming the spelling this app uses. The
  kana it points at is not named — that is the difference from a kana confusion.

- Q: How is the right sound in the wrong script handled — ロ where ろ was wanted? → A: **A script
  note**: the answer is named as the other script's character and the card's script is stated. It is
  not presented as a confusion between two characters, because the learner picked the right one.

**Consequence of combining the last two answers** — recorded because it is not obvious: a
romanization note names the canonical spelling, which on a Kana → Romaji card *is* the answer.
Telling a learner "this app uses `shi`" while they still have attempts left on し would hand them the
answer the retry is meant to withhold (FR-015a). The romanization note is therefore suppressed
whenever it would reveal the current card's expected answer (FR-020b).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Tell me which kana I actually wrote (Priority: P1)

A learner is drilling Hiragana. The card shows ろ. They type `ru`. Instead of only being told the
answer was `ro`, they are shown that `ru` is る — the character they were thinking of — alongside the
ろ they were actually asked about.

**Why this priority**: This is the feature. Everything else is presentation of it. Without the
lookup there is nothing new to show, and with it even a plain text line delivers the whole value.

**Independent Test**: Answer a ろ card with `ru` and confirm the feedback names る as the kana that
reading belongs to, alongside the correct answer.

**Acceptance Scenarios**:

1. **Given** a Kana → Romaji card showing ろ, **When** the learner answers `ru`, **Then** the feedback
   shows that ろ is the correct answer and that `ru` is る.
2. **Given** a Romaji → Kana card prompting `ro`, **When** the learner writes る, **Then** the feedback
   shows that ろ was wanted and that る is read `ru`.
3. **Given** any wrong answer that is not a kana reading at all, such as `zzz`, **When** the feedback
   appears, **Then** it shows what the learner typed and the correct answer exactly as it does today,
   with no confusion explanation and no empty space where one would have been.
4. **Given** a learner drilling Katakana who answers ロ with `ru`, **When** the feedback appears,
   **Then** the kana named is ル, not る — the script being practised is the script explained.
5. **Given** a correct answer, **When** the feedback appears, **Then** nothing about confusion is
   shown; this feature never comments on a right answer.
6. **Given** a three-attempt card with tries remaining, **When** the learner answers `ru` to ろ,
   **Then** they are told they wrote る, and are still not told that the answer is ろ or `ro`.
7. **Given** that same card once every attempt is spent, **When** the answer is revealed, **Then**
   both characters are shown together.

---

### User Story 2 - Show me the two characters, not a sentence about them (Priority: P2)

The learner sees ろ and る next to each other, large enough to compare, each labelled with its
reading — so the difference registers visually rather than being described in words they have to
decode.

**Why this priority**: This is the "user-friendly" half of the request, and it is what turns a
correct explanation into a useful one. A learner who reads *"you wrote ru which is る"* has to hold
two characters in their head; a learner who sees them side by side does not. It depends on Story 1
but is where most of the teaching happens.

**Independent Test**: Trigger a confusion on a phone-sized screen and confirm both characters are
legible, clearly labelled as *wanted* and *what you wrote*, and distinguishable without relying on
colour alone.

**Acceptance Scenarios**:

1. **Given** a confusion is being explained, **When** the learner looks at the feedback, **Then** both
   kana are shown at a size comparable to the card itself, each with its reading.
2. **Given** the two characters are shown, **When** the learner reads them, **Then** it is unambiguous
   which one was wanted and which one they wrote, stated in words and not by colour or position
   alone.
3. **Given** a narrow phone screen, **When** the explanation appears, **Then** nothing is clipped,
   nothing scrolls sideways, and the answer input does not move.
4. **Given** a screen reader is in use, **When** the explanation appears, **Then** it is announced as
   one coherent statement rather than as loose characters.
5. **Given** the explanation appears, **When** the learner continues, **Then** advancing works exactly
   as it does for any other wrong answer.

---

### User Story 3 - The same help wherever I am corrected (Priority: P3)

The explanation appears consistently: in an ordinary quiz, in a correction round drawn from the
mistake list, and in either quiz direction.

**Why this priority**: Consistency is what makes it feel like part of the app rather than a feature
that fires sometimes. It is last because each surface works on its own once Story 1 exists.

**Independent Test**: Trigger the same confusion in an ordinary quiz and in a correction round and
confirm the explanation is the same in both.

**Acceptance Scenarios**:

1. **Given** a correction round from the mistake list, **When** the learner answers with another
   kana's reading, **Then** the same explanation appears as in an ordinary quiz.
2. **Given** a correction round mixing both scripts, **When** the learner is wrong on a Katakana card,
   **Then** the kana named belongs to that card's script, not to the script selected on the
   configuration screen.
3. **Given** either quiz direction, **When** a confusion is explained, **Then** the two characters are
   presented the same way round in both, so the layout does not have to be relearned.
4. **Given** a Hiragana card wanting ろ, **When** the learner writes ロ, **Then** they are told that is
   the Katakana character and that this card wants Hiragana, and it is still marked wrong.

---

### Edge Cases

- **The answer is not a kana reading**: `zzz`, a number, an emoji, punctuation. No explanation is
  offered and the existing feedback is unchanged.
- **The answer is a non-canonical spelling**: `si`, `tu`, `hu`, `zi`. Explained as a spelling note
  rather than a kana confusion — the learner did not pick the wrong character, they used a different
  romanization system.
- **A non-canonical spelling on the card it belongs to**: `si` answered to し. The note would state
  the answer, so while attempts remain it is withheld (FR-020b).
- **A string that is both**: any candidate alternate spelling that is already a canonical reading is
  excluded from the alternate set entirely (FR-020a), so this case cannot arise.
- **The answer is a kana reading in the other script only**: the learner is on Hiragana and writes
  ル. What is named must not silently cross scripts and imply ル was an acceptable answer.
- **The answer is the correct kana in the wrong script**: ろ answered as ロ. Explained as a script
  note (FR-008), never as a confusion — the learner picked the right character in the wrong alphabet.
- **Case and whitespace**: `RU`, ` ru ` and `ru` are the same answer and must all resolve the same
  way, following the app's existing answer handling.
- **A composed kana from an IME**: a decomposed character typed on a Japanese keyboard must resolve
  the same as its composed form.
- **Multi-character answers**: `kya` and きゃ are single entries; an answer of `kya` must name きゃ
  rather than failing to resolve.
- **An answer that is several kana**: `ruro` or るろ. This is not one confusion and MUST NOT be
  explained as one.
- **A blank answer**: already ignored by the quiz and unchanged here.
- **Retry state**: a wrong answer with attempts remaining names what the learner wrote but never
  what was wanted (FR-015a), so the retry still withholds the answer. The learner sees "you wrote る"
  and is left to work out that ろ is something else.
- **Retry where the learner repeats the same wrong kana**: writing `ru` three times in a row must not
  produce three identical explanations stacked up; the card shows the current state, not a log.

## Requirements *(mandatory)*

### Functional Requirements

#### Identifying the confusion

- **FR-001**: When the learner's answer is wrong, the system MUST determine whether that answer is
  itself a valid reading or character of a kana in the dataset.
- **FR-002**: The system MUST resolve the answer within the **card's own script**, so a Hiragana card
  names a Hiragana character and a Katakana card names a Katakana one.
- **FR-003**: The system MUST resolve answers in both directions: a romaji answer to the kana it
  reads, and a kana answer to the reading it has.
- **FR-004**: The system MUST apply the same case, whitespace, and character-composition handling to
  this lookup as it applies to judging the answer, so an answer that is treated as one thing when
  graded is treated as the same thing when explained.
- **FR-005**: The system MUST NOT offer an explanation when the answer does not resolve to exactly
  one kana in the card's script.
- **FR-006**: The system MUST NOT offer an explanation for a multi-kana answer, even when every part
  of it is individually valid.
- **FR-007**: The system MUST NOT treat resolving an answer as accepting it. What counts as correct
  is unchanged.
- **FR-008**: When the answer is the correct kana in the wrong script — ロ where ろ was wanted — the
  system MUST show a script note naming the script the answer belongs to and the script the card
  wants.
- **FR-008a**: A script note MUST NOT be presented as a confusion between two characters. The learner
  chose the right character, and telling them they mixed up two would be false.
- **FR-008b**: A script note MUST NOT imply the answer was acceptable. It is a wrong answer and is
  scored as one.
- **FR-008c**: A script note MUST NOT be shown while attempts remain if it would reveal the card's
  expected answer, on the same grounds as FR-020b.

#### Showing it

- **FR-009**: When a confusion is identified, the system MUST show the kana that was asked for, its
  reading, the kana the learner's answer belongs to, and its reading.
- **FR-010**: The two characters MUST be shown at a size that makes their shapes comparable, not
  embedded in running text.
- **FR-011**: Which character was wanted and which the learner wrote MUST be stated in words, and MUST
  NOT depend on colour, position, or order alone.
- **FR-012**: The explanation MUST be announced to assistive technology as one coherent statement.
- **FR-013**: The explanation MUST fit the existing feedback area without moving the answer input or
  the button beneath it.
- **FR-014**: The explanation MUST NOT appear for a correct answer.
- **FR-015**: The explanation MUST appear while attempts remain on a card, naming the kana the
  learner's answer belongs to.
- **FR-015a**: While attempts remain, the explanation MUST NOT reveal the kana that was asked for,
  nor its reading. The retry keeps withholding the correct answer; only what the learner themselves
  wrote is named back to them.
- **FR-015b**: Once the answer is revealed — the attempts are spent, or the card is in a correction
  round — the explanation MUST show both sides, as described in FR-009.

#### Where it applies

- **FR-016**: The explanation MUST appear in ordinary quizzes and in correction rounds alike.
- **FR-017**: In a correction round, the script named MUST come from the card, not from the script
  selected on the configuration screen.
- **FR-018**: The explanation MUST behave identically in both quiz directions.

#### Scope

- **FR-019**: A confusion MUST NOT be recorded. It exists only for as long as the feedback is on
  screen, and the app MUST NOT accumulate any history of which pairs a learner confuses.
- **FR-020**: When a wrong answer is a recognised non-canonical romanization of a kana, the system
  MUST tell the learner which spelling this app uses.
- **FR-020a**: The set of recognised non-canonical spellings MUST be defined against this dataset's
  own canonical readings, and MUST NOT contain any string that is already a canonical reading. `di`
  and `du` are the canonical readings of ぢ and づ here, so neither may be treated as an alternate
  spelling of something else.
- **FR-020b**: A romanization note MUST NOT be shown while attempts remain if it would state the
  current card's expected answer, since the retry withholds that answer (FR-015a).
- **FR-020c**: Recognising a non-canonical spelling MUST NOT make it an accepted answer. The app
  continues to accept exactly one romanization system.
- **FR-020d**: A romanization note MUST NOT name a kana. Naming the character is what distinguishes a
  kana confusion from a spelling note, and conflating the two would tell the learner they confused
  two characters when they did not.
- **FR-021**: The feature MUST NOT change which answers are accepted, how quizzes are generated, or
  how they are scored.
- **FR-022**: The feature MUST NOT introduce any new stored data, in browser storage or anywhere
  else, and MUST NOT extend what the mistake history stores.

### Key Entities

- **Confusion**: The pairing of the kana a card asked for with the kana the learner's answer actually
  belongs to. Both sides are existing dataset entries, so the pairing carries no information beyond
  those two identities. It is derived on the spot from the answer just given, lives only as long as
  the feedback is on screen, and is never written anywhere.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every wrong answer that is a valid reading in the card's script is explained — 100% of
  them — and no answer that is not is explained.
- **SC-002**: A learner can identify which two characters they confused without reading more than one
  short sentence.
- **SC-003**: The explanation is legible on the narrowest supported phone screen with nothing clipped
  and no sideways scrolling.
- **SC-004**: Feedback continues to appear within the app's existing latency budget, with no
  measurable delay added by the lookup.
- **SC-005**: Answering with a valid reading or a recognised alternate spelling changes the learner's
  score in 0% of cases — the feature is feedback, never grading.
- **SC-005a**: A romanization note never states the current card's expected answer while attempts
  remain, in 100% of retry cases.
- **SC-006**: Existing quiz behaviour is unchanged, verified by the current scenarios passing without
  modification.
- **SC-007**: Over a study period, a learner shown these explanations can name their own confusion
  pairs — a qualitative check that the feature teaches rather than merely reports.

## Assumptions

- **The dataset makes this possible and unambiguous.** Romaji is unique within a script and the
  kana↔romaji mapping inverts one-to-one, so "which kana is `ru`?" has exactly one answer per script.
  This feature is a reverse lookup over data that already exists; it adds no dataset entries.
- **The card's script is the right scope.** A learner drilling Hiragana who types `ru` is thinking of
  る, not ル. Naming the other script's character would answer a question they did not ask.
- **There are three distinct messages, and they are never combined.** A *kana confusion* says you
  wrote a different character. A *spelling note* says you used a different romanization system. A
  *script note* says you wrote the right character in the wrong alphabet. Exactly one applies to any
  given answer, and each says only what is true of that answer.
- **Only single-kana answers are explained.** A learner who types two kana has made a different kind
  of mistake, and guessing at which half they meant would teach the wrong lesson.
- **This is presentation, not assessment.** Existing normalization, validation, and scoring are
  untouched; the same answers are right and wrong as before.
- **Nothing is stored.** The explanation is derived from the answer in front of the learner, every
  time. This keeps the feature free of the storage, repair, and privacy obligations that recording it
  would bring, and leaves Principle I untouched.
- **It reuses the existing feedback area** rather than introducing a new surface, keeping the app at
  its current four screens.
- **Frequency is not tracked** here. How often a learner confuses a given pair is the mistake
  history's concern, not this feature's.

## Dependencies

- **Depends on the kana dataset** and specifically on its one-to-one kana↔romaji guarantee within a
  script. If that guarantee were ever relaxed, this feature would become ambiguous.
- **Depends on the existing answer-normalization rules**, so that the lookup and the grading agree
  about what the learner typed.
- **Touches the existing feedback surfaces** shared by ordinary quizzes and correction rounds.
- **Relates to two other features without depending on or feeding either**: the mistake history
  records *that* a kana was missed, and the planned matching mode is built around confusion sets.
  Recording confusion pairs here would have served both, and was deliberately declined (FR-019) to
  keep this feature to a display change. The lookup this feature needs is the same one a future
  recording feature would use, so that option stays open at no cost.
