import { describe, expect, it } from 'vitest'
import {
  ALL_FAMILIES,
  factId,
  familyOf,
  isHardCore,
  tierOf,
  TIER_NAMES,
} from './index'
import { buildFacts } from '@/engine/facts'

describe('Phase 0 contracts smoke test', () => {
  it('builds 144 facts for a 12×12 table', () => {
    expect(buildFacts(12)).toHaveLength(144)
  })

  it('family is the larger operand', () => {
    expect(familyOf(7, 8)).toBe(8)
    expect(familyOf(12, 3)).toBe(12)
  })

  it('every fact lands in exactly one named tier', () => {
    for (const f of buildFacts(12)) {
      expect(TIER_NAMES[tierOf(f.a, f.b)]).toBeTypeOf('string')
    }
  })

  it('hard-core matching is order-insensitive', () => {
    expect(isHardCore(factId(7, 8))).toBe(true)
    expect(isHardCore(factId(8, 7))).toBe(true)
    expect(isHardCore(factId(2, 2))).toBe(false)
  })

  it('covers families 1..12', () => {
    const seen = new Set(buildFacts(12).map((f) => f.family))
    expect([...seen].sort((a, b) => a - b)).toEqual([...ALL_FAMILIES])
  })
})
