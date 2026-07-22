import { resolve } from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

const rootDir = import.meta.dirname;

// App-mode build for the deployable demo site (NOT the library bundle).
// Uses index.html as the entry, bundles React and all deps into a
// self-contained dist-web/ that the Express server in server.js serves.
// The library build stays in vite.config.ts (`vite build`).
export default defineConfig({
  root: rootDir,
  plugins: [
    react(),
    // Copy the repo's static assets verbatim into dist-web/assets/ so
    // literal-string references like <img src="./assets/oops-tomato.gif">
    // (which Vite does not process or hash) resolve at /assets/* in production.
    viteStaticCopy({
      targets: [{ src: 'assets/*', dest: '.' }],
    }),
  ],
  build: {
    outDir: 'dist-web',
    emptyOutDir: true,
    sourcemap: false,
    target: 'es2022',
    rollupOptions: {
      input: resolve(rootDir, 'index.html'),
    },
  },
});
