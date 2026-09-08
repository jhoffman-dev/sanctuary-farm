import type { Box, FactState, Outcome } from '../facts/fact'
import { getFact } from '../facts/table'
import { MAX_RECENT_LATENCIES } from '../facts/tuning'
import type { Card } from './cards'
import { cardsInPlay, withStatus } from './cards'
import { creditTwin } from './commute'
import { assertLatency, classifyOutcome } from './latency'
import { boxAfter, requeueInterval } from './leitner'
import { isFactMastered, isFamilyMastered } from './progress'
import { withUnlockedTiers } from './tiers'
import type { Answer, GradeResult, Graded, SchedulerState } from './types'

/**
 * Only an introduced fact can be graded: grading one at box 0 would leave it
 * boxed but not introduced, and the scheduler only ever serves introduced facts.
 */
function requireCard(state: SchedulerState, factId: string): Card {
  const fact = getFact(factId)
  const status = state.facts[factId]
  if (!fact || !status) throw new Error(`gradeAnswer: unknown fact "${factId}"`)
  if (!status.introduced) throw new Error(`gradeAnswer: fact "${factId}" was never introduced`)
  return { fact, status }
}

type Attempt = {
  status: FactState
  answer: Answer
  outcome: Outcome
  newBox: Box
  dueAt: number
}

function recordAttempt({ status, answer, outcome, newBox, dueAt }: Attempt): FactState {
  const correct = outcome !== 'WRONG'
  return {
    ...status,
    box: newBox,
    dueAt,
    lastLatencyMs: answer.latencyMs,
    recentLatencies: [...status.recentLatencies, answer.latencyMs].slice(-MAX_RECENT_LATENCIES),
    correctStreak: correct ? status.correctStreak + 1 : 0,
    totalAttempts: status.totalAttempts + 1,
    totalCorrect: correct ? status.totalCorrect + 1 : status.totalCorrect,
  }
}

type Transition = {
  card: Card
  outcome: Outcome
  before: SchedulerState
  after: SchedulerState
}

function describe({ card, outcome, before, after }: Transition): GradeResult {
  const { fact, status } = card
  const graded = after.facts[fact.id]
  const familyWasMastered = isFamilyMastered(before, fact.family)
  return {
    outcome,
    correct: outcome !== 'WRONG',
    fact,
    correctAnswer: fact.answer,
    previousBox: status.box,
    newBox: graded?.box ?? status.box,
    factMastered: !isFactMastered(status) && isFactMastered(graded),
    familyJustMastered:
      !familyWasMastered && isFamilyMastered(after, fact.family) ? fact.family : null,
  }
}

/**
 * Grade one answer: classify by latency, move the Leitner box, re-queue, credit
 * the commutative twin, and unlock tiers. Throws, before touching the state, for
 * a fact the state does not know or never introduced, and for a latency that is
 * not a finite duration — the application layer grades only the fact it has in
 * flight, with a clock it has already clamped.
 */
export function gradeAnswer(state: SchedulerState, answer: Answer): Graded {
  assertLatency(answer.latencyMs)
  const card = requireCard(state, answer.factId)
  const correct = answer.given === card.fact.answer
  const outcome = classifyOutcome(correct, answer.latencyMs)
  const newBox = boxAfter(outcome, card.status.box)
  const globalCounter = state.globalCounter + 1
  const dueAt = globalCounter + requeueInterval(outcome, newBox)

  const attempted = withStatus(
    { ...state, globalCounter },
    recordAttempt({ status: card.status, answer, outcome, newBox, dueAt }),
  )
  const credited = correct ? creditTwin(attempted, card.fact) : attempted
  const after = withUnlockedTiers(credited, cardsInPlay(credited))

  return { result: describe({ card, outcome, before: state, after }), state: after }
}
