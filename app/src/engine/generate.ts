import { buildPool, validateConfiguration } from './pool';
import { defaultRng, shuffle, type Rng } from './rng';
import type { Direction, DirectionSetting, Kana, QuizConfiguration, QuizQuestion } from '../models/types';

/**
 * Quiz generation. Sampling is shuffle-then-take, never retry-until-unique: "no kana twice"
 * (FR-016) is then a structural property that cannot fail rather than one that usually holds.
 *
 * There is exactly one generator (Constitution Principle IV). `buildQuestions` is the whole of it;
 * `generateQuiz` only decides which pool to hand it. A correction round supplies its own pool —
 * drawn from the mistake list and spanning both scripts — and goes through the same code path
 * (003 FR-020a, research D3).
 */

function toQuestion(kana: Kana, direction: Direction): QuizQuestion {
  return direction === 'kana-to-romaji'
    ? { kana, direction, prompt: kana.kana, expectedAnswer: kana.romaji }
    : { kana, direction, prompt: kana.romaji, expectedAnswer: kana.kana };
}

/**
 * Draws `cardCount` cards from an explicit pool.
 *
 * The pool may mix scripts. Nothing here needs to know: a `Kana` already carries its own script,
 * and a question holds the whole `Kana`, so `question.kana.script` is authoritative for both
 * display and validation (003 FR-020b).
 */
export function buildQuestions(
  pool: readonly Kana[],
  cardCount: number,
  direction: DirectionSetting,
  rng: Rng = defaultRng,
): QuizQuestion[] {
  const drawn = shuffle(pool, rng).slice(0, cardCount);

  return drawn.map((kana) => {
    const resolved: Direction =
      direction === 'both' ? (rng() < 0.5 ? 'kana-to-romaji' : 'romaji-to-kana') : direction;
    return toQuestion(kana, resolved);
  });
}

export function generateQuiz(config: QuizConfiguration, rng: Rng = defaultRng): QuizQuestion[] {
  const validation = validateConfiguration(config);
  if (!validation.ok) {
    // An invalid quiz is never silently truncated — the caller must fix the configuration.
    throw new Error(`Cannot generate quiz: ${validation.error} (pool size ${validation.poolSize})`);
  }

  const pool = buildPool(config.script, config.selectedGroupIds);
  return buildQuestions(pool, config.cardCount, config.direction, rng);
}
