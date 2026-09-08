import type { FactId, Outcome, SessionContext } from '@sf/domain'

/** One question as the UI shows it. `index` is the 0-based position in the round. */
export type Question = {
  factId: FactId
  a: number
  b: number
  family: number
  index: number
}

export type AnswerFeedback = {
  question: Question
  outcome: Outcome
  correct: boolean
  correctAnswer: number
  latencyMs: number
  coinsEarned: number
  factMastered: boolean
  familyJustMastered: number | null
  /** The question now in flight, or null when the round is complete. */
  next: Question | null
}

export type RoundPlan = {
  context: SessionContext
  questions: number
  /** The family to practise. Required for 'egg' and 'stall' rounds. */
  family?: number
}

export type RoundProgress = {
  /** Questions served so far, including the one in flight. */
  asked: number
  total: number
  /** Every planned question has been answered. */
  complete: boolean
}

export type FamilySummary = {
  family: number
  progress: number
  mastered: boolean
}

export type FarmSummary = {
  coins: number
  feed: number
  muted: boolean
  families: FamilySummary[]
}

export type BuyFeedOutcome =
  | { ok: true; summary: FarmSummary }
  | { ok: false; reason: 'not-enough-coins' }
