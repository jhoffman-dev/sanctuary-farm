import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      'packages/*',
      'apps/web',
      // The e2e tooling the Playwright configs share (SF-90).
      { test: { name: 'e2e-tooling', environment: 'node', include: ['scripts/e2e/**/*.test.ts'] } },
      // The Godot web export tooling: fingerprinting and the size ceilings (SF-100).
      { test: { name: 'godot-web-tooling', environment: 'node', include: ['game/tools/web_export/**/*.test.ts'] } },
    ],
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**/*.ts', 'apps/web/src/**/*.{ts,tsx}'],
      exclude: [
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.adversarial.test.ts',
        // Package entry points are re-exports only. Named one by one, because
        // `**/index.ts` would also hide real code such as the ports.
        'packages/*/src/index.ts',
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
        'packages/world/src/**': { lines: 90, statements: 90 },
      },
    },
  },
})
