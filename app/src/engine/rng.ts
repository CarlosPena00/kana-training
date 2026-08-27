/**
 * Randomness, injected. Nothing in the engine reads a global random source, so every generated
 * quiz is reproducible in tests (Constitution Principle IV, research.md D5).
 */

/** Uniform in [0, 1) — the same shape as Math.random. */
export type Rng = () => number;

export const defaultRng: Rng = Math.random;

/** Small, well-known seeded generator. Six lines of arithmetic instead of a dependency. */
export function mulberry32(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates over a copy. Sampling without replacement is what makes FR-016 structural. */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const a = result[i]!;
    const b = result[j]!;
    result[i] = b;
    result[j] = a;
  }
  return result;
}
