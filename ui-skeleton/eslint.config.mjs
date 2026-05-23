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
  {
    files: ['src/organisms/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['@/organisms/*', '../organisms/*', './**/organisms/*'],
            message: 'Organisms MUST NOT import other organisms. Promote to template instead.',
          },
          {
            group: [
              '@/templates/*', '../templates/*', './**/templates/*',
              '@/pages/*', '../pages/*', './**/pages/*',
              '@/providers/*', '../providers/*', './**/providers/*',
            ],
            message: 'Organisms MUST NOT import upward layers.',
          },
        ],
      }],
    },
  },
  {
    files: ['src/templates/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['@/templates/*', '../templates/*', './**/templates/*'],
            message: 'Templates MUST NOT import other templates. Lift shared treatment to a particle instead.',
          },
          {
            group: [
              '@/pages/*', '../pages/*', './**/pages/*',
              '@/providers/*', '../providers/*', './**/providers/*',
            ],
            message: 'Templates MUST NOT import upward layers.',
          },
        ],
      }],
    },
  },
];
