import type { GroupId, Kana } from '../models/types';

/**
 * The complete Hiragana inventory: 46 main + 25 dakuten/handakuten + 36 combination = 107.
 * Romaji follows the canonical mapping in specs/001-kana-flashcards/contracts/kana-dataset.md —
 * note `di` for ぢ, `du` for づ, and `wo` for を, which keep the kana↔romaji mapping one-to-one.
 */
const ROWS: ReadonlyArray<readonly [GroupId, ReadonlyArray<readonly [string, string]>]> = [
  ['main.a', [['あ', 'a'], ['い', 'i'], ['う', 'u'], ['え', 'e'], ['お', 'o']]],
  ['main.ka', [['か', 'ka'], ['き', 'ki'], ['く', 'ku'], ['け', 'ke'], ['こ', 'ko']]],
  ['main.sa', [['さ', 'sa'], ['し', 'shi'], ['す', 'su'], ['せ', 'se'], ['そ', 'so']]],
  ['main.ta', [['た', 'ta'], ['ち', 'chi'], ['つ', 'tsu'], ['て', 'te'], ['と', 'to']]],
  ['main.na', [['な', 'na'], ['に', 'ni'], ['ぬ', 'nu'], ['ね', 'ne'], ['の', 'no']]],
  ['main.ha', [['は', 'ha'], ['ひ', 'hi'], ['ふ', 'fu'], ['へ', 'he'], ['ほ', 'ho']]],
  ['main.ma', [['ま', 'ma'], ['み', 'mi'], ['む', 'mu'], ['め', 'me'], ['も', 'mo']]],
  ['main.ya', [['や', 'ya'], ['ゆ', 'yu'], ['よ', 'yo']]],
  ['main.ra', [['ら', 'ra'], ['り', 'ri'], ['る', 'ru'], ['れ', 're'], ['ろ', 'ro']]],
  ['main.wa', [['わ', 'wa'], ['を', 'wo'], ['ん', 'n']]],

  ['dakuten.ga', [['が', 'ga'], ['ぎ', 'gi'], ['ぐ', 'gu'], ['げ', 'ge'], ['ご', 'go']]],
  ['dakuten.za', [['ざ', 'za'], ['じ', 'ji'], ['ず', 'zu'], ['ぜ', 'ze'], ['ぞ', 'zo']]],
  ['dakuten.da', [['だ', 'da'], ['ぢ', 'di'], ['づ', 'du'], ['で', 'de'], ['ど', 'do']]],
  ['dakuten.ba', [['ば', 'ba'], ['び', 'bi'], ['ぶ', 'bu'], ['べ', 'be'], ['ぼ', 'bo']]],
  ['dakuten.pa', [['ぱ', 'pa'], ['ぴ', 'pi'], ['ぷ', 'pu'], ['ぺ', 'pe'], ['ぽ', 'po']]],

  ['combo.kya', [['きゃ', 'kya'], ['きゅ', 'kyu'], ['きょ', 'kyo']]],
  ['combo.sha', [['しゃ', 'sha'], ['しゅ', 'shu'], ['しょ', 'sho']]],
  ['combo.cha', [['ちゃ', 'cha'], ['ちゅ', 'chu'], ['ちょ', 'cho']]],
  ['combo.nya', [['にゃ', 'nya'], ['にゅ', 'nyu'], ['にょ', 'nyo']]],
  ['combo.hya', [['ひゃ', 'hya'], ['ひゅ', 'hyu'], ['ひょ', 'hyo']]],
  ['combo.mya', [['みゃ', 'mya'], ['みゅ', 'myu'], ['みょ', 'myo']]],
  ['combo.rya', [['りゃ', 'rya'], ['りゅ', 'ryu'], ['りょ', 'ryo']]],
  ['combo.gya', [['ぎゃ', 'gya'], ['ぎゅ', 'gyu'], ['ぎょ', 'gyo']]],
  ['combo.ja', [['じゃ', 'ja'], ['じゅ', 'ju'], ['じょ', 'jo']]],
  ['combo.dya', [['ぢゃ', 'dya'], ['ぢゅ', 'dyu'], ['ぢょ', 'dyo']]],
  ['combo.bya', [['びゃ', 'bya'], ['びゅ', 'byu'], ['びょ', 'byo']]],
  ['combo.pya', [['ぴゃ', 'pya'], ['ぴゅ', 'pyu'], ['ぴょ', 'pyo']]],
];

export const HIRAGANA: readonly Kana[] = ROWS.flatMap(([groupId, pairs]) =>
  pairs.map(([kana, romaji]): Kana => ({ kana, romaji, script: 'hiragana', groupId })),
);
