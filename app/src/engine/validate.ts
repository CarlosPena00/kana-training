import { normalizeAnswer } from './normalize';
import type { QuizQuestion } from '../models/types';

/**
 * One comparison, both directions, both scripts (FR-028). Because romaji is unique within a
 * script, a romaji prompt has exactly one accepted kana, and a Hiragana prompt is never satisfied
 * by the Katakana character.
 *
 * Blank input is rejected here as well, but callers should test isBlank first: a blank submission
 * must not be recorded as an answer at all (FR-023).
 */
export function checkAnswer(question: QuizQuestion, raw: string): boolean {
  const answer = normalizeAnswer(raw);
  if (answer === '') return false;
  return answer === normalizeAnswer(question.expectedAnswer);
}
