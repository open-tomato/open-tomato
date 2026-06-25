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
];
