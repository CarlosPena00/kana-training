import { describe, expect, it } from 'vitest';
import { applyAnswer, sortEntries, toPool } from '../../src/engine/mistakes';
import { findKana } from '../../src/data';
import type { Kana, MistakeEntry, MistakeList } from '../../src/models/types';

/**
 * The streak rules from specs/003-mistake-history/contracts/mistake-store.md.
 * Pure functions over plain data — no storage, no clock (Constitution Principle IV).
 */

const NU = findKana('hiragana', 'ぬ')!;
const NU_KATAKANA = findKana('katakana', 'ヌ')!;
const NE = findKana('hiragana', 'ね')!;

const T1 = '2026-08-01T10:00:00.000Z';
const T2 = '2026-08-02T10:00:00.000Z';

const entry = (over: Partial<MistakeEntry> & { kana: string }): MistakeEntry => ({
  script: 'hiragana',
  missCount: 1,
  streak: 0,
  lastMissedAt: T1,
  ...over,
});

const find = (list: MistakeList, kana: Kana) =>
  list.find((e) => e.script === kana.script && e.kana === kana.kana);

describe('applyAnswer — recording a mistake (FR-001, FR-004, FR-005)', () => {
  it('creates an entry on a wrong first answer', () => {
    const list = applyAnswer([], NU, false, T1);
    expect(list).toHaveLength(1);
    expect(list[0]).toEqual({
      script: 'hiragana',
      kana: 'ぬ',
      missCount: 1,
      streak: 0,
      lastMissedAt: T1,
    });
  });

  it('updates the existing entry rather than adding a second (FR-005)', () => {
    const once = applyAnswer([], NU, false, T1);
    const twice = applyAnswer(once, NU, false, T2);
    expect(twice).toHaveLength(1);
    expect(find(twice, NU)).toMatchObject({ missCount: 2, lastMissedAt: T2 });
  });

  it('keeps ぬ and ヌ as separate entries (FR-001)', () => {
    let list = applyAnswer([], NU, false, T1);
    list = applyAnswer(list, NU_KATAKANA, false, T1);
    expect(list).toHaveLength(2);
    expect(find(list, NU)).toBeDefined();
    expect(find(list, NU_KATAKANA)).toBeDefined();
  });

  it('resets the streak to zero on a wrong answer (FR-008)', () => {
    const list = applyAnswer([entry({ kana: 'ぬ', streak: 2, missCount: 4 })], NU, false, T2);
    expect(find(list, NU)).toMatchObject({ streak: 0, missCount: 5, lastMissedAt: T2 });
  });

  it('does nothing when a kana with no entry is answered correctly (FR-011)', () => {
    // Getting あ right forever must never create an あ record.
    expect(applyAnswer([], NU, true, T1)).toEqual([]);
  });

  it('leaves other entries untouched', () => {
    const list = applyAnswer([entry({ kana: 'ね' })], NU, false, T2);
    expect(find(list, NE)).toMatchObject({ missCount: 1, lastMissedAt: T1 });
  });

  it('never mutates the list it is given', () => {
    const before: MistakeList = [entry({ kana: 'ぬ' })];
    const snapshot = JSON.parse(JSON.stringify(before));
    applyAnswer(before, NU, false, T2);
    expect(before).toEqual(snapshot);
  });

  it('takes the timestamp as a parameter rather than reading a clock', () => {
    // Determinism under test is what makes these rules provable (research D5).
    expect(applyAnswer([], NU, false, T1)[0]?.lastMissedAt).toBe(T1);
    expect(applyAnswer([], NU, false, T2)[0]?.lastMissedAt).toBe(T2);
  });
});

describe('toPool (FR-020, FR-037)', () => {
  it('resolves entries to dataset kana', () => {
    const pool = toPool([entry({ kana: 'ぬ' }), entry({ kana: 'ヌ', script: 'katakana' })]);
    expect(pool).toHaveLength(2);
    expect(pool.map((k) => k.kana).sort()).toEqual(['ぬ', 'ヌ']);
  });

  it('carries each kana own script, so a pool can span both (FR-020a)', () => {
    const pool = toPool([entry({ kana: 'ぬ' }), entry({ kana: 'ヌ', script: 'katakana' })]);
    expect(pool.map((k) => k.script).sort()).toEqual(['hiragana', 'katakana']);
  });

  it('silently omits an entry whose kana is no longer in the dataset (FR-037)', () => {
    const pool = toPool([entry({ kana: 'ぬ' }), entry({ kana: 'ゐ' })]);
    expect(pool).toHaveLength(1);
    expect(pool[0]?.kana).toBe('ぬ');
  });

  it('returns an empty pool for an empty list', () => {
    expect(toPool([])).toEqual([]);
  });
});

describe('sortEntries (FR-017, store case 18)', () => {
  it('puts the most-missed kana first', () => {
    const list = [entry({ kana: 'ぬ', missCount: 2 }), entry({ kana: 'ね', missCount: 9 })];
    expect(sortEntries(list).map((e) => e.kana)).toEqual(['ね', 'ぬ']);
  });

  it('breaks a tie on miss count with the most recently missed', () => {
    const list = [
      entry({ kana: 'ぬ', missCount: 3, lastMissedAt: T1 }),
      entry({ kana: 'ね', missCount: 3, lastMissedAt: T2 }),
    ];
    expect(sortEntries(list).map((e) => e.kana)).toEqual(['ね', 'ぬ']);
  });

  it('breaks a full tie on dataset order, so the result is never arbitrary', () => {
    // ぬ precedes ね in the na row. Without this final tiebreak, two equal entries could swap
    // places between renders, which reads as a glitch and defeats any test asserting order.
    const list = [
      entry({ kana: 'ね', missCount: 3, lastMissedAt: T1 }),
      entry({ kana: 'ぬ', missCount: 3, lastMissedAt: T1 }),
    ];
    expect(sortEntries(list).map((e) => e.kana)).toEqual(['ぬ', 'ね']);
  });

  it('is stable across repeated calls on the same data', () => {
    const list = [
      entry({ kana: 'ぬ', missCount: 3, lastMissedAt: T1 }),
      entry({ kana: 'ね', missCount: 3, lastMissedAt: T1 }),
      entry({ kana: 'ヌ', script: 'katakana', missCount: 3, lastMissedAt: T1 }),
    ];
    const first = sortEntries(list).map((e) => `${e.script}:${e.kana}`);
    for (let i = 0; i < 5; i += 1) {
      expect(sortEntries(list).map((e) => `${e.script}:${e.kana}`)).toEqual(first);
    }
  });

  it('does not mutate the list it is given', () => {
    const list = [entry({ kana: 'ぬ', missCount: 1 }), entry({ kana: 'ね', missCount: 9 })];
    const before = list.map((e) => e.kana);
    sortEntries(list);
    expect(list.map((e) => e.kana)).toEqual(before);
  });
});

describe('applyAnswer — clearing an entry (FR-009, FR-010, FR-011, FR-012)', () => {
  it('advances the streak on a correct first answer', () => {
    const list = applyAnswer([entry({ kana: 'ぬ', streak: 0 })], NU, true, T2);
    expect(find(list, NU)).toMatchObject({ streak: 1 });
  });

  it('leaves missCount and lastMissedAt alone when advancing', () => {
    const list = applyAnswer([entry({ kana: 'ぬ', streak: 0, missCount: 4 })], NU, true, T2);
    expect(find(list, NU)).toMatchObject({ missCount: 4, lastMissedAt: T1 });
  });

  it('store case 14: removes the entry on the third correct answer in a row', () => {
    let list: MistakeList = [entry({ kana: 'ぬ', streak: 0 })];
    list = applyAnswer(list, NU, true, T2);
    expect(find(list, NU)?.streak).toBe(1);
    list = applyAnswer(list, NU, true, T2);
    expect(find(list, NU)?.streak).toBe(2);
    list = applyAnswer(list, NU, true, T2);
    expect(find(list, NU)).toBeUndefined();
    expect(list).toHaveLength(0);
  });

  it('never stores a streak of three — reaching it is the removal', () => {
    const list = applyAnswer([entry({ kana: 'ぬ', streak: 2 })], NU, true, T2);
    expect(list.every((e) => e.streak < 3)).toBe(true);
  });

  it('a broken streak restarts from zero, not from where it was', () => {
    let list: MistakeList = [entry({ kana: 'ぬ', streak: 0, missCount: 1 })];
    list = applyAnswer(list, NU, true, T2);
    list = applyAnswer(list, NU, true, T2);
    expect(find(list, NU)?.streak).toBe(2);

    list = applyAnswer(list, NU, false, T2);
    expect(find(list, NU)).toMatchObject({ streak: 0, missCount: 2 });
  });

  it('store case 16: a cleared kana returns at missCount 1 and streak 0', () => {
    let list: MistakeList = [entry({ kana: 'ぬ', streak: 2, missCount: 11 })];
    list = applyAnswer(list, NU, true, T2);
    expect(list).toHaveLength(0);

    list = applyAnswer(list, NU, false, T2);
    // The old miss count went with the entry: the list measures current weakness, not a lifetime
    // error tally (SC-009).
    expect(find(list, NU)).toMatchObject({ missCount: 1, streak: 0 });
  });

  it('clears only the kana answered, leaving the rest of the list intact', () => {
    const list = applyAnswer(
      [entry({ kana: 'ぬ', streak: 2 }), entry({ kana: 'ね', streak: 2 })],
      NU,
      true,
      T2,
    );
    expect(find(list, NU)).toBeUndefined();
    expect(find(list, NE)).toMatchObject({ streak: 2 });
  });

  it('advances ぬ without touching ヌ', () => {
    const list = applyAnswer(
      [entry({ kana: 'ぬ', streak: 1 }), entry({ kana: 'ヌ', script: 'katakana', streak: 1 })],
      NU,
      true,
      T2,
    );
    expect(find(list, NU)?.streak).toBe(2);
    expect(find(list, NU_KATAKANA)?.streak).toBe(1);
  });

  /**
   * The regression test the whole feature turns on (SC-004). A correction round refuses to advance
   * until the card is right, so if a later submission could advance the streak, a learner could
   * empty their entire mistake list by answering wrong and copying the answer three rounds running
   * — learning nothing. Only the first submission is ever passed in, and it stays false.
   */
  it('store case 17: wrong-then-copy never clears an entry, however many times it is repeated', () => {
    let list: MistakeList = [entry({ kana: 'ぬ', streak: 0, missCount: 1 })];
    for (let round = 0; round < 3; round += 1) {
      // The learner answers wrong, then types the revealed answer to continue. Only the first
      // submission reaches applyAnswer.
      list = applyAnswer(list, NU, false, T2);
    }
    expect(find(list, NU)).toMatchObject({ streak: 0, missCount: 4 });
    expect(list).toHaveLength(1);
  });
});
