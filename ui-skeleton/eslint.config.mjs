import baseConfig from '@open-tomato/eslint-config/react';

/** @type {import("eslint").Linter.Config} */
export default [
  ...baseConfig,
  { ignores: ['storybook-static/**'] },
];
