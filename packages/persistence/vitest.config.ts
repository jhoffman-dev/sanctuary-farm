import { defineProject } from 'vitest/config'

export default defineProject({
  test: {
    name: 'persistence',
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
  },
})
