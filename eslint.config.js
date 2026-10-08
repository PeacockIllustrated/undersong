import js from '@eslint/js';
import tseslint from 'typescript-eslint';

const impure = [
  { name: 'Date', message: 'Use ctx.now — src/sim and src/world must be pure (dev-bible §1.3).' },
  { name: 'document', message: 'No DOM in src/sim or src/world.' },
  { name: 'window', message: 'No DOM in src/sim or src/world.' },
  { name: 'localStorage', message: 'No storage in src/sim or src/world.' },
  { name: 'performance', message: 'No clocks in src/sim or src/world.' },
];

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'docs/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    files: ['src/sim/**/*.ts', 'src/world/**/*.ts', 'src/co/sim/**/*.ts'],
    rules: {
      'no-restricted-globals': ['error', ...impure],
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'Use ctx.rng (dev-bible §1.3).' },
      ],
    },
  },
);
