import { describe, expect, it } from 'vitest';
import { isBlank, normalizeAnswer } from '../../src/engine/normalize';

describe('normalizeAnswer', () => {
  it('trims ASCII whitespace (FR-026)', () => {
    expect(normalizeAnswer('  a  ')).toBe('a');
    expect(normalizeAnswer('\ta\n')).toBe('a');
  });

  it('trims the full-width space U+3000, which a Japanese IME produces', () => {
    expect(normalizeAnswer('　あ　')).toBe('あ');
  });

  it('lowercases romaji (FR-025) and leaves kana untouched', () => {
    expect(normalizeAnswer('SHI')).toBe('shi');
    expect(normalizeAnswer('Ka')).toBe('ka');
    expect(normalizeAnswer('カ')).toBe('カ');
  });

  it('NFC-normalizes, so a decomposed IME kana equals the composed dataset kana', () => {
    const decomposed = 'が'; // か + combining dakuten
    expect(normalizeAnswer(decomposed)).toBe('が');
    expect(decomposed).not.toBe('が');
  });

  it('does not strip internal spacing or translate romanization systems (FR-005)', () => {
    expect(normalizeAnswer('k a')).toBe('k a');
    expect(normalizeAnswer('si')).toBe('si');
  });
});

describe('isBlank (FR-023)', () => {
  it('detects empty and whitespace-only input', () => {
    expect(isBlank('')).toBe(true);
    expect(isBlank('   ')).toBe(true);
    expect(isBlank('　')).toBe(true);
    expect(isBlank('\t\n')).toBe(true);
  });

  it('does not treat real answers as blank', () => {
    expect(isBlank('a')).toBe(false);
    expect(isBlank(' あ ')).toBe(false);
  });
});
