import selfConfig from '@lxsmnsyc/oxlint-config';
import { defineConfig } from 'oxlint';

export default defineConfig({
  extends: [selfConfig],
  ignorePatterns: ['**/dist/**', '**/node_modules/**'],
  overrides: [
    {
      files: ['examples/**', 'packages/*/e2e/**'],
      rules: {
        'import/prefer-default-export': 'off',
        'no-console': 'off',
        'typescript/explicit-function-return-type': 'off',
        'typescript/explicit-module-boundary-types': 'off',
      },
    },
  ],
});
