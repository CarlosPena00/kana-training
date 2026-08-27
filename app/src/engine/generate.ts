import { buildPool, validateConfiguration } from './pool';
import { defaultRng, shuffle, type Rng } from './rng';
import type { Direction, Kana, QuizConfiguration, QuizQuestion } from '../models/types';

/**
 * Quiz generation. Sampling is shuffle-then-take, never retry-until-unique: "no kana twice"
 * (FR-016) is then a structural property that cannot fail rather than one that usually holds.
 */

function toQuestion(kana: Kana, direction: Direction): QuizQuestion {
  return direction === 'kana-to-romaji'
    ? { kana, direction, prompt: kana.kana, expectedAnswer: kana.romaji }
    : { kana, direction, prompt: kana.romaji, expectedAnswer: kana.kana };
}

export function generateQuiz(config: QuizConfiguration, rng: Rng = defaultRng): QuizQuestion[] {
  const validation = validateConfiguration(config);
  if (!validation.ok) {
    // An invalid quiz is never silently truncated — the caller must fix the configuration.
    throw new Error(`Cannot generate quiz: ${validation.error} (pool size ${validation.poolSize})`);
  }

  const pool = buildPool(config.script, config.selectedGroupIds);
  const drawn = shuffle(pool, rng).slice(0, config.cardCount);

  return drawn.map((kana) => {
    const direction: Direction =
      config.direction === 'both'
        ? rng() < 0.5
          ? 'kana-to-romaji'
          : 'romaji-to-kana'
        : config.direction;
    return toQuestion(kana, direction);
  });
}
