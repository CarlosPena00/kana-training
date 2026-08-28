# Feature Specification: Match Similar Kana

**Feature Branch**: `002-match-similar-kana`

**Created**: 2026-08-28

**Status**: Draft

**Input**: User description: "Another mode that instead of show 1 card, we will shows a few cards, and a few translations, the user must connect them. I want to focus on similar kana, such as Ro and ru, Me and Ne, Hi and Bi, Ha and ho, and goes on"

## Overview

A second practice mode. Instead of one card at a time, the learner is shown a small grid of kana and
a matching set of romaji, and connects each kana to its reading.

The point is not the format for its own sake — it is **contrast**. Single-card practice asks "what
is this?", which a learner can often answer from a half-remembered shape. Matching asks "which of
these is which?", which they cannot. Putting ろ next to る, or め next to ね, forces exactly the
discrimination that single cards let you avoid, and those confusions are what make early kana study
frustrating.

This mode is additive: the existing single-card quiz is unchanged, and a learner can use either.

## Clarifications

### Session 2026-08-28

- Q: How does the learner connect a kana to its reading? → A: Tap one tile then the other; once matched, a line is drawn between them and stays for the rest of the round.
- Q: Where do the pairs in a round come from? → A: The learner picks from a ready-made catalogue of confusion sets, with a sensible default already selected so a first round can start immediately.
- Q: What happens when the learner connects the wrong pair? → A: The connection is rejected immediately and both tiles reopen; after a second wrong attempt on the same kana, its correct pair is revealed and matched for them.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Tell apart the kana that look alike (Priority: P1)

A learner keeps mixing up ろ and る. They start a matching round built from that confusion set, see
both kana on screen at once alongside their readings, and have to decide which is which — with no
option to guess from a vague impression, because both shapes are right there.

**Why this priority**: This is the entire feature. Without the matching interaction there is no mode,
and without the confusion sets it is just a slower version of the existing quiz.

**Independent Test**: Start a round from a single confusion set, connect every pair, and confirm the
round completes and reports which pairs were connected correctly.

**Acceptance Scenarios**:

1. **Given** a round has started, **When** the learner looks at the screen, **Then** they see several
   kana and the same number of readings, arranged so that no kana sits directly beside its own
   reading.
2. **Given** an unmatched kana and its correct reading, **When** the learner connects them, **Then**
   the pair is shown as matched and both stop being available for further connections.
3. **Given** an unmatched kana, **When** the learner connects it to the wrong reading, **Then** the
   connection is refused, both tiles become selectable again, and the reading remains available for
   the kana it truly belongs to.
4. **Given** a kana the learner has already connected wrongly once, **When** they connect it wrongly
   a second time, **Then** the app reveals its correct reading, matches the pair for them, and marks
   it as revealed rather than solved.
5. **Given** a pair has been matched, **When** the learner looks at the board, **Then** a line joins
   the two tiles, and a revealed pair's line is distinguishable from one they matched themselves.
6. **Given** every pair has been connected, **When** the last one is made, **Then** the round ends
   and the results are shown.
7. **Given** a round drawn from the ろ/る confusion set, **When** the round is generated, **Then**
   both ろ and る appear in it, so the learner has to distinguish them rather than recognize one in
   isolation.

---

### User Story 2 - Choose which confusions to drill (Priority: P2)

A learner who has mastered ろ/る but still fumbles シ/ツ wants to spend their time on the pairs that
actually trouble them, rather than working through everything.

**Why this priority**: Targeting is what makes the mode worth repeating, but a learner gets value
from a default selection on their first run.

**Independent Test**: Select only the シ/ツ confusion set, start a round, and confirm every tile
comes from that set and no other.

**Acceptance Scenarios**:

1. **Given** the configuration screen, **When** the learner views the available confusion sets,
   **Then** they see a ready-made list, each set labelled with the kana it contains, with a default
   selection already made so they can start immediately.
2. **Given** the learner has selected two confusion sets, **When** a round is generated, **Then**
   every tile comes from one of those two sets.
3. **Given** the learner selects a script, **When** they view the confusion sets, **Then** they see
   the sets belonging to that script, since the look-alikes differ between Hiragana and Katakana.

---

### User Story 3 - See exactly what was confused (Priority: P2)

After a round, a learner wants to know not just how many they got wrong, but *which pair they mixed
up with which* — that ね was matched to `me` is far more useful than "1 incorrect".

**Why this priority**: The whole mode is about confusions, so a result that does not name the
confusion wastes the exercise.

**Independent Test**: Deliberately connect ね to `me`, finish the round, and confirm the results name
that specific mistake rather than only counting it.

**Acceptance Scenarios**:

1. **Given** a completed round with mistakes, **When** the results appear, **Then** each mistake is
   shown as the kana, the reading the learner chose, and the correct reading.
2. **Given** a completed round with no mistakes, **When** the results appear, **Then** no mistake
   list is shown at all.
3. **Given** a completed round, **When** the results appear, **Then** the learner can start another
   round with the same selection without reconfiguring.

---

### Edge Cases

- **A confusion set smaller than the round size**: a round draws from the selected sets until it is
  full; if the selection cannot fill a round, the round is smaller rather than padded with unrelated
  kana.
- **A single confusion set selected**: the round is built entirely from that set, which is the point
  — the learner sees ろ and る side by side.
- **Nothing selected**: starting is blocked with a clear explanation, as in the existing quiz.
- **The same reading appearing twice**: cannot happen, because every kana in the dataset has a
  distinct reading; a round never contains two tiles with the same label.
- **Tapping the same tile twice**: deselects it rather than connecting it to itself.
- **Connecting an already-matched tile**: matched tiles are inert and cannot be reconnected.
- **A wrong connection to a reading needed later**: the reading is not consumed, so an early mistake
  never causes a later pair to fail as a consequence.
- **Two wrong attempts spread across different kana**: the reveal counts wrong attempts per kana, so
  one mistake on each of two kana reveals neither.
- **The last remaining pair**: with one kana and one reading left the answer is forced, so the round
  completes on the next connection whether or not the learner is sure.
- **Leaving mid-round**: platform back navigation returns to configuration and discards the round,
  consistent with the existing quiz.
- **Very small screens**: all tiles in a round remain visible and tappable without the layout
  overflowing; a round never requires horizontal scrolling.
- **Rounds of a single pair**: a one-pair round is trivially solvable and is therefore not offered;
  a round contains at least two pairs so a choice is always required.

## Requirements *(mandatory)*

### Functional Requirements

**Confusion sets**

- **FR-001**: The app MUST include a bundled catalogue of confusion sets: named groups of kana that
  learners commonly mistake for one another.
- **FR-002**: Confusion sets MUST cover both kinds of confusion — kana that look alike (ろ/る, め/ぬ,
  シ/ツ) and kana that differ only by a diacritic (ひ/び/ぴ, は/ば/ぱ).
- **FR-003**: Each confusion set MUST contain at least two kana, and every kana in it MUST exist in
  the bundled kana dataset with the same reading.
- **FR-004**: Confusion sets MUST be defined per script, because Hiragana and Katakana look-alikes
  are different — シ/ツ has no Hiragana equivalent, and ろ/る has no Katakana one.
- **FR-005**: The catalogue MUST be editable without touching interaction or results logic, so sets
  can be added as more confusions are identified.
- **FR-005a**: The catalogue MUST ship ready-made. The learner chooses from the sets provided and
  never has to assemble their own, since knowing which kana are confusable is precisely what a
  beginner does not yet know.
- **FR-005b**: A default selection MUST be pre-selected, so a learner can start a first round without
  making any choices.

**Building a round**

- **FR-006**: A round MUST present several kana and the same number of readings, with exactly one
  correct reading for each kana.
- **FR-007**: Every kana in a round MUST come from a confusion set the learner has selected.
- **FR-008**: A round MUST prefer kana from the *same* confusion set over kana spread across
  different sets, so the learner is discriminating between look-alikes rather than between unrelated
  characters.
- **FR-009**: A kana MUST NOT appear more than once in a round.
- **FR-010**: The readings MUST be ordered independently of the kana, so that position gives no clue
  to the answer.
- **FR-011**: A round MUST contain at least two pairs, and the learner MUST be able to choose how
  many pairs a round holds.

**Matching**

- **FR-012**: The learner MUST connect a kana to a reading by selecting one tile and then the other.
  Dragging MUST NOT be required, so the same interaction serves a finger, a mouse, and a keyboard.
- **FR-012a**: The app MUST show clearly which tile is currently selected and which pairs are already
  matched.
- **FR-012b**: Once a pair is matched, a line MUST be drawn between the two tiles and MUST remain for
  the rest of the round, so the learner can see the connections they have made.
- **FR-012c**: A line joining a revealed pair MUST be visually distinct from one joining a pair the
  learner matched themselves — a revealed answer is not an achievement and must not read as one.
- **FR-013**: A matched pair MUST become inert — neither tile can be selected or reconnected.
- **FR-014**: Selecting an already-selected tile MUST deselect it rather than match it to itself.
- **FR-015**: The round MUST end when every kana has been matched, whether by the learner or by
  being revealed.
- **FR-016**: Progress through the round MUST be visible, so the learner can see how many pairs
  remain.

**Wrong connections**

- **FR-016a**: A wrong connection MUST be rejected immediately and visibly, and both tiles MUST
  return to being selectable so the learner can try again.
- **FR-016b**: A wrong connection MUST NOT consume the reading it was dropped on — the tile stays
  available for the pair it actually belongs to.
- **FR-016c**: The app MUST count wrong attempts per kana. On the second wrong attempt for the same
  kana, the app MUST reveal that kana's correct reading and match the pair automatically, so a
  learner cannot become stuck on a character they do not yet know.
- **FR-016d**: A revealed pair MUST be recorded as not correct, and MUST appear in the results
  alongside the readings the learner had tried.

**Results**

- **FR-017**: On finishing a round, the app MUST report how many pairs the learner matched correctly.
- **FR-018**: For each mistake, the results MUST name the kana, the reading or readings the learner
  chose, and the correct reading — a count alone is not enough for a mode built around specific
  confusions.
- **FR-018a**: The results MUST distinguish a pair the learner eventually matched themselves from one
  that had to be revealed.
- **FR-019**: When there were no mistakes, no mistake list MUST be shown rather than an empty one.
- **FR-020**: The learner MUST be able to start another round with the same selection, and to return
  to the configuration screen.

**Fitting the existing app**

- **FR-021**: The learner MUST be able to choose between single-card practice and matching practice,
  and the existing single-card quiz MUST behave exactly as it does today.
- **FR-022**: Matching MUST work entirely offline with the bundled data, requiring no network access
  and no additional permissions.
- **FR-023**: The mode and its selection MUST be remembered between sessions in the same way the
  existing quiz configuration is, and MUST work correctly when that stored information is absent.
- **FR-024**: Matching MUST meet the same accessibility bar as the rest of the app: operable by
  keyboard, labelled for assistive technology, WCAG 2.1 AA contrast, and touch targets of at least
  44×44 points.

### Key Entities

- **Confusion Set**: A named group of kana that learners commonly mix up — an id, the script it
  belongs to, the kana it contains, and a short label naming the confusion (for example "ろ / る").
- **Match Round**: One run of the mode — the pairs it was built from, which tiles have been matched,
  which attempts were made, and whether it is in progress or complete.
- **Match Tile**: One item on screen — either a kana or a reading — carrying which underlying pair it
  belongs to and whether it is unmatched, selected, or matched.
- **Match Attempt**: One connection the learner made — the kana tile, the reading tile, and whether
  it was correct. Retained for the whole round so the results can name each confusion.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of generated rounds contain each kana at most once, with exactly one correct
  reading per kana — verified across at least 1,000 generated rounds spanning every confusion set.
- **SC-002**: Every round built from a single confusion set contains only kana from that set, so the
  learner is always choosing between look-alikes.
- **SC-003**: Every kana named in a confusion set exists in the bundled dataset with the same
  reading, verified automatically — a catalogue that drifts from the dataset would teach a wrong pair.
- **SC-004**: A learner can go from opening the mode to making their first connection in under 30
  seconds without reading instructions.
- **SC-005**: The result of a connection is shown within 100 ms, so the interaction feels immediate.
- **SC-006**: After a round with mistakes, a learner can state which kana they confused with which,
  from the results screen alone.
- **SC-006a**: No kana can be attempted wrongly more than twice — a learner is never stuck, and every
  round can be finished.
- **SC-007**: A complete round can be played using only a keyboard, and every screen passes an
  automated WCAG 2.1 AA audit with no critical violations.
- **SC-008**: All tiles in a round are visible and tappable on a 320 px-wide screen without
  horizontal scrolling.
- **SC-009**: The mode works fully with the device in airplane mode.

## Assumptions

- **Both kinds of confusion belong here**: shape look-alikes (ろ/る) and diacritic families (ひ/び)
  are different phenomena but the same learner problem, so both are modelled as confusion sets rather
  than as separate concepts.
- **Confusion sets are curated, not computed**: which kana look alike is a judgement about human
  perception, not something derivable from the character data. The catalogue is written by hand and
  reviewed, starting from the pairs named in the request and the widely-recognised confusions:
  - *Hiragana shapes*: あ/お · い/り · き/さ · し/つ/そ · す/む · た/な · ぬ/め · ね/れ/わ · は/ほ/ま ·
    ま/も · る/ろ · ち/ら
  - *Katakana shapes*: シ/ツ · ソ/ン · ク/ケ/タ · ノ/メ/ヌ/ス · ア/マ · ウ/ワ/フ · エ/コ · チ/テ ·
    ル/レ · オ/ホ
  - *Diacritic families* (both scripts): は/ば/ぱ · ひ/び/ぴ · ふ/ぶ/ぷ · へ/べ/ぺ · ほ/ぼ/ぽ ·
    か/が · き/ぎ · さ/ざ · し/じ · た/だ · ち/ぢ · つ/づ
- **One script per round**: a round is Hiragana or Katakana, not both, matching how the existing quiz
  works and how the confusion sets are defined.
- **Kana to reading only**: tiles are kana on one side and romaji on the other. Kana-to-kana matching
  (Hiragana to its Katakana counterpart) is a plausible future mode but is not this one.
- **Rounds are not timed against the learner**: as with the existing quiz, no countdown is shown; a
  time pressure would work against careful discrimination, which is the point of the mode.
- **The reveal is a floor, not a hint system**: two wrong attempts on one kana reveals it. There is
  no way to ask for a hint, and no penalty beyond the pair being marked not correct.
- **No history**: results exist for the round just played. Tracking which confusions a learner gets
  wrong over time is a natural extension but is out of scope, consistent with the no-accounts,
  no-tracking constraint.
- **Romanization is unchanged**: readings use the same canonical mapping as the existing quiz, so
  ぢ is `di` and づ is `du`.
