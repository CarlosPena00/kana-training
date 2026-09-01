import type { ExampleWord } from '../models/types';

/**
 * Example words — real vocabulary a learner can be shown after missing a character, so the kana
 * is seen doing its job rather than alone on a card.
 *
 * Reference data, so it lives beside the kana rather than inside the engine (Principle III) and
 * grows without touching feedback logic.
 *
 * Two things this list deliberately does *not* do:
 *
 *   1. It does not say which kana each word illustrates. That is a property of the spelling and is
 *      derived from it, so a word can never claim a character it does not contain.
 *   2. It does not romanize character by character. Words follow the romanization of the Marugoto
 *      coursebooks (The Japan Foundation), which is the app's reference for how a *word* is
 *      written:
 *
 *        - Consonants are Hepburn — `tsukue`, `zasshi`, `ocha`, `fujisan` — the same spellings the
 *          cards teach. This matters: a word is shown in the panel that answers `si` with "this
 *          app spells it shi" (see ALTERNATE_SPELLINGS), and a word spelled `zassi` would make the
 *          feedback argue with itself.
 *        - A long vowel is doubled rather than spelled out as the two kana that write it, and
 *          never given a macron: えい is `ee` (`とけい` → `tokee`), おう is `oo` (`とうきょう` →
 *          `tookyoo`) and いい is `ii`. This is the series' own practice — its titles romanize
 *          かつどう as *Katsudoo*, and its family vocabulary prints `otoosan`, `oniisan` and
 *          `oneesan`, never `otousan` or `onēsan`.
 *        - ん is `n`: `tenpura`, `nihongo`.
 *
 *      The per-kana mapping — where え is `e`, い is `i` and う is `u` — stays where it belongs, in
 *      HIRAGANA. A doubled vowel belongs to the word, not to any character in it.
 *
 * This list covers a fraction of the dataset — and katakana barely at all — so most cards have no
 * example. That is expected: an example is shown when one exists and is silently absent
 * otherwise, never promised by the UI.
 *
 * Note that `ざっし` contains っ and `カーラ` contains ー, neither of which is in the kana dataset
 * (っ is excluded along with ゐ and ヱ; ー is not a kana). A word may contain characters the app
 * never quizzes; only the ones it does quiz can be illustrated by it.
 */
const HIRAGANA_WORDS: ReadonlyArray<readonly [string, string, string]> = [
  ['あさ', 'asa', 'morning'],
  ['ひる', 'hiru', 'midday'],
  ['よる', 'yoru', 'night'],
  ['かぞく', 'kazoku', 'family'],
  ['そら', 'sora', 'sky'],
  ['へや', 'heya', 'room'],
  ['むすめ', 'musume', 'daughter'],
  ['りょうり', 'ryoori', 'cooking'],
  ['これ', 'kore', 'this'],
  ['いす', 'isu', 'chair'],
  ['おちゃ', 'ocha', 'tea'],
  ['とけい', 'tokee', 'clock'],
  ['うみ', 'umi', 'sea'],
  ['ゆき', 'yuki', 'snow'],
  ['やま', 'yama', 'mountain'],
  ['いぬ', 'inu', 'dog'],
  ['ねこ', 'neko', 'cat'],
  ['ざっし', 'zasshi', 'magazine'],
  ['つくえ', 'tsukue', 'desk'],
  ['にほんご', 'nihongo', 'Japanese language'],
  ['てんぷら', 'tenpura', 'tempura'],
  ['ふじさん', 'fujisan', 'Mount Fuji'],
  ['とうきょう', 'tookyoo', 'Tokyo'],

  // Self-introduction dialogue: greetings, the two professions it contrasts, and the
  // words that carry the questions.
  ['はじめまして', 'hajimemashite', 'how do you do'],
  ['どうぞ', 'doozo', 'please, go ahead'],
  ['よろしく', 'yoroshiku', 'pleased to meet you'],
  ['わたし', 'watashi', 'I'],
  ['あのう', 'anoo', 'um, excuse me'],
  ['いいえ', 'iie', 'no'],
  ['なん', 'nan', 'what'],
  ['しごと', 'shigoto', 'work'],
  ['がくせい', 'gakusee', 'student'],
  ['せんせい', 'sensee', 'teacher'],

  // Family. The glosses keep the distinction the lesson is built on: the plain words name one's
  // own family, the お…さん forms name someone else's.
  ['はは', 'haha', 'my mother'],
  ['おっと', 'otto', 'my husband'],
  ['いもうと', 'imooto', 'younger sister'],
  ['おとうと', 'otooto', 'younger brother'],
  ['おとうさん', 'otoosan', "someone's father"],
  ['おにいさん', 'oniisan', "someone's older brother"],
  ['おねえさん', 'oneesan', "someone's older sister"],
  ['おくさん', 'okusan', "someone's wife"],

  // Numbers 1-10 and 100, with both readings where the language has two. The teens and tens are
  // left out on purpose: じゅういち is じゅう and いち written together and introduces no character
  // these entries do not already carry.
  ['いち', 'ichi', 'one'],
  ['に', 'ni', 'two'],
  ['さん', 'san', 'three'],
  ['し', 'shi', 'four'],
  ['よん', 'yon', 'four'],
  ['ご', 'go', 'five'],
  ['ろく', 'roku', 'six'],
  ['しち', 'shichi', 'seven'],
  ['なな', 'nana', 'seven'],
  ['はち', 'hachi', 'eight'],
  ['きゅう', 'kyuu', 'nine'],
  ['く', 'ku', 'nine'],
  ['じゅう', 'juu', 'ten'],
  ['ひゃく', 'hyaku', 'one hundred'],
];

/**
 * Phrases, for characters no word can illustrate.
 *
 * Only を needs this so far: it is a particle and nothing else, so it appears in no vocabulary
 * item at all. That also makes it the one entry whose romaji names a sound the card does not —
 * the phrase reads `o`, while the を card's reading is `wo`, which `hiragana.ts` uses to keep the
 * kana↔romaji mapping one-to-one. The rule that gives `tokee` its doubled vowel gives this its
 * `o`: romaji here is how the phrase is said. Anything shown next to a を card should expect the
 * mismatch rather than be surprised by it.
 */
const HIRAGANA_PHRASES: ReadonlyArray<readonly [string, string, string]> = [
  ['にほんごを はなします', 'nihongo o hanashimasu', 'I speak Japanese'],
];

/**
 * Katakana words are kept apart because `script` decides which cards a word may illustrate, and
 * these two are the only entries that can serve a katakana card at all.
 */
const KATAKANA_WORDS: ReadonlyArray<readonly [string, string, string]> = [
  ['キム', 'kimu', 'Kim (name)'],
  ['カーラ', 'kaara', 'Kara (name)'],
];

function build(
  rows: ReadonlyArray<readonly [string, string, string]>,
  script: ExampleWord['script'],
  kind: ExampleWord['kind'],
): readonly ExampleWord[] {
  return rows.map(([word, romaji, meaning]) => ({ word, romaji, meaning, script, kind }));
}

export const EXAMPLE_WORDS: readonly ExampleWord[] = [
  ...build(HIRAGANA_WORDS, 'hiragana', 'word'),
  ...build(KATAKANA_WORDS, 'katakana', 'word'),
  ...build(HIRAGANA_PHRASES, 'hiragana', 'phrase'),
];
