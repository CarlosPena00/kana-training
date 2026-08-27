import { useEffect, useRef } from 'react';
import { GroupToggle } from './GroupToggle';
import type { GroupId, KanaGroup, Kana, Script } from '../models/types';
import './GroupSection.css';

interface Props {
  readonly title: string;
  readonly selectAllLabel: string;
  readonly groups: readonly KanaGroup[];
  readonly script: Script;
  readonly pool: readonly Kana[];
  readonly selectedGroupIds: readonly GroupId[];
  readonly onToggleGroup: (groupId: GroupId) => void;
  readonly onSetSection: (groupIds: readonly GroupId[], selected: boolean) => void;
}

/** A titled section with a select-all control that reflects all / none / partial state (FR-009). */
export function GroupSection({
  title,
  selectAllLabel,
  groups,
  script,
  pool,
  selectedGroupIds,
  onToggleGroup,
  onSetSection,
}: Props) {
  const ids = groups.map((group) => group.id);
  const selectedCount = ids.filter((id) => selectedGroupIds.includes(id)).length;
  const allSelected = selectedCount === ids.length;
  const someSelected = selectedCount > 0 && !allSelected;

  const selectAllRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someSelected;
  }, [someSelected]);

  const countFor = (groupId: GroupId) => pool.filter((kana) => kana.groupId === groupId).length;

  return (
    <section className="group-section">
      <div className="group-section__header">
        <h2 className="section-title">{title}</h2>
        <label className="group-section__select-all">
          <input
            ref={selectAllRef}
            type="checkbox"
            checked={allSelected}
            onChange={() => onSetSection(ids, !allSelected)}
          />
          <span>{selectAllLabel}</span>
        </label>
      </div>

      <div className="group-section__grid">
        {groups.map((group) => (
          <GroupToggle
            key={group.id}
            group={group}
            script={script}
            count={countFor(group.id)}
            selected={selectedGroupIds.includes(group.id)}
            onToggle={() => onToggleGroup(group.id)}
          />
        ))}
      </div>
    </section>
  );
}
