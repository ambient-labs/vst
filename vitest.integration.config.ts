import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      // Allow tests to import from frontend package
      '@srvb/frontend': resolve(__dirname, 'packages/frontend/src'),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    // Exclude plugin-validation tests - they require a native build and run in the Build workflow
    exclude: ['tests/plugin-validation.test.ts'],
    globals: false,
    environment: 'node',
    testTimeout: 60000, // Allow time for native builds
    // Allow vitest to resolve dependencies from frontend package
    deps: {
      optimizer: {
        web: {
          include: ['ai', '@ai-sdk/anthropic', 'zod'],
        },
      },
    },
  },
});
