// STUB — Track E replaces with the real versioned localStorage store + migrate.
import { MAX_TABLE_DEFAULT, SAVE_KEY, SCHEMA_VERSION } from '@/contracts'
import type { EmptySave, SaveData, SaveStore } from '@/contracts'
import { initialSchedulerState } from '@/engine/scheduler'

export const emptySave: EmptySave = () => {
  const scheduler = initialSchedulerState(MAX_TABLE_DEFAULT)
  return {
    schemaVersion: SCHEMA_VERSION,
    facts: scheduler.facts,
    scheduler,
    globalCounter: 0,
    creatures: [],
    currency: { pellets: 0, coins: 0 },
    sessions: [],
    settings: { muted: false, maxTable: MAX_TABLE_DEFAULT },
    lastChoresDate: null,
  }
}

export function createSaveStore(): SaveStore {
  let mem: SaveData | null = null
  const read = (): SaveData => {
    if (mem) return mem
    try {
      const raw = localStorage.getItem(SAVE_KEY)
      mem = raw ? (JSON.parse(raw) as SaveData) : emptySave()
    } catch {
      mem = emptySave()
    }
    return mem
  }
  const write = (data: SaveData) => {
    mem = data
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data))
    } catch {
      /* private mode / quota — keep in memory */
    }
  }
  return {
    load: read,
    save: write,
    migrate: (raw) => (raw && typeof raw === 'object' ? (raw as SaveData) : emptySave()),
    exportJSON: () => JSON.stringify(read(), null, 2),
    importJSON: (json) => {
      try {
        write(JSON.parse(json) as SaveData)
        return true
      } catch {
        return false
      }
    },
    reset: () => write(emptySave()),
  }
}
