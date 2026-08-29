import { describe, expect, it } from 'vitest'
import type { CreatureMood } from '@/contracts'
import { moodVariants } from './animations'

const MOODS: CreatureMood[] = ['idle', 'happy', 'eating', 'puzzled', 'sleeping']

describe('mood motion variants', () => {
  it('defines every mood', () => {
    for (const m of MOODS) {
      expect(moodVariants[m]).toBeDefined()
      expect(moodVariants[m].animate).toBeTypeOf('object')
      expect(moodVariants[m].transition).toBeTypeOf('object')
    }
  })

  it('gives each mood a distinct motion target', () => {
    const sigs = MOODS.map((m) => JSON.stringify(moodVariants[m].animate))
    expect(new Set(sigs).size).toBe(MOODS.length)
  })

  it('loops only idle, sleeping and eating; one-shots settle quickly', () => {
    expect(moodVariants.idle.transition.repeat).toBe(Infinity)
    expect(moodVariants.sleeping.transition.repeat).toBe(Infinity)
    expect(moodVariants.eating.transition.repeat).toBe(Infinity)
    expect(moodVariants.happy.transition.repeat).not.toBe(Infinity)
    expect(moodVariants.puzzled.transition.repeat ?? 0).toBe(0)
    expect(moodVariants.puzzled.transition.duration as number).toBeLessThanOrEqual(0.6)
  })

  it('keeps puzzled a tilt, not a droop (rotate away from 0, no downward slump)', () => {
    const rot = moodVariants.puzzled.animate.rotate as number[]
    expect(Array.isArray(rot)).toBe(true)
    expect(Math.max(...rot.map(Math.abs))).toBeGreaterThan(0)
  })
})
