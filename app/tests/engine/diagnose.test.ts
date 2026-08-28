import { describe, expect, it } from 'vitest';
import { diagnoseAnswer } from '../../src/engine/diagnose';
import { ALTERNATE_SPELLINGS } from '../../src/data/alternates';
import { HIRAGANA, KATAKANA, findKana } from '../../src/data';
import type { Direction, Kana, QuizQuestion } from '../../src/models/types';

/**
 * Contract cases 1-19 from specs/004-confused-kana-feedback/contracts/answer-diagnosis.md.
 */

const card = (kana: Kana, direction: Direction): QuizQuestion =>
  direction === 'kana-to-romaji'
    ? { kana, direction, prompt: kana.kana, expectedAnswer: kana.romaji }
    : { kana, direction, prompt: kana.romaji, expectedAnswer: kana.kana };

const RO = findKana('hiragana', 'ろ')!;
const RU = findKana('hiragana', 'る')!;
const RO_K = findKana('katakana', 'ロ')!;
const RU_K = findKana('katakana', 'ル')!;
const SHI = findKana('hiragana', 'し')!;
const DI = findKana('hiragana', 'ぢ')!;
const JI = findKana('hiragana', 'じ')!;
const KYA = findKana('hiragana', 'きゃ')!;

const REVEALED = true;
const HIDDEN = false;

describe('kana confusion (cases 1-3)', () => {
  it('case 1: names the kana a wrong reading belongs to', () => {
    expect(diagnoseAnswer(card(RO, 'kana-to-romaji'), 'ru', REVEALED)).toEqual({
      kind: 'kana-confusion',
      wrote: RU,
      wanted: RO,
    });
  });

  it("case 2: resolves within the card's own script, never the other", () => {
    // Drilling Katakana, the learner who types `ru` means ル. Naming る would answer a question
    // they did not ask.
    expect(diagnoseAnswer(card(RO_K, 'kana-to-romaji'), 'ru', REVEALED)).toMatchObject({
      kind: 'kana-confusion',
      wrote: RU_K,
    });
  });

  it('case 3: works the other way round too', () => {
    expect(diagnoseAnswer(card(RO, 'romaji-to-kana'), 'る', REVEALED)).toEqual({
      kind: 'kana-confusion',
      wrote: RU,
      wanted: RO,
    });
  });

  it('survives a retry, because "you wrote る" says nothing about the answer', () => {
    expect(diagnoseAnswer(card(RO, 'kana-to-romaji'), 'ru', HIDDEN)).toMatchObject({
      kind: 'kana-confusion',
      wrote: RU,
    });
  });
});

describe('script note (cases 4-6)', () => {
  it('case 4: the right character in the wrong alphabet', () => {
    expect(diagnoseAnswer(card(RO, 'romaji-to-kana'), 'ロ', REVEALED)).toEqual({
      kind: 'script',
      wrote: RO_K,
      wanted: RO,
    });
  });

  it('case 5: withheld while attempts remain, because it identifies the answer', () => {
    expect(diagnoseAnswer(card(RO, 'romaji-to-kana'), 'ロ', HIDDEN)).toBeNull();
  });

  it('case 6: wrong character AND wrong alphabet is not one nameable mistake', () => {
    expect(diagnoseAnswer(card(RO, 'romaji-to-kana'), 'ル', REVEALED)).toBeNull();
  });

  it('cannot arise in the kana-to-romaji direction, where both scripts share readings', () => {
    // `ro` on a ろ card is simply correct, so there is nothing to diagnose.
    expect(diagnoseAnswer(card(RO, 'kana-to-romaji'), 'ro', REVEALED)).toBeNull();
  });
});

describe('spelling note (cases 7-9)', () => {
  it('case 7: names the spelling this app uses', () => {
    expect(diagnoseAnswer(card(RO, 'kana-to-romaji'), 'si', REVEALED)).toEqual({
      kind: 'spelling',
      typed: 'si',
      canonical: 'shi',
    });
  });

  it('case 8: shown on its own card once the answer is revealed', () => {
    expect(diagnoseAnswer(card(SHI, 'kana-to-romaji'), 'si', REVEALED)).toMatchObject({
      kind: 'spelling',
      canonical: 'shi',
    });
  });

  /**
   * The leak this feature could most easily spring. On a し card, "this app uses shi" *is* the
   * answer the retry is withholding — so the note has to disappear entirely (FR-020b, SC-005a).
   */
  it('case 9: withheld on its own card while attempts remain', () => {
    expect(diagnoseAnswer(card(SHI, 'kana-to-romaji'), 'si', HIDDEN)).toBeNull();
  });

  it('still shown during a retry when it does not name this card answer', () => {
    expect(diagnoseAnswer(card(RO, 'kana-to-romaji'), 'si', HIDDEN)).toMatchObject({
      kind: 'spelling',
      canonical: 'shi',
    });
  });

  it('never carries a kana — a spelling note names no character (FR-020d)', () => {
    const note = diagnoseAnswer(card(RO, 'kana-to-romaji'), 'tu', REVEALED);
    expect(note).toMatchObject({ kind: 'spelling', canonical: 'tsu' });
    expect(note && 'wrote' in note).toBe(false);
  });

  it('is impossible in the romaji-to-kana direction, where the answer is not romaji', () => {
    expect(diagnoseAnswer(card(RO, 'romaji-to-kana'), 'si', REVEALED)).toBeNull();
  });
});

describe('canonical readings beat the alternate table (case 10)', () => {
  /**
   * `di` and `du` are the canonical readings of ぢ and づ here. A stock Kunrei table would call
   * `di` an alternate for じ; this dataset must produce a kana confusion instead.
   */
  it('case 10: `di` names ぢ rather than producing a spelling note', () => {
    expect(diagnoseAnswer(card(RO, 'kana-to-romaji'), 'di', REVEALED)).toEqual({
      kind: 'kana-confusion',
      wrote: DI,
      wanted: RO,
    });
  });

  it('`ji` names じ, which is more useful than any spelling note', () => {
    expect(diagnoseAnswer(card(DI, 'kana-to-romaji'), 'ji', REVEALED)).toEqual({
      kind: 'kana-confusion',
      wrote: JI,
      wanted: DI,
    });
  });
});

describe('nothing to say (cases 11-13)', () => {
  it('case 11: a correct answer is never commented on, in either direction', () => {
    expect(diagnoseAnswer(card(RO, 'kana-to-romaji'), 'ro', REVEALED)).toBeNull();
    expect(diagnoseAnswer(card(RO, 'romaji-to-kana'), 'ろ', REVEALED)).toBeNull();
  });

  it('case 12: blank and whitespace-only answers', () => {
    for (const blank of ['', '   ', '　']) {
      expect(diagnoseAnswer(card(RO, 'kana-to-romaji'), blank, REVEALED)).toBeNull();
    }
  });

  it('case 13: junk that is not a reading at all', () => {
    for (const junk of ['zzz', '123', '🙂', '!!']) {
      expect(diagnoseAnswer(card(RO, 'kana-to-romaji'), junk, REVEALED)).toBeNull();
    }
  });
});

describe('normalization is shared with grading (cases 14-17)', () => {
  it('case 14: case and surrounding whitespace do not change the result', () => {
    const expected = diagnoseAnswer(card(RO, 'kana-to-romaji'), 'ru', REVEALED);
    for (const variant of ['RU', ' ru ', 'Ru', '  RU  ']) {
      expect(diagnoseAnswer(card(RO, 'kana-to-romaji'), variant, REVEALED)).toEqual(expected);
    }
  });

  it('case 15: a decomposed kana resolves as its composed form', () => {
    const composed = 'が';
    const decomposed = 'が'.normalize('NFD');
    expect(decomposed).not.toBe(composed);
    expect(diagnoseAnswer(card(RO, 'romaji-to-kana'), decomposed, REVEALED)).toEqual(
      diagnoseAnswer(card(RO, 'romaji-to-kana'), composed, REVEALED),
    );
  });

  it('case 16: a combination kana is one entry, not two characters', () => {
    expect(diagnoseAnswer(card(RO, 'kana-to-romaji'), 'kya', REVEALED)).toMatchObject({
      kind: 'kana-confusion',
      wrote: KYA,
    });
    expect(diagnoseAnswer(card(RO, 'romaji-to-kana'), 'きゃ', REVEALED)).toMatchObject({
      kind: 'kana-confusion',
      wrote: KYA,
    });
  });

  it('case 17: several kana is not one confusion', () => {
    expect(diagnoseAnswer(card(RO, 'kana-to-romaji'), 'ruro', REVEALED)).toBeNull();
    expect(diagnoseAnswer(card(RO, 'romaji-to-kana'), 'るろ', REVEALED)).toBeNull();
  });
});

describe('exhaustive sweeps (cases 18-19)', () => {
  const ALL = [...HIRAGANA, ...KATAKANA];
  const DIRECTIONS: readonly Direction[] = ['kana-to-romaji', 'romaji-to-kana'];

  it('case 18: never throws, and never names a wanted kana other than the card', () => {
    for (const kana of ALL) {
      for (const direction of DIRECTIONS) {
        const question = card(kana, direction);
        for (const other of ALL) {
          const answer = direction === 'kana-to-romaji' ? other.romaji : other.kana;
          const note = diagnoseAnswer(question, answer, REVEALED);
          if (note && note.kind !== 'spelling') expect(note.wanted).toBe(kana);
        }
      }
    }
  });

  /**
   * SC-005a as a property rather than an example: across the whole dataset and the whole alternate
   * table, a hidden answer is never present in what the caller is handed.
   */
  it('case 19: with the answer hidden, no note ever contains this card expected answer', () => {
    for (const kana of ALL) {
      for (const direction of DIRECTIONS) {
        const question = card(kana, direction);
        const answers = [
          ...Object.keys(ALTERNATE_SPELLINGS),
          ...ALL.map((k) => (direction === 'kana-to-romaji' ? k.romaji : k.kana)),
        ];
        for (const answer of answers) {
          const note = diagnoseAnswer(question, answer, HIDDEN);
          if (!note) continue;
          if (note.kind === 'spelling') {
            expect(note.canonical).not.toBe(question.expectedAnswer);
          } else {
            // A confusion carries `wanted`, but the caller renders only the `wrote` half while
            // attempts remain (FR-015a); what must never happen is a script note surviving.
            expect(note.kind).toBe('kana-confusion');
          }
        }
      }
    }
  });
});
