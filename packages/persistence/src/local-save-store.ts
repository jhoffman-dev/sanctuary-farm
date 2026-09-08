import type { SaveStore } from '@sf/application'
import type { FarmSave } from '@sf/domain'
import { parseFarmSave } from './parse-farm-save'

export const DEFAULT_SAVE_KEY = 'sanctuary-farm/save'

export type LocalSaveStoreOptions = {
  /** Defaults to `globalThis.localStorage`, looked up on each call rather than at import. */
  storage?: Storage
  key?: string
}

/**
 * `localStorage` can be absent (SSR, tests) or throw on access (opaque origins,
 * some private modes). Either way the store must keep working, so resolution is
 * lazy and a failure means "no durable storage", never an exception.
 */
function resolveStorage(preferred: Storage | undefined): Storage | null {
  if (preferred) return preferred
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

function readStoredFarm(storage: Storage | null, key: string): FarmSave | null {
  if (!storage) return null
  try {
    const raw = storage.getItem(key)
    return raw === null ? null : parseFarmSave(JSON.parse(raw))
  } catch {
    // Unreadable storage or corrupt JSON both mean the same thing to the
    // use-case: there is no save, start a fresh farm.
    return null
  }
}

/**
 * One versioned key holding `JSON.stringify(FarmSave)`. Never throws: the
 * latest farm saved in this process is kept in memory, so play continues even
 * when the browser refuses to persist it.
 */
export function createLocalSaveStore(options: LocalSaveStoreOptions = {}): SaveStore {
  const key = options.key ?? DEFAULT_SAVE_KEY
  const storage = () => resolveStorage(options.storage)
  let lastSaved: FarmSave | null = null

  return {
    load: async () => lastSaved ?? readStoredFarm(storage(), key),
    save: async (farm) => {
      lastSaved = farm
      try {
        storage()?.setItem(key, JSON.stringify(farm))
      } catch {
        // Quota exceeded or private mode. The in-memory copy above is the
        // fallback, so the session carries on; only the reload is lost.
      }
    },
    clear: async () => {
      lastSaved = null
      try {
        storage()?.removeItem(key)
      } catch {
        // Same failure modes as setItem. With the memory copy gone, `load()`
        // falls back to the stored blob, which we could not remove; nothing
        // more can be done from here.
      }
    },
  }
}
