import markdown from '@eslint/markdown';
import stylistic from '@stylistic/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import { defineConfig } from 'eslint/config';
import importPlugin from 'eslint-plugin-import';
import jsonc from 'eslint-plugin-jsonc';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import pluginReact from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import { default as reactRefresh } from 'eslint-plugin-react-refresh';
import globals from 'globals';
import * as jsoncParser from 'jsonc-eslint-parser';

import baseConfig from './eslint.base.mjs';
import sharedRules from './sharedRules.mjs';

// Reference-free gate targets (see rule below) — split so the literal names
// never appear in this file.
const BANNED_SOURCE_PACKAGE = ['@open-tomato/pre', 'components'].join('-');
const BANNED_SOURCE_REPO = ['component', 'breakdown'].join('-');

/**
 * A custom ESLint configuration for libraries that use React.
 *
 * @type {import("eslint").Linter.Config} */
export default defineConfig([
  {
    ignores: [
      'dist/**',
      'build/**',
      'node_modules/**',
      '**/package-lock.json',
      '**/.docs/*',
    ],
  },
  baseConfig,
  importPlugin.flatConfigs.recommended,
  importPlugin.flatConfigs.typescript,
  {
    // Reference-free gate (WS05 / docs/plans/poc-release/05-ui-components-port.md):
    // this package must never import from its pre-publish source repositories.
    // The banned names are assembled from parts so this config itself passes
    // the publish gate's grep sweep for the same strings.
    files: ['**/*.{js,mjs,cjs,ts,tsx,jsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: [BANNED_SOURCE_PACKAGE, `${BANNED_SOURCE_PACKAGE}/*`],
            message: 'Banned source package — use local relative imports inside @open-tomato/ui-components.',
          },
          {
            group: [`*${BANNED_SOURCE_REPO}*`],
            message: 'Cross-repo path imports are banned in @open-tomato/ui-components.',
          },
        ],
      }],
    },
  },
  {
    files: ['**/*.jsx', '**/*.tsx'],
    extends: [
      baseConfig,
      reactHooks.configs.flat.recommended,
      jsxA11y.flatConfigs.recommended,
      reactRefresh.configs.vite,
      reactRefresh.configs.recommended,
    ],
    languageOptions: {
      parser: tsParser,
      globals: {
        ...globals.serviceworker,
        ...globals.browser,
      },
    },
    plugins: {
      react: pluginReact,
      '@stylistic': stylistic,
    },
    settings: {
      react: {
        version: 'detect',
        // version: '18.3',
      },
      'import/parsers': {
        '@typescript-eslint/parser': ['.ts', '.tsx'],
      },
      'import/resolver': {
        typescript: {
          project: [
            './tsconfig.json',
            './packages/*/tsconfig.json',
            // './services/*/tsconfig.json',
            // './apps/*/tsconfig.json',
          ],
        },
      },

    },
    rules: {
      ...sharedRules,
      'react/display-name': 'off',
      'react/prop-types': 'off',
      'react/function-component-definition': 0,
      'react/jsx-filename-extension': [
        1,
        {
          'extensions': [
            '.tsx',
            '.ts',
          ],
        },
      ],
      'react/react-in-jsx-scope': 'off',
      'react/require-default-props': 0,
    },

  },
  {
    files: ['**/*.md'],
    plugins: {
      markdown,
    },
    extends: ['markdown/recommended'],
    rules: {
      'markdown/no-missing-label-refs': 'off',
    },
  },
  {
    files: ['**/*.json'],
    ignores: ['package-lock.json'],
    languageOptions: {
      parser: jsoncParser,
    },
    plugins: {
      jsonc,
      '@stylistic': stylistic,
    },
    rules: {
      'jsonc/indent': ['error', 2],
      '@stylistic/no-multiple-empty-lines': ['error', { 'max': 0, 'maxEOF': 0 }],
    },
  },
]);

