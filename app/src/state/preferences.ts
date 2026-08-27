import { buildPool } from '../engine/pool';
import { isKnownGroupId } from '../data';
import { DEFAULT_CONFIGURATION } from './quizReducer';
import type { AttemptsAllowed, DirectionSetting, GroupId, QuizConfiguration, Script } from '../models/types';

/**
 * Preferences are a convenience, never a dependency: the app must work when this storage is
 * missing, unreadable, or cleared (FR-037). Every path here has a working answer that does not
 * involve stored data.
 */

export const PREFERENCES_KEY = 'kana-training.preferences';
const VERSION = 1;

const SCRIPTS: readonly Script[] = ['hiragana', 'katakana'];
const DIRECTIONS: readonly DirectionSetting[] = ['kana-to-romaji', 'romaji-to-kana', 'both'];
const ATTEMPTS: readonly AttemptsAllowed[] = [1, 3];

function readRaw(): string | null {
  try {
    // A try/catch, not a null check: Safari private mode and storage-blocking settings make the
    // accessor itself throw.
    return globalThis.localStorage?.getItem(PREFERENCES_KEY) ?? null;
  } catch {
    return null;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
}

export function loadPreferences(): QuizConfiguration {
  const raw = readRaw();
  if (raw === null) return DEFAULT_CONFIGURATION;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return DEFAULT_CONFIGURATION;
  }

  const stored = asRecord(parsed);
  if (!stored || stored['version'] !== VERSION) return DEFAULT_CONFIGURATION;

  // Field-by-field repair: each field falls back independently, and repair is never surfaced
  // to the learner as an error.
  const script = SCRIPTS.find((candidate) => candidate === stored['script']) ?? DEFAULT_CONFIGURATION.script;
  const direction =
    DIRECTIONS.find((candidate) => candidate === stored['direction']) ?? DEFAULT_CONFIGURATION.direction;

  const storedGroups = Array.isArray(stored['selectedGroupIds']) ? stored['selectedGroupIds'] : [];
  const known: GroupId[] = storedGroups.filter(isKnownGroupId);
  const selectedGroupIds = known.length > 0 ? known : [...DEFAULT_CONFIGURATION.selectedGroupIds];

  const poolSize = buildPool(script, selectedGroupIds).length;
  const storedCount = stored['cardCount'];
  const validCount = typeof storedCount === 'number' && Number.isInteger(storedCount) && storedCount >= 1;
  // Clamped rather than refused: a stored count must never produce an unstartable configuration.
  const cardCount = Math.min(validCount ? storedCount : DEFAULT_CONFIGURATION.cardCount, Math.max(poolSize, 1));

  const attemptsAllowed =
    ATTEMPTS.find((candidate) => candidate === stored['attemptsAllowed']) ??
    DEFAULT_CONFIGURATION.attemptsAllowed;

  return { script, selectedGroupIds, cardCount, direction, attemptsAllowed };
}

export function savePreferences(config: QuizConfiguration): void {
  try {
    globalThis.localStorage?.setItem(
      PREFERENCES_KEY,
      JSON.stringify({
        version: VERSION,
        script: config.script,
        selectedGroupIds: config.selectedGroupIds,
        cardCount: config.cardCount,
        direction: config.direction,
        attemptsAllowed: config.attemptsAllowed,
      }),
    );
  } catch {
    // A failed save must never interrupt the quiz that is about to start.
  }
}

export function clearPreferences(): void {
  try {
    globalThis.localStorage?.removeItem(PREFERENCES_KEY);
  } catch {
    // Nothing to do — the preference is a convenience.
  }
}
