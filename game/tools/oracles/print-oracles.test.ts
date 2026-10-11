// Prints what the TypeScript rules do on fixed seeds, as the JSON the GDScript
// port's tests compare against (game/tests/oracles/typescript_oracles.json).
// A trace or a state is reduced to a SHA-256 of a canonical string that
// game/tests/support/oracle_digest.gd rebuilds byte for byte from the port.
//
//   pnpm exec vitest run --config game/tools/oracles/vitest.config.ts
import { createHash } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import type { FarmSave, Fact, Rng, SchedulerState } from '@sf/domain'
import {
  buildFacts,
  createRng,
  gradeAnswer,
  initialSchedulerState,
  nextFact,
  nextFactInFamily,
  shuffle,
  weightedPick,
} from '@sf/domain'
import { it } from 'vitest'
import { harness } from '../../../packages/application/src/test-fakes'

type Policy = (fact: Pick<Fact, 'answer'>, index: number) => { given: number; latencyMs: number }
type Picker = (state: SchedulerState, rng: Rng) => ReturnType<typeof nextFact>
type Run = { trace: string[]; state: SchedulerState }

const POLICIES: Record<string, Policy> = {
  alwaysFluent: (fact) => ({ given: fact.answer, latencyMs: 900 }),
  mixed: (fact, i) => ({
    given: i % 7 === 0 ? fact.answer + 1 : fact.answer,
    latencyMs: i % 11 === 0 ? 9000 : i % 3 === 0 ? 5000 : 1200,
  }),
  struggling: (fact, i) => ({
    given: i % 5 < 2 ? fact.answer - 1 : fact.answer,
    latencyMs: i % 2 === 0 ? 4000 : 9500,
  }),
  interleave: (fact, i) => ({
    given: i % 5 === 0 ? fact.answer + 1 : fact.answer,
    latencyMs: i % 3 === 0 ? 5000 : 1500,
  }),
  determinism: (fact, i) => ({ given: fact.answer, latencyMs: i % 3 === 0 ? 4000 : 1500 }),
  purity: (fact, i) => ({ given: i % 6 === 0 ? 0 : fact.answer, latencyMs: i % 4 === 0 ? 6000 : 1200 }),
}

const sha256 = (text: string): string => createHash('sha256').update(text).digest('hex')

function canonicalState(state: SchedulerState): string {
  const facts = buildFacts(state.maxTable)
    .flatMap((fact) => {
      const status = state.facts[fact.id]
      return status ? [status] : []
    })
    .map((status) =>
      [
        status.id,
        status.box,
        status.dueAt,
        status.lastLatencyMs === null ? 'n' : Math.round(status.lastLatencyMs),
        status.recentLatencies.map(Math.round).join('.'),
        status.correctStreak,
        status.totalAttempts,
        status.totalCorrect,
        status.introduced ? 1 : 0,
      ].join('|'),
    )
  const credit = Object.keys(state.commuteCredit)
    .toSorted()
    .map((id) => `${id}=${Math.round((state.commuteCredit[id] ?? 0) * 2)}`)
  return [
    facts.join(','),
    state.globalCounter,
    state.unlockedTiers.join('.'),
    state.recentFamilies.join('.'),
    state.lastServed ?? 'n',
    credit.join('.'),
    state.maxTable,
  ].join(';')
}

function canonicalFarm(farm: FarmSave): string {
  const sessions = farm.sessions.map((log) =>
    [
      log.startedAt,
      log.endedAt,
      log.context,
      log.family ?? 'n',
      log.entries
        .map((e) => [e.factId, Math.round(e.given), e.correct ? 1 : 0, Math.round(e.latencyMs), e.outcome, e.askedAt].join(':'))
        .join('/'),
    ].join('|'),
  )
  return [canonicalState(farm.scheduler), farm.coins, farm.feed, sessions.join(','), farm.settings.muted ? 1 : 0].join('#')
}

function play(initial: SchedulerState, rng: Rng, count: number, policy: Policy, pick: Picker = nextFact): Run {
  const trace: string[] = []
  let state = initial
  for (let i = 0; i < count; i++) {
    const served = pick(state, rng)
    const { given, latencyMs } = policy(served.fact, i)
    const graded = gradeAnswer(served.state, { factId: served.fact.id, given, latencyMs })
    trace.push(`${served.fact.id}:${graded.result.outcome[0]}`)
    state = graded.state
  }
  return { trace, state }
}

const digestOf = (run: Run) => ({ trace: sha256(run.trace.join(',')), state: sha256(canonicalState(run.state)) })
const fresh = (maxTable = 12): SchedulerState => initialSchedulerState(maxTable)
const inFamily = (family: number): Picker => (state, rng) => nextFactInFamily(state, family, rng)

function invariantRuns(maxTable: number, length: number): Record<string, ReturnType<typeof digestOf>> {
  const runs: Record<string, ReturnType<typeof digestOf>> = {}
  for (const name of ['alwaysFluent', 'mixed', 'struggling']) {
    for (const seed of [1, 42, 98765]) {
      runs[`${name}/${seed}`] = digestOf(play(fresh(maxTable), createRng(seed), length, POLICIES[name] as Policy))
    }
  }
  return runs
}

function eggRotationRuns(): Record<string, ReturnType<typeof digestOf>> {
  const runs: Record<string, ReturnType<typeof digestOf>> = {}
  for (const family of [2, 3, 7, 12]) {
    for (const name of ['alwaysFluent', 'mixed', 'struggling']) {
      runs[`${family}/${name}`] = digestOf(play(fresh(), createRng(family), 400, POLICIES[name] as Policy, inFamily(family)))
    }
  }
  return runs
}

/** Mixed and egg practice alternating over 500 steps, as the purity suite drives it. */
function alternating(): Run {
  const trace: string[] = []
  let state = fresh()
  const rng = createRng(31)
  for (let i = 0; i < 500; i++) {
    const served = i % 2 === 0 ? nextFact(state, rng) : nextFactInFamily(state, 1 + (i % 12), rng)
    const { given, latencyMs } = (POLICIES.mixed as Policy)(served.fact, i)
    const graded = gradeAnswer(served.state, { factId: served.fact.id, given, latencyMs })
    trace.push(`${served.fact.id}:${graded.result.outcome[0]}`)
    state = graded.state
  }
  return { trace, state }
}

/** The hatch run of family-practice.test.ts: a fresh createRng(7) on every call. */
function hatchStep(): number {
  let state = fresh()
  const status = state.facts['1x3']
  if (!status) throw new Error('no 1x3')
  state = { ...state, facts: { ...state.facts, '1x3': { ...status, introduced: true, box: 1 } } }
  for (let i = 0; i < 400; i++) {
    const served = nextFactInFamily(state, 3, createRng(7))
    const graded = gradeAnswer(served.state, { factId: served.fact.id, given: served.fact.answer, latencyMs: 900 })
    state = graded.state
    if (graded.result.familyJustMastered === 3) return i
  }
  return -1
}

async function farmScript(seed: number): Promise<string> {
  const { game, clock, saveStore } = harness({ seed, startAt: 1_000 })
  await game.load()
  for (let round = 0; round < 4; round++) {
    game.startRound(round % 2 === 0 ? { context: 'paddock', questions: 6 } : { context: 'egg', questions: 6, family: 3 })
    for (let i = 0; i < 6; i++) {
      const question = game.currentQuestion()
      if (!question) throw new Error('round ended early')
      clock.advance(i % 3 === 0 ? 5000 : 1200)
      await game.answer(i % 5 === 0 ? -1 : question.a * question.b)
    }
    await game.endRound()
  }
  const stored = saveStore.stored()
  if (!stored) throw new Error('nothing stored')
  return sha256(canonicalFarm(stored))
}

function rngDraws(): Record<string, unknown> {
  const picks = createRng(3)
  return {
    shuffle5: shuffle([1, 2, 3, 4, 5, 6, 7, 8], createRng(5)),
    weightedPick3: Array.from({ length: 20 }, () => weightedPick(['a', 'b', 'c'], [1, 2, 3], picks)).join(''),
    uniformPick11: (() => {
      const uniform = createRng(11)
      return Array.from({ length: 20 }, () => weightedPick(['a', 'b', 'c'], [0, -1, 0], uniform)).join('')
    })(),
  }
}

function tierCoverage(): Record<string, ReturnType<typeof digestOf>> {
  const runs: Record<string, ReturnType<typeof digestOf>> = {}
  for (let maxTable = 1; maxTable <= 12; maxTable++) {
    runs[String(maxTable)] = digestOf(play(fresh(maxTable), createRng(7), maxTable * maxTable * 16, POLICIES.alwaysFluent as Policy))
  }
  return runs
}

it('prints the oracles', async () => {
  const midway = play(fresh(), createRng(5), 200, POLICIES.mixed as Policy).state
  const oracles = {
    generatedFrom: 'packages/domain + packages/application via game/tools/oracles/print-oracles.test.ts',
    rng: rngDraws(),
    traces: {
      determinism4242: play(fresh(), createRng(4242), 150, POLICIES.determinism as Policy).trace,
      determinism9999: play(fresh(), createRng(9999), 150, POLICIES.determinism as Policy).trace,
      interleave12345: play(fresh(), createRng(12345), 200, POLICIES.interleave as Policy).trace,
    },
    digests: {
      long300: digestOf(play(fresh(), createRng(1), 300, POLICIES.alwaysFluent as Policy)),
      mixed2024: digestOf(play(fresh(), createRng(2024), 500, POLICIES.mixed as Policy)),
      egg7seed77: digestOf(play(fresh(), createRng(77), 300, POLICIES.mixed as Policy, inFamily(7))),
      continued5then6: digestOf(play(midway, createRng(6), 200, POLICIES.mixed as Policy)),
      purityMidway9: sha256(canonicalState(play(fresh(), createRng(9), 250, POLICIES.mixed as Policy).state)),
      purityRun99: digestOf(play(fresh(), createRng(99), 120, POLICIES.purity as Policy)),
      alternating31: digestOf(alternating()),
      invariants12: invariantRuns(12, 500),
      invariants3: invariantRuns(3, 300),
      invariants2: invariantRuns(2, 300),
      eggRotation: eggRotationRuns(),
      tierCoverage: tierCoverage(),
    },
    hatchStep: hatchStep(),
    farmScript11: await farmScript(11),
  }
  const target = new URL('../../tests/oracles/typescript_oracles.json', import.meta.url)
  writeFileSync(target, `${JSON.stringify(oracles, null, 2)}\n`)
}, 120_000)
