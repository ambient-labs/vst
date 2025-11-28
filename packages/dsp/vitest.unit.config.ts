import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['**/*.test.ts', '**/*.test.js'],
    exclude: ['node_modules'],
    globals: false,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: './coverage',
      // Only enforce coverage on TypeScript files (JS can be untested)
      include: ['**/*.ts'],
      exclude: ['**/*.test.ts', 'node_modules/**'],
      thresholds: {
        // Per-file thresholds - each TS file must have 95% coverage
        perFile: true,
        statements: 95,
        branches: 95,
        functions: 95,
        lines: 95,
      },
    },
  },
});
