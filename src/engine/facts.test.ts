import { describe, expect, it } from 'vitest'
import { commuteId, factId, familyOf, tierOf } from '@/contracts'
import { ALL_FACTS, buildFacts, factsInFamily, factsInTier, getFact } from './facts'

describe('fact table', () => {
  it('builds every ordered pair for a 12×12 table (7×8 and 8×7 are distinct)', () => {
    expect(buildFacts(12)).toHaveLength(144)
    expect(getFact('7x8')).not.toBe(getFact('8x7'))
    expect(getFact('7x8')?.answer).toBe(56)
  })

  it('respects a smaller maxTable', () => {
    const facts = buildFacts(4)
    expect(facts).toHaveLength(16)
    expect(facts.every((f) => f.a <= 4 && f.b <= 4)).toBe(true)
  })

  it('family is the larger operand and sizes are uneven (D3)', () => {
    expect(factsInFamily(1)).toHaveLength(1) // { 1×1 }
    expect(factsInFamily(12)).toHaveLength(23)
    for (const f of ALL_FACTS) expect(f.family).toBe(familyOf(f.a, f.b))
  })

  it('every fact carries the tier that tierOf() assigns', () => {
    for (const f of ALL_FACTS) expect(f.tier).toBe(tierOf(f.a, f.b))
    expect(factsInTier(1).length).toBeGreaterThan(0)
  })

  it('id and commuteId round-trip', () => {
    for (const f of ALL_FACTS) {
      expect(f.id).toBe(factId(f.a, f.b))
      expect(commuteId(f.id)).toBe(factId(f.b, f.a))
    }
  })

  it('marks the hard-core set on both operand orders (D5)', () => {
    expect(getFact('7x8')?.hardCore).toBe(true)
    expect(getFact('8x7')?.hardCore).toBe(true)
    expect(getFact('2x2')?.hardCore).toBe(false)
  })
})
