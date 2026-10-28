import js from '@eslint/js';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist', 'node_modules', 'src/generated']),
  {
    files: ['src/**/*.ts'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.node,
      // VS Code's ESLint server loads client + server configs in one process; without this,
      // typescript-eslint sees two candidate roots and refuses to parse any server file
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      // External packages, blank line, then `@/` aliases (regionify server order)
      'simple-import-sort/imports': [
        'error',
        { groups: [['^node:', '^@?\\w'], ['^@/'], ['^\\.']] },
      ],
      'simple-import-sort/exports': 'error',

      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      // `declare global { namespace Express {} }` is the documented way to extend Request
      '@typescript-eslint/no-namespace': ['error', { allowDeclarations: true }],

      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
]);
