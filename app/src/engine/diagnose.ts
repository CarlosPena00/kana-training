import { findByRomaji, findKana } from '../data';
import { ALTERNATE_SPELLINGS } from '../data/alternates';
import { normalizeAnswer } from './normalize';
import { checkAnswer } from './validate';
import type { AnswerNote, QuizQuestion, Script } from '../models/types';

/**
 * Works out what — if anything — to tell a learner about a wrong answer, and returns at most one
 * note. See specs/004-confused-kana-feedback/contracts/answer-diagnosis.md.
 *
 * Pure: no clock, no storage, no React. Same inputs, same output.
 *
 * This module *reads*. It is never authoritative about correctness — it calls `checkAnswer` to
 * learn that an answer was wrong rather than re-implementing that judgement, so there is still
 * exactly one validator (Principle IV). And recognising a spelling is not accepting it: the
 * alternate table is consulted only after `checkAnswer` has already returned false, and its output
 * is a string to display, never a comparison input. No path here can make an answer correct
 * (Principle III, FR-020c).
 */

const OTHER_SCRIPT: Readonly<Record<Script, Script>> = {
  hiragana: 'katakana',
  katakana: 'hiragana',
};

export function diagnoseAnswer(
  question: QuizQuestion,
  raw: string,
  answerRevealed: boolean,
): AnswerNote | null {
  const answer = normalizeAnswer(raw);

  // Nothing to explain about a blank answer or a right one (FR-014).
  if (answer === '') return null;
  if (checkAnswer(question, raw)) return null;

  const wanted = question.kana;

  return question.direction === 'kana-to-romaji'
    ? diagnoseRomajiAnswer(answer, wanted, question.expectedAnswer, answerRevealed)
    : diagnoseKanaAnswer(answer, wanted, answerRevealed);
}

/**
 * The learner should have typed a reading. Two notes are possible here and a script note is not:
 * both scripts share readings, so answering `ro` to ろ is simply correct.
 */
function diagnoseRomajiAnswer(
  answer: string,
  wanted: QuizQuestion['kana'],
  expectedAnswer: string,
  answerRevealed: boolean,
): AnswerNote | null {
  // Kana confusion wins any overlap: it is the most informative message, and a learner who typed
  // another kana's reading confused two characters rather than two spelling systems.
  const wrote = findByRomaji(wanted.script, answer);
  if (wrote && wrote.kana !== wanted.kana) return { kind: 'kana-confusion', wrote, wanted };

  const canonical = ALTERNATE_SPELLINGS[answer];
  if (canonical === undefined) return null;

  // The note names the canonical spelling, which on this card *is* the answer. Saying it while
  // attempts remain would hand over what the retry is withholding (FR-020b).
  if (!answerRevealed && canonical === normalizeAnswer(expectedAnswer)) return null;

  return { kind: 'spelling', typed: answer, canonical };
}

/**
 * The learner should have written a character. A spelling note is impossible here — the answer is
 * not romaji — so the second possibility is a script note.
 */
function diagnoseKanaAnswer(
  answer: string,
  wanted: QuizQuestion['kana'],
  answerRevealed: boolean,
): AnswerNote | null {
  const wrote = findKana(wanted.script, answer);
  if (wrote && wrote.kana !== wanted.kana) return { kind: 'kana-confusion', wrote, wanted };

  const other = findKana(OTHER_SCRIPT[wanted.script], answer);
  if (!other) return null;

  // Only the right character in the wrong alphabet is a script note. Wrong on both axes — ル where
  // ろ was wanted — is not one nameable mistake, so nothing is said (research D5).
  if (other.romaji !== wanted.romaji) return null;

  // Naming the other script's character and the wanted script together identifies the answer, so
  // this note cannot survive a retry either (FR-008c).
  if (!answerRevealed) return null;

  return { kind: 'script', wrote: other, wanted };
}
