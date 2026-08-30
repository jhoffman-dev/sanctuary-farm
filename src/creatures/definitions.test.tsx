import { describe, expect, it } from 'vitest'
import type { AnimalKind, CreatureParams } from '@/contracts'
import { COLD_START_CREATURE_FAMILY } from '@/contracts'
import { ALL_CREATURE_PARAMS, defaultCreatureParams } from './definitions'

const KINDS: AnimalKind[] = [
  'chick', 'duckling', 'bunny', 'lamb', 'piglet', 'kitten',
  'puppy', 'foal', 'fawn', 'calf', 'gosling', 'kid',
]
const EYE: CreatureParams['eyeStyle'][] = ['big', 'sleepy', 'sparkly', 'wide']
const FAMILIES = Array.from({ length: 12 }, (_, i) => i + 1)

describe('creature definitions', () => {
  it('is deterministic per family', () => {
    for (const f of FAMILIES) {
      expect(defaultCreatureParams(f)).toEqual(defaultCreatureParams(f))
    }
  })

  it('produces a valid, complete param set for every family', () => {
    for (const f of FAMILIES) {
      const p = defaultCreatureParams(f)
      expect(KINDS).toContain(p.animal)
      expect(EYE).toContain(p.eyeStyle)
      expect(p.palette).toHaveLength(3)
      for (const c of p.palette) expect(typeof c).toBe('string')
    }
  })

  it('gives every family a distinct animal', () => {
    const animals = FAMILIES.map((f) => defaultCreatureParams(f).animal)
    expect(new Set(animals).size).toBe(12)
  })

  it('makes every family visually distinct', () => {
    const seen = new Set(FAMILIES.map((f) => JSON.stringify(defaultCreatureParams(f))))
    expect(seen.size).toBe(12)
  })

  it('gives the cold-start gift family a friendly calf', () => {
    const gift = defaultCreatureParams(COLD_START_CREATURE_FAMILY)
    expect(gift.animal).toBe('calf')
    expect(gift.eyeStyle).toBe('big')
    expect(ALL_CREATURE_PARAMS[COLD_START_CREATURE_FAMILY]).toEqual(gift)
  })

  it('exposes all 12 in ALL_CREATURE_PARAMS', () => {
    expect(Object.keys(ALL_CREATURE_PARAMS).map(Number).sort((a, b) => a - b)).toEqual(FAMILIES)
  })

  it('resolves a deterministic animal for families outside 1..12', () => {
    expect(defaultCreatureParams(99)).toEqual(defaultCreatureParams(99))
    expect(KINDS).toContain(defaultCreatureParams(99).animal)
  })
})
