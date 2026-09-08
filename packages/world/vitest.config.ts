import { defineProject } from 'vitest/config'

export default defineProject({
  test: {
    name: 'world',
    include: ['src/**/*.test.ts'],
  },
})
