import { describe, expect, it } from 'vitest'
import { createRng } from '@/contracts'
import type { FactState, SchedulerState } from '@/contracts'
import { ALL_FACTS } from './facts'
import { createScheduler, initialSchedulerState } from './scheduler'

/** Force a fact into a known state before handing the scheduler its state object. */
function setFact(state: SchedulerState, id: string, patch: Partial<FactState>): void {
  state.facts[id] = { ...state.facts[id], introduced: true, ...patch }
}

describe('grading — latency is the primary promotion signal', () => {
  it('a correct-but-slow (5000 ms) answer does not advance a fact to box 5', () => {
    const state = initialSchedulerState()
    setFact(state, '5x6', { box: 4 })
    const s = createScheduler(state, { rng: createRng(1) })

    const r = s.grade('5x6', 30, 5000)

    expect(r.outcome).toBe('SLOW')
    expect(r.previousBox).toBe(4)
    expect(r.newBox).toBe(4)
    expect(state.facts['5x6'].box).toBe(4)
  })

  it('a SLOW answer re-queues sooner than a fresh promotion would', () => {
    const state = initialSchedulerState()
    setFact(state, '5x6', { box: 4, dueAt: 0 })
    const s = createScheduler(state, { rng: createRng(1) })

    s.grade('5x6', 30, 4000)

    // box 4 normally schedules 60 questions out; SLOW clamps to box 1's interval (3).
    expect(state.facts['5x6'].dueAt).toBe(state.globalCounter + 3)
  })

  it('a LABORED answer demotes one box', () => {
    const state = initialSchedulerState()
    setFact(state, '6x7', { box: 3 })
    const s = createScheduler(state, { rng: createRng(1) })

    const r = s.grade('6x7', 42, 9000)

    expect(r.outcome).toBe('LABORED')
    expect(r.newBox).toBe(2)
    expect(state.facts['6x7'].box).toBe(2)
  })

  it('a LABORED answer on a box-1 fact leaves it at box 1', () => {
    const state = initialSchedulerState()
    setFact(state, '6x7', { box: 1 })
    const s = createScheduler(state, { rng: createRng(1) })

    const r = s.grade('6x7', 42, 12000)

    expect(r.outcome).toBe('LABORED')
    expect(r.newBox).toBe(1)
    expect(state.facts['6x7'].box).toBe(1)
  })

  it('a WRONG answer resets to box 1 regardless of prior box', () => {
    const state = initialSchedulerState()
    setFact(state, '8x9', { box: 5, recentLatencies: [900, 900, 900] })
    const s = createScheduler(state, { rng: createRng(1) })

    const r = s.grade('8x9', 71, 500)

    expect(r.outcome).toBe('WRONG')
    expect(r.correct).toBe(false)
    expect(r.newBox).toBe(1)
    expect(state.facts['8x9'].box).toBe(1)
  })

  it('grade() advances the global counter by exactly 1', () => {
    const state = initialSchedulerState()
    const s = createScheduler(state, { rng: createRng(1) })
    const before = state.globalCounter
    s.grade('1x2', 2, 1000)
    expect(state.globalCounter).toBe(before + 1)
  })
})

describe('commutativity — the twin is half-promoted, never demoted', () => {
  it('answering 7×8 correctly raises 8×7’s progress and never lowers it', () => {
    const state = initialSchedulerState()
    setFact(state, '7x8', { box: 1 })
    setFact(state, '8x7', { box: 1 })
    const s = createScheduler(state, { rng: createRng(1) })

    // Half a box per correct answer: one correct is not yet a full box.
    s.grade('7x8', 56, 1000)
    expect(state.facts['8x7'].box).toBe(1)

    // Two correct answers → one full box on the twin.
    s.grade('7x8', 56, 1000)
    expect(state.facts['8x7'].box).toBe(2)

    // Across a mixed run the twin's box is monotonically non-decreasing.
    const seq: number[] = []
    for (let i = 0; i < 30; i++) {
      const wrong = i % 4 === 0
      s.grade('7x8', wrong ? 0 : 56, 1000)
      seq.push(state.facts['8x7'].box)
    }
    for (let i = 1; i < seq.length; i++) {
      expect(seq[i]).toBeGreaterThanOrEqual(seq[i - 1])
    }
    expect(state.facts['8x7'].box).toBe(5)
  })

  it('a square (7×7) has no distinct twin to promote', () => {
    const state = initialSchedulerState()
    setFact(state, '7x7', { box: 1 })
    const s = createScheduler(state, { rng: createRng(1) })
    expect(() => s.grade('7x7', 49, 1000)).not.toThrow()
    expect(state.facts['7x7'].box).toBe(2)
  })
})

describe('interleaving — never the same family three times in a row', () => {
  it('holds across 200 seeded next()/grade() cycles', () => {
    const state = initialSchedulerState()
    const s = createScheduler(state, { rng: createRng(12345) })
    const families: number[] = []

    for (let i = 0; i < 200; i++) {
      const fact = s.next()
      families.push(fact.family)
      const wrong = i % 5 === 0
      const slow = i % 3 === 0
      s.grade(fact.id, wrong ? fact.answer + 1 : fact.answer, slow ? 5000 : 1500)
    }

    for (let i = 2; i < families.length; i++) {
      const threeInARow =
        families[i] === families[i - 1] && families[i - 1] === families[i - 2]
      expect(threeInARow, `families[${i - 2}..${i}] = ${families.slice(i - 2, i + 1)}`).toBe(
        false,
      )
    }
  })
})

describe('introduction tiers', () => {
  it('tier 3 does not unlock while tier 2 is below 80% at box 3+', () => {
    const state = initialSchedulerState()
    const s = createScheduler(state, { rng: createRng(1) })

    const tier1 = ALL_FACTS.filter((f) => f.tier === 1)
    const tier2 = ALL_FACTS.filter((f) => f.tier === 2)

    // Tier 1 fully at box 3+ → tier 2 unlocks, tier 3 does not.
    for (const f of tier1) setFact(state, f.id, { box: 4 })
    s.next()
    expect(state.unlockedTiers).toContain(2)
    expect(state.unlockedTiers).not.toContain(3)

    // Half of tier 2 at box 3+ → still short of the 80% gate.
    const half = Math.floor(tier2.length * 0.5)
    for (let i = 0; i < half; i++) setFact(state, tier2[i].id, { box: 3 })
    s.next()
    expect(state.unlockedTiers).not.toContain(3)

    // Push tier 2 past 80% → tier 3 unlocks.
    const most = Math.ceil(tier2.length * 0.85)
    for (let i = 0; i < most; i++) setFact(state, tier2[i].id, { box: 3 })
    s.next()
    expect(state.unlockedTiers).toContain(3)
  })

  it('introduces a fact when too few are due', () => {
    const state = initialSchedulerState()
    // Push every introduced fact far into the future so nothing is due.
    for (const fs of Object.values(state.facts)) {
      if (fs.introduced) fs.dueAt = 9999
    }
    const s = createScheduler(state, { rng: createRng(1) })
    const introducedBefore = Object.values(state.facts).filter((f) => f.introduced).length

    s.next()

    const introducedAfter = Object.values(state.facts).filter((f) => f.introduced).length
    expect(introducedAfter).toBe(introducedBefore + 1)
  })
})

describe('mastery and familyProgress', () => {
  it('familyProgress is exactly 1.0 only when every fact in the family is mastered', () => {
    const state = initialSchedulerState()
    const s = createScheduler(state, { rng: createRng(1) })

    // Family 1 = { 1×1 } — a single fact, introduced at cold start.
    setFact(state, '1x1', { box: 5, recentLatencies: [900, 5000] })
    expect(s.isMastered(1)).toBe(false)
    expect(s.familyProgress(1)).toBeCloseTo(0.98)

    setFact(state, '1x1', { box: 5, recentLatencies: [900, 900, 900] })
    expect(s.isMastered(1)).toBe(true)
    expect(s.familyProgress(1)).toBe(1)
  })

  it('caps at 0.98 while unmastered even when every fact is at box 5', () => {
    const state = initialSchedulerState()
    const s = createScheduler(state, { rng: createRng(1) })
    const fam3 = ALL_FACTS.filter((f) => f.family === 3)

    for (const f of fam3) {
      setFact(state, f.id, { box: 5, recentLatencies: [9000, 9000, 9000] })
    }
    expect(s.isMastered(3)).toBe(false)
    expect(s.familyProgress(3)).toBe(0.98)
  })

  it('familyProgress is the share of the family at box >= 3', () => {
    const state = initialSchedulerState()
    const s = createScheduler(state, { rng: createRng(1) })
    const fam4 = ALL_FACTS.filter((f) => f.family === 4)

    setFact(state, fam4[0].id, { box: 3 })
    setFact(state, fam4[1].id, { box: 4 })
    expect(s.familyProgress(4)).toBeCloseTo(2 / fam4.length)
  })

  it('grade() reports factMastered and familyJustMastered on the completing answer', () => {
    const state = initialSchedulerState()
    setFact(state, '1x1', { box: 4, recentLatencies: [900, 900] })
    const s = createScheduler(state, { rng: createRng(1) })

    const r = s.grade('1x1', 1, 900)

    expect(r.newBox).toBe(5)
    expect(r.factMastered).toBe(true)
    expect(r.familyJustMastered).toBe(1)
  })
})

describe('determinism', () => {
  const run = (seed: number): string[] => {
    const s = createScheduler(initialSchedulerState(), { rng: createRng(seed) })
    const ids: string[] = []
    for (let i = 0; i < 150; i++) {
      const f = s.next()
      ids.push(f.id)
      s.grade(f.id, f.answer, i % 3 === 0 ? 4000 : 1500)
    }
    return ids
  }

  it('a seeded run is reproducible', () => {
    expect(run(4242)).toEqual(run(4242))
  })

  it('different seeds diverge', () => {
    expect(run(4242)).not.toEqual(run(9999))
  })
})

describe('snapshot', () => {
  it('returns a deep copy that later grades do not mutate', () => {
    const s = createScheduler(initialSchedulerState(), { rng: createRng(1) })
    s.next()
    const snap = s.snapshot()
    const gc = snap.globalCounter

    s.grade('1x2', 2, 1000)

    expect(snap.globalCounter).toBe(gc)
  })

  it('the snapshot carries the full fact table and can seed a new scheduler', () => {
    const s = createScheduler(initialSchedulerState(), { rng: createRng(1) })
    for (let i = 0; i < 20; i++) {
      const f = s.next()
      s.grade(f.id, f.answer, 1500)
    }
    const snap = s.snapshot()
    expect(Object.keys(snap.facts)).toHaveLength(ALL_FACTS.length)
    expect(() => createScheduler(snap, { rng: createRng(1) }).next()).not.toThrow()
  })
})
