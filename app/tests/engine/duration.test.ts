import { describe, expect, it } from 'vitest';
import { formatDuration, formatPerCard } from '../../src/engine/duration';

describe('formatDuration', () => {
  it('keeps a decimal under ten seconds, so a fast run never reads as zero', () => {
    expect(formatDuration(0)).toBe('0.0s');
    expect(formatDuration(400)).toBe('0.4s');
    expect(formatDuration(1_400)).toBe('1.4s');
    expect(formatDuration(9_940)).toBe('9.9s');
  });

  it('shows whole seconds from ten seconds to a minute', () => {
    expect(formatDuration(9_960)).toBe('10s');
    expect(formatDuration(42_000)).toBe('42s');
    expect(formatDuration(59_400)).toBe('59s');
  });

  it('switches to minutes and seconds at a minute', () => {
    expect(formatDuration(60_000)).toBe('1:00');
    expect(formatDuration(83_000)).toBe('1:23');
    expect(formatDuration(127_000)).toBe('2:07');
    expect(formatDuration(3_600_000)).toBe('60:00');
  });

  it('pads the seconds so the digits line up', () => {
    expect(formatDuration(65_000)).toBe('1:05');
  });

  it('never shows a negative duration', () => {
    expect(formatDuration(-5_000)).toBe('0.0s');
  });
});

describe('formatPerCard', () => {
  it('keeps one decimal while answers are quick', () => {
    expect(formatPerCard(900)).toBe('0.9s');
    expect(formatPerCard(8_300)).toBe('8.3s');
  });

  it('drops the decimal once it stops being useful', () => {
    expect(formatPerCard(12_400)).toBe('12s');
    expect(formatPerCard(65_000)).toBe('65s');
  });

  it('never shows a negative duration', () => {
    expect(formatPerCard(-1)).toBe('0.0s');
  });
});

describe('formatPerCard at the ten-second boundary', () => {
  it('does not render a rounded-up value in the decimal format', () => {
    // 9.96s rounds to 10.0, which belongs in the whole-second format, not "10.0s".
    expect(formatPerCard(9_960)).toBe('10s');
    expect(formatPerCard(9_999)).toBe('10s');
  });

  it('still uses a decimal just below the boundary', () => {
    expect(formatPerCard(9_940)).toBe('9.9s');
  });

  it('is continuous across the boundary', () => {
    expect(formatPerCard(10_000)).toBe('10s');
    expect(formatPerCard(10_400)).toBe('10s');
  });
});
