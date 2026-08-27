# Kana Flashcards — Cross-Platform App Development Prompt

## Role

You are a senior mobile/web application architect and developer.

Build a polished **Kana Flashcards learning application** that runs on:

* Android
* iOS
* Web

The application must be completely client-side. And follow the 'keep it simple (KISS)'

## Core Constraints

* **No external database**
* **No backend**
* **No API**
* **No server-side CPU**
* **No workers/background services**
* **No authentication**
* **No in-app purchases**
* **No monetization**
* All kana data must be bundled directly with the application.
* The application must work fully offline after installation/loading.
* Do not introduce unnecessary infrastructure.

Prefer a cross-platform framework that allows a single codebase for Android, iOS, and Web.

Use local device/browser storage only if persistence is actually useful. The application must not depend on it to function.

---

# Product Goal

Create a simple flashcard application for learning **Japanese Hiragana and Katakana**.

The user chooses:

1. Hiragana or Katakana
2. Which subset of kana to practice
3. Number of cards
4. Quiz direction:

   * Kana → Romaji
   * Romaji → Kana
   * Both directions (default)

The application then presents randomized flashcards.

The user must provide the corresponding translation.

### Example

If the card displays:

> あ

The user must enter:

> a

If the card displays:

> A

The user must enter:

> あ

The answer should be validated automatically.

---

# Reference UI

Use the attached screenshot as a **visual and UX reference**.

The reference application has:

* Hiragana / Katakana selection
* Main Kana
* Dakuten Kana
* Combination Kana
* Group-based selection
* Start Quiz button

Do not copy the website literally. Create a cleaner, modern, responsive version suitable for Android, iOS and Web while preserving the simple learning workflow.

---

# Kana Dataset

The application must contain a complete structured dataset for both:

* Hiragana
* Katakana

Each kana entry should contain at minimum:

```text
kana
romaji
type
group
```

Example:

```text
あ → a
か → ka
が → ga
きゃ → kya
```

Support the standard Japanese kana categories:

## Main Kana

* あ/a
* か/ka
* さ/sa
* た/ta
* な/na
* は/ha
* ま/ma
* や/ya
* ら/ra
* わ/wa

## Dakuten / Handakuten

* が/ga
* ざ/za
* だ/da
* ば/ba
* ぱ/pa

and all corresponding kana within those rows.

## Combination Kana

* きゃ/kya
* きゅ/kyu
* きょ/kyo
* しゃ/sha
* しゅ/shu
* しょ/sho
* ちゃ/cha
* ちゅ/chu
* ちょ/cho
* にゃ/nya
* にゅ/nyu
* にょ/nyo
* ひゃ/hya
* ひゅ/hyu
* ひょ/hyo
* みゃ/mya
* みゅ/myu
* みょ/myo
* りゃ/rya
* りゅ/ryu
* りょ/ryo
* ぎゃ/gya
* ぎゅ/gyu
* ぎょ/gyo
* じゃ/ja
* じゅ/ju
* じょ/jo
* ぢゃ/dya
* ぢゅ/dyu
* ぢょ/dyo
* びゃ/bya
* びゅ/byu
* びょ/byo
* ぴゃ/pya
* ぴゅ/pyu
* ぴょ/pyo

Include the appropriate standard kana inventory and avoid obsolete/incorrect combinations unless deliberately supported.

Hiragana and Katakana should use the same underlying structure so the quiz engine can operate identically on both.

---

# Home / Configuration Screen

Create a configuration screen where the user can configure the quiz before starting.

## 1. Script

Allow:

* Hiragana
* Katakana

Use a clear segmented control or tabs.

Default:

> Hiragana

## 2. Kana Groups

Allow the user to select:

* All Main Kana
* All Dakuten Kana
* All Combination Kana
* Individual kana groups

For example:

```text
Main Kana

[ All Main Kana ]

[ あ ] [ か ]
[ さ ] [ た ]
[ な ] [ は ]
[ ま ] [ や ]
[ ら ] [ わ ]
```

Then:

```text
Dakuten Kana

[ All Dakuten Kana ]

[ が ]
[ ざ ]
[ だ ]
[ ば ]
[ ぱ ]
```

And:

```text
Combination Kana

[ All Combination Kana ]

[ きゃ ] [ しゃ ]
[ ちゃ ] [ にゃ ]
[ ひゃ ] [ みゃ ]
[ りゃ ] [ ぎゃ ]
[ じゃ ] [ ぢゃ ]
[ びゃ ] [ ぴゃ ]
```

The actual UI can be improved compared with the reference screenshot.

### Selection behavior

Support:

* Select all
* Deselect all
* Select individual groups
* Multiple groups simultaneously

The user should be able to create a custom subset.

---

# Number of Cards

Allow the user to select how many flashcards will be generated.

Examples:

* 5
* 10
* 20
* 30
* 50
* Custom

The number of cards must never exceed the number of unique cards available in the selected subset.

For example:

If the selected subset contains 10 unique kana, the user cannot start a 20-card quiz.

Either:

* prevent invalid selection, or
* automatically limit the maximum.

Prefer preventing the invalid configuration with clear feedback.

---

# Quiz Direction

Provide three options:

### Kana → Romaji

Example:

```text
あ
```

User enters:

```text
a
```

### Romaji → Kana

Example:

```text
a
```

User enters:

```text
あ
```

### Both

Randomly choose the direction for every flashcard.

This must be the **default**.

For example, a 10-card quiz could contain:

```text
あ → user enters a
ka → user enters か
し → user enters shi
mya → user enters みゃ
```

The direction should be independently randomized for every card.

---

# Quiz Generation

When the user presses:

> Start Quiz

Generate the requested number of unique flashcards.

## Important requirement: NO REPETITION

A kana must not appear more than once during a quiz.

For example, if the user requests 10 cards:

```text
あ
か
し
ta
きゃ
...
```

No card may be repeated.

This applies regardless of quiz direction.

For example, these must be considered the **same underlying card**:

```text
あ → a
a → あ
```

If `あ` has already been used, it cannot appear again in the same quiz, even if the direction changes.

Use a proper random sampling algorithm rather than repeatedly generating random indexes and hoping duplicates do not occur.

A simple approach:

1. Build the selected kana pool.
2. Shuffle it.
3. Take the first N items.
4. Assign the direction to each card according to the selected quiz mode.

---

# Quiz Screen

The quiz screen should be extremely focused.

Display:

```text
Question 3 / 10

        あ

[________________]

       [ Check ]
```

The card should be visually prominent.

Below it, provide a text input.

The user types the answer.

Examples:

```text
Question:
あ

Input:
a
```

or:

```text
Question:
a

Input:
あ
```

---

# Answer Validation

Answers should be case-insensitive for Romaji.

For example:

```text
a
A
```

must both be accepted as:

```text
a
```

Normalize user input before comparison.

Trim leading/trailing whitespace.

For kana answers, compare the actual Unicode kana.

Romaji should use a consistent canonical representation.

For example:

```text
shi
chi
tsu
fu
ja
ju
jo
```

Do not silently accept arbitrary alternative romanization systems unless explicitly supported.

Keep the validation logic centralized and easily extensible.

---

# Feedback

After submitting an answer:

### Correct

Clearly indicate:

> Correct!

Then briefly show the correct mapping.

Example:

```text
あ
a

✓ Correct
```

Allow the user to proceed to the next card.

### Incorrect

Clearly indicate:

> Incorrect

Show the correct answer.

Example:

```text
Question:
あ

Your answer:
o

Correct answer:
a
```

Then allow the user to continue.

Do not immediately hide the correct answer.

---

# Quiz Progress

Show progress throughout the quiz.

Example:

```text
3 / 10
```

Optionally include a small progress bar.

Also track:

* Correct answers
* Incorrect answers
* Accuracy percentage

---

# Quiz Results

At the end, show a results screen.

Example:

```text
Quiz Complete!

8 / 10 Correct

Accuracy
80%

✓ Correct: 8
✕ Incorrect: 2

[ Practice Again ]
[ Back to Home ]
```

The user should be able to restart using the same configuration.

---

# UX Requirements

The application should prioritize:

* simplicity
* fast interaction
* readability
* large kana
* minimal distractions
* mobile-first design
* responsive Web layout
* accessibility
* keyboard usability on Web
* touch-friendly controls on mobile

The flashcard itself should be the visual focus.

Use a clean Japanese-learning aesthetic without excessive decoration.

Avoid unnecessary animations.

Small, fast transitions are acceptable.

---

# Responsive Design

The same application must work well on:

### Mobile

Portrait-oriented Android/iOS screens.

### Tablet

Use the additional space without making the UI unnecessarily large.

### Desktop Web

Center the learning experience and avoid stretching the flashcard across the entire screen.

The quiz should remain visually focused.

---

# Navigation

Keep navigation simple.

Suggested flow:

```text
Home
  ↓
Quiz Configuration
  ↓
Quiz
  ↓
Results
  ↓
Home / Practice Again
```

Do not introduce unnecessary screens.

---

# State Management

All quiz state must exist locally.

The application should maintain:

```text
selectedScript
selectedKanaGroups
selectedKana
numberOfCards
quizDirection
currentQuestion
questions
currentAnswer
correctAnswers
incorrectAnswers
quizStatus
```

No remote state is necessary.

Avoid over-engineering state management.

---

# Data Architecture

Keep the kana data separate from UI code.

For example:

```text
data/
    hiragana
    katakana

models/
    Kana
    QuizConfiguration
    QuizQuestion
```

The exact project structure can follow the chosen framework's best practices.

The kana dataset should be easy to modify or extend later.

---

# Persistence

Persistence is optional.

If useful, locally persist lightweight preferences such as:

* Last selected script
* Last selected quiz direction
* Last selected number of cards
* Last selected groups

Do NOT create a database for this.

Simple local/browser storage is sufficient.

The app must work correctly if storage is unavailable or cleared.

---

# Offline Requirement

After the application assets are available, the core functionality must work without an Internet connection.

Do not make runtime network requests for:

* kana data
* quiz generation
* answer validation
* scoring
* navigation

Everything required for the quiz must be packaged with the application.

---

# No Monetization

The application must contain:

* No advertisements
* No purchases
* No subscriptions
* No premium features
* No tracking intended for advertising

The application is a free learning utility.

---

# Accessibility

Support:

* readable contrast
* scalable text
* keyboard navigation on Web
* visible focus states
* accessible buttons
* semantic labels
* sufficiently large touch targets

The kana should be displayed using a font with proper Japanese Unicode support.

Do not rely on the user's system font being able to render all kana correctly.

---

# Technical Quality

Implement production-quality code.

Requirements:

* Strong typing where supported
* Small, focused components
* Clear separation between data, business logic and UI
* No duplicated quiz logic
* No duplicated Hiragana/Katakana logic
* Reusable components
* Centralized answer normalization
* Centralized quiz generation
* Deterministic/testable business logic
* No unnecessary dependencies

The quiz engine should be testable independently of the UI.

---

# Important Edge Cases

Handle at minimum:

1. User selects zero kana.
2. User requests more cards than available.
3. User submits an empty answer.
4. User enters uppercase Romaji.
5. User enters leading/trailing spaces.
6. User finishes the final card.
7. User restarts a quiz.
8. User changes configuration before starting.
9. Browser refresh during configuration.
10. Browser/mobile back navigation during a quiz.
11. Very small screen sizes.
12. Keyboard opening on mobile.
13. Web keyboard Enter key submitting an answer.
14. Quiz containing only one available kana.
15. Both-direction mode.

---

# Testing

Create tests for the core quiz logic.

At minimum test:

### Randomization

Verify that requested number of questions is generated.

### No repetition

Verify that every underlying kana appears at most once.

### Direction

Verify:

```text
kana → romaji
romaji → kana
both
```

### Validation

Verify:

```text
a == A
" a " == "a"
```

and that incorrect answers are rejected.

### Selection

Verify that only selected kana can appear.

### Maximum size

Verify that the quiz cannot contain more cards than the selected pool.

### Completion

Verify that the quiz correctly transitions to the results screen.

---

# Visual Direction

Use the attached reference screenshot as inspiration.

The reference uses:

* blue primary actions
* white background
* outlined selection buttons
* large section headings
* clear kana labels
* a prominent Start Quiz button

Keep the general clarity of that design, but modernize it for a professional cross-platform application.

The final UI should feel like a **small, polished educational app**, not an enterprise dashboard.

Prioritize the learning interaction over visual complexity.

---

# Deliverables

Build the complete application, not just a prototype description.

Provide:

1. Complete project structure
2. Complete source code
3. Complete Hiragana dataset
4. Complete Katakana dataset
5. Quiz generation logic
6. Answer validation logic
7. Configuration screen
8. Quiz screen
9. Results screen
10. Responsive Web layout
11. Android/iOS-compatible implementation
12. Automated tests for the quiz engine
13. Clear instructions for running the project locally
14. Clear instructions for building Android, iOS and Web

Before implementation, briefly explain the chosen framework and why it is appropriate for a **single client-side codebase targeting Android, iOS and Web**.

Do not introduce a backend or external database unless there is an absolutely unavoidable technical reason. For this application, assume that there is not.

## Priority

If there is a conflict between features, prioritize in this order:

1. Correct kana/romaji data
2. Correct quiz behavior
3. No repetition
4. Answer validation
5. Simple UX
6. Mobile usability
7. Web usability
8. Visual polish
9. Optional enhancements

Do not add unnecessary features such as accounts, social features, leaderboards, cloud synchronization, advertisements, purchases, or online services.
