import baseConfig from '@open-tomato/eslint-config/base';
import globals from 'globals';

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...baseConfig,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ['**/*.ts'],
    rules: {
      'no-undef': 'off',
    },
  },
  {
    // Tests excluded from production tsconfig; disable import resolver
    // check to avoid false positives.
    files: ['tests/**/*.ts'],
    rules: {
      'import/no-unresolved': 'off',
    },
  },
];
