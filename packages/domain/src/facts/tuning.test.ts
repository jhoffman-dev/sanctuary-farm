import { describe, expect, it } from 'vitest'
import { buildFacts } from './table'
import {
  ALL_FAMILIES,
  LEITNER_INTERVALS,
  TIER_NAMES,
  commuteId,
  factId,
  familyOf,
  isHardCore,
  tierOf,
} from './tuning'

describe('tierOf — first matching rule wins, 1 → 6', () => {
  it('anchors: anything with a 1, 2 or 10', () => {
    expect(tierOf(1, 9)).toBe(1)
    expect(tierOf(7, 2)).toBe(1)
    expect(tierOf(10, 12)).toBe(1)
  })

  it('easy patterns: 5s, squares, and 11s up to 11×9', () => {
    expect(tierOf(5, 7)).toBe(2)
    expect(tierOf(7, 7)).toBe(2)
    expect(tierOf(11, 9)).toBe(2)
    expect(tierOf(11, 11)).toBe(2)
  })

  it('3s and 4s, then 9s, then 6/7/8, then the rest', () => {
    expect(tierOf(3, 8)).toBe(3)
    expect(tierOf(4, 9)).toBe(3)
    expect(tierOf(9, 6)).toBe(4)
    expect(tierOf(6, 8)).toBe(5)
    // 12×7 has a 7, so it lands in tier 5 before the 12s rule is reached.
    expect(tierOf(12, 7)).toBe(5)
    expect(tierOf(11, 12)).toBe(6)
    expect(tierOf(12, 12)).toBe(2)
  })

  it('is total over the 12×12 table and every tier is named', () => {
    for (const fact of buildFacts(12)) expect(TIER_NAMES[tierOf(fact.a, fact.b)]).toBeTypeOf('string')
  })
})

describe('fact identity', () => {
  it('family is the larger operand', () => {
    expect(familyOf(7, 8)).toBe(8)
    expect(familyOf(12, 3)).toBe(12)
  })

  it('commuteId swaps the operands and rejects a malformed id', () => {
    expect(commuteId(factId(7, 8))).toBe('8x7')
    expect(commuteId('12x3')).toBe('3x12')
    expect(() => commuteId('nonsense')).toThrow(/malformed/)
  })

  it('hard-core matching is order-insensitive', () => {
    expect(isHardCore(factId(7, 8))).toBe(true)
    expect(isHardCore(factId(8, 7))).toBe(true)
    expect(isHardCore(factId(2, 2))).toBe(false)
  })

  it('the 12×12 table covers families 1..12', () => {
    const seen = new Set(buildFacts(12).map((fact) => fact.family))
    expect([...seen].sort((a, b) => a - b)).toEqual([...ALL_FAMILIES])
  })

  it('Leitner intervals grow with the box', () => {
    expect(LEITNER_INTERVALS[1]).toBeLessThan(LEITNER_INTERVALS[2])
    expect(LEITNER_INTERVALS[4]).toBeLessThan(LEITNER_INTERVALS[5])
  })
})
