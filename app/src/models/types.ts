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
}

export type SessionStatus = 'active' | 'awaiting-continue' | 'complete';

export interface QuizSession {
  readonly configuration: QuizConfiguration;
  readonly questions: readonly QuizQuestion[];
  readonly currentIndex: number;
  readonly answers: readonly AnswerRecord[];
  readonly status: SessionStatus;
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
}

export type ConfigurationError =
  | 'NO_KANA_SELECTED'
  | 'CARD_COUNT_TOO_LOW'
  | 'CARD_COUNT_NOT_INTEGER'
  | 'CARD_COUNT_EXCEEDS_POOL';

export type ValidationResult =
  | { readonly ok: true; readonly poolSize: number }
  | { readonly ok: false; readonly poolSize: number; readonly error: ConfigurationError };
