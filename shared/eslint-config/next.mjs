import pluginNext from '@next/eslint-plugin-next';
import tsParser from '@typescript-eslint/parser';
import { defineConfig } from 'eslint/config';

import reactConfig from './react.mjs';

/**
 * A custom ESLint configuration for libraries that use Next.js.
 *
 * @type {import("eslint").Linter.Config}
 * */
export default defineConfig([
  {
    ignores: [
      '.next/**',
      'dist/**',
      'build/**',
      'node_modules/**',
      '**/package-lock.json',
      '**/.docs/*',
    ],
  },
  reactConfig,
  {
    files: ['**/*.js', '**/*.ts', '**/*.jsx', '**/*.tsx'],
    extends: [reactConfig],
    plugins: {
      '@next/next': pluginNext,
    },
    languageOptions: {
      parser: tsParser,
    },
    rules: {
      ...pluginNext.configs.recommended.rules,
      ...pluginNext.configs['core-web-vitals'].rules,
    },
  },
]);
