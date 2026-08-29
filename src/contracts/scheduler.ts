// Scheduler contract. Implementation owned by Track A (src/engine/scheduler.ts).
// Phase 0 ships a STUB at that path.

import type { Fact, FactState, Outcome } from './facts'
import type { Rng } from './rng'

/** Full, serialisable scheduler state. Persisted inside SaveData via SaveStore. */
export type SchedulerState = {
  facts: Record<string, FactState>
  globalCounter: number
  /** Tiers whose facts have been unlocked for introduction. Always contains 1. */
  unlockedTiers: number[]
  /** Families of the most recently served facts, newest last. Used for interleave.
   *  Keep the last INTERLEAVE_MAX_CONSECUTIVE + a small margin (e.g. 4). */
  recentFamilies: number[]
  /** Highest table in play (settings.maxTable). Facts above this are inert. */
  maxTable: number
}

/**
 * Richer result than the original `Outcome` so the UI can render feedback and
 * Phase 2 can trigger hatch ceremonies without re-deriving state.
 * REVISION vs original spec: grade() returns GradeResult, not bare Outcome.
 */
export type GradeResult = {
  outcome: Outcome
  correct: boolean
  fact: Fact
  correctAnswer: number
  previousBox: number
  newBox: number
  /** The fact just crossed into "mastered". */
  factMastered: boolean
  /** Non-null when THIS answer completed the family (every fact mastered). */
  familyJustMastered: number | null
}

export interface Scheduler {
  /** The next fact to present. Never throws once at least one fact is introduced. */
  next(): Fact
  /** Grade an answer to the fact `next()` last returned. Advances globalCounter by 1. */
  grade(factId: string, given: number, latencyMs: number): GradeResult
  /** 0..1 display fraction for the family's egg. Exactly 1.0 only when isMastered. */
  familyProgress(family: number): number
  isMastered(family: number): boolean
  /** Deep copy of current state, safe to persist. */
  snapshot(): SchedulerState
}

export type SchedulerDeps = {
  rng: Rng
}

/** Fresh state with every in-range fact created, only the Anchors tier unlocked. */
export type InitialSchedulerState = (maxTable?: number) => SchedulerState

/** Build a scheduler over existing (or fresh) state. */
export type CreateScheduler = (
  state: SchedulerState,
  deps?: Partial<SchedulerDeps>,
) => Scheduler
