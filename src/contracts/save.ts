// Persistence contract. Implementation owned by Track E (src/save/store.ts).
// Phase 0 ships a STUB there.

import type { FactState } from './facts'
import type { SchedulerState } from './scheduler'
import type { HatchedCreature } from './creature'
import type { SessionLog } from './quiz'

export type SaveData = {
  schemaVersion: 1
  /** Denormalised copy of scheduler fact states — kept so the dashboard can read
   *  without constructing a Scheduler. The Scheduler's snapshot() is the source
   *  of truth; Phase 2 keeps them in sync on every graded answer. */
  facts: Record<string, FactState>
  /** Authoritative scheduler state. */
  scheduler: SchedulerState
  globalCounter: number
  creatures: HatchedCreature[]
  currency: { pellets: number; coins: number }
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

/** A brand-new, internally consistent save. Track E implements; Phase 0 stubs. */
export type EmptySave = () => SaveData
