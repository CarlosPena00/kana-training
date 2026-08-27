import type { KanaGroup } from '../models/types';

/**
 * The 27 selectable groups. Identical for both scripts — only the label changes — which is
 * what makes a selection survive a script switch (FR-003, FR-009a).
 */
export const GROUPS: readonly KanaGroup[] = [
  { id: 'main.a', section: 'main', label: { hiragana: 'あ', katakana: 'ア' }, order: 1 },
  { id: 'main.ka', section: 'main', label: { hiragana: 'か', katakana: 'カ' }, order: 2 },
  { id: 'main.sa', section: 'main', label: { hiragana: 'さ', katakana: 'サ' }, order: 3 },
  { id: 'main.ta', section: 'main', label: { hiragana: 'た', katakana: 'タ' }, order: 4 },
  { id: 'main.na', section: 'main', label: { hiragana: 'な', katakana: 'ナ' }, order: 5 },
  { id: 'main.ha', section: 'main', label: { hiragana: 'は', katakana: 'ハ' }, order: 6 },
  { id: 'main.ma', section: 'main', label: { hiragana: 'ま', katakana: 'マ' }, order: 7 },
  { id: 'main.ya', section: 'main', label: { hiragana: 'や', katakana: 'ヤ' }, order: 8 },
  { id: 'main.ra', section: 'main', label: { hiragana: 'ら', katakana: 'ラ' }, order: 9 },
  { id: 'main.wa', section: 'main', label: { hiragana: 'わ', katakana: 'ワ' }, order: 10 },

  { id: 'dakuten.ga', section: 'dakuten', label: { hiragana: 'が', katakana: 'ガ' }, order: 11 },
  { id: 'dakuten.za', section: 'dakuten', label: { hiragana: 'ざ', katakana: 'ザ' }, order: 12 },
  { id: 'dakuten.da', section: 'dakuten', label: { hiragana: 'だ', katakana: 'ダ' }, order: 13 },
  { id: 'dakuten.ba', section: 'dakuten', label: { hiragana: 'ば', katakana: 'バ' }, order: 14 },
  { id: 'dakuten.pa', section: 'dakuten', label: { hiragana: 'ぱ', katakana: 'パ' }, order: 15 },

  { id: 'combo.kya', section: 'combination', label: { hiragana: 'きゃ', katakana: 'キャ' }, order: 16 },
  { id: 'combo.sha', section: 'combination', label: { hiragana: 'しゃ', katakana: 'シャ' }, order: 17 },
  { id: 'combo.cha', section: 'combination', label: { hiragana: 'ちゃ', katakana: 'チャ' }, order: 18 },
  { id: 'combo.nya', section: 'combination', label: { hiragana: 'にゃ', katakana: 'ニャ' }, order: 19 },
  { id: 'combo.hya', section: 'combination', label: { hiragana: 'ひゃ', katakana: 'ヒャ' }, order: 20 },
  { id: 'combo.mya', section: 'combination', label: { hiragana: 'みゃ', katakana: 'ミャ' }, order: 21 },
  { id: 'combo.rya', section: 'combination', label: { hiragana: 'りゃ', katakana: 'リャ' }, order: 22 },
  { id: 'combo.gya', section: 'combination', label: { hiragana: 'ぎゃ', katakana: 'ギャ' }, order: 23 },
  { id: 'combo.ja', section: 'combination', label: { hiragana: 'じゃ', katakana: 'ジャ' }, order: 24 },
  { id: 'combo.dya', section: 'combination', label: { hiragana: 'ぢゃ', katakana: 'ヂャ' }, order: 25 },
  { id: 'combo.bya', section: 'combination', label: { hiragana: 'びゃ', katakana: 'ビャ' }, order: 26 },
  { id: 'combo.pya', section: 'combination', label: { hiragana: 'ぴゃ', katakana: 'ピャ' }, order: 27 },
];

export const SECTION_LABELS: Readonly<Record<KanaGroup['section'], string>> = {
  main: 'Main Kana',
  dakuten: 'Dakuten Kana',
  combination: 'Combination Kana',
};
