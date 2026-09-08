import { describe, expect, it } from 'vitest'
import { drive, introducedIds, withFact, withFacts } from '../../test/fixtures'
import { buyFeedBundle, FEED_BUNDLE_PRICE } from '../economy/coins'
import { buildFacts, factsInFamily, factsInTier } from '../facts/table'
import { MASTERY_BOX, MAX_TABLE_DEFAULT, MIN_TABLE } from '../facts/tuning'
import { createRng } from '../rng'
import { emptyFarmSave } from '../save/empty'
import { gradeAnswer } from './grade'
import { nextFact, nextFactInFamily } from './next'
import { familyProgress, isFactMastered, isFamilyMastered } from './progress'
import { initialSchedulerState } from './state'
import type { SchedulerState } from './types'

const FAR_FUTURE = 99_999
const FLUENT = [900, 900, 900]

/** Every introduced fact pushed out of reach, so nothing is due. */
function nothingDue(state: SchedulerState): SchedulerState {
  return withFacts(state, introducedIds(state), { dueAt: FAR_FUTURE })
}

// ─── maxTable ───

describe('maxTable boundaries', () => {
  // Infinity and 1e12 must be refused up front: buildFacts would otherwise loop until OOM.
  it.each([0, -1, MAX_TABLE_DEFAULT + 1, Number.NaN, 1.5, Number.POSITIVE_INFINITY, 1e12])(
    'initialSchedulerState and emptyFarmSave refuse a table of %s outside MIN_TABLE..MAX_TABLE_DEFAULT',
    (maxTable) => {
      expect(() => initialSchedulerState(maxTable)).toThrow(RangeError)
      expect(() => emptyFarmSave(maxTable)).toThrow(RangeError)
    },
  )

  it('every fact a state holds can be graded, for every valid table size', () => {
    // getFact() only knows the 12×12 table, so no accepted size may create a fact outside it.
    for (let n = MIN_TABLE; n <= MAX_TABLE_DEFAULT; n++) {
      const state = initialSchedulerState(n)
      const unknown = Object.keys(state.facts).filter((id) => {
        try {
          gradeAnswer(withFact(state, id, { box: 1 }), { factId: id, given: 1, latencyMs: 900 })
          return false
        } catch {
          return true
        }
      })
      expect(unknown, `n=${n}`).toEqual([])
    }
  })

  it('emptyFarmSave(n) keeps settings.maxTable, scheduler.maxTable and the fact count in step for every valid n', () => {
    for (let n = MIN_TABLE; n <= MAX_TABLE_DEFAULT; n++) {
      const farm = emptyFarmSave(n)
      expect(farm.settings.maxTable, `n=${n}`).toBe(n)
      expect(farm.scheduler.maxTable, `n=${n}`).toBe(n)
      expect(Object.keys(farm.scheduler.facts), `n=${n}`).toHaveLength(n * n)
    }
  })

  it('a single-fact board (maxTable 1) can be played to mastery and hatches', () => {
    const { state, trace } = drive(initialSchedulerState(1), createRng(1), 30)
    expect(trace.every((cycle) => cycle.factId === '1x1')).toBe(true)
    expect(isFamilyMastered(state, 1)).toBe(true)
    expect(familyProgress(state, 1)).toBe(1)
  })
})

// ─── gradeAnswer inputs the type system does not stop ───

describe('gradeAnswer — hostile inputs', () => {
  it('grading an un-introduced fact is refused, so "box 0 ⇔ not introduced" cannot be broken', () => {
    // The application only grades what it served; grading a box-0 fact would leave it
    // boxed but un-introduced, so the domain refuses rather than guess an introduction.
    const state = initialSchedulerState()
    expect(state.facts['7x8']?.introduced).toBe(false)
    for (const latencyMs of [900, 5000, 9000]) {
      expect(() => gradeAnswer(state, { factId: '7x8', given: 56, latencyMs })).toThrow(/never introduced/)
    }
  })

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, -1])(
    'a latency of %s is never recorded — latency is a finite, non-negative duration',
    (latencyMs) => {
      const state = withFact(initialSchedulerState(), '7x8', { box: 3 })
      let after: SchedulerState | null = null
      try {
        after = gradeAnswer(state, { factId: '7x8', given: 56, latencyMs }).state
      } catch {
        // Throwing is an acceptable way to refuse a nonsensical duration.
        return
      }
      const status = after.facts['7x8']
      expect(status?.lastLatencyMs).not.toBe(latencyMs)
      expect(status?.recentLatencies.every((ms) => Number.isFinite(ms) && ms >= 0)).toBe(true)
    },
  )

  it('a NaN latency on a correct answer must not demote the fact', () => {
    const state = withFact(initialSchedulerState(), '7x8', { box: 3 })
    let result
    try {
      result = gradeAnswer(state, { factId: '7x8', given: 56, latencyMs: Number.NaN }).result
    } catch {
      return
    }
    expect(result.newBox).toBeGreaterThanOrEqual(3)
  })

  it.each([Number.NaN, 1.5, -0, Number.POSITIVE_INFINITY, 56.0000001])(
    'a given of %s that is not the answer grades WRONG, resets to box 1 and reports the correct answer',
    (given) => {
      const state = withFact(initialSchedulerState(), '7x8', { box: 4, recentLatencies: FLUENT })
      const { result, state: after } = gradeAnswer(state, { factId: '7x8', given, latencyMs: 900 })
      expect(result.outcome).toBe('WRONG')
      expect(result.correctAnswer).toBe(56)
      expect(after.facts['7x8']?.box).toBe(1)
      expect(after.facts['7x8']?.correctStreak).toBe(0)
    },
  )

  it('grades the first fact an egg round introduces into a family with nothing introduced yet', () => {
    const state = initialSchedulerState()
    expect(factsInFamily(5).some((fact) => state.facts[fact.id]?.introduced)).toBe(false)
    const served = nextFactInFamily(state, 5, createRng(1))
    expect(served.fact.family).toBe(5)
    expect(served.state.facts[served.fact.id]).toMatchObject({ introduced: true, box: 1 })
    const graded = gradeAnswer(served.state, { factId: served.fact.id, given: served.fact.answer, latencyMs: 900 })
    expect(graded.result.newBox).toBe(2)
  })

  it('an empty fact id and a lookalike id are refused, not silently graded', () => {
    const state = initialSchedulerState()
    expect(() => gradeAnswer(state, { factId: '', given: 1, latencyMs: 900 })).toThrow(/unknown fact/)
    expect(() => gradeAnswer(state, { factId: '07x8', given: 56, latencyMs: 900 })).toThrow(/unknown fact/)
    expect(() => gradeAnswer(state, { factId: '8 x 7', given: 56, latencyMs: 900 })).toThrow(/unknown fact/)
  })
})

// ─── nextFact edge states ───

describe('nextFact — edge states', () => {
  it('serves without introducing when every fact is mastered', () => {
    const all = buildFacts().map((fact) => fact.id)
    const mastered = withFacts(initialSchedulerState(), all, { box: MASTERY_BOX, recentLatencies: FLUENT, dueAt: FAR_FUTURE })
    const { fact, state } = nextFact(mastered, createRng(1))
    expect(fact).toBeDefined()
    expect(introducedIds(state)).toHaveLength(all.length)
    expect(Object.values(state.facts).every(isFactMastered)).toBe(true)
  })

  it('keeps serving mastered facts that fall due again (mastery is not retirement)', () => {
    const all = buildFacts().map((fact) => fact.id)
    const mastered = withFacts(initialSchedulerState(), all, { box: MASTERY_BOX, recentLatencies: FLUENT, dueAt: 0 })
    const state = { ...mastered, globalCounter: 200 }
    const { fact } = nextFact(state, createRng(1))
    expect(state.facts[fact.id]?.box).toBe(MASTERY_BOX)
  })

  it('an introduction never breaks the interleave rule when the lowest tier has only the blocked family left', () => {
    // Tier 1 in table order ends with 12×1, 12×2, 12×10 — all family 12. Two 12s were just
    // served and nothing is due, so the scheduler wants to introduce; it must not pick a third 12.
    const tier1 = factsInTier(1).map((fact) => fact.id)
    const remaining = ['12x1', '12x2', '12x10']
    const introduced = withFacts(initialSchedulerState(), tier1.filter((id) => !remaining.includes(id)), {
      box: 2,
      dueAt: FAR_FUTURE,
    })
    const state: SchedulerState = { ...introduced, recentFamilies: [12, 12] }
    const { fact } = nextFact(state, createRng(1))
    expect(fact.family).not.toBe(12)
  })

  it('the first three introductions on a fresh maxTable-3 board are not all family 3', () => {
    // Tier 1 on a 3×3 table has exactly four un-introduced facts, all family 3.
    const { trace } = drive(nothingDue(initialSchedulerState(3)), createRng(1), 3)
    expect(trace.map((cycle) => cycle.family)).not.toEqual([3, 3, 3])
  })

  it('unlocks the next tier at exactly 80% of the current tier at box 3, and not one fact fewer', () => {
    const tier1 = factsInTier(1).map((fact) => fact.id)
    const needed = Math.ceil(tier1.length * 0.8)
    const oneShort = withFacts(initialSchedulerState(), tier1.slice(0, needed - 1), { box: 3 })
    expect(nextFact(oneShort, createRng(1)).state.unlockedTiers).toEqual([1])
    const exactly = withFacts(initialSchedulerState(), tier1.slice(0, needed), { box: 3 })
    expect(nextFact(exactly, createRng(1)).state.unlockedTiers).toEqual([1, 2])
  })
})

// ─── nextFactInFamily edge states ───

describe('nextFactInFamily — edge states', () => {
  it('does not repeat the sole unmastered fact when mastered family facts could be asked instead', () => {
    const ids = factsInFamily(3).map((fact) => fact.id)
    const mastered = withFacts(initialSchedulerState(), ids, { box: MASTERY_BOX, recentLatencies: FLUENT, dueAt: FAR_FUTURE })
    const oneLeft = withFact(mastered, '3x3', { box: 2, recentLatencies: [2000], dueAt: 0 })
    const state: SchedulerState = { ...oneLeft, lastServed: '3x3', recentFamilies: [3] }
    expect(nextFactInFamily(state, 3, createRng(1)).fact.id).not.toBe('3x3')
  })

  it('a family with a single fact (family 1) necessarily repeats and never throws', () => {
    const state: SchedulerState = { ...initialSchedulerState(), lastServed: '1x1' }
    expect(nextFactInFamily(state, 1, createRng(1)).fact.id).toBe('1x1')
  })

  it.each([0, -1, 13, Number.NaN, 1.5])('family %s has no facts: falls back to mixed practice without introducing into it', (family) => {
    const state = initialSchedulerState()
    const served = nextFactInFamily(state, family, createRng(1))
    expect(served.fact.family).not.toBe(family)
    expect(Object.keys(served.state.facts)).toEqual(Object.keys(state.facts))
  })
})

// ─── progress and economy boundaries ───

describe('familyProgress — out-of-range families', () => {
  it.each([0, -1, 13, Number.NaN, 1.5, Number.POSITIVE_INFINITY])('family %s reports 0 progress and not mastered', (family) => {
    const state = initialSchedulerState()
    expect(familyProgress(state, family)).toBe(0)
    expect(isFamilyMastered(state, family)).toBe(false)
  })
})

describe('mastery via commutative credit', () => {
  it('a family completed by a twin’s credit still reports familyJustMastered', () => {
    // Family 2 = 1×2, 2×1, 2×2. Credit on 2×1 (box 4, fluent recents, half a box banked) completes it.
    const base = withFacts(initialSchedulerState(), ['1x2', '2x2'], { box: MASTERY_BOX, recentLatencies: FLUENT })
    const almost = withFact(base, '2x1', { box: 4, recentLatencies: FLUENT })
    const state: SchedulerState = { ...almost, commuteCredit: { '2x1': 0.5 } }
    const { result, state: after } = gradeAnswer(state, { factId: '1x2', given: 2, latencyMs: 900 })
    expect(after.facts['2x1']?.box).toBe(MASTERY_BOX)
    expect(isFamilyMastered(after, 2)).toBe(true)
    expect(result.familyJustMastered).toBe(2)
  })
})

describe('buyFeedBundle — exact boundaries', () => {
  it('one coin short is refused and leaves the farm untouched', () => {
    const farm = { ...emptyFarmSave(), coins: FEED_BUNDLE_PRICE - 1 }
    expect(buyFeedBundle(farm)).toEqual({ ok: false, reason: 'not-enough-coins' })
    expect(farm.coins).toBe(FEED_BUNDLE_PRICE - 1)
  })

  it('exactly the price leaves zero coins, never negative', () => {
    const bought = buyFeedBundle({ ...emptyFarmSave(), coins: FEED_BUNDLE_PRICE })
    expect(bought.ok && bought.farm.coins).toBe(0)
    expect(bought.ok && bought.farm.coins >= 0).toBe(true)
  })

  it('negative coins can never buy feed', () => {
    expect(buyFeedBundle({ ...emptyFarmSave(), coins: -FEED_BUNDLE_PRICE }).ok).toBe(false)
  })
})
