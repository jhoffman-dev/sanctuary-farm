import { describe, expect, it } from 'vitest'
import type { CreatureParams } from '@/contracts'
import { COLD_START_CREATURE_FAMILY } from '@/contracts'
import { ALL_CREATURE_PARAMS, defaultCreatureParams } from './definitions'

const BODY: CreatureParams['bodyShape'][] = ['round', 'tall', 'wide', 'lumpy']
const EAR: CreatureParams['earType'][] = ['none', 'pointy', 'floppy', 'round', 'antenna']
const EYE: CreatureParams['eyeStyle'][] = ['big', 'sleepy', 'sparkly', 'wide']
const PAT: CreatureParams['pattern'][] = ['none', 'spots', 'stripes', 'star']
const TAIL: CreatureParams['tail'][] = ['none', 'puff', 'long', 'curl']

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
      expect(BODY).toContain(p.bodyShape)
      expect(EAR).toContain(p.earType)
      expect(EYE).toContain(p.eyeStyle)
      expect(PAT).toContain(p.pattern)
      expect(TAIL).toContain(p.tail)
      expect(p.palette).toHaveLength(3)
      for (const c of p.palette) expect(typeof c).toBe('string')
    }
  })

  it('makes every family visually distinct', () => {
    const seen = new Set(FAMILIES.map((f) => JSON.stringify(defaultCreatureParams(f))))
    expect(seen.size).toBe(12)
  })

  it('varies each visual axis across the set (no single-value axis)', () => {
    const axis = (key: keyof CreatureParams) =>
      new Set(FAMILIES.map((f) => JSON.stringify(defaultCreatureParams(f)[key])))
    expect(axis('bodyShape').size).toBeGreaterThan(2)
    expect(axis('earType').size).toBeGreaterThan(2)
    expect(axis('eyeStyle').size).toBeGreaterThan(2)
    expect(axis('pattern').size).toBeGreaterThan(2)
    expect(axis('tail').size).toBeGreaterThan(2)
  })

  it('gives the cold-start gift family a friendly, patterned look', () => {
    const gift = defaultCreatureParams(COLD_START_CREATURE_FAMILY)
    expect(gift.pattern).not.toBe('none')
    expect(gift.eyeStyle).toBe('big')
    expect(ALL_CREATURE_PARAMS[COLD_START_CREATURE_FAMILY]).toEqual(gift)
  })

  it('exposes all 12 in ALL_CREATURE_PARAMS', () => {
    expect(Object.keys(ALL_CREATURE_PARAMS).map(Number).sort((a, b) => a - b)).toEqual(FAMILIES)
  })
})
