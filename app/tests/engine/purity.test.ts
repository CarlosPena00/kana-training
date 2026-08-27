import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Constitution Principle IV (NON-NEGOTIABLE): the engine must be runnable and testable without a UI.
 * The ESLint rule in eslint.config.js enforces this while editing; this test enforces it in CI.
 */
const ENGINE_DIR = join(import.meta.dirname, '../../src/engine');
const FORBIDDEN = [/from ['"]react/, /from ['"].*\/screens\//, /from ['"].*\/components\//, /from ['"].*\/state\//];

describe('engine purity', () => {
  const files = readdirSync(ENGINE_DIR).filter((f) => f.endsWith('.ts'));

  it('has engine modules to check', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)('%s imports no UI, screen, component, or state module', (file) => {
    const source = readFileSync(join(ENGINE_DIR, file), 'utf-8');
    for (const pattern of FORBIDDEN) expect(source).not.toMatch(pattern);
  });

  it.each(files)('%s does not reach for browser or ambient globals', (file) => {
    const source = readFileSync(join(ENGINE_DIR, file), 'utf-8');
    for (const global of ['localStorage', 'window.', 'document.', 'Date.now', 'crypto.']) {
      expect(source).not.toContain(global);
    }
  });
});
