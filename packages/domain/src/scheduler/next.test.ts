import { describe, expect, it } from 'vitest'
import { drive, introducedIds, withFact, withFacts } from '../../test/fixtures'
import { buildFacts, factsInTier } from '../facts/table'
import { DUE_WEIGHTING_THRESHOLD } from '../facts/tuning'
import { createRng } from '../rng'
import { gradeAnswer } from './grade'
import { nextFact } from './next'
import { initialSchedulerState } from './state'
import type { SchedulerState } from './types'

const FAR_FUTURE = 9999

/** Every introduced fact pushed out of reach, so nothing is due. */
function nothingDue(state: SchedulerState): SchedulerState {
  return withFacts(state, introducedIds(state), { dueAt: FAR_FUTURE })
}

describe('nextFact — introduction', () => {
  it('introduces a fact when fewer than MIN_DUE_BEFORE_INTRODUCE are due', () => {
    const state = nothingDue(initialSchedulerState())
    const before = introducedIds(state).length
    const { fact, state: after } = nextFact(state, createRng(1))
    expect(introducedIds(after)).toHaveLength(before + 1)
    expect(after.facts[fact.id]).toMatchObject({ introduced: true, box: 1, dueAt: after.globalCounter })
  })

  it('introduces from the lowest unlocked tier, in table order', () => {
    const state = nothingDue(initialSchedulerState())
    const { fact } = nextFact(state, createRng(1))
    expect(fact.tier).toBe(1)
    expect(fact.id).toBe('1x3')
  })

  it('does not introduce when enough facts are already due', () => {
    const state = initialSchedulerState()
    const before = introducedIds(state).length
    const { state: after } = nextFact(state, createRng(1))
    expect(introducedIds(after)).toHaveLength(before)
  })

  it('does not reach into a locked tier', () => {
    const state = initialSchedulerState(3)
    const tier1 = factsInTier(1, 3).map((fact) => fact.id)
    const allIntroduced = withFacts(nothingDue(state), tier1, { dueAt: FAR_FUTURE, box: 1 })
    const { fact, state: after } = nextFact(allIntroduced, createRng(1))
    expect(after.unlockedTiers).toEqual([1])
    expect(fact.tier).toBe(1)
  })
})

describe('nextFact — choosing among due facts', () => {
  it('serves the most overdue when DUE_WEIGHTING_THRESHOLD or fewer are due', () => {
    const base = nothingDue(initialSchedulerState())
    const dueIds = ['1x1', '1x2', '2x1', '2x2', '1x10', '10x1'].slice(0, DUE_WEIGHTING_THRESHOLD)
    const state = { ...withFacts(base, dueIds, { dueAt: 50 }), globalCounter: 100 }
    const mostOverdue = withFact(state, '2x2', { dueAt: 10 })
    for (const seed of [1, 2, 3, 4, 5]) {
      expect(nextFact(mostOverdue, createRng(seed)).fact.id).toBe('2x2')
    }
  })

  it('picks by weight, so the choice depends on the rng, when more are due', () => {
    const base = nothingDue(initialSchedulerState())
    const dueIds = ['1x1', '1x2', '2x1', '2x2', '1x10', '10x1', '2x10', '10x2']
    const state = { ...withFacts(base, dueIds, { dueAt: 50 }), globalCounter: 100 }
    const picks = new Set([1, 2, 3, 4, 5, 6, 7, 8].map((seed) => nextFact(state, createRng(seed)).fact.id))
    expect(picks.size).toBeGreaterThan(1)
    for (const id of picks) expect(dueIds).toContain(id)
  })

  it('falls back to the worst rolling-mean latency when nothing is due and nothing can be introduced', () => {
    const state = {
      ...withFact(
        withFact(
          withFact(withFact(initialSchedulerState(2), '1x1', { recentLatencies: [1000] }), '1x2', {
            recentLatencies: [5000, 4000],
          }),
          '2x1',
          { recentLatencies: [2000] },
        ),
        '2x2',
        { recentLatencies: [3000] },
      ),
    }
    const { fact, state: after } = nextFact(nothingDue(state), createRng(1))
    expect(fact.id).toBe('1x2')
    expect(introducedIds(after)).toHaveLength(4)
  })

  it('a fact with no latency history counts as the slowest', () => {
    const state = withFacts(initialSchedulerState(2), ['1x1', '1x2', '2x1'], { recentLatencies: [9000] })
    const { fact } = nextFact(nothingDue(state), createRng(1))
    expect(fact.id).toBe('2x2')
  })
})

describe('interleaving — never the same family three times in a row', () => {
  it('holds across 200 seeded next/grade cycles with mixed answers', () => {
    const { trace } = drive(initialSchedulerState(), createRng(12345), 200, (fact, i) => ({
      given: i % 5 === 0 ? fact.answer + 1 : fact.answer,
      latencyMs: i % 3 === 0 ? 5000 : 1500,
    }))
    const families = trace.map((cycle) => cycle.family)
    for (let i = 2; i < families.length; i++) {
      const run = families.slice(i - 2, i + 1)
      expect(new Set(run).size, `families[${i - 2}..${i}] = ${run}`).toBeGreaterThan(1)
    }
  })

  it('prefers introducing another family when every due fact is the blocked one', () => {
    // 3×3 table: families 1 and 2 are cold-start; family 3 waits in tier 1.
    const state: SchedulerState = {
      ...withFact(initialSchedulerState(3), '1x1', { dueAt: FAR_FUTURE }),
      recentFamilies: [2, 2],
    }
    const { fact, state: after } = nextFact(state, createRng(1))
    expect(fact.family).toBe(3)
    expect(after.facts[fact.id]?.introduced).toBe(true)
  })

  it('pulls another family’s soonest-due fact forward when nothing can be introduced', () => {
    // 2×2 table: everything is introduced; only family 2 is due and it is blocked.
    const state: SchedulerState = {
      ...withFact(initialSchedulerState(2), '1x1', { dueAt: FAR_FUTURE }),
      recentFamilies: [2, 2],
    }
    const { fact } = nextFact(state, createRng(1))
    expect(fact.id).toBe('1x1')
  })

  it('among other families it pulls the soonest-due fact, not the first in table order', () => {
    // 3×3 table with tier 1 fully introduced and tier 2 locked, so nothing can be introduced.
    const tier1Family3 = ['1x3', '2x3', '3x1', '3x2']
    const waiting = withFacts(
      withFact(initialSchedulerState(3), '1x1', { dueAt: 200 }),
      tier1Family3,
      { box: 1, dueAt: 150 },
    )
    const state: SchedulerState = {
      ...withFact(waiting, '3x1', { dueAt: 120 }),
      recentFamilies: [2, 2],
    }
    const { fact, state: after } = nextFact(state, createRng(1))
    expect(fact.id).toBe('3x1')
    expect(introducedIds(after)).toHaveLength(introducedIds(state).length)
  })

  it('introduces from a higher unlocked tier when the lowest tier has only the blocked family left', () => {
    // Tiers 1–4 unlocked; 9×8 is the last un-introduced tier-4 fact and family 9 is blocked.
    // Tier 5 (the 6s, 7s, 8s) still has other families to introduce, so one of those comes next.
    const tiersTo4 = buildFacts()
      .filter((fact) => fact.tier <= 4 && fact.id !== '9x8')
      .map((fact) => fact.id)
    const state: SchedulerState = {
      ...withFacts(initialSchedulerState(), tiersTo4, { box: 2, dueAt: FAR_FUTURE }),
      unlockedTiers: [1, 2, 3, 4, 5],
      recentFamilies: [9, 9],
    }
    const { fact, state: after } = nextFact(state, createRng(1))
    expect(fact.tier).toBe(5)
    expect(fact.family).not.toBe(9)
    expect(after.facts[fact.id]?.introduced).toBe(true)
    expect(after.facts['9x8']?.introduced).toBe(false)
  })

  it('serves another family’s due fact instead of introducing the blocked family', () => {
    // Review repro: recentFamilies [9, 9], 9×8 is the only introducible fact, 2×2 is due.
    const tiersTo4 = buildFacts()
      .filter((fact) => fact.tier <= 4 && fact.id !== '9x8')
      .map((fact) => fact.id)
    const waiting = withFacts(initialSchedulerState(), tiersTo4, { box: 2, dueAt: FAR_FUTURE })
    const state: SchedulerState = {
      ...withFact(waiting, '2x2', { dueAt: 0 }),
      unlockedTiers: [1, 2, 3, 4],
      recentFamilies: [9, 9],
    }
    const { fact, state: after } = nextFact(state, createRng(1))
    expect(fact.id).toBe('2x2')
    expect(after.facts['9x8']?.introduced).toBe(false)
  })

  it('only a single-family board forces a repeat', () => {
    let state = initialSchedulerState(1)
    const served: number[] = []
    for (let i = 0; i < 4; i++) {
      const next = nextFact(state, createRng(i))
      served.push(next.fact.family)
      state = gradeAnswer(next.state, { factId: next.fact.id, given: 1, latencyMs: 900 }).state
    }
    expect(served).toEqual([1, 1, 1, 1])
  })

  it('records the served family and fact in the returned state', () => {
    const { fact, state } = nextFact(initialSchedulerState(), createRng(1))
    expect(state.recentFamilies).toEqual([fact.family])
    expect(state.lastServed).toBe(fact.id)
  })
})

describe('introduction tiers', () => {
  it('tier 3 does not unlock while tier 2 is below 80% at box 3+', () => {
    const tier1 = factsInTier(1).map((fact) => fact.id)
    const tier2 = factsInTier(2).map((fact) => fact.id)
    const rng = createRng(1)

    const tier1Done = withFacts(initialSchedulerState(), tier1, { box: 4 })
    const afterTier1 = nextFact(tier1Done, rng).state
    expect(afterTier1.unlockedTiers).toContain(2)
    expect(afterTier1.unlockedTiers).not.toContain(3)

    const halfTier2 = withFacts(afterTier1, tier2.slice(0, Math.floor(tier2.length * 0.5)), { box: 3 })
    expect(nextFact(halfTier2, rng).state.unlockedTiers).not.toContain(3)

    const mostTier2 = withFacts(afterTier1, tier2.slice(0, Math.ceil(tier2.length * 0.85)), { box: 3 })
    expect(nextFact(mostTier2, rng).state.unlockedTiers).toContain(3)
  })

  it('unlocks several tiers at once when they are all ready', () => {
    const ready = withFacts(
      initialSchedulerState(),
      buildFacts().map((fact) => fact.id),
      { box: 5 },
    )
    expect(nextFact(ready, createRng(1)).state.unlockedTiers).toEqual([1, 2, 3, 4, 5, 6])
  })
})

describe('determinism', () => {
  const run = (seed: number): string[] =>
    drive(initialSchedulerState(), createRng(seed), 150, (fact, i) => ({
      given: fact.answer,
      latencyMs: i % 3 === 0 ? 4000 : 1500,
    })).trace.map((cycle) => cycle.factId)

  it('a seeded run is reproducible', () => {
    expect(run(4242)).toEqual(run(4242))
  })

  it('different seeds diverge', () => {
    expect(run(4242)).not.toEqual(run(9999))
  })

  it('a long run keeps the full fact table and keeps the counter in step', () => {
    const { state } = drive(initialSchedulerState(), createRng(1), 300)
    expect(Object.keys(state.facts)).toHaveLength(144)
    expect(state.globalCounter).toBe(300)
  })
})
