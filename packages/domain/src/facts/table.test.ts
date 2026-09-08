import { describe, expect, it } from 'vitest'
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
