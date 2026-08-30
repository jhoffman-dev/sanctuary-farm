// Persistence contract. Implementation in src/save/store.ts.

import type { FactState } from './facts'
import type { SchedulerState } from './scheduler'
import type { HatchedCreature } from './creature'
import type { AnimalCare } from './care'
import type { SessionLog } from './quiz'

export type SaveData = {
  schemaVersion: 2
  /** Denormalised copy of scheduler fact states — kept so the dashboard can read
   *  without constructing a Scheduler. The Scheduler's snapshot() is the source
   *  of truth; the game keeps them in sync on every graded answer. */
  facts: Record<string, FactState>
  /** Authoritative scheduler state. */
  scheduler: SchedulerState
  globalCounter: number
  creatures: HatchedCreature[]
  /** Per-animal daily care, keyed by family. */
  care: Record<number, AnimalCare>
  /** Earned from correct answers only. Spent in the feed shed. */
  coins: number
  /** Bought with coins. Consumed by feeding. */
  feed: number
  sessions: SessionLog[]
  settings: { muted: boolean; maxTable: number }
  lastChoresDate: string | null // YYYY-MM-DD (local)
}

export interface SaveStore {
  load(): SaveData
  save(data: SaveData): void
  /** Best-effort upgrade of an unknown blob to the current schema. Never throws. */
  migrate(raw: unknown): SaveData
  exportJSON(): string
  /** Replace current save from an exported string. Returns false on bad input. */
  importJSON(json: string): boolean
  /** Wipe to a fresh save (parent dashboard "reset"). */
  reset(): void
}

/** A brand-new, internally consistent save. */
export type EmptySave = () => SaveData
