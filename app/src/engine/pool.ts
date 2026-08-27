import { isKnownGroupId, kanaForScript } from '../data';
import type { GroupId, Kana, QuizConfiguration, Script, ValidationResult } from '../models/types';

/**
 * Resolves a selection into the kana it stands for, and answers the single question
 * "can this quiz start?" for both the UI and the generator — so the two cannot disagree.
 */

export function buildPool(script: Script, selectedGroupIds: readonly GroupId[]): Kana[] {
  const selected = new Set(selectedGroupIds.filter(isKnownGroupId));
  return kanaForScript(script).filter((entry) => selected.has(entry.groupId));
}

export function validateConfiguration(config: QuizConfiguration): ValidationResult {
  const poolSize = buildPool(config.script, config.selectedGroupIds).length;

  if (poolSize === 0) return { ok: false, poolSize, error: 'NO_KANA_SELECTED' };
  if (!Number.isInteger(config.cardCount)) return { ok: false, poolSize, error: 'CARD_COUNT_NOT_INTEGER' };
  if (config.cardCount < 1) return { ok: false, poolSize, error: 'CARD_COUNT_TOO_LOW' };
  if (config.cardCount > poolSize) return { ok: false, poolSize, error: 'CARD_COUNT_EXCEEDS_POOL' };

  return { ok: true, poolSize };
}
