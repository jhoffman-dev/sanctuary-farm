import { describe, expect, it } from 'vitest'
import { isAnimalLineupRoute } from './animal-lineup-route'

describe('isAnimalLineupRoute', () => {
  it('is on only for ?animals=1', () => {
    expect(isAnimalLineupRoute('?animals=1')).toBe(true)
    expect(isAnimalLineupRoute('?perf=1&animals=1')).toBe(true)
    expect(isAnimalLineupRoute('')).toBe(false)
    expect(isAnimalLineupRoute('?animals=0')).toBe(false)
    expect(isAnimalLineupRoute('?assets=1')).toBe(false)
  })
})
