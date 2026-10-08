import { createRng } from '@sf/domain'
import { describe, expect, it } from 'vitest'
import { createSeededRng } from './seeded-rng'

const draw = (seed: number, count: number) => {
  const rng = createSeededRng(seed)
  return Array.from({ length: count }, () => rng())
}

describe('createSeededRng', () => {
  it('replays the same stream for the same seed', () => {
    expect(draw(20261008, 50)).toEqual(draw(20261008, 50))
  })

  it('gives different seeds different streams', () => {
    expect(draw(1, 5)).not.toEqual(draw(2, 5))
  })

  it('stays in [0, 1) and spreads across it', () => {
    const values = draw(7, 2000)
    for (const value of values) {
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length
    expect(mean).toBeGreaterThan(0.45)
    expect(mean).toBeLessThan(0.55)
  })

  it('draws exactly what @sf/domain\'s createRng draws, so a world is the same whoever builds it', () => {
    for (const seed of [0, 1, 20261008, 0xffffffff]) {
      const domain = createRng(seed)
      expect(draw(seed, 20)).toEqual(Array.from({ length: 20 }, () => domain()))
    }
  })

  it('treats seeds modulo 2^32, as the world\'s mixed seeds are unsigned 32-bit', () => {
    expect(draw(2 ** 32 + 5, 3)).toEqual(draw(5, 3))
    expect(draw(-1, 3)).toEqual(draw(2 ** 32 - 1, 3))
  })
})
