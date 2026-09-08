import { describe, expect, it } from 'vitest'
import { createRng, shuffle, weightedPick } from './rng'

describe('createRng', () => {
  it('is deterministic for a seed and stays in [0, 1)', () => {
    const a = createRng(7)
    const b = createRng(7)
    for (let i = 0; i < 100; i++) {
      const value = a()
      expect(value).toBe(b())
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })

  it('different seeds diverge', () => {
    expect(createRng(1)()).not.toBe(createRng(2)())
  })
})

describe('weightedPick', () => {
  it('never picks a zero-weight item when a positive one exists', () => {
    const rng = createRng(3)
    for (let i = 0; i < 200; i++) expect(weightedPick(['a', 'b'], [0, 5], rng)).toBe('b')
  })

  it('falls back to uniform when every weight is non-positive', () => {
    const rng = createRng(11)
    const seen = new Set<string>()
    for (let i = 0; i < 100; i++) seen.add(weightedPick(['a', 'b', 'c'], [0, -1, 0], rng))
    expect(seen.size).toBe(3)
  })

  it('throws on an empty list', () => {
    expect(() => weightedPick([], [], createRng(1))).toThrow(/empty/)
  })
})

describe('shuffle', () => {
  it('returns a permutation and leaves the input untouched', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8]
    const out = shuffle(input, createRng(5))
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    expect([...out].sort((a, b) => a - b)).toEqual(input)
    expect(out).not.toEqual(input)
  })
})
