import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Runs the TypeScript rules to print the values the GDScript port's tests pin
// (SF-94). Outside the workspace's vitest projects, so `pnpm test` never runs it:
//   pnpm exec vitest run --config game/tools/oracles/vitest.config.ts
const source = (path: string): string => fileURLToPath(new URL(`../../../packages/${path}`, import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@sf/domain': source('domain/src/index.ts'),
      '@sf/application': source('application/src/index.ts'),
    },
  },
  test: {
    root: fileURLToPath(new URL('.', import.meta.url)),
    include: ['print-oracles.test.ts'],
    environment: 'node',
  },
})
