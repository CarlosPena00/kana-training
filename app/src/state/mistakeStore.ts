import { findKana } from '../data';
import { STREAK_TO_CLEAR } from '../engine/mistakes';
import type { MistakeEntry, MistakeList, Script } from '../models/types';

/**
 * Persistence for the mistake list. Cache-grade data (FR-030): losing it is a normal outcome, not
 * a failure, so every path here has a working answer that does not involve stored data and no
 * function throws.
 *
 * Deliberately a separate key from preferences — a corrupt mistake list must not cost the learner
 * their script and card count, and "delete my history" must not reset them either (FR-038).
 *
 * The rules that decide what goes in here live in `engine/mistakes.ts`, which knows nothing about
 * storage. See specs/003-mistake-history/contracts/mistake-store.md.
 */

export const MISTAKES_KEY = 'kana-training.mistakes';
const VERSION = 1;

const SCRIPTS: readonly Script[] = ['hiragana', 'katakana'];
const MAX_STORED_STREAK = STREAK_TO_CLEAR - 1;

function readRaw(): string | null {
  try {
    // A try/catch, not a null check: Safari private mode and storage-blocking settings make the
    // accessor itself throw.
    return globalThis.localStorage?.getItem(MISTAKES_KEY) ?? null;
  } catch {
    return null;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
}

/** Returns a repaired entry, or null if it cannot be trusted at all. */
function repairEntry(value: unknown): MistakeEntry | null {
  const raw = asRecord(value);
  if (!raw) return null;

  const script = SCRIPTS.find((candidate) => candidate === raw['script']);
  if (!script) return null;

  const kana = raw['kana'];
  // Resolved against the dataset so an entry left behind by a dataset change disappears quietly,
  // exactly as loadPreferences drops group ids it no longer recognizes (FR-037).
  if (typeof kana !== 'string' || findKana(script, kana) === undefined) return null;

  const missCount = raw['missCount'];
  if (typeof missCount !== 'number' || !Number.isInteger(missCount) || missCount < 1) return null;

  // Clamped rather than dropped: a streak at or above the clearing threshold means a write was
  // interrupted between advancing and deleting, and the learner should keep their progress.
  const rawStreak = raw['streak'];
  const streak = typeof rawStreak === 'number' && Number.isInteger(rawStreak) && rawStreak > 0
    ? (Math.min(rawStreak, MAX_STORED_STREAK) as MistakeEntry['streak'])
    : 0;

  // A bad timestamp is a display-order problem, never a reason to lose a real mistake.
  const rawDate = raw['lastMissedAt'];
  const parsed = typeof rawDate === 'string' ? Date.parse(rawDate) : Number.NaN;
  const lastMissedAt = Number.isNaN(parsed) ? new Date(0).toISOString() : new Date(parsed).toISOString();

  return { script, kana, missCount, streak, lastMissedAt };
}

/** Always returns a usable list — never null, never a thrown error. */
export function loadMistakes(): MistakeEntry[] {
  const raw = readRaw();
  if (raw === null) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  const stored = asRecord(parsed);
  // No migration is attempted: there is no prior version to migrate from, and an unreadable store
  // is discarded rather than repaired (FR-035).
  if (!stored || stored['version'] !== VERSION) return [];
  if (!Array.isArray(stored['entries'])) return [];

  // One malformed entry must never invalidate the whole list, so repair is per entry.
  const byIdentity = new Map<string, MistakeEntry>();
  for (const value of stored['entries']) {
    const entry = repairEntry(value);
    if (!entry) continue;

    const identity = `${entry.script}:${entry.kana}`;
    const existing = byIdentity.get(identity);
    if (!existing || entry.missCount > existing.missCount) byIdentity.set(identity, entry);
  }

  return [...byIdentity.values()];
}

export function saveMistakes(list: MistakeList): void {
  try {
    globalThis.localStorage?.setItem(
      MISTAKES_KEY,
      JSON.stringify({
        version: VERSION,
        entries: list.map((entry) => ({
          script: entry.script,
          kana: entry.kana,
          missCount: entry.missCount,
          streak: entry.streak,
          lastMissedAt: entry.lastMissedAt,
        })),
      }),
    );
  } catch {
    // A failed write must never interrupt the quiz in progress (FR-036), and the learner is never
    // asked to do anything about it (FR-034).
  }
}

export function clearMistakes(): void {
  try {
    globalThis.localStorage?.removeItem(MISTAKES_KEY);
  } catch {
    // Nothing to do — the list is a cache.
  }
}
