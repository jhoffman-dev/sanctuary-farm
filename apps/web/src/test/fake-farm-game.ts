import type {
  AnswerFeedback,
  BuyFeedOutcome,
  FarmGame,
  FarmSummary,
  Question,
  RoundPlan,
  RoundProgress,
} from '@sf/application'
import type { SessionLog } from '@sf/domain'

type ScriptedAnswer = Pick<AnswerFeedback, 'outcome' | 'coinsEarned'>

export type FakeFarmGameOptions = {
  questions: ReadonlyArray<[a: number, b: number]>
  /** Feedback returned for each answer, in order. Correctness follows the outcome. */
  answers: ReadonlyArray<ScriptedAnswer>
}

export type FakeFarmGame = FarmGame & {
  calls: { startRound: RoundPlan[]; answer: number[]; endRound: number; setMuted: boolean[] }
  summaryValue: FarmSummary
}

function toQuestion([a, b]: readonly [number, number], index: number): Question {
  return { factId: `${a}x${b}`, a, b, family: Math.max(a, b), index }
}

/**
 * A scripted stand-in for the application. Components under test may only
 * render what it returns, so its answers are fixed up front by the test.
 */
export function createFakeFarmGame(options: FakeFarmGameOptions): FakeFarmGame {
  const questions = options.questions.map(toQuestion)
  let answered = 0
  let total = 0
  let inFlight: Question | null = null
  const calls: FakeFarmGame['calls'] = { startRound: [], answer: [], endRound: 0, setMuted: [] }

  // Mirrors the real read-model: `asked` counts the question in flight.
  const progress = (): RoundProgress => ({
    asked: answered + (inFlight ? 1 : 0),
    total,
    complete: total > 0 && answered >= total,
  })

  const fake: FakeFarmGame = {
    calls,
    summaryValue: { coins: 0, feed: 3, muted: false, families: [] },
    load: async () => fake.summaryValue,
    summary: () => fake.summaryValue,
    startRound: (plan) => {
      calls.startRound.push(plan)
      answered = 0
      total = plan.questions
      const first = questions[0]
      if (!first) throw new Error('fake has no questions')
      inFlight = first
      return first
    },
    currentQuestion: () => inFlight,
    roundProgress: progress,
    answer: async (given) => {
      calls.answer.push(given)
      const question = inFlight
      const scripted = options.answers[answered]
      if (!question || !scripted) throw new Error(`fake has no answer scripted for question ${answered}`)
      answered += 1
      inFlight = answered < total ? (questions[answered] ?? null) : null
      const correct = scripted.outcome !== 'WRONG'
      fake.summaryValue = { ...fake.summaryValue, coins: fake.summaryValue.coins + scripted.coinsEarned }
      return {
        question,
        outcome: scripted.outcome,
        correct,
        correctAnswer: question.a * question.b,
        latencyMs: 1200,
        coinsEarned: scripted.coinsEarned,
        factMastered: false,
        familyJustMastered: null,
        next: inFlight,
      }
    },
    endRound: async (): Promise<SessionLog> => {
      calls.endRound += 1
      inFlight = null
      total = 0
      return { startedAt: 0, endedAt: 0, context: 'paddock', family: null, entries: [] }
    },
    buyFeed: async (): Promise<BuyFeedOutcome> => ({ ok: true, summary: fake.summaryValue }),
    setMuted: async (muted) => {
      calls.setMuted.push(muted)
      fake.summaryValue = { ...fake.summaryValue, muted }
    },
  }
  return fake
}
