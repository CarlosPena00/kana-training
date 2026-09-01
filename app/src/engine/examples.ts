import { EXAMPLE_WORDS } from '../data/words';
import { defaultRng, type Rng } from './rng';
import type { ExampleWord, Kana } from '../models/types';

/**
 * Picks a real word to show beside a character the learner just missed.
 *
 * Pure, and random only through an injected `Rng` (Principle IV), so a test can pin the choice
 * without stubbing a global.
 *
 * Nothing here can affect correctness: this module is read-only over the word list and is called
 * after a card is already graded and its answer already on screen. That timing is the whole safety
 * argument — a word containing the answer would hand it over, so the caller must never show one
 * while attempts remain (the same rule `diagnoseAnswer` follows for its notes).
 */

/** Where in a word the character appears, so the UI can point at it rather than make it hunt. */
export interface KanaExample {
  readonly entry: ExampleWord;
  /** Index of the occurrence to highlight. */
  readonly at: number;
  /** Its length: 1, or 2 for a combination like きょ. */
  readonly length: number;
}

/**
 * The small ya/yu/yo. A preceding character binds to these into one sound — きょ is `kyo`, not a
 * `ki` next to something — and the app quizzes that pair as its own card. So とうきょう illustrates
 * きょ and must not be offered as an example of き: the learner would be shown a character that,
 * right there, is not read the way the card just taught it.
 */
const SMALL_Y: ReadonlySet<string> = new Set(['ゃ', 'ゅ', 'ょ', 'ャ', 'ュ', 'ョ']);

/**
 * The first occurrence of `kana` in `word` that actually reads as that character, or -1.
 *
 * Only a one-character target can be swallowed by a following small ya/yu/yo; a two-character
 * combination is already the whole sound.
 */
function findOccurrence(word: string, kana: string): number {
  for (let from = 0; from <= word.length - kana.length; from += 1) {
    const at = word.indexOf(kana, from);
    if (at === -1) return -1;

    const next = word[at + kana.length];
    if (kana.length === 1 && next !== undefined && SMALL_Y.has(next)) {
      from = at;
      continue;
    }
    return at;
  }
  return -1;
}

/**
 * Every entry that can illustrate this character, in dataset order.
 *
 * Two entries are excluded beyond the obvious script mismatch:
 *
 *   - A word that *is* the character. "You missed に. Here is a word: に" teaches nothing; the
 *     point of an example is seeing the character among others.
 *   - A word where the character only appears inside a combination (see SMALL_Y).
 */
export function examplesFor(kana: Kana): readonly KanaExample[] {
  const found: KanaExample[] = [];

  for (const entry of EXAMPLE_WORDS) {
    if (entry.script !== kana.script) continue;
    if (entry.word === kana.kana) continue;

    const at = findOccurrence(entry.word, kana.kana);
    if (at !== -1) found.push({ entry, at, length: kana.kana.length });
  }

  return found;
}

/**
 * One example at random, or null when the word list has nothing for this character — which is the
 * normal case for most of the dataset and not an error. The caller shows nothing at all rather
 * than an empty slot or an apology (the UI never promises an example).
 */
export function pickExample(kana: Kana, rng: Rng = defaultRng): KanaExample | null {
  const candidates = examplesFor(kana);
  if (candidates.length === 0) return null;

  return candidates[Math.floor(rng() * candidates.length)] ?? null;
}
