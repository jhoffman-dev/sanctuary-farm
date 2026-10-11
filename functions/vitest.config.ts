import { defineConfig } from 'vitest/config'

// Standalone: `functions` is an adapter package outside the root vitest
// `projects` list, so the root gate runs it via `pnpm test:functions`.
// Emulator-backed tests live in `test/integration` and run with
// `pnpm test:auth` (vitest.integration.config.ts).
export default defineConfig({
  test: {
    name: 'functions',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        '**/*.test.ts',
        'src/auth/testing/**',
        // Wiring and re-exports only.
        'src/index.ts',
        'src/auth/composition.ts',
        'src/auth/*/index.ts',
        // Thin Firebase adapters: proven against the emulators by `pnpm test:auth`.
        'src/auth/adapters/firestore*.ts',
        'src/auth/adapters/firebaseTokenMinter.ts',
      ],
      reporter: ['text-summary'],
      // Sign-in guards a child's farm: the high-impact slice (COVERAGE bar 90%+).
      thresholds: {
        lines: 70,
        statements: 70,
        'src/auth/domain/**': { lines: 95, statements: 95 },
        'src/auth/application/**': { lines: 90, statements: 90 },
      },
    },
  },
})
