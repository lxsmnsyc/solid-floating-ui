import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import solid from '@solidjs/vite-plugin';

// The playground imports the library from source, so editing `src` in the
// package is reflected here without a build step.
export default defineConfig({
  resolve: {
    alias: {
      'solid-floating-ui': fileURLToPath(
        new URL('../../packages/solid-floating-ui/src/index.ts', import.meta.url),
      ),
    },
  },
  plugins: [solid()],
  server: {
    port: 4320,
  },
});
