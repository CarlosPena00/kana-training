import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', 'dev-dist/**', 'node_modules/**', 'android/**', 'ios/**', 'coverage/**', 'test-results/**', 'playwright-report/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Constitution Principle IV, enforced by tooling rather than by review:
    // the quiz engine must be runnable without a UI, so it may not reach into one.
    files: ['src/engine/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [{ name: 'react', message: 'The engine must stay UI-free (Constitution Principle IV).' }],
          patterns: [
            {
              group: ['**/screens/**', '**/components/**', '**/state/**', 'react-dom*'],
              message: 'The engine must stay UI-free (Constitution Principle IV).',
            },
          ],
        },
      ],
    },
  },
);
