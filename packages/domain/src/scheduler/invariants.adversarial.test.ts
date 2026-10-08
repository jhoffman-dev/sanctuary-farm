import { describe, expect, it } from 'vitest'
import type { AnswerPolicy } from '../../test/fixtures'
import { alwaysFluent, deepFreeze, drive } from '../../test/fixtures'
import type { Fact, FactState, Outcome } from '../facts/fact'
import { buildFacts, factsInFamily } from '../facts/table'
import {
  EGG_ROTATION,
  FLUENT_MAX_MS,
  INTERLEAVE_MAX_CONSECUTIVE,
  MASTERY_BOX,
  MASTERY_RECENT_FLUENT_COUNT,
  MAX_RECENT_LATENCIES,
  TIER_UNLOCK_BOX3_SHARE,
} from '../facts/tuning'
import { createRng } from '../rng'
import type { Rng } from '../rng'
import { gradeAnswer } from './grade'
import { nextFact, nextFactInFamily } from './next'
import { familyProgress, isFactMastered, isFamilyMastered } from './progress'
import { initialSchedulerState } from './state'
import type { SchedulerState } from './types'

// ─── Driven runs that keep every intermediate state, so per-step invariants can be checked ───

type Step = {
  index: number
  served: Fact
  outcome: Outcome
  /** State returned by next*(): after the serve, before the grade. */
  afterServe: SchedulerState
  /** State returned by gradeAnswer(). */
  afterGrade: SchedulerState
}

type Picker = (state: SchedulerState, rng: Rng) => ReturnType<typeof nextFact>

function play(
  initial: SchedulerState,
  rng: Rng,
  count: number,
  policy: AnswerPolicy,
  pick: Picker = nextFact,
): Step[] {
  const steps: Step[] = []
  let state = initial
  for (let i = 0; i < count; i++) {
    const served = pick(state, rng)
    const { given, latencyMs } = policy(served.fact, i)
    const graded = gradeAnswer(served.state, { factId: served.fact.id, given, latencyMs })
    steps.push({
      index: i,
      served: served.fact,
      outcome: graded.result.outcome,
      afterServe: served.state,
      afterGrade: graded.state,
    })
    state = graded.state
  }
  return steps
}

/** Wrong every 7th, labored every 11th, slow every 3rd, fluent otherwise. */
const mixed: AnswerPolicy = (fact, i) => ({
  given: i % 7 === 0 ? fact.answer + 1 : fact.answer,
  latencyMs: i % 11 === 0 ? 9000 : i % 3 === 0 ? 5000 : 1200,
})

/** A struggling child: wrong two in five, never fluent. */
const struggling: AnswerPolicy = (fact, i) => ({
  given: i % 5 < 2 ? fact.answer - 1 : fact.answer,
  latencyMs: i % 2 === 0 ? 4000 : 9500,
})

const POLICIES: ReadonlyArray<[string, AnswerPolicy]> = [
  ['always fluent', alwaysFluent],
  ['mixed', mixed],
  ['struggling', struggling],
]
const SEEDS = [1, 42, 98765]
const RUN_LENGTH = 500
/**
 * The long-run sweeps are deterministic but CPU-bound (seconds under coverage), so they get an
 * explicit budget: vitest's 5 s default made them fail on a loaded machine (SF-81).
 */
const LONG_RUN_TIMEOUT_MS = 30_000

type Run = { label: string; maxTable: number; steps: Step[] }

function runsFor(maxTable: number, length = RUN_LENGTH): Run[] {
  return POLICIES.flatMap(([name, policy]) =>
    SEEDS.map((seed) => ({
      label: `${name} / seed ${seed} / maxTable ${maxTable}`,
      maxTable,
      steps: play(initialSchedulerState(maxTable), createRng(seed), length, policy),
    })),
  )
}

const RUNS_12 = runsFor(12)
const RUNS_3 = runsFor(3, 300)
const RUNS_2 = runsFor(2, 300)

type StepCheck = (step: Step, run: Run) => string | null
type FactCheck = (status: FactState, state: SchedulerState) => string | null

/** First violation across every step of every run, or null. Plain loops: millions of expect() calls time out. */
function firstStepViolation(runs: readonly Run[], check: StepCheck): string | null {
  for (const run of runs) {
    for (const step of run.steps) {
      const violation = check(step, run)
      if (violation) return `${run.label} @ step ${step.index} (served ${step.served.id}): ${violation}`
    }
  }
  return null
}

/** Applies a per-fact check to both states of every step. */
function firstFactViolation(runs: readonly Run[], check: FactCheck): string | null {
  return firstStepViolation(runs, (step) => {
    for (const state of [step.afterServe, step.afterGrade]) {
      for (const status of Object.values(state.facts)) {
        const violation = check(status, state)
        if (violation) return `${status.id}: ${violation}`
      }
    }
    return null
  })
}

function longestRun(families: readonly number[]): number {
  let longest = 0
  let current = 0
  let previous: number | null = null
  for (const family of families) {
    current = family === previous ? current + 1 : 1
    previous = family
    longest = Math.max(longest, current)
  }
  return longest
}

// ─── Determinism and purity ───

describe('determinism — a seeded session is a pure function of the seed', () => {
  it('a 500-question mixed run played twice ends in deep-equal states with identical traces', () => {
    const first = drive(initialSchedulerState(), createRng(2024), 500, mixed)
    const second = drive(initialSchedulerState(), createRng(2024), 500, mixed)
    expect(first.trace).toEqual(second.trace)
    expect(first.state).toEqual(second.state)
  })

  it('a 300-question family (egg) run played twice ends in deep-equal states', () => {
    const family: Picker = (state, rng) => nextFactInFamily(state, 7, rng)
    const first = play(initialSchedulerState(), createRng(77), 300, mixed, family)
    const second = play(initialSchedulerState(), createRng(77), 300, mixed, family)
    expect(first.map((step) => step.served.id)).toEqual(second.map((step) => step.served.id))
    expect(first.at(-1)?.afterGrade).toEqual(second.at(-1)?.afterGrade)
  })

  it('a state that survived a JSON round-trip continues identically to the original', () => {
    const midway = drive(initialSchedulerState(), createRng(5), 200, mixed).state
    const reloaded = JSON.parse(JSON.stringify(midway)) as SchedulerState
    const fromOriginal = drive(midway, createRng(6), 200, mixed)
    const fromReloaded = drive(reloaded, createRng(6), 200, mixed)
    expect(fromReloaded.trace).toEqual(fromOriginal.trace)
    expect(fromReloaded.state).toEqual(fromOriginal.state)
  })
})

describe('purity — every exported function leaves a frozen mid-run state deep-equal to its snapshot', () => {
  const midway = deepFreeze(drive(initialSchedulerState(), createRng(9), 250, mixed).state)
  const snapshot = JSON.parse(JSON.stringify(midway)) as SchedulerState

  it('after nextFact', () => {
    nextFact(midway, createRng(1))
    expect(midway).toEqual(snapshot)
  })

  it('after nextFactInFamily for in-range and out-of-range families', () => {
    for (const family of [1, 2, 7, 12, 13, 0]) nextFactInFamily(midway, family, createRng(1))
    expect(midway).toEqual(snapshot)
  })

  it('after gradeAnswer with every outcome on every introduced fact', () => {
    for (const status of Object.values(midway.facts)) {
      if (!status.introduced) continue
      const fact = buildFacts().find((candidate) => candidate.id === status.id)
      if (!fact) throw new Error(`no fact ${status.id}`)
      for (const latencyMs of [900, 5000, 9000]) {
        gradeAnswer(midway, { factId: fact.id, given: fact.answer, latencyMs })
      }
      gradeAnswer(midway, { factId: fact.id, given: -1, latencyMs: 900 })
    }
    expect(midway).toEqual(snapshot)
  })

  it('after familyProgress and isFamilyMastered for in-range and out-of-range families', () => {
    for (const family of [0, 1, 2, 3, 12, 13]) {
      familyProgress(midway, family)
      isFamilyMastered(midway, family)
    }
    expect(midway).toEqual(snapshot)
  })

  it('a 500-step run alternating mixed and egg practice over deep-frozen states never throws', () => {
    let state = deepFreeze(initialSchedulerState())
    const rng = createRng(31)
    for (let i = 0; i < 500; i++) {
      const served = deepFreeze(
        i % 2 === 0 ? nextFact(state, rng) : nextFactInFamily(state, 1 + (i % 12), rng),
      )
      const { given, latencyMs } = mixed(served.fact, i)
      state = deepFreeze(gradeAnswer(served.state, { factId: served.fact.id, given, latencyMs }).state)
    }
    expect(state.globalCounter).toBe(500)
  })
})

// ─── Structural invariants over long runs ───

describe('structural invariants hold at every step of long seeded runs (maxTable 12)', { timeout: LONG_RUN_TIMEOUT_MS }, () => {
  it('box is always an integer in 0..MASTERY_BOX', () => {
    const violation = firstFactViolation(RUNS_12, (status) =>
      Number.isInteger(status.box) && status.box >= 0 && status.box <= MASTERY_BOX
        ? null
        : `box=${status.box}`,
    )
    expect(violation).toBeNull()
  })

  it('box 0 if and only if the fact is not introduced', () => {
    const violation = firstFactViolation(RUNS_12, (status) =>
      (status.box === 0) === !status.introduced
        ? null
        : `box=${status.box} introduced=${status.introduced}`,
    )
    expect(violation).toBeNull()
  })

  it('dueAt is a finite non-negative integer', () => {
    const violation = firstFactViolation(RUNS_12, (status) =>
      Number.isInteger(status.dueAt) && status.dueAt >= 0 ? null : `dueAt=${status.dueAt}`,
    )
    expect(violation).toBeNull()
  })

  it('a graded fact is always re-queued strictly after the counter it was graded at', () => {
    const violation = firstStepViolation(RUNS_12, (step) => {
      const status = step.afterGrade.facts[step.served.id]
      return status && status.dueAt > step.afterGrade.globalCounter
        ? null
        : `dueAt=${status?.dueAt} counter=${step.afterGrade.globalCounter}`
    })
    expect(violation).toBeNull()
  })

  it('unlockedTiers always contains 1, is sorted ascending, and only ever grows', () => {
    const violation = firstStepViolation(RUNS_12, (step, run) => {
      const previous = run.steps[step.index - 1]?.afterGrade.unlockedTiers ?? [1]
      for (const tiers of [step.afterServe.unlockedTiers, step.afterGrade.unlockedTiers]) {
        if (!tiers.includes(1)) return `tiers=${tiers} lacks 1`
        const sorted = [...tiers].sort((a, b) => a - b)
        if (tiers.some((tier, i) => tier !== sorted[i])) return `tiers=${tiers} not sorted`
        if (previous.some((tier, i) => tiers[i] !== tier)) return `tiers went ${previous} → ${tiers}`
      }
      return null
    })
    expect(violation).toBeNull()
  })

  it('a tier only ever unlocks when its predecessor sits at >= 80% box 3', () => {
    const facts = buildFacts()
    const violation = firstStepViolation(RUNS_12, (step, run) => {
      const before = run.steps[step.index - 1]?.afterGrade ?? initialSchedulerState()
      const after = step.afterGrade
      for (const tier of after.unlockedTiers) {
        if (before.unlockedTiers.includes(tier)) continue
        const predecessor = facts.filter((fact) => fact.tier === tier - 1)
        const atBox3 = predecessor.filter((fact) => (after.facts[fact.id]?.box ?? 0) >= 3).length
        if (atBox3 / predecessor.length < TIER_UNLOCK_BOX3_SHARE) {
          return `tier ${tier} unlocked at ${atBox3}/${predecessor.length}`
        }
      }
      return null
    })
    expect(violation).toBeNull()
  })

  it('commuteCredit values are always in [0, 1)', () => {
    const violation = firstStepViolation(RUNS_12, (step) => {
      for (const [id, credit] of Object.entries(step.afterGrade.commuteCredit)) {
        if (!(credit >= 0 && credit < 1)) return `commuteCredit[${id}]=${credit}`
      }
      return null
    })
    expect(violation).toBeNull()
  })

  it('commutative credit never lowers a twin’s box', () => {
    const violation = firstStepViolation(RUNS_12, (step) => {
      const twinId = `${step.served.b}x${step.served.a}`
      if (twinId === step.served.id) return null
      const before = step.afterServe.facts[twinId]?.box ?? 0
      const after = step.afterGrade.facts[twinId]?.box ?? 0
      return after >= before ? null : `twin ${twinId} went ${before} → ${after}`
    })
    expect(violation).toBeNull()
  })

  it('isFactMastered agrees with "box 5 and the last 3 latencies fluent" for every fact', () => {
    const violation = firstFactViolation(RUNS_12, (status) => {
      const recent = status.recentLatencies.slice(-MASTERY_RECENT_FLUENT_COUNT)
      const expected =
        status.box === MASTERY_BOX &&
        recent.length === MASTERY_RECENT_FLUENT_COUNT &&
        recent.every((ms) => ms < FLUENT_MAX_MS)
      return isFactMastered(status) === expected ? null : `mastered=${!expected} box=${status.box} recent=${recent}`
    })
    expect(violation).toBeNull()
  })

  it('a family is mastered (progress exactly 1) only when every fact in it is mastered', () => {
    // Membership is fixed, so build it once rather than at each of the 4500 steps.
    const members = new Map([1, 2, 3, 10, 12].map((family) => [family, factsInFamily(family)]))
    const violation = firstStepViolation(RUNS_12, (step) => {
      const state = step.afterGrade
      for (const [family, facts] of members) {
        const expected = facts.every((fact) => isFactMastered(state.facts[fact.id]))
        if (isFamilyMastered(state, family) !== expected) return `family ${family} mastered != ${expected}`
        if ((familyProgress(state, family) === 1) !== expected) return `family ${family} progress`
      }
      return null
    })
    expect(violation).toBeNull()
  })

  it('familyProgress is always in [0, 1] and below 1 while unmastered', () => {
    const violation = firstStepViolation(RUNS_12, (step) => {
      for (let family = 1; family <= 12; family++) {
        const progress = familyProgress(step.afterGrade, family)
        if (!(progress >= 0 && progress <= 1)) return `family ${family} progress=${progress}`
        if (progress === 1 && !isFamilyMastered(step.afterGrade, family)) return `family ${family} full early`
      }
      return null
    })
    expect(violation).toBeNull()
  })

  it('recentLatencies never exceeds MAX_RECENT_LATENCIES and holds only finite numbers', () => {
    const violation = firstFactViolation(RUNS_12, (status) =>
      status.recentLatencies.length <= MAX_RECENT_LATENCIES && status.recentLatencies.every(Number.isFinite)
        ? null
        : `recentLatencies=${status.recentLatencies}`,
    )
    expect(violation).toBeNull()
  })

  it('attempt counters are consistent: streak <= correct <= attempts', () => {
    const violation = firstFactViolation(RUNS_12, (status) =>
      status.correctStreak <= status.totalCorrect && status.totalCorrect <= status.totalAttempts
        ? null
        : `streak=${status.correctStreak} correct=${status.totalCorrect} attempts=${status.totalAttempts}`,
    )
    expect(violation).toBeNull()
  })

  it('globalCounter counts graded answers exactly and never moves on a serve', () => {
    const violation = firstStepViolation(RUNS_12, (step) =>
      step.afterServe.globalCounter === step.index && step.afterGrade.globalCounter === step.index + 1
        ? null
        : `counter ${step.afterServe.globalCounter} / ${step.afterGrade.globalCounter}`,
    )
    expect(violation).toBeNull()
  })

  it('lastServed is always the fact just served', () => {
    const violation = firstStepViolation(RUNS_12, (step) =>
      step.afterServe.lastServed === step.served.id ? null : `lastServed=${step.afterServe.lastServed}`,
    )
    expect(violation).toBeNull()
  })

  it('the served fact is always introduced by the time it is graded', () => {
    const violation = firstStepViolation(RUNS_12, (step) =>
      step.afterServe.facts[step.served.id]?.introduced ? null : 'served un-introduced',
    )
    expect(violation).toBeNull()
  })

  it('nothing is ever introduced from a locked tier', () => {
    const facts = buildFacts()
    const violation = firstStepViolation(RUNS_12, (step) => {
      const state = step.afterServe
      for (const fact of facts) {
        if (state.facts[fact.id]?.introduced && !state.unlockedTiers.includes(fact.tier)) {
          return `${fact.id} (tier ${fact.tier}) introduced with tiers ${state.unlockedTiers}`
        }
      }
      return null
    })
    expect(violation).toBeNull()
  })

  it('the fact table is never grown, shrunk or re-keyed', () => {
    const ids = buildFacts().map((fact) => fact.id)
    for (const run of RUNS_12) {
      const final = run.steps.at(-1)?.afterGrade
      expect(Object.keys(final?.facts ?? {}), run.label).toEqual(ids)
      for (const [key, status] of Object.entries(final?.facts ?? {})) expect(status.id, run.label).toBe(key)
    }
  })
})

// ─── Interleaving ───

describe('interleaving — never the same family more than INTERLEAVE_MAX_CONSECUTIVE in a row', { timeout: LONG_RUN_TIMEOUT_MS }, () => {
  function firstBreak(run: Run): string | null {
    const families = run.steps.map((step) => step.served.family)
    for (let i = INTERLEAVE_MAX_CONSECUTIVE; i < families.length; i++) {
      const window = families.slice(i - INTERLEAVE_MAX_CONSECUTIVE, i + 1)
      if (window.every((family) => family === families[i])) {
        const served = run.steps.slice(i - INTERLEAVE_MAX_CONSECUTIVE, i + 1).map((step) => step.served.id)
        return `${run.label}: step ${i} served ${served.join(', ')} (families …${families.slice(Math.max(0, i - 6), i + 1)})`
      }
    }
    return null
  }

  it('holds over 500-question mixed-practice runs for every policy and seed (maxTable 12)', () => {
    for (const run of RUNS_12) expect(firstBreak(run)).toBeNull()
  })

  it('holds on a three-family board (maxTable 3)', () => {
    for (const run of RUNS_3) expect(firstBreak(run)).toBeNull()
  })

  it('holds on a two-family board (maxTable 2), where family 1 is a single fact', () => {
    for (const run of RUNS_2) expect(firstBreak(run)).toBeNull()
  })

  it('is relaxed only on a single-family board (maxTable 1)', () => {
    const steps = play(initialSchedulerState(1), createRng(3), 20, mixed)
    expect(steps.every((step) => step.served.id === '1x1')).toBe(true)
    expect(longestRun(steps.map((step) => step.served.family))).toBe(20)
  })

  it('recentFamilies always ends with the served family and stays short', () => {
    const violation = firstStepViolation(RUNS_12, (step) =>
      step.afterServe.recentFamilies.at(-1) === step.served.family && step.afterServe.recentFamilies.length <= 4
        ? null
        : `recentFamilies=${step.afterServe.recentFamilies}`,
    )
    expect(violation).toBeNull()
  })
})

// ─── Egg practice ───

describe('egg practice — the family rotation over long runs', { timeout: LONG_RUN_TIMEOUT_MS }, () => {
  const FAMILIES = [2, 3, 7, 12]

  it('never serves the same fact twice running for a family with more than one fact', () => {
    for (const family of FAMILIES) {
      for (const [name, policy] of POLICIES) {
        const steps = play(initialSchedulerState(), createRng(family), 400, policy, (state, rng) =>
          nextFactInFamily(state, family, rng),
        )
        const repeat = steps.find((step, i) => i > 0 && step.served.id === steps[i - 1]?.served.id)
        const unmastered = repeat
          ? factsInFamily(family).filter((fact) => !isFactMastered(repeat.afterServe.facts[fact.id])).map((f) => f.id)
          : []
        expect(
          repeat,
          `${name} / family ${family}: ${repeat?.served.id} repeated at step ${repeat?.index}; unmastered then: ${unmastered}`,
        ).toBeUndefined()
      }
    }
  })

  it('only ever serves facts of the requested family', () => {
    for (const family of FAMILIES) {
      const steps = play(initialSchedulerState(), createRng(1), 200, struggling, (state, rng) =>
        nextFactInFamily(state, family, rng),
      )
      for (const step of steps) expect(step.served.family, `family ${family}`).toBe(family)
    }
  })

  it('never has more than EGG_ROTATION unmastered facts of the family introduced', () => {
    // A struggling child never masters anything, so the rotation must not keep growing.
    const family = 7
    const steps = play(initialSchedulerState(), createRng(2), 300, struggling, (state, rng) =>
      nextFactInFamily(state, family, rng),
    )
    const final = steps.at(-1)?.afterGrade
    const introduced = factsInFamily(family).filter((fact) => final?.facts[fact.id]?.introduced).length
    expect(introduced).toBeLessThanOrEqual(EGG_ROTATION)
  })
})
