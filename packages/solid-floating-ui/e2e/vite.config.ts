import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';

// The harness imports the library from source so `pnpm test:e2e` never depends
// on a stale `dist`.
export default defineConfig({
  root: fileURLToPath(new URL('./app', import.meta.url)),
  resolve: {
    alias: {
      'solid-floating-ui': fileURLToPath(new URL('../src/index.ts', import.meta.url)),
    },
  },
  plugins: [solid()],
  server: {
    port: 4319,
    strictPort: true,
  },
  preview: {
    port: 4319,
    strictPort: true,
  },
});
