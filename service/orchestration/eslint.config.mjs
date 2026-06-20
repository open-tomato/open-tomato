import baseConfig from '@open-tomato/eslint-config/base';

/** @type {import("eslint").Linter.Config[]} */
export default [
  { ignores: ['docs/**'] },
  ...baseConfig,
  {
    settings: {
      'import/resolver': {
        node: {
          moduleDirectory: ['node_modules'],
        },
      },
    },
    rules: {
      'import/no-unresolved': ['error', { ignore: ['^bun:'] }],
    },
  },
];
