import type { FarmSave } from '@sf/domain'
import { SAVE_SCHEMA_VERSION } from '@sf/domain'

/** The smallest well-formed v3 save: a fresh farm before the first question. */
export function freshFarmSave(overrides: Partial<FarmSave> = {}): FarmSave {
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    scheduler: {
      facts: {},
      globalCounter: 0,
      unlockedTiers: [1],
      recentFamilies: [],
      lastServed: null,
      commuteCredit: {},
      maxTable: 12,
    },
    coins: 0,
    feed: 12,
    sessions: [],
    settings: { muted: false, maxTable: 12 },
    ...overrides,
  }
}

/**
 * A Storage backed by a Map, so tests control exactly what is persisted
 * without sharing jsdom's global localStorage between cases.
 */
export function createMemoryStorage(): Storage {
  const entries = new Map<string, string>()
  return {
    get length() {
      return entries.size
    },
    clear: () => entries.clear(),
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => {
      entries.set(key, String(value))
    },
    removeItem: (key) => {
      entries.delete(key)
    },
    key: (index) => [...entries.keys()][index] ?? null,
  }
}

type StorageMethod = 'getItem' | 'setItem' | 'removeItem'

/** A working Storage whose named methods throw, to simulate quota / private-mode failures. */
export function createFailingStorage(failing: StorageMethod[]): Storage {
  const storage = createMemoryStorage()
  const throwing = () => {
    throw new Error('storage unavailable')
  }
  return {
    ...storage,
    getItem: failing.includes('getItem') ? throwing : storage.getItem,
    setItem: failing.includes('setItem') ? throwing : storage.setItem,
    removeItem: failing.includes('removeItem') ? throwing : storage.removeItem,
  }
}
