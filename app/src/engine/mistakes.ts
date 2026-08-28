import { findKana, kanaForScript } from '../data';
import type { Kana, MistakeEntry, MistakeList, Script } from '../models/types';

/**
 * The mistake-list rules, as pure functions over plain data. No storage and no clock: `now` is a
 * parameter, exactly as the quiz timer is passed into the reducer, so every transition is
 * deterministic under test (Constitution Principle IV, research D5).
 *
 * Persistence lives in `state/mistakeStore.ts`. Keeping the two apart is what makes the rule
 * "three correct in a row clears an entry" provable without stubbing browser storage.
 *
 * See specs/003-mistake-history/data-model.md for the lifecycle this implements.
 */

/** Reaching this many consecutive correct first answers deletes the entry (FR-009). */
export const STREAK_TO_CLEAR = 3;

function isSame(entry: MistakeEntry, kana: Kana): boolean {
  // Identity is (script, kana): ぬ and ヌ are different entries despite sharing a reading, and
  // direction is deliberately not part of it (FR-002).
  return entry.script === kana.script && entry.kana === kana.kana;
}

/**
 * Applies one answered card to the list and returns a new list. Never mutates its input.
 *
 * `firstSubmissionCorrect` must be the learner's *first* answer to the card — not their latest.
 * Passing a later submission is the one way to reintroduce the loophole SC-004 exists to catch:
 * a correction round forces every card to end correctly, so scoring on the final answer would let
 * a learner clear their whole list by answering wrong and copying the answer.
 */
export function applyAnswer(
  list: MistakeList,
  kana: Kana,
  firstSubmissionCorrect: boolean,
  now: string,
): MistakeEntry[] {
  const existing = list.find((entry) => isSame(entry, kana));

  if (!firstSubmissionCorrect) {
    const missed: MistakeEntry = existing
      ? { ...existing, missCount: existing.missCount + 1, streak: 0, lastMissedAt: now }
      : { script: kana.script, kana: kana.kana, missCount: 1, streak: 0, lastMissedAt: now };

    return existing
      ? list.map((entry) => (entry === existing ? missed : entry))
      : [...list, missed];
  }

  // A kana the learner has never missed is not tracked, so a correct answer on it does nothing.
  // Getting あ right forever never creates an あ record (FR-011).
  if (!existing) return [...list];

  // The third consecutive correct first answer is the removal, not a state — a stored entry is
  // never at 3 (FR-009).
  if (existing.streak + 1 >= STREAK_TO_CLEAR) {
    return list.filter((entry) => entry !== existing);
  }

  const advanced: MistakeEntry = {
    ...existing,
    // missCount and lastMissedAt are untouched: they answer "how much has this cost me", which
    // stays true while the learner is working it off.
    streak: (existing.streak + 1) as MistakeEntry['streak'],
  };
  return list.map((entry) => (entry === existing ? advanced : entry));
}

/**
 * Resolves entries to dataset kana for use as a quiz pool. Each result carries its own script,
 * which is what lets a correction round span both (FR-020a, FR-020b).
 *
 * Entries that no longer resolve are omitted silently — a dataset change between releases must
 * not strand the learner with an unusable list (FR-037).
 */
export function toPool(list: MistakeList): Kana[] {
  return list
    .map((entry) => findKana(entry.script, entry.kana))
    .filter((kana): kana is Kana => kana !== undefined);
}

const SCRIPT_ORDER: readonly Script[] = ['hiragana', 'katakana'];

/**
 * Position of every kana in the dataset, used only as the final tiebreak below. Built once.
 */
const DATASET_ORDER: ReadonlyMap<string, number> = new Map(
  SCRIPT_ORDER.flatMap((script, scriptIndex) =>
    kanaForScript(script).map(
      (kana, index) => [`${script}:${kana.kana}`, scriptIndex * 1000 + index] as const,
    ),
  ),
);

/**
 * Display order: most-missed first, then most-recently-missed, then dataset order (FR-017).
 *
 * The list is a to-do list, so the kana costing the learner most belongs at the top. The final
 * tiebreak matters more than it looks — without it, two entries with equal counts can swap places
 * between renders, which reads as a glitch and defeats any test that asserts order.
 *
 * Returns a new array; the caller's list is not reordered.
 */
export function sortEntries(list: MistakeList): MistakeEntry[] {
  return [...list].sort((a, b) => {
    if (a.missCount !== b.missCount) return b.missCount - a.missCount;

    const byRecency = Date.parse(b.lastMissedAt) - Date.parse(a.lastMissedAt);
    if (byRecency !== 0 && !Number.isNaN(byRecency)) return byRecency;

    const orderA = DATASET_ORDER.get(`${a.script}:${a.kana}`) ?? Number.MAX_SAFE_INTEGER;
    const orderB = DATASET_ORDER.get(`${b.script}:${b.kana}`) ?? Number.MAX_SAFE_INTEGER;
    return orderA - orderB;
  });
}
