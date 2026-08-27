import { describe, expect, it } from 'vitest';
import { GROUPS, HIRAGANA, KATAKANA, groupsForSection, kanaForScript } from '../../src/data';
import type { Kana } from '../../src/models/types';
import unicodeReference from './unicode-reference.json';

/**
 * Dataset invariants from specs/001-kana-flashcards/contracts/kana-dataset.md.
 * Constitution Principle III puts data correctness above all other work.
 */

const BOTH: readonly Kana[] = [...HIRAGANA, ...KATAKANA];
const EXCLUDED = ['ゐ', 'ゑ', 'ヰ', 'ヱ', 'っ', 'ッ', 'ヴ'];

describe('inventory size (invariants 1, 10)', () => {
  it('holds 107 kana per script', () => {
    expect(HIRAGANA).toHaveLength(107);
    expect(KATAKANA).toHaveLength(107);
  });

  it('splits 46 main / 25 dakuten / 36 combination in each script', () => {
    for (const script of ['hiragana', 'katakana'] as const) {
      const entries = kanaForScript(script);
      const countIn = (section: 'main' | 'dakuten' | 'combination') => {
        const ids = new Set(groupsForSection(section).map((g) => g.id));
        return entries.filter((k) => ids.has(k.groupId)).length;
      };
      expect(countIn('main')).toBe(46);
      expect(countIn('dakuten')).toBe(25);
      expect(countIn('combination')).toBe(36);
    }
  });
});

describe('group structure (invariants 2, 3, 4, 13)', () => {
  it('exposes exactly 27 groups: 10 main, 5 dakuten, 12 combination', () => {
    expect(GROUPS).toHaveLength(27);
    expect(groupsForSection('main')).toHaveLength(10);
    expect(groupsForSection('dakuten')).toHaveLength(5);
    expect(groupsForSection('combination')).toHaveLength(12);
  });

  it('leaves no kana outside a group and no group empty', () => {
    const ids = new Set(GROUPS.map((g) => g.id));
    for (const entry of BOTH) expect(ids.has(entry.groupId)).toBe(true);
    for (const group of GROUPS) {
      expect(HIRAGANA.some((k) => k.groupId === group.id)).toBe(true);
      expect(KATAKANA.some((k) => k.groupId === group.id)).toBe(true);
    }
  });

  it('gives both scripts identical group membership counts', () => {
    for (const group of GROUPS) {
      const h = HIRAGANA.filter((k) => k.groupId === group.id).length;
      const k = KATAKANA.filter((x) => x.groupId === group.id).length;
      expect(h).toBe(k);
    }
  });

  it('puts わ, を and ん in main.wa (clarification 2026-08-27)', () => {
    const hira = HIRAGANA.filter((k) => k.groupId === 'main.wa').map((k) => k.kana);
    const kata = KATAKANA.filter((k) => k.groupId === 'main.wa').map((k) => k.kana);
    expect(hira).toEqual(['わ', 'を', 'ん']);
    expect(kata).toEqual(['ワ', 'ヲ', 'ン']);
  });
});

describe('uniqueness and invertibility (invariants 5, 6, 7)', () => {
  it('has unique kana within each script', () => {
    expect(new Set(HIRAGANA.map((k) => k.kana)).size).toBe(HIRAGANA.length);
    expect(new Set(KATAKANA.map((k) => k.kana)).size).toBe(KATAKANA.length);
  });

  // The load-bearing invariant: it is what lets a romaji prompt have exactly one correct kana.
  it('has unique romaji within each script, so romaji -> kana inverts', () => {
    expect(new Set(HIRAGANA.map((k) => k.romaji)).size).toBe(HIRAGANA.length);
    expect(new Set(KATAKANA.map((k) => k.romaji)).size).toBe(KATAKANA.length);
  });

  it('uses the identical romaji set in both scripts', () => {
    const h = HIRAGANA.map((k) => k.romaji).sort();
    const k = KATAKANA.map((x) => x.romaji).sort();
    expect(h).toEqual(k);
  });
});

describe('character hygiene (invariants 8, 9, 11, 12)', () => {
  it('spells romaji as lowercase ASCII', () => {
    for (const entry of BOTH) expect(entry.romaji).toMatch(/^[a-z]+$/);
  });

  it('keeps each script inside its own Unicode block', () => {
    const inRange = (s: string, lo: number, hi: number) =>
      [...s].every((c) => c.codePointAt(0)! >= lo && c.codePointAt(0)! <= hi);
    for (const entry of HIRAGANA) expect(inRange(entry.kana, 0x3040, 0x309f)).toBe(true);
    for (const entry of KATAKANA) expect(inRange(entry.kana, 0x30a0, 0x30ff)).toBe(true);
  });

  it('stores every kana NFC-normalized', () => {
    for (const entry of BOTH) expect(entry.kana.normalize('NFC')).toBe(entry.kana);
  });

  it('excludes obsolete and out-of-scope characters', () => {
    for (const entry of BOTH) {
      for (const bad of EXCLUDED) expect(entry.kana).not.toContain(bad);
    }
  });
});

describe('canonical romanization (invariant 14)', () => {
  const expectRomaji = (kana: string, romaji: string) => {
    expect(BOTH.find((k) => k.kana === kana)?.romaji).toBe(romaji);
  };

  it('uses the spellings that keep the mapping one-to-one', () => {
    expectRomaji('し', 'shi');
    expectRomaji('ち', 'chi');
    expectRomaji('つ', 'tsu');
    expectRomaji('ふ', 'fu');
    expectRomaji('じ', 'ji');
    expectRomaji('ぢ', 'di'); // not Hepburn 'ji' — would collide with じ
    expectRomaji('づ', 'du'); // not Hepburn 'zu' — would collide with ず
    expectRomaji('を', 'wo'); // distinguishes it from お
    expectRomaji('ん', 'n');
    expectRomaji('じゃ', 'ja');
    expectRomaji('ぢゃ', 'dya');
  });

  /**
   * Independent cross-check: unicode-reference.json is derived from the Unicode Standard's own
   * character names (HIRAGANA LETTER KA -> ka), not from this dataset. It catches a correct-looking
   * glyph paired with the wrong reading, which the structural invariants above cannot (SC-003).
   * Regenerate with scripts/verify-dataset.py.
   */
  it('matches the readings recorded in the Unicode Standard for all 214 entries', () => {
    const reference = unicodeReference as Record<string, string>;
    expect(Object.keys(reference)).toHaveLength(214);
    for (const entry of BOTH) {
      expect(reference[entry.kana], `reading for ${entry.kana}`).toBe(entry.romaji);
    }
  });
});
