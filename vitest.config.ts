import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: ['packages/*', 'apps/web'],
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**/*.ts', 'apps/web/src/**/*.{ts,tsx}'],
      exclude: [
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.adversarial.test.ts',
        '**/index.ts',
        // Test scaffolding is not product code.
        '**/test-fakes.ts',
        '**/test-fixtures.ts',
        '**/test/**',
        // Wiring only: the entry point and the composition root hold no rules to cover.
        'apps/web/src/main.tsx',
        'apps/web/src/composition/**',
      ],
      reporter: ['text-summary', 'html'],
      thresholds: {
        lines: 70,
        statements: 70,
        'packages/domain/src/**': { lines: 90, statements: 90 },
      },
    },
  },
})
