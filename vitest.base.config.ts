import { defineConfig } from 'vitest/config';

/**
 * Base vitest configuration for unit tests.
 * Extend this in package-specific vitest.unit.config.ts files.
 */
export default defineConfig({
  test: {
    exclude: ['node_modules', 'dist'],
    globals: false,
    environment: 'node',
  },
});
