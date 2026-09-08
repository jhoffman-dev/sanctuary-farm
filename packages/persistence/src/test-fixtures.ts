import type { FarmSave } from '@sf/domain'
import { emptyFarmSave } from '@sf/domain'

/**
 * A fresh farm before the first question — the real thing, so what the guard
 * accepts here is exactly what the domain can serve from.
 */
export function freshFarmSave(overrides: Partial<FarmSave> = {}): FarmSave {
  return { ...emptyFarmSave(), ...overrides }
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
