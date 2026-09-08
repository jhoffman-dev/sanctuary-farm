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
        // SF-63 spike (throwaway branch, not for merge). Its pure modules —
        // steering, model-fit, frame-stats, texture-memory, spike-session — are
        // unit-tested and stay in coverage; the r3f components are WebGL-only
        // and are covered by `e2e/spike-3d.spec.ts` in headless Chromium
        // instead, because jsdom has no WebGL context to render them in.
        'apps/web/src/spike/*.tsx',
        'apps/web/src/spike/use-animated-gltf.ts',
        'apps/web/src/spike/use-keyboard-direction.ts',
        'apps/web/src/spike/clip-crossfade.ts',
        'apps/web/src/spike/camera-rig.ts',
        'apps/web/src/spike/silhouette.ts',
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
