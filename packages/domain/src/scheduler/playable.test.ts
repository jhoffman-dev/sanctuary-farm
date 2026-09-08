import { describe, expect, it } from 'vitest'
import { factStatus, withFacts } from '../../test/fixtures'
import { createRng } from '../rng'
import { nextFact } from './next'
import { hasPlayableFact } from './playable'
import { initialSchedulerState } from './state'
import type { SchedulerState } from './types'

/** A state knowing exactly one fact, un-introduced: 7×8, family 8, tier 5. */
function onlyUnintroduced78(overrides: Partial<SchedulerState> = {}): SchedulerState {
  return {
    ...initialSchedulerState(12),
    facts: { '7x8': factStatus({ id: '7x8', box: 0, introduced: false }) },
    ...overrides,
  }
}

describe('hasPlayableFact', () => {
  it('is true for a fresh state, which has the cold-start families introduced', () => {
    expect(hasPlayableFact(initialSchedulerState())).toBe(true)
  })

  it('is true when a fact can still be introduced from an unlocked tier', () => {
    const state = onlyUnintroduced78({ unlockedTiers: [1, 2, 3, 4, 5] })
    expect(hasPlayableFact(state)).toBe(true)
  })

  it('is false when every known fact sits in a tier the state has not unlocked', () => {
    // Judged as stored: nextFact would unlock its way down to tier 5 first,
    // but a save whose own tiers reach none of its own facts is not one the
    // game wrote, and a caller is right to turn it away.
    expect(hasPlayableFact(onlyUnintroduced78({ unlockedTiers: [1] }))).toBe(false)
  })

  it('is false when the only introducible fact is in the blocked family', () => {
    const state = onlyUnintroduced78({ unlockedTiers: [1, 2, 3, 4, 5], recentFamilies: [8, 8] })
    expect(hasPlayableFact(state)).toBe(false)
  })

  it('is false for a state with no facts at all', () => {
    expect(hasPlayableFact({ ...initialSchedulerState(), facts: {} })).toBe(false)
  })

  it('is true once a fact is introduced, even with every tier locked away', () => {
    const state = withFacts(onlyUnintroduced78({ unlockedTiers: [1] }), ['7x8'], { box: 1 })
    expect(hasPlayableFact(state)).toBe(true)
  })

  it.each([
    ['no facts at all', { ...initialSchedulerState(), facts: {} }],
    [
      'the only introducible fact blocked by the interleave rule',
      onlyUnintroduced78({ unlockedTiers: [1, 2, 3, 4, 5], recentFamilies: [8, 8] }),
    ],
  ])('says false for %s, which is exactly what nextFact throws on', (_label, state) => {
    expect(hasPlayableFact(state)).toBe(false)
    expect(() => nextFact(state, createRng(1))).toThrow(/no candidate facts/)
  })
})
