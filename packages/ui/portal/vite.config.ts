import { createRequire } from 'node:module';
import { resolve } from 'node:path';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { viteStaticCopy } from 'vite-plugin-static-copy';

const rootDir = import.meta.dirname;
const require = createRequire(import.meta.url);

// Theme files ship as copies next to lib.css so its relative @imports resolve
// in dist; the default theme definition is owned by @open-tomato/theme-default.
const themeTokensCss = require.resolve('@open-tomato/theme-default/tokens.css');
const themeFontsCss = require.resolve('@open-tomato/theme-default/fonts.css');

export default defineConfig({
  server: {
    open: true,
    port: 5175,
    watch: {
      usePolling: true,
      interval: 300,
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    dts({
      include: ['src'],
      // Stories are dev-only and never part of the published API (the barrels
      // export components, not stories), so skip emitting their declarations.
      // This also sidesteps a flaky vite-plugin-dts + `satisfies Meta<…>`
      // interaction (TS2742). `check-types` still type-checks the story files.
      exclude: ['**/*.stories.tsx'],
      tsconfigPath: './tsconfig.json',
    }),
    // Theme-definition split shipped alongside the JS: lib.css becomes the
    // "./styles.css" export; tokens.css doubles as the overridable default
    // theme ("./theme.css" export). See src/styles/lib.css for the contract.
    viteStaticCopy({
      targets: [
        { src: 'src/styles/lib.css', dest: 'styles', rename: { stripBase: true, name: 'index.css' } },
        { src: themeFontsCss, dest: 'styles', rename: { stripBase: true } },
        { src: themeTokensCss, dest: 'styles', rename: { stripBase: true } },
        { src: 'src/styles/theme.css', dest: 'styles', rename: { stripBase: true } },
      ],
    }),
  ],
  // resolve: {
  //   alias: {
  //     '@': resolve(rootDir, 'src'),
  //   },
  // },
  build: {
    lib: {
      entry: {
        index: resolve(rootDir, 'src/index.tsx'),
      },
      formats: ['es'],
    },
    rollupOptions: {
      external: [
        /^react($|\/)/,
        /^react-dom($|\/)/,
        /^@radix-ui\//,
        // Sibling published packages are peers of the consumer, not bundled in.
        /^@open-tomato\//,
        /^lucide-react($|\/)/,
        'class-variance-authority',
        'clsx',
        'tailwind-merge',
        'vaul',
        'sonner',
        'cmdk',
        'react-resizable-panels',
        'react-day-picker',
      ],
      output: {
        preserveModules: false,
        entryFileNames: '[name].js',
      },
    },
    sourcemap: true,
    target: 'es2022',
  },
});
