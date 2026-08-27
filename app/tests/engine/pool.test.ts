import { describe, expect, it } from 'vitest';
import { buildPool, validateConfiguration } from '../../src/engine/pool';
import type { GroupId, QuizConfiguration } from '../../src/models/types';

const config = (over: Partial<QuizConfiguration> = {}): QuizConfiguration => ({
  script: 'hiragana',
  selectedGroupIds: ['main.ka'],
  cardCount: 5,
  direction: 'both',
  attemptsAllowed: 1,
  ...over,
});

describe('buildPool', () => {
  it('returns only kana from the selected groups', () => {
    const pool = buildPool('hiragana', ['main.ka', 'main.sa']);
    expect(pool).toHaveLength(10);
    expect(pool.every((k) => k.groupId === 'main.ka' || k.groupId === 'main.sa')).toBe(true);
  });

  it('respects the script', () => {
    expect(buildPool('katakana', ['main.a']).map((k) => k.kana)).toEqual(['ア', 'イ', 'ウ', 'エ', 'オ']);
  });

  it('ignores unknown group ids instead of throwing (stale preferences must not crash)', () => {
    const pool = buildPool('hiragana', ['main.ka', 'main.zzz' as GroupId]);
    expect(pool).toHaveLength(5);
  });

  it('collapses duplicate ids', () => {
    expect(buildPool('hiragana', ['main.ka', 'main.ka'])).toHaveLength(5);
  });

  it('returns an empty pool for an empty selection', () => {
    expect(buildPool('hiragana', [])).toEqual([]);
  });
});

describe('validateConfiguration', () => {
  it('accepts a workable configuration and reports the pool size', () => {
    const result = validateConfiguration(config({ cardCount: 5 }));
    expect(result).toEqual({ ok: true, poolSize: 5 });
  });

  it('rejects an empty selection (FR-013)', () => {
    const result = validateConfiguration(config({ selectedGroupIds: [] }));
    expect(result).toMatchObject({ ok: false, error: 'NO_KANA_SELECTED', poolSize: 0 });
  });

  it('rejects a card count above the pool and names the maximum (FR-012)', () => {
    const result = validateConfiguration(config({ cardCount: 20 }));
    expect(result).toMatchObject({ ok: false, error: 'CARD_COUNT_EXCEEDS_POOL', poolSize: 5 });
  });

  it('rejects card counts below one', () => {
    expect(validateConfiguration(config({ cardCount: 0 }))).toMatchObject({ error: 'CARD_COUNT_TOO_LOW' });
    expect(validateConfiguration(config({ cardCount: -3 }))).toMatchObject({ error: 'CARD_COUNT_TOO_LOW' });
  });

  it('rejects non-integer card counts', () => {
    expect(validateConfiguration(config({ cardCount: 2.5 }))).toMatchObject({ error: 'CARD_COUNT_NOT_INTEGER' });
    expect(validateConfiguration(config({ cardCount: Number.NaN }))).toMatchObject({ error: 'CARD_COUNT_NOT_INTEGER' });
  });

  it('reports the empty selection before complaining about the count', () => {
    const result = validateConfiguration(config({ selectedGroupIds: [], cardCount: 99 }));
    expect(result).toMatchObject({ error: 'NO_KANA_SELECTED' });
  });
});
