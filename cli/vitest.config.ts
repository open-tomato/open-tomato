import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Dispatcher-level tests live under `tests/`. Module-colocated tests
    // for the cli-core adoption (registry, dispatch, legacyShim, describe)
    // live under `src/`. Legacy command-level tests under
    // `src/commands/**/tests/` carry pre-migration infrastructure and
    // remain excluded — fix them ad-hoc when their command is next touched.
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
    exclude: ['**/node_modules/**', 'src/commands/**/tests/**'],
  },
});
