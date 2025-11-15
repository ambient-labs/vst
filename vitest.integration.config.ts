import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.js'],
    globals: false,
    environment: 'node',
    testTimeout: 60000, // Allow time for native builds
  },
});
