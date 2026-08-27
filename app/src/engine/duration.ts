/**
 * Duration formatting. Pure string work — no clock is read here, which is what keeps the engine
 * testable without freezing time (Constitution Principle IV).
 */

/**
 * Total elapsed time: a decimal under ten seconds, whole seconds up to a minute, m:ss above.
 *
 * The decimal band matters because it keeps the total consistent with the per-card average beside
 * it — without it a one-card quiz answered in 0.8s reads "0s total, 0.8s per card", which looks
 * like a broken clock rather than a fast answer.
 */
export function formatDuration(ms: number): string {
  const exact = Math.max(ms, 0) / 1000;
  const rounded = Math.round(exact * 10) / 10;
  if (rounded < 10) return `${rounded.toFixed(1)}s`;

  const totalSeconds = Math.round(exact);
  if (totalSeconds < 60) return `${totalSeconds}s`;

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/** Average per card. A decimal matters at 8.3s and stops mattering at 12s. */
export function formatPerCard(ms: number): string {
  const seconds = Math.max(ms, 0) / 1000;
  // Round first, then choose the format: deciding on the raw value lets 9.96s take the decimal
  // branch and render as "10.0s", the very shape the branch exists to avoid.
  const rounded = Math.round(seconds * 10) / 10;
  return rounded < 10 ? `${rounded.toFixed(1)}s` : `${Math.round(seconds)}s`;
}
