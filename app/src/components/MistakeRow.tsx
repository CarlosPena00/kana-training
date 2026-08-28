import { STREAK_TO_CLEAR } from '../engine/mistakes';
import type { Kana, MistakeEntry } from '../models/types';
import './MistakeRow.css';

interface Props {
  readonly entry: MistakeEntry;
  readonly kana: Kana;
}

const SCRIPT_LABEL: Readonly<Record<string, string>> = {
  hiragana: 'Hiragana',
  katakana: 'Katakana',
};

/**
 * One entry on the mistake list: the kana, its reading, how often it has been missed, and how
 * close it is to being cleared (FR-015).
 *
 * There is deliberately no delete control here. An entry leaves the list by being answered
 * correctly three times in a row, or not at all (FR-013a) — a list the learner can curate is no
 * longer an honest record of what they do not know.
 */
export function MistakeRow({ entry, kana }: Props) {
  const remaining = STREAK_TO_CLEAR - entry.streak;

  return (
    <li className="mistake-row">
      <span className="mistake-row__kana" lang="ja">
        {entry.kana}
      </span>

      <span className="mistake-row__detail">
        <span className="mistake-row__romaji">{kana.romaji}</span>
        {/* Script is spelled out rather than implied by the glyph: ぬ and ヌ are separate
            entries, and the learner has to be able to tell which one they are looking at
            (FR-016). */}
        <span className="mistake-row__script">{SCRIPT_LABEL[entry.script] ?? entry.script}</span>
      </span>

      <span className="mistake-row__stats">
        <span className="mistake-row__misses">
          Missed {entry.missCount} {entry.missCount === 1 ? 'time' : 'times'}
        </span>

        {/* Pips are decoration; the text beside them carries the meaning, so the progress is not
            conveyed by shape or color alone (WCAG 1.4.1). */}
        <span className="mistake-row__progress">
          <span className="mistake-row__pips" aria-hidden="true">
            {Array.from({ length: STREAK_TO_CLEAR }, (_, index) => (
              <span
                key={index}
                className={
                  index < entry.streak ? 'mistake-row__pip mistake-row__pip--on' : 'mistake-row__pip'
                }
              />
            ))}
          </span>
          <span className="mistake-row__progress-text">
            {entry.streak} of {STREAK_TO_CLEAR} — {remaining} more in a row to clear
          </span>
        </span>
      </span>
    </li>
  );
}
