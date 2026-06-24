import type { StorybookConfig } from '@storybook/react-vite';

import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx|mdx)'],
  addons: [getAbsolutePath('@storybook/addon-a11y'), getAbsolutePath('@storybook/addon-docs')],
  framework: { name: getAbsolutePath('@storybook/react-vite'), options: {} },
  typescript: { reactDocgen: 'react-docgen-typescript' },
};

export default config;

function getAbsolutePath(value: string): string {
  return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)));
}
