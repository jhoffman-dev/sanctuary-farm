import type { Fact, NextFact, Rng, SchedulerState, SessionEntry, SessionLog } from '@sf/domain'
import { nextFact, nextFactInFamily } from '@sf/domain'
import type { Question, RoundPlan, RoundProgress } from './read-models'

/** The question the player is looking at. There is never more than one. */
export type InFlight = {
  question: Question
  /** Clock reading when served. Latency is measured from here — never by the UI. */
  servedAt: number
  /** Scheduler globalCounter when served; becomes the SessionEntry's askedAt. */
  askedAt: number
}

export type ActiveRound = {
  plan: RoundPlan
  startedAt: number
  inFlight: InFlight | null
  entries: SessionEntry[]
}

export function beginRound(plan: RoundPlan, startedAt: number): ActiveRound {
  return { plan, startedAt, inFlight: null, entries: [] }
}

function questionFrom(fact: Fact, index: number): Question {
  return { factId: fact.id, a: fact.a, b: fact.b, family: fact.family, index }
}

function pickFact(plan: RoundPlan, scheduler: SchedulerState, rng: Rng): NextFact {
  return plan.family === undefined
    ? nextFact(scheduler, rng)
    : nextFactInFamily(scheduler, plan.family, rng)
}

type Serving = {
  round: ActiveRound
  scheduler: SchedulerState
  rng: Rng
  now: number
}

type Served = {
  round: ActiveRound
  scheduler: SchedulerState
  question: Question
}

/** Ask the scheduler for exactly one fact and put it in flight. */
export function serveQuestion({ round, scheduler, rng, now }: Serving): Served {
  const served = pickFact(round.plan, scheduler, rng)
  const question = questionFrom(served.fact, round.entries.length)
  const inFlight = { question, servedAt: now, askedAt: served.state.globalCounter }
  return { round: { ...round, inFlight }, scheduler: served.state, question }
}

export function recordAnswer(round: ActiveRound, entry: SessionEntry): ActiveRound {
  return { ...round, inFlight: null, entries: [...round.entries, entry] }
}

export function isRoundComplete(round: ActiveRound): boolean {
  return round.entries.length >= round.plan.questions
}

export function roundProgress(round: ActiveRound): RoundProgress {
  const asked = round.entries.length + (round.inFlight ? 1 : 0)
  return { asked, total: round.plan.questions, complete: isRoundComplete(round) }
}

/** An unanswered in-flight question is simply dropped — only graded answers are logged. */
export function sessionLogFrom(round: ActiveRound, endedAt: number): SessionLog {
  return {
    startedAt: round.startedAt,
    endedAt,
    context: round.plan.context,
    family: round.plan.family ?? null,
    entries: round.entries,
  }
}
