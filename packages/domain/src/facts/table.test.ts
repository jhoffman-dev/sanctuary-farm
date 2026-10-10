import { describe, expect, it } from 'vitest'
import type { Fact, Tier } from './fact'
import { assertTableSize, buildFacts, factsInFamily, factsInTier, getFact } from './table'
import { MAX_TABLE_DEFAULT, MIN_TABLE, commuteId, factId, familyOf, tierOf } from './tuning'

const ALL = buildFacts(12)

describe('fact table', () => {
  it('builds every ordered pair for a 12×12 table (7×8 and 8×7 are distinct)', () => {
    expect(ALL).toHaveLength(144)
    expect(getFact('7x8')).not.toBe(getFact('8x7'))
    expect(getFact('7x8')?.answer).toBe(56)
    expect(getFact('13x1')).toBeUndefined()
  })

  it('respects a smaller maxTable', () => {
    const facts = buildFacts(4)
    expect(facts).toHaveLength(16)
    expect(facts.every((fact) => fact.a <= 4 && fact.b <= 4)).toBe(true)
  })

  it('family is the larger operand and family sizes are uneven', () => {
    expect(factsInFamily(1)).toHaveLength(1)
    expect(factsInFamily(12)).toHaveLength(23)
    expect(factsInFamily(12, 4)).toHaveLength(0)
    for (const fact of ALL) expect(fact.family).toBe(familyOf(fact.a, fact.b))
  })

  it('every fact carries the tier that tierOf() assigns', () => {
    for (const fact of ALL) expect(fact.tier).toBe(tierOf(fact.a, fact.b))
    expect(factsInTier(1).length).toBeGreaterThan(0)
    expect(factsInTier(6, 4)).toHaveLength(0)
  })

  it('id and commuteId round-trip', () => {
    for (const fact of ALL) {
      expect(fact.id).toBe(factId(fact.a, fact.b))
      expect(commuteId(fact.id)).toBe(factId(fact.b, fact.a))
    }
  })

  it('marks the hard-core set on both operand orders', () => {
    expect(getFact('7x8')?.hardCore).toBe(true)
    expect(getFact('8x7')?.hardCore).toBe(true)
    expect(getFact('2x2')?.hardCore).toBe(false)
  })

  it('returns a fresh array on every build', () => {
    expect(buildFacts(3)).not.toBe(buildFacts(3))
    expect(buildFacts(3)).toEqual(buildFacts(3))
  })

  it('accepts every whole table size from MIN_TABLE to MAX_TABLE_DEFAULT', () => {
    for (let n = MIN_TABLE; n <= MAX_TABLE_DEFAULT; n++) {
      expect(() => assertTableSize(n), `n=${n}`).not.toThrow()
      expect(buildFacts(n), `n=${n}`).toHaveLength(n * n)
    }
  })

  it.each([0, -1, MAX_TABLE_DEFAULT + 1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 1e12])(
    'refuses a table size of %s with a RangeError before building anything',
    (maxTable) => {
      expect(() => assertTableSize(maxTable)).toThrow(RangeError)
      expect(() => buildFacts(maxTable)).toThrow(RangeError)
      expect(() => factsInFamily(1, maxTable)).toThrow(RangeError)
      expect(() => factsInTier(1, maxTable)).toThrow(RangeError)
    },
  )
})

describe('family and tier membership is computed once per table size (SF-88)', () => {
  const sizes = Array.from({ length: MAX_TABLE_DEFAULT - MIN_TABLE + 1 }, (_, i) => MIN_TABLE + i)
  const TIERS: Tier[] = [1, 2, 3, 4, 5, 6]

  it.each(sizes)('matches a fresh build of the %s-table for every family and tier', (maxTable) => {
    const fresh = buildFacts(maxTable)
    for (let family = 0; family <= MAX_TABLE_DEFAULT + 1; family++) {
      expect(factsInFamily(family, maxTable), `family ${family}`).toEqual(
        fresh.filter((fact) => fact.family === family),
      )
    }
    for (const tier of TIERS) {
      expect(factsInTier(tier, maxTable), `tier ${tier}`).toEqual(fresh.filter((fact) => fact.tier === tier))
    }
  })

  it('hands out the same frozen arrays and facts on every call, so no caller can change them', () => {
    const family = factsInFamily(7, 9)
    const tier = factsInTier(1, 9)
    expect(factsInFamily(7, 9)).toBe(family)
    expect(factsInTier(1, 9)).toBe(tier)
    for (const facts of [family, tier, factsInFamily(13), factsInTier(6, 4)]) {
      expect(Object.isFrozen(facts)).toBe(true)
      expect(() => (facts as Fact[]).push(ALL[0] as Fact)).toThrow(TypeError)
      for (const fact of facts) expect(Object.isFrozen(fact)).toBe(true)
    }
    const first = family[0] as Fact
    expect(() => {
      first.answer = 0
    }).toThrow(TypeError)
    expect(factsInFamily(7, 9)[0]?.answer).toBe(first.a * first.b)
  })

  it('still refuses an invalid table size and leaves the valid sizes untouched', () => {
    for (const maxTable of [0, 13, 2.5, Number.NaN]) {
      expect(() => factsInFamily(1, maxTable)).toThrow(RangeError)
      expect(() => factsInTier(1, maxTable)).toThrow(RangeError)
    }
    expect(factsInFamily(12)).toHaveLength(23)
    expect(factsInTier(1, 3)).toEqual(buildFacts(3).filter((fact) => fact.tier === 1))
  })
})
