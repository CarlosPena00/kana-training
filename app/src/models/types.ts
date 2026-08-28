/**
 * Core domain types. Data-only — nothing here imports React, the engine, or a screen.
 * See specs/001-kana-flashcards/data-model.md
 */

export type Script = 'hiragana' | 'katakana';

/** A concrete card direction. Never 'both' — that is a setting, not a card. */
export type Direction = 'kana-to-romaji' | 'romaji-to-kana';

/** What the learner picks on the configuration screen. */
export type DirectionSetting = Direction | 'both';

export type Section = 'main' | 'dakuten' | 'combination';

export type MainGroupId =
  | 'main.a' | 'main.ka' | 'main.sa' | 'main.ta' | 'main.na'
  | 'main.ha' | 'main.ma' | 'main.ya' | 'main.ra' | 'main.wa';

export type DakutenGroupId =
  | 'dakuten.ga' | 'dakuten.za' | 'dakuten.da' | 'dakuten.ba' | 'dakuten.pa';

export type CombinationGroupId =
  | 'combo.kya' | 'combo.sha' | 'combo.cha' | 'combo.nya' | 'combo.hya' | 'combo.mya'
  | 'combo.rya' | 'combo.gya' | 'combo.ja' | 'combo.dya' | 'combo.bya' | 'combo.pya';

export type GroupId = MainGroupId | DakutenGroupId | CombinationGroupId;

/** One character in one script — the atomic unit a quiz draws from. */
export interface Kana {
  readonly kana: string;
  readonly romaji: string;
  readonly script: Script;
  readonly groupId: GroupId;
}

/** A selectable row or family. Group ids are shared by both scripts (FR-003, FR-009a). */
export interface KanaGroup {
  readonly id: GroupId;
  readonly section: Section;
  readonly label: Readonly<Record<Script, string>>;
  readonly order: number;
}

/** How many tries a learner gets per card before the answer is revealed. */
export type AttemptsAllowed = 1 | 3;

export interface QuizConfiguration {
  readonly script: Script;
  readonly selectedGroupIds: readonly GroupId[];
  readonly cardCount: number;
  readonly direction: DirectionSetting;
  readonly attemptsAllowed: AttemptsAllowed;
}

export interface QuizQuestion {
  readonly kana: Kana;
  readonly direction: Direction;
  readonly prompt: string;
  readonly expectedAnswer: string;
}

/**
 * One record per question, not per submission: a card can take several tries, and the record
 * accumulates them. Each entry is kept exactly as typed so feedback can echo it back (FR-031).
 */
export interface AnswerRecord {
  readonly questionIndex: number;
  readonly submissions: readonly string[];
  readonly isCorrect: boolean;
  /**
   * Whether the learner's *first* answer to this card was right. Written once, when the first
   * submission is graded, and never revised (003 FR-006).
   *
   * Deliberately not the same thing as `isCorrect`, which tracks the most recent submission and
   * flips to `true` as the learner retries. In a correction round every card ends `isCorrect`,
   * because the round refuses to advance until the answer is typed — so scoring or the mistake
   * list on `isCorrect` would report perfect rounds and let a learner clear their whole history by
   * answering wrong and copying the answer (003 SC-004).
   */
  readonly firstSubmissionCorrect: boolean;
}

export type SessionStatus = 'active' | 'awaiting-continue' | 'complete';

/**
 * What kind of round this is. `correction` changes exactly two behaviors — the card does not
 * advance until answered correctly (003 FR-024), and scoring counts first submissions only
 * (003 FR-029a) — and nothing else.
 */
export type SessionMode = 'standard' | 'correction';

export interface QuizSession {
  readonly configuration: QuizConfiguration;
  /**
   * In a `correction` session the pool is drawn from the mistake list and spans both scripts, so
   * `configuration.script` is meaningless here — every card's script comes from its own kana
   * (003 FR-020b). Nothing may read `configuration.script` while this is `'correction'`.
   */
  readonly mode: SessionMode;
  readonly questions: readonly QuizQuestion[];
  readonly currentIndex: number;
  readonly answers: readonly AnswerRecord[];
  readonly status: SessionStatus;
  /**
   * Milliseconds from a monotonic clock (performance.now), supplied by the caller so the reducer
   * reads no clock of its own. Monotonic rather than wall-clock because a duration must survive
   * an NTP correction or a DST change mid-quiz.
   *
   * The clock runs from the moment the quiz starts to the moment the final card is answered, and
   * is never shown during the quiz: a visible timer turns practice into a stress test. It is
   * revealed on the results screen instead.
   */
  readonly startedAt: number;
  readonly completedAt: number | null;
}

export interface SessionScore {
  /** Cards answered correctly, whichever attempt got there. */
  readonly correctCount: number;
  /** Cards never answered correctly. */
  readonly incorrectCount: number;
  /**
   * Credit earned: 1 point on the first attempt, 1/2 on the second, 1/3 on the third — so a card
   * is worth 1 / (attempts used). Nothing for a card never answered correctly.
   */
  readonly points: number;
  /** Whole percent, 0-100, derived from points rather than from the raw correct count. */
  readonly accuracy: number;
  /** How many cards were solved on attempt 1, 2, 3 … indexed from 0. */
  readonly byAttempt: readonly number[];
  readonly missedKana: readonly Kana[];
  /** Wall-clock time from starting the quiz to answering the last card; null until complete. */
  readonly elapsedMs: number | null;
  /** Average across the whole quiz, not per answered card; null until complete. */
  readonly msPerCard: number | null;
}

export type ConfigurationError =
  | 'NO_KANA_SELECTED'
  | 'CARD_COUNT_TOO_LOW'
  | 'CARD_COUNT_NOT_INTEGER'
  | 'CARD_COUNT_EXCEEDS_POOL';

export type ValidationResult =
  | { readonly ok: true; readonly poolSize: number }
  | { readonly ok: false; readonly poolSize: number; readonly error: ConfigurationError };

/**
 * One kana the learner has answered incorrectly and has not yet cleared.
 * Identity is (script, kana) — direction is deliberately not part of it, because a kana is one
 * card whichever way it is asked (003 FR-002). ぬ and ヌ are therefore separate entries.
 *
 * See specs/003-mistake-history/data-model.md for the full lifecycle.
 */
export interface MistakeEntry {
  readonly script: Script;
  readonly kana: string;
  /** Total times missed, >= 1. Never decreases while the entry exists. */
  readonly missCount: number;
  /**
   * Consecutive correct first answers. Reaching 3 deletes the entry (003 FR-009), so a stored
   * entry is never at 3 — that value is the removal, not a state.
   */
  readonly streak: 0 | 1 | 2;
  /** ISO 8601, UTC. The only timestamp kept; no answer log and no per-quiz data (003 FR-039). */
  readonly lastMissedAt: string;
}

/** At most one entry per kana per script, so bounded by the dataset at 214 (003 FR-030). */
export type MistakeList = readonly MistakeEntry[];

/**
 * What the app can tell a learner about a wrong answer, beyond "that was wrong".
 *
 * A union rather than a list, deliberately: three message kinds mean an answer could plausibly
 * produce two of them, and a learner told both "you confused two characters" and "you used the
 * wrong romanization" has been told something false either way. A single value makes two notes
 * impossible to express, not merely unlikely (003-style contradictions are what this guards).
 *
 * See specs/004-confused-kana-feedback/data-model.md.
 */
export type AnswerNote =
  /** The answer was a real reading — of a different character in this card's script. */
  | { readonly kind: 'kana-confusion'; readonly wrote: Kana; readonly wanted: Kana }
  /**
   * The answer used a different romanization system. Carries no Kana on purpose: naming a
   * character is what makes a note a confusion, and this learner picked no character at all.
   */
  | { readonly kind: 'spelling'; readonly typed: string; readonly canonical: string }
  /** The right character in the wrong alphabet. Both kana always share a reading. */
  | { readonly kind: 'script'; readonly wrote: Kana; readonly wanted: Kana };
