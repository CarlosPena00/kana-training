/**
 * Romanizations this app does not use, mapped to the spelling it does.
 *
 * Reference data, so it lives beside the kana rather than inside the engine (Principle III) and can
 * be extended without touching diagnosis logic.
 *
 * Two invariants, asserted in tests/data/dataset.test.ts because getting either wrong produces
 * confidently incorrect feedback:
 *
 *   1. No key may be a canonical reading. This dataset uses `di` and `du` as the readings of ぢ and
 *      づ, so a stock Kunrei-shiki table — which treats `di` as an alternate for じ — would tell a
 *      learner who typed the correct reading that they had misspelled it.
 *   2. Every value must be a canonical reading. A note must never point at a spelling the app
 *      would itself reject.
 *
 * Deliberately absent: `ji` for ぢ and `zu` for づ. Both are canonical readings of *other* kana
 * (じ, ず), so a learner typing them gets the more useful kana confusion — "you wrote じ" — instead.
 * Listing them here would shadow a better message with a worse one.
 */
export const ALTERNATE_SPELLINGS: Readonly<Record<string, string>> = {
  // Kunrei-shiki / Nihon-shiki basics
  si: 'shi',
  ti: 'chi',
  tu: 'tsu',
  hu: 'fu',
  zi: 'ji',

  // Kunrei-shiki yōon
  sya: 'sha',
  syu: 'shu',
  syo: 'sho',
  tya: 'cha',
  tyu: 'chu',
  tyo: 'cho',
  zya: 'ja',
  zyu: 'ju',
  zyo: 'jo',

  // Common hybrid spellings
  jya: 'ja',
  jyu: 'ju',
  jyo: 'jo',

  // づ and ぢ written the long way round
  dzu: 'du',
  dji: 'di',
};
