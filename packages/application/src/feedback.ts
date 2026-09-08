import type { GradeResult, SessionContext, SessionEntry } from '@sf/domain'
import { coinsFor, contextEarnsCoins } from '@sf/domain'
import type { AnswerFeedback, Question } from './read-models'

/** One answer, graded, with everything the log and the feedback need. */
export type GradedAnswer = {
  question: Question
  result: GradeResult
  given: number
  latencyMs: number
  askedAt: number
}

/** Coins come only from a graded answer, and only where the context earns them. */
export function coinsEarnedFor(context: SessionContext, result: GradeResult): number {
  return contextEarnsCoins(context) ? coinsFor(result.outcome) : 0
}

export function sessionEntryFor({
  question,
  result,
  given,
  latencyMs,
  askedAt,
}: GradedAnswer): SessionEntry {
  return {
    factId: question.factId,
    given,
    correct: result.correct,
    latencyMs,
    outcome: result.outcome,
    askedAt,
  }
}

export function feedbackFor(
  graded: GradedAnswer,
  coinsEarned: number,
  next: Question | null,
): AnswerFeedback {
  const { question, result, latencyMs } = graded
  return {
    question,
    outcome: result.outcome,
    correct: result.correct,
    correctAnswer: result.correctAnswer,
    latencyMs,
    coinsEarned,
    factMastered: result.factMastered,
    familyJustMastered: result.familyJustMastered,
    next,
  }
}
