import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts', 'src/utils.ts'],
  platform: 'neutral',
  dts: true,
  sourcemap: true,
  target: 'es2022',
  treeshake: true,
  // Solid's JSX is left untouched for the consuming app's Solid plugin to
  // compile, so the output is named `.jsx` and reached through the `solid`
  // export condition.
  outExtensions: () => ({ js: '.jsx' }),
});
