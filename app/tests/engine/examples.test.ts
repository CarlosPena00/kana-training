import { describe, expect, it } from 'vitest';
import { examplesFor, pickExample } from '../../src/engine/examples';
import { findKana } from '../../src/data';
import { EXAMPLE_WORDS } from '../../src/data/words';
import { mulberry32 } from '../../src/engine/rng';
import type { Kana } from '../../src/models/types';

const kana = (script: 'hiragana' | 'katakana', character: string): Kana => {
  const found = findKana(script, character);
  if (!found) throw new Error(`not in the dataset: ${character}`);
  return found;
};

const wordsFor = (script: 'hiragana' | 'katakana', character: string) =>
  examplesFor(kana(script, character)).map((example) => example.entry.word);

describe('finding examples', () => {
  it('matches a character at the start, the middle, and the end of a word', () => {
    expect(wordsFor('hiragana', 'あ')).toContain('あさ');
    expect(wordsFor('hiragana', 'す')).toContain('いす');
    expect(wordsFor('hiragana', 'ま')).toContain('やま');
  });

  it('reports where the character sits, so the UI can mark it', () => {
    const [example] = examplesFor(kana('hiragana', 'ね')).filter((e) => e.entry.word === 'ねこ');
    expect(example).toEqual(expect.objectContaining({ at: 0, length: 1 }));

    const [inside] = examplesFor(kana('hiragana', 'つ')).filter((e) => e.entry.word === 'つくえ');
    expect(inside?.at).toBe(0);

    const [end] = examplesFor(kana('hiragana', 'こ')).filter((e) => e.entry.word === 'ねこ');
    expect(end?.at).toBe(1);
  });

  it('matches a combination kana as the two characters that write it', () => {
    const [example] = examplesFor(kana('hiragana', 'きょ')).filter(
      (e) => e.entry.word === 'とうきょう',
    );
    expect(example).toEqual(expect.objectContaining({ at: 2, length: 2 }));
  });

  it('never crosses scripts', () => {
    // ぬ and ヌ are separate cards, and キム is the katakana entry for ム.
    expect(wordsFor('hiragana', 'ぬ')).toContain('いぬ');
    expect(wordsFor('katakana', 'ヌ')).toEqual([]);
    expect(wordsFor('katakana', 'ム')).toContain('キム');
    expect(wordsFor('hiragana', 'む')).not.toContain('キム');
  });

  it('returns nothing for a character no word covers, rather than throwing', () => {
    expect(examplesFor(kana('hiragana', 'ぴゅ'))).toEqual([]);
    expect(pickExample(kana('hiragana', 'ぴゅ'), mulberry32(1))).toBeNull();
  });
});

describe('what is deliberately not an example', () => {
  /**
   * The reason this rule exists: き inside きょ is not read `ki`, so offering とうきょう for a き
   * card would contradict the card the learner just failed.
   */
  it('does not offer a word where the character is swallowed by a small ya/yu/yo', () => {
    expect(wordsFor('hiragana', 'き')).not.toContain('とうきょう');
    expect(wordsFor('hiragana', 'ひ')).not.toContain('ひゃく');
    expect(wordsFor('hiragana', 'ゆ')).not.toContain('りょうり');
  });

  it('still matches a later, standalone occurrence in the same word', () => {
    // りょうり: the first り is part of りょ and is skipped, the last one is a plain り and is the
    // occurrence the UI should mark.
    const [example] = examplesFor(kana('hiragana', 'り')).filter(
      (e) => e.entry.word === 'りょうり',
    );
    expect(example).toEqual(expect.objectContaining({ at: 3, length: 1 }));

    // ゆき is offered for き — nothing about the rule blocks an ordinary occurrence.
    expect(wordsFor('hiragana', 'き')).toContain('ゆき');
  });

  it('does not offer a one-character word as an example of that same character', () => {
    expect(wordsFor('hiragana', 'に')).not.toContain('に');
    expect(wordsFor('hiragana', 'に')).toContain('にほんご');
  });
});

describe('picking one at random', () => {
  it('always returns one of the candidates', () => {
    const target = kana('hiragana', 'い');
    const candidates = examplesFor(target).map((e) => e.entry.word);
    expect(candidates.length).toBeGreaterThan(1);

    for (let seed = 0; seed < 25; seed += 1) {
      const picked = pickExample(target, mulberry32(seed));
      expect(candidates).toContain(picked?.entry.word);
    }
  });

  it('is decided by the injected rng and nothing else', () => {
    const target = kana('hiragana', 'い');
    const candidates = examplesFor(target);

    // A generator pinned to 0 takes the first candidate; one pinned just under 1 takes the last.
    expect(pickExample(target, () => 0)).toEqual(candidates[0]);
    expect(pickExample(target, () => 0.999999)).toEqual(candidates[candidates.length - 1]);
  });

  it('spreads over the candidates instead of favouring one', () => {
    const target = kana('hiragana', 'い');
    const rng = mulberry32(7);
    const seen = new Set<string>();
    for (let i = 0; i < 200; i += 1) seen.add(pickExample(target, rng)!.entry.word);

    expect(seen.size).toBe(examplesFor(target).length);
  });
});

describe('the word list itself', () => {
  it('gives every entry a spelling, a reading and a meaning', () => {
    for (const entry of EXAMPLE_WORDS) {
      expect(entry.word.length).toBeGreaterThan(0);
      expect(entry.romaji).toMatch(/^[a-z]+( [a-z]+)*$/);
      expect(entry.meaning.trim().length).toBeGreaterThan(0);
    }
  });

  it('writes each entry in the script it claims', () => {
    // Long-vowel ー and the space in a phrase are the only non-kana characters allowed.
    const HIRAGANA_ONLY = /^[ぁ-ゟ ]+$/;
    const KATAKANA_ONLY = /^[゠-ヿ ]+$/;

    for (const entry of EXAMPLE_WORDS) {
      expect(entry.word).toMatch(entry.script === 'hiragana' ? HIRAGANA_ONLY : KATAKANA_ONLY);
    }
  });

  it('marks as a phrase exactly those entries that are not a single word', () => {
    for (const entry of EXAMPLE_WORDS) {
      expect(entry.kind).toBe(entry.word.includes(' ') ? 'phrase' : 'word');
    }
  });

  it('holds no duplicate spellings within a script', () => {
    const seen = new Set<string>();
    for (const entry of EXAMPLE_WORDS) {
      const key = `${entry.script}:${entry.word}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });
});
