import { defineConfig } from 'vitest/config'

// Standalone: `functions` is an adapter package outside the root vitest
// `projects` list, so the root gate runs it via `pnpm test:functions`.
export default defineConfig({
  test: {
    name: 'functions',
    include: ['src/**/*.test.ts'],
  },
})
