import type { Fact, FactId, FactState, Outcome } from '../facts/fact'

/**
 * The whole learning state. Plain data, fully serialisable, persisted inside
 * FarmSave. Every scheduler function takes a state and returns a new one —
 * nothing here is mutated in place.
 */
export type SchedulerState = {
  facts: Record<FactId, FactState>
  /** Questions asked so far. The unit of time for Leitner scheduling. */
  globalCounter: number
  /** Tiers whose facts may be introduced. Always contains 1. */
  unlockedTiers: number[]
  /** Families of the most recently served facts, newest last. Drives interleaving. */
  recentFamilies: number[]
  /** The fact served last, so family practice never asks the same one twice in a row. */
  lastServed: FactId | null
  /**
   * Fractional commutative credit owed to a fact's twin (a×b correct → half a
   * box for b×a). Persisted so a reload never loses a half-earned promotion.
   */
  commuteCredit: Record<FactId, number>
  /** Highest table in play. Facts with an operand above this are inert. */
  maxTable: number
}

export type NextFact = {
  fact: Fact
  state: SchedulerState
}

export type Answer = {
  factId: FactId
  given: number
  latencyMs: number
}

export type GradeResult = {
  outcome: Outcome
  correct: boolean
  fact: Fact
  correctAnswer: number
  previousBox: number
  newBox: number
  /** This answer moved the fact into "mastered". */
  factMastered: boolean
  /** Set when this answer completed the family — every fact in it is now mastered. */
  familyJustMastered: number | null
}

export type Graded = {
  result: GradeResult
  state: SchedulerState
}
