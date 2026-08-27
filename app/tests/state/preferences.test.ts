import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PREFERENCES_KEY,
  clearPreferences,
  loadPreferences,
  savePreferences,
} from '../../src/state/preferences';
import { DEFAULT_CONFIGURATION } from '../../src/state/quizReducer';
import type { QuizConfiguration } from '../../src/models/types';

/**
 * A storage double stands in for localStorage. Tests run in the node environment, and real
 * browsers throw from the accessor itself in private mode — so the seam has to be injectable.
 */
class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length() { return this.data.size; }
  clear() { this.data.clear(); }
  getItem(key: string) { return this.data.get(key) ?? null; }
  key(index: number) { return [...this.data.keys()][index] ?? null; }
  removeItem(key: string) { this.data.delete(key); }
  setItem(key: string, value: string) { this.data.set(key, value); }
}

const throwingStorage = (): Storage =>
  new Proxy({} as Storage, {
    get() {
      throw new DOMException('storage is not available', 'SecurityError');
    },
  });

let storage: MemoryStorage;

beforeEach(() => {
  storage = new MemoryStorage();
  vi.stubGlobal('localStorage', storage);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const store = (value: unknown) => storage.setItem(PREFERENCES_KEY, JSON.stringify(value));

const valid = {
  version: 1,
  script: 'katakana',
  selectedGroupIds: ['main.ka', 'main.sa'],
  cardCount: 6,
  direction: 'kana-to-romaji',
  attemptsAllowed: 3,
};

describe('loadPreferences', () => {
  it('returns defaults when nothing is stored', () => {
    expect(loadPreferences()).toEqual(DEFAULT_CONFIGURATION);
  });

  it('returns defaults for malformed JSON without throwing', () => {
    storage.setItem(PREFERENCES_KEY, '{not json');
    expect(loadPreferences()).toEqual(DEFAULT_CONFIGURATION);
  });

  it('returns defaults for a missing or unknown version', () => {
    store({ ...valid, version: 0 });
    expect(loadPreferences()).toEqual(DEFAULT_CONFIGURATION);
    store({ script: 'katakana' });
    expect(loadPreferences()).toEqual(DEFAULT_CONFIGURATION);
  });

  it('restores a valid stored configuration', () => {
    store(valid);
    expect(loadPreferences()).toEqual({
      script: 'katakana',
      selectedGroupIds: ['main.ka', 'main.sa'],
      cardCount: 6,
      direction: 'kana-to-romaji',
      attemptsAllowed: 3,
    });
  });

  it('drops unknown group ids and keeps the valid ones', () => {
    store({ ...valid, selectedGroupIds: ['main.ka', 'main.removed', 'combo.kya'] });
    expect(loadPreferences().selectedGroupIds).toEqual(['main.ka', 'combo.kya']);
  });

  it('falls back to the default selection when every stored group id is unknown', () => {
    store({ ...valid, selectedGroupIds: ['nope.one', 'nope.two'] });
    expect(loadPreferences().selectedGroupIds).toEqual(DEFAULT_CONFIGURATION.selectedGroupIds);
  });

  it('clamps a card count above the current pool so the configuration stays startable', () => {
    store({ ...valid, selectedGroupIds: ['main.ka'], cardCount: 40 });
    expect(loadPreferences().cardCount).toBe(5);
  });

  it('falls back to the default card count for nonsense values', () => {
    for (const cardCount of [0, -1, 2.5, '10', null]) {
      store({ ...valid, cardCount });
      expect(loadPreferences().cardCount).toBe(DEFAULT_CONFIGURATION.cardCount);
    }
  });

  it('falls back to one attempt when the stored value is not 1 or 3', () => {
    store({ ...valid, attemptsAllowed: 7 });
    expect(loadPreferences().attemptsAllowed).toBe(1);
    store({ ...valid, attemptsAllowed: '3' });
    expect(loadPreferences().attemptsAllowed).toBe(1);
  });

  it('falls back for an unknown script or direction', () => {
    store({ ...valid, script: 'kanji', direction: 'sideways' });
    const loaded = loadPreferences();
    expect(loaded.script).toBe(DEFAULT_CONFIGURATION.script);
    expect(loaded.direction).toBe(DEFAULT_CONFIGURATION.direction);
  });

  it('returns defaults when the storage accessor itself throws', () => {
    vi.stubGlobal('localStorage', throwingStorage());
    expect(loadPreferences()).toEqual(DEFAULT_CONFIGURATION);
  });
});

describe('savePreferences', () => {
  it('round-trips a configuration', () => {
    const configuration: QuizConfiguration = {
      script: 'katakana',
      selectedGroupIds: ['dakuten.ga'],
      cardCount: 5,
      direction: 'romaji-to-kana',
      attemptsAllowed: 3,
    };
    savePreferences(configuration);
    expect(loadPreferences()).toEqual(configuration);
  });

  it('never throws when storage is unavailable', () => {
    vi.stubGlobal('localStorage', throwingStorage());
    expect(() => savePreferences(DEFAULT_CONFIGURATION)).not.toThrow();
    expect(() => clearPreferences()).not.toThrow();
  });
});

describe('clearPreferences', () => {
  it('removes the stored value', () => {
    savePreferences(DEFAULT_CONFIGURATION);
    clearPreferences();
    expect(storage.getItem(PREFERENCES_KEY)).toBeNull();
  });
});
