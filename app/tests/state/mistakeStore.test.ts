import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MISTAKES_KEY,
  clearMistakes,
  loadMistakes,
  saveMistakes,
} from '../../src/state/mistakeStore';
import { PREFERENCES_KEY } from '../../src/state/preferences';
import type { MistakeEntry } from '../../src/models/types';

/**
 * Store cases 1-12 from specs/003-mistake-history/contracts/mistake-store.md.
 *
 * The mistake list is cache-grade (FR-030): every path here has a working answer that does not
 * involve stored data, and no function throws. Repair is never surfaced to the learner (FR-034).
 */

class MemoryStorage {
  private map = new Map<string, string>();
  getItem(key: string) {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.map.set(key, value);
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
}

let storage: MemoryStorage;

const write = (value: unknown) =>
  storage.setItem(MISTAKES_KEY, typeof value === 'string' ? value : JSON.stringify(value));

const stored = (entries: unknown[]) => write({ version: 1, entries });

const entry = (over: Record<string, unknown> = {}) => ({
  script: 'hiragana',
  kana: 'ぬ',
  missCount: 2,
  streak: 1,
  lastMissedAt: '2026-08-01T10:00:00.000Z',
  ...over,
});

beforeEach(() => {
  storage = new MemoryStorage();
  vi.stubGlobal('localStorage', storage);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('loadMistakes — repair paths', () => {
  it('case 1: returns an empty list when the key is absent', () => {
    expect(loadMistakes()).toEqual([]);
  });

  it('case 2: returns an empty list when the accessor itself throws', () => {
    // Safari private mode and storage-blocking settings throw rather than returning null, which
    // is why the implementation needs try/catch and not a null check.
    vi.stubGlobal('localStorage', {
      getItem() {
        throw new Error('SecurityError');
      },
    });
    expect(() => loadMistakes()).not.toThrow();
    expect(loadMistakes()).toEqual([]);
  });

  it('case 3: returns an empty list for content that is not JSON', () => {
    write('not json');
    expect(loadMistakes()).toEqual([]);
  });

  it('case 4: returns an empty list for an unknown version, without migrating', () => {
    write({ version: 2, entries: [entry()] });
    expect(loadMistakes()).toEqual([]);
  });

  it('returns an empty list when entries is not an array', () => {
    write({ version: 1, entries: 'nope' });
    expect(loadMistakes()).toEqual([]);
  });

  it('case 5: drops an entry whose kana is no longer in the dataset, keeping the rest', () => {
    stored([entry(), entry({ kana: 'ゐ' })]);
    const list = loadMistakes();
    expect(list).toHaveLength(1);
    expect(list[0]?.kana).toBe('ぬ');
  });

  it('drops an entry whose script is not one of the two literals', () => {
    stored([entry({ script: 'klingon' }), entry({ kana: 'ね' })]);
    expect(loadMistakes().map((e) => e.kana)).toEqual(['ね']);
  });

  it('case 6: clamps a stored streak above the maximum rather than dropping the entry', () => {
    // A stored 3 means a write was interrupted between advancing and deleting. The learner should
    // keep their progress, not lose the entry.
    stored([entry({ streak: 5 })]);
    expect(loadMistakes()[0]).toMatchObject({ kana: 'ぬ', streak: 2 });
  });

  it('case 7: drops an entry with a missCount that is not a positive integer', () => {
    stored([entry({ missCount: 0 }), entry({ kana: 'ね', missCount: 1.5 }), entry({ kana: 'の' })]);
    expect(loadMistakes().map((e) => e.kana)).toEqual(['の']);
  });

  it('case 8: keeps the higher missCount when the same identity appears twice', () => {
    stored([entry({ missCount: 2 }), entry({ missCount: 9 })]);
    const list = loadMistakes();
    expect(list).toHaveLength(1);
    expect(list[0]?.missCount).toBe(9);
  });

  it('case 9: substitutes the epoch for an unparseable timestamp rather than losing the entry', () => {
    stored([entry({ lastMissedAt: 'whenever' })]);
    const list = loadMistakes();
    expect(list).toHaveLength(1);
    expect(new Date(list[0]!.lastMissedAt).getTime()).toBe(0);
  });

  it('case 12: keeps ぬ and ヌ as two entries', () => {
    stored([entry(), entry({ script: 'katakana', kana: 'ヌ' })]);
    expect(loadMistakes()).toHaveLength(2);
  });

  it('round-trips a valid list unchanged', () => {
    const list: MistakeEntry[] = [
      { script: 'hiragana', kana: 'ぬ', missCount: 3, streak: 2, lastMissedAt: '2026-08-01T10:00:00.000Z' },
      { script: 'katakana', kana: 'ヌ', missCount: 1, streak: 0, lastMissedAt: '2026-08-02T10:00:00.000Z' },
    ];
    saveMistakes(list);
    expect(loadMistakes()).toEqual(list);
  });
});

describe('saveMistakes and clearMistakes', () => {
  it('case 10: swallows a failing write so a quiz is never interrupted (FR-036)', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem() {
        throw new Error('QuotaExceededError');
      },
    });
    expect(() => saveMistakes([{ script: 'hiragana', kana: 'ぬ', missCount: 1, streak: 0, lastMissedAt: 'x' }])).not.toThrow();
  });

  it('case 11: clears the mistake list without touching preferences (FR-038)', () => {
    saveMistakes([{ script: 'hiragana', kana: 'ぬ', missCount: 1, streak: 0, lastMissedAt: '2026-08-01T10:00:00.000Z' }]);
    storage.setItem(PREFERENCES_KEY, '{"version":1}');

    clearMistakes();

    expect(loadMistakes()).toEqual([]);
    expect(storage.getItem(PREFERENCES_KEY)).toBe('{"version":1}');
  });

  it('swallows a failing clear', () => {
    vi.stubGlobal('localStorage', {
      removeItem() {
        throw new Error('SecurityError');
      },
    });
    expect(() => clearMistakes()).not.toThrow();
  });

  it('stores nothing beyond the documented fields (FR-039)', () => {
    saveMistakes([{ script: 'hiragana', kana: 'ぬ', missCount: 1, streak: 0, lastMissedAt: '2026-08-01T10:00:00.000Z' }]);
    const raw = JSON.parse(storage.getItem(MISTAKES_KEY)!);
    expect(Object.keys(raw).sort()).toEqual(['entries', 'version']);
    expect(Object.keys(raw.entries[0]).sort()).toEqual([
      'kana',
      'lastMissedAt',
      'missCount',
      'script',
      'streak',
    ]);
  });
});
