import { defineProject } from 'vitest/config'

export default defineProject({
  test: {
    name: 'application',
    include: ['src/**/*.test.ts'],
  },
})
