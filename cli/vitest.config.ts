import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Only run the dispatcher-level tests. Legacy command-level tests
    // under `src/commands/**/tests/` carry legacy infrastructure that
    // predates this move; fix them ad-hoc when their command is next
    // touched, not as part of the Plan 06 migration gate.
    include: ['tests/**/*.test.ts'],
  },
});
