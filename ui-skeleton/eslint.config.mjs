import baseConfig from '@open-tomato/eslint-config/react';

/** @type {import("eslint").Linter.Config} */
export default [
  ...baseConfig,
  { ignores: ['storybook-static/**'] },
  {
    files: ['src/molecules/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['@/molecules/*', '../molecules/*', './**/molecules/*'],
            message: 'Molecules MUST NOT import other molecules. Promote to organism instead.',
          },
          {
            group: ['@/organisms/*', '@/templates/*', '@/pages/*', '@/providers/*'],
            message: 'Molecules MUST NOT import upward layers.',
          },
        ],
      }],
    },
  },
  {
    files: ['src/atoms/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['@/atoms/*'],
            message: 'Atoms MUST NOT import other atoms. Use @/particles or fold into one atom.',
          },
          {
            group: ['@/molecules/*', '@/organisms/*', '@/templates/*', '@/pages/*', '@/providers/*'],
            message: 'Atoms MUST NOT import upward layers.',
          },
        ],
      }],
    },
  },
];
