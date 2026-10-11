import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Needs the Auth, Firestore and Functions emulators: run with `pnpm test:auth`
// from the repo root, which starts them around this config. Kept out of
// `pnpm gate` (the Firestore emulator needs a JDK), like `pnpm test:rules`.
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  test: {
    name: 'functions-integration',
    include: ['test/integration/**/*.int.test.ts'],
    // scrypt at production cost plus a cold emulator start.
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // The suites share one emulator; serial keeps their counters apart and the run readable.
    fileParallelism: false,
  },
})
