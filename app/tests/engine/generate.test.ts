import { describe, expect, it } from 'vitest';
import { generateQuiz } from '../../src/engine/generate';
import { buildPool } from '../../src/engine/pool';
import { mulberry32 } from '../../src/engine/rng';
import { ALL_MAIN_GROUP_IDS } from '../../src/data';
import type { DirectionSetting, GroupId, QuizConfiguration } from '../../src/models/types';

const config = (over: Partial<QuizConfiguration> = {}): QuizConfiguration => ({
  script: 'hiragana',
  selectedGroupIds: ALL_MAIN_GROUP_IDS,
  cardCount: 10,
  direction: 'both',
  attemptsAllowed: 1,
  ...over,
});

const DIRECTIONS: readonly DirectionSetting[] = ['kana-to-romaji', 'romaji-to-kana', 'both'];

describe('generateQuiz — size and scope (FR-015)', () => {
  it('returns exactly the requested number of cards', () => {
    for (const cardCount of [1, 5, 10, 30, 46]) {
      expect(generateQuiz(config({ cardCount }))).toHaveLength(cardCount);
    }
  });

  it('draws only from the selected groups', () => {
    const selected: readonly GroupId[] = ['main.ka', 'dakuten.ga'];
    const questions = generateQuiz(config({ selectedGroupIds: selected, cardCount: 10 }));
    expect(questions.every((q) => selected.includes(q.kana.groupId))).toBe(true);
  });

  it('draws only from the selected script', () => {
    const questions = generateQuiz(config({ script: 'katakana', cardCount: 20 }));
    expect(questions.every((q) => q.kana.script === 'katakana')).toBe(true);
  });

  it('runs a valid one-card quiz when only one kana is available', () => {
    const questions = generateQuiz(config({ selectedGroupIds: ['main.ya'], cardCount: 1 }));
    expect(questions).toHaveLength(1);
    expect(questions[0]!.prompt.length).toBeGreaterThan(0);
  });
});

// SC-002: verified across 1,000+ generated quizzes spanning every direction and a range of pools.
describe('generateQuiz — no repetition (FR-016, SC-002)', () => {
  it('never repeats a kana within a quiz, whatever direction the card received', () => {
    const pools: readonly (readonly GroupId[])[] = [
      ['main.ya'],
      ['main.ka'],
      ['main.ka', 'main.sa'],
      ALL_MAIN_GROUP_IDS,
    ];
    let quizzes = 0;
    for (const direction of DIRECTIONS) {
      for (const selectedGroupIds of pools) {
        const poolSize = buildPool('hiragana', selectedGroupIds).length;
        for (let seed = 0; seed < 90; seed += 1) {
          const cardCount = (seed % poolSize) + 1;
          const questions = generateQuiz(
            config({ selectedGroupIds, cardCount, direction }),
            mulberry32(seed),
          );
          const identities = questions.map((q) => q.kana.kana);
          expect(new Set(identities).size).toBe(questions.length);
          quizzes += 1;
        }
      }
    }
    expect(quizzes).toBeGreaterThanOrEqual(1000);
  });
});

describe('generateQuiz — direction (FR-014, FR-018)', () => {
  it('uses the chosen direction for every card', () => {
    const forward = generateQuiz(config({ direction: 'kana-to-romaji' }));
    expect(forward.every((q) => q.direction === 'kana-to-romaji')).toBe(true);
    expect(forward.every((q) => q.prompt === q.kana.kana && q.expectedAnswer === q.kana.romaji)).toBe(true);

    const reverse = generateQuiz(config({ direction: 'romaji-to-kana' }));
    expect(reverse.every((q) => q.direction === 'romaji-to-kana')).toBe(true);
    expect(reverse.every((q) => q.prompt === q.kana.romaji && q.expectedAnswer === q.kana.kana)).toBe(true);
  });

  it('decides each card independently in both mode', () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 40; seed += 1) {
      for (const q of generateQuiz(config({ cardCount: 20 }), mulberry32(seed))) seen.add(q.direction);
    }
    expect(seen).toEqual(new Set(['kana-to-romaji', 'romaji-to-kana']));
  });

  it('derives prompt and expected answer from the card own direction', () => {
    for (const q of generateQuiz(config({ cardCount: 30 }), mulberry32(7))) {
      if (q.direction === 'kana-to-romaji') {
        expect([q.prompt, q.expectedAnswer]).toEqual([q.kana.kana, q.kana.romaji]);
      } else {
        expect([q.prompt, q.expectedAnswer]).toEqual([q.kana.romaji, q.kana.kana]);
      }
    }
  });
});

describe('generateQuiz — validation (FR-012, FR-013)', () => {
  it('throws rather than silently truncating when more cards than kana are requested', () => {
    expect(() => generateQuiz(config({ selectedGroupIds: ['main.ka'], cardCount: 20 }))).toThrow();
  });

  it('throws when nothing is selected', () => {
    expect(() => generateQuiz(config({ selectedGroupIds: [] }))).toThrow();
  });
});

describe('generateQuiz — determinism (Constitution Principle IV)', () => {
  it('produces identical output for the same seed', () => {
    const a = generateQuiz(config({ cardCount: 20 }), mulberry32(42));
    const b = generateQuiz(config({ cardCount: 20 }), mulberry32(42));
    expect(a).toEqual(b);
  });

  it('produces a different order for different seeds', () => {
    const a = generateQuiz(config({ cardCount: 20 }), mulberry32(1)).map((q) => q.kana.kana);
    const b = generateQuiz(config({ cardCount: 20 }), mulberry32(2)).map((q) => q.kana.kana);
    expect(a).not.toEqual(b);
  });

  it('takes rng as its only source of nondeterminism', () => {
    const constant = () => 0.5;
    const a = generateQuiz(config({ cardCount: 15 }), constant);
    const b = generateQuiz(config({ cardCount: 15 }), constant);
    expect(a).toEqual(b);
  });
});
