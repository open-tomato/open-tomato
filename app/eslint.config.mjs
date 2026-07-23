import reactConfig from '@open-tomato/eslint-config/react';
import globals from 'globals';

/** @type {import("eslint").Linter.Config[]} */
export default [
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
  ...reactConfig,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
];
