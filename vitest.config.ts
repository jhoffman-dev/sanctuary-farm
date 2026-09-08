import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: ['packages/*', 'apps/web'],
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**/*.ts'],
      exclude: ['**/*.test.ts', '**/index.ts'],
      reporter: ['text-summary', 'html'],
      thresholds: {
        'packages/domain/src/**': { lines: 90, statements: 90 },
      },
    },
  },
})
