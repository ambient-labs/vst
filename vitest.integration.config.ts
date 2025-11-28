import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // Exclude plugin-validation tests - they require a native build and run in the Build workflow
    exclude: ['tests/plugin-validation.test.ts'],
    globals: false,
    environment: 'node',
    testTimeout: 180000, // Allow time for plugin validation (3 minutes)
  },
});
