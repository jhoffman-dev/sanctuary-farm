import { defineConfig } from 'vitest/config'

// Standalone: these tests need the Firestore emulator, so they are kept out of
// the root `projects` list and out of `pnpm gate`. Run them with
// `pnpm test:rules`, which starts the emulator around this config.
export default defineConfig({
  test: {
    name: 'firestore-rules',
    // Relative to the repo root: `emulators:exec` runs the script from there.
    include: ['firestore/*.test.ts'],
    // The emulator is started by `firebase emulators:exec`; first connection
    // can be slow on a cold JVM.
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
})
