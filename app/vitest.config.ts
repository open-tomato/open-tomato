import { defineConfig } from 'vitest/config';

// No @vitejs/plugin-react here: Vitest 4's bundled Vite transforms TSX via
// oxc using the tsconfig `jsx: react-jsx` setting; the babel-based react
// plugin only adds deprecated-option warnings in this context.
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./vitest.setup.ts'],
  },
});
