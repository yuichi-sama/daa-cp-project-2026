import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@sokoban/shared': path.resolve(__dirname, '../shared/src/index.ts'),
    },
  },
});
