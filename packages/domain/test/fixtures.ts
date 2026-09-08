import type { FactId, FactState } from '../src/facts/fact'
import type { Rng } from '../src/rng'
import { gradeAnswer } from '../src/scheduler/grade'
import { nextFact } from '../src/scheduler/next'
import type { SchedulerState } from '../src/scheduler/types'

/** A copy of `state` with one fact forced into a known (introduced) state. */
export function withFact(
  state: SchedulerState,
  id: FactId,
  patch: Partial<FactState>,
): SchedulerState {
  const current = state.facts[id]
  if (!current) throw new Error(`fixture: state has no fact "${id}"`)
  return { ...state, facts: { ...state.facts, [id]: { ...current, introduced: true, ...patch } } }
}

/** A complete, introduced FactState with the given overrides. */
export function factStatus(patch: Partial<FactState>): FactState {
  return {
    id: '1x1',
    box: 1,
    dueAt: 0,
    lastLatencyMs: null,
    recentLatencies: [],
    correctStreak: 0,
    totalAttempts: 0,
    totalCorrect: 0,
    introduced: true,
    ...patch,
  }
}

/** Same patch applied to many facts. */
export function withFacts(
  state: SchedulerState,
  ids: readonly FactId[],
  patch: Partial<FactState>,
): SchedulerState {
  return ids.reduce((acc, id) => withFact(acc, id, patch), state)
}

export function introducedIds(state: SchedulerState): FactId[] {
  return Object.values(state.facts)
    .filter((status) => status.introduced)
    .map((status) => status.id)
}

/** Freeze every nested object so any in-place mutation throws (modules are strict). */
export function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const nested of Object.values(value as object)) deepFreeze(nested)
  }
  return value
}

export type Cycle = {
  factId: FactId
  family: number
  outcome: string
}

/** Answer policy for a driven run: returns the given answer and latency for a served fact. */
export type AnswerPolicy = (
  fact: { id: FactId; answer: number },
  index: number,
) => { given: number; latencyMs: number }

export const alwaysFluent: AnswerPolicy = (fact) => ({ given: fact.answer, latencyMs: 900 })

/** Run `count` next → grade cycles and return the final state plus a trace. */
export function drive(
  state: SchedulerState,
  rng: Rng,
  count: number,
  policy: AnswerPolicy = alwaysFluent,
): { state: SchedulerState; trace: Cycle[] } {
  const trace: Cycle[] = []
  let current = state
  for (let i = 0; i < count; i++) {
    const served = nextFact(current, rng)
    const { given, latencyMs } = policy(served.fact, i)
    const graded = gradeAnswer(served.state, { factId: served.fact.id, given, latencyMs })
    trace.push({ factId: served.fact.id, family: served.fact.family, outcome: graded.result.outcome })
    current = graded.state
  }
  return { state: current, trace }
}
