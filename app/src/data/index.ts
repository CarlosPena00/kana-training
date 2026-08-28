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

const BY_SCRIPT: Readonly<Record<Script, ReadonlyMap<string, Kana>>> = {
  hiragana: new Map(HIRAGANA.map((entry) => [entry.kana, entry])),
  katakana: new Map(KATAKANA.map((entry) => [entry.kana, entry])),
};

/**
 * Resolves a stored (script, kana) pair back to a dataset entry. Returns undefined rather than
 * throwing: callers read these pairs out of local storage, where a dataset change between releases
 * can leave a character that no longer exists. The script is looked up defensively for the same
 * reason — a stored value is not necessarily one of the two literals.
 */
export function findKana(script: Script, kana: string): Kana | undefined {
  return BY_SCRIPT[script]?.get(kana);
}

const KNOWN_GROUP_IDS: ReadonlySet<string> = new Set(GROUPS.map((group) => group.id));

export function isKnownGroupId(value: unknown): value is GroupId {
  return typeof value === 'string' && KNOWN_GROUP_IDS.has(value);
}

export const ALL_MAIN_GROUP_IDS: readonly GroupId[] = groupsForSection('main').map((g) => g.id);
