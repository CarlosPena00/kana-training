import { describe, expect, it } from 'vitest';
import { checkAnswer } from '../../src/engine/validate';
import { HIRAGANA, KATAKANA } from '../../src/data';
import type { Kana, QuizQuestion } from '../../src/models/types';

const find = (set: readonly Kana[], kana: string): Kana => {
  const entry = set.find((k) => k.kana === kana);
  if (!entry) throw new Error(`missing test fixture ${kana}`);
  return entry;
};

const kanaToRomaji = (kana: Kana): QuizQuestion => ({
  kana,
  direction: 'kana-to-romaji',
  prompt: kana.kana,
  expectedAnswer: kana.romaji,
});

const romajiToKana = (kana: Kana): QuizQuestion => ({
  kana,
  direction: 'romaji-to-kana',
  prompt: kana.romaji,
  expectedAnswer: kana.kana,
});

const a = find(HIRAGANA, 'あ');
const shi = find(HIRAGANA, 'し');
const ka = find(HIRAGANA, 'か');
const kaKatakana = find(KATAKANA, 'カ');

describe('checkAnswer', () => {
  it('accepts the exact romaji', () => {
    expect(checkAnswer(kanaToRomaji(a), 'a')).toBe(true);
  });

  it('is case-insensitive (FR-025)', () => {
    expect(checkAnswer(kanaToRomaji(a), 'A')).toBe(true);
    expect(checkAnswer(kanaToRomaji(shi), 'SHi')).toBe(true);
  });

  it('ignores surrounding whitespace (FR-026)', () => {
    expect(checkAnswer(kanaToRomaji(a), ' a ')).toBe(true);
    expect(checkAnswer(romajiToKana(ka), '　か　')).toBe(true);
  });

  it('accepts a decomposed kana typed by an IME', () => {
    const ga = find(HIRAGANA, 'が');
    expect(checkAnswer(romajiToKana(ga), 'が')).toBe(true);
  });

  it('rejects a different romanization system (FR-005)', () => {
    expect(checkAnswer(kanaToRomaji(shi), 'si')).toBe(false);
    expect(checkAnswer(kanaToRomaji(find(HIRAGANA, 'つ')), 'tu')).toBe(false);
  });

  it('rejects the other script for the prompted one (FR-027)', () => {
    expect(checkAnswer(romajiToKana(ka), 'カ')).toBe(false);
    expect(checkAnswer(romajiToKana(kaKatakana), 'か')).toBe(false);
  });

  it('rejects a plainly wrong answer', () => {
    expect(checkAnswer(kanaToRomaji(a), 'o')).toBe(false);
  });

  it('rejects blank input rather than treating it as a match', () => {
    expect(checkAnswer(kanaToRomaji(a), '')).toBe(false);
    expect(checkAnswer(kanaToRomaji(a), '   ')).toBe(false);
  });

  it('distinguishes the kana that share a Hepburn spelling', () => {
    expect(checkAnswer(kanaToRomaji(find(HIRAGANA, 'ぢ')), 'di')).toBe(true);
    expect(checkAnswer(kanaToRomaji(find(HIRAGANA, 'ぢ')), 'ji')).toBe(false);
    expect(checkAnswer(kanaToRomaji(find(HIRAGANA, 'づ')), 'du')).toBe(true);
    expect(checkAnswer(kanaToRomaji(find(HIRAGANA, 'づ')), 'zu')).toBe(false);
  });
});
