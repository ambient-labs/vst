import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['scripts/**/*.test.ts'],
    globals: false,
    environment: 'node',
    fileParallelism: true,
    sequence: {
      concurrent: true,
    },
  },
});
