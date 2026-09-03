import selfConfig from '@lxsmnsyc/oxlint-config';
import { defineConfig } from 'oxlint';

export default defineConfig({
  extends: [selfConfig],
  ignorePatterns: ['**/dist/**', '**/node_modules/**'],
});
