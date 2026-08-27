import type { GroupId, Kana, KanaGroup, Script, Section } from '../models/types';
import { GROUPS } from './groups';
import { HIRAGANA } from './hiragana';
import { KATAKANA } from './katakana';

export { GROUPS, SECTION_LABELS } from './groups';
export { HIRAGANA } from './hiragana';
export { KATAKANA } from './katakana';

/** Lookup only — no quiz logic lives in the data layer. */
export function kanaForScript(script: Script): readonly Kana[] {
  return script === 'hiragana' ? HIRAGANA : KATAKANA;
}

export function groupsForSection(section: Section): readonly KanaGroup[] {
  return GROUPS.filter((group) => group.section === section);
}

const KNOWN_GROUP_IDS: ReadonlySet<string> = new Set(GROUPS.map((group) => group.id));

export function isKnownGroupId(value: unknown): value is GroupId {
  return typeof value === 'string' && KNOWN_GROUP_IDS.has(value);
}

export const ALL_MAIN_GROUP_IDS: readonly GroupId[] = groupsForSection('main').map((g) => g.id);
