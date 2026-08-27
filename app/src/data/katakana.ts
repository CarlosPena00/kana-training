import type { GroupId, Kana } from '../models/types';

/**
 * The complete Katakana inventory: 46 main + 25 dakuten/handakuten + 36 combination = 107.
 * Written out literally rather than derived from Hiragana by code-point arithmetic — a derivation
 * would produce the wrong result for the combination kana and would make a single-character
 * correction impossible to express (contracts/kana-dataset.md).
 */
const ROWS: ReadonlyArray<readonly [GroupId, ReadonlyArray<readonly [string, string]>]> = [
  ['main.a', [['ア', 'a'], ['イ', 'i'], ['ウ', 'u'], ['エ', 'e'], ['オ', 'o']]],
  ['main.ka', [['カ', 'ka'], ['キ', 'ki'], ['ク', 'ku'], ['ケ', 'ke'], ['コ', 'ko']]],
  ['main.sa', [['サ', 'sa'], ['シ', 'shi'], ['ス', 'su'], ['セ', 'se'], ['ソ', 'so']]],
  ['main.ta', [['タ', 'ta'], ['チ', 'chi'], ['ツ', 'tsu'], ['テ', 'te'], ['ト', 'to']]],
  ['main.na', [['ナ', 'na'], ['ニ', 'ni'], ['ヌ', 'nu'], ['ネ', 'ne'], ['ノ', 'no']]],
  ['main.ha', [['ハ', 'ha'], ['ヒ', 'hi'], ['フ', 'fu'], ['ヘ', 'he'], ['ホ', 'ho']]],
  ['main.ma', [['マ', 'ma'], ['ミ', 'mi'], ['ム', 'mu'], ['メ', 'me'], ['モ', 'mo']]],
  ['main.ya', [['ヤ', 'ya'], ['ユ', 'yu'], ['ヨ', 'yo']]],
  ['main.ra', [['ラ', 'ra'], ['リ', 'ri'], ['ル', 'ru'], ['レ', 're'], ['ロ', 'ro']]],
  ['main.wa', [['ワ', 'wa'], ['ヲ', 'wo'], ['ン', 'n']]],

  ['dakuten.ga', [['ガ', 'ga'], ['ギ', 'gi'], ['グ', 'gu'], ['ゲ', 'ge'], ['ゴ', 'go']]],
  ['dakuten.za', [['ザ', 'za'], ['ジ', 'ji'], ['ズ', 'zu'], ['ゼ', 'ze'], ['ゾ', 'zo']]],
  ['dakuten.da', [['ダ', 'da'], ['ヂ', 'di'], ['ヅ', 'du'], ['デ', 'de'], ['ド', 'do']]],
  ['dakuten.ba', [['バ', 'ba'], ['ビ', 'bi'], ['ブ', 'bu'], ['ベ', 'be'], ['ボ', 'bo']]],
  ['dakuten.pa', [['パ', 'pa'], ['ピ', 'pi'], ['プ', 'pu'], ['ペ', 'pe'], ['ポ', 'po']]],

  ['combo.kya', [['キャ', 'kya'], ['キュ', 'kyu'], ['キョ', 'kyo']]],
  ['combo.sha', [['シャ', 'sha'], ['シュ', 'shu'], ['ショ', 'sho']]],
  ['combo.cha', [['チャ', 'cha'], ['チュ', 'chu'], ['チョ', 'cho']]],
  ['combo.nya', [['ニャ', 'nya'], ['ニュ', 'nyu'], ['ニョ', 'nyo']]],
  ['combo.hya', [['ヒャ', 'hya'], ['ヒュ', 'hyu'], ['ヒョ', 'hyo']]],
  ['combo.mya', [['ミャ', 'mya'], ['ミュ', 'myu'], ['ミョ', 'myo']]],
  ['combo.rya', [['リャ', 'rya'], ['リュ', 'ryu'], ['リョ', 'ryo']]],
  ['combo.gya', [['ギャ', 'gya'], ['ギュ', 'gyu'], ['ギョ', 'gyo']]],
  ['combo.ja', [['ジャ', 'ja'], ['ジュ', 'ju'], ['ジョ', 'jo']]],
  ['combo.dya', [['ヂャ', 'dya'], ['ヂュ', 'dyu'], ['ヂョ', 'dyo']]],
  ['combo.bya', [['ビャ', 'bya'], ['ビュ', 'byu'], ['ビョ', 'byo']]],
  ['combo.pya', [['ピャ', 'pya'], ['ピュ', 'pyu'], ['ピョ', 'pyo']]],
];

export const KATAKANA: readonly Kana[] = ROWS.flatMap(([groupId, pairs]) =>
  pairs.map(([kana, romaji]): Kana => ({ kana, romaji, script: 'katakana', groupId })),
);
