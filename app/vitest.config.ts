import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['tests/engine/**/*.test.ts', 'tests/data/**/*.test.ts', 'tests/state/**/*.test.ts'],
    exclude: ['tests/e2e/**'],
    environment: 'node',
  },
});
