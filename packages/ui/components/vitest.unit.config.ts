// Placeholder test config for the empty scaffold: plain node runs, no
// Storybook/browser. WS05 wave 0 restores `vitest run` against
// vitest.config.ts (Storybook + Playwright) and deletes this file.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    passWithNoTests: true,
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
