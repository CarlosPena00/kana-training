import type { KanaGroup, Script } from '../models/types';
import './GroupToggle.css';

interface Props {
  readonly group: KanaGroup;
  readonly script: Script;
  readonly count: number;
  readonly selected: boolean;
  readonly onToggle: () => void;
}

/** One selectable group tile, showing its representative kana for the current script. */
export function GroupToggle({ group, script, count, selected, onToggle }: Props) {
  return (
    <label className={`group-toggle${selected ? ' group-toggle--selected' : ''}`}>
      <input
        type="checkbox"
        className="visually-hidden"
        checked={selected}
        onChange={onToggle}
      />
      <span className="group-toggle__kana" lang="ja">
        {group.label[script]}
      </span>
      <span className="group-toggle__count">
        {count} kana
      </span>
    </label>
  );
}
