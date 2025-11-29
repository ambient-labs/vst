import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import prettier from 'eslint-config-prettier';

export default [
  eslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      curly: 'error',
      semi: 'error',
    },
  },
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      curly: 'error',
      semi: 'error',
    },
  },
  {
    files: ['dsp/**/*.js', 'packages/dsp/**/*.js'],
    languageOptions: {
      globals: {
        console: 'readonly',
        __postNativeMessage__: 'readonly',
      },
    },
  },
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: {
        // zx globals
        $: 'readonly',
        cd: 'readonly',
        echo: 'readonly',
        fs: 'readonly',
        path: 'readonly',
        argv: 'readonly',
        __dirname: 'readonly',
      },
    },
  },
  {
    files: ['scripts/**/*.ts'],
    languageOptions: {
      globals: {
        // Node.js globals
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
      },
    },
  },
  prettier,
  {
    ignores: [
      'node_modules/',
      'dist/',
      '**/dist/',
      'native/',
      'public/',
      '**/public/',
      'pnpm-lock.yaml',
      '.devcontainer/',
      '.wireit/',
      '.worktrees/',
    ],
  },
];
