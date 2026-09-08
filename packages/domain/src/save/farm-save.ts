import type { FactId, Outcome } from '../facts/fact'
import type { SchedulerState } from '../scheduler/types'

export const SAVE_SCHEMA_VERSION = 3 as const

/** Where a practice round happened. Decides whether answers mint coins. */
export type SessionContext = 'stall' | 'paddock' | 'free' | 'egg'

export type SessionEntry = {
  factId: FactId
  given: number
  correct: boolean
  latencyMs: number
  outcome: Outcome
  /** globalCounter value when the question was asked. */
  askedAt: number
}

export type SessionLog = {
  /** Epoch ms, from the injected Clock. */
  startedAt: number
  endedAt: number
  context: SessionContext
  /** The family being practised, for 'egg' and 'stall' rounds. Informational. */
  family: number | null
  entries: SessionEntry[]
}

export type FarmSettings = {
  muted: boolean
  maxTable: number
}

/**
 * Everything that persists between visits. Schema v3 starts fresh — prototype
 * (v1/v2) saves are not migrated; the adapter treats them as "no save".
 */
export type FarmSave = {
  schemaVersion: typeof SAVE_SCHEMA_VERSION
  scheduler: SchedulerState
  /** Earned from graded answers only, and only in the paddock and nest. */
  coins: number
  /** Bought with coins in the feed shed; consumed by feeding. */
  feed: number
  sessions: SessionLog[]
  settings: FarmSettings
}
