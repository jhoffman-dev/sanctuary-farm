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

function parseStoredBlob(raw: string | null): FarmSave | null {
  if (raw === null) return null
  try {
    return parseFarmSave(JSON.parse(raw))
  } catch {
    // Corrupt JSON means the same thing to the use-case as no blob: start a fresh farm.
    return null
  }
}

/**
 * One versioned key holding `JSON.stringify(FarmSave)`. Storage is the source
 * of truth — another store on the same key, or a `clear()` from elsewhere, is
 * seen on the next `load()`. Never throws: the latest farm saved in this
 * process is kept in memory and wins only while the browser has refused to
 * persist it, so play continues even when a write fails.
 */
export function createLocalSaveStore(options: LocalSaveStoreOptions = {}): SaveStore {
  const key = options.key ?? DEFAULT_SAVE_KEY
  const storage = () => resolveStorage(options.storage)
  let lastSaved: FarmSave | null = null
  /** True while the latest write (save or clear) never reached storage, so memory is the newer copy. */
  let memoryIsNewer = false

  return {
    load: async () => {
      if (memoryIsNewer) return lastSaved
      const durable = storage()
      if (!durable) return lastSaved
      try {
        return parseStoredBlob(durable.getItem(key))
      } catch {
        // Storage refused to be read. The copy from this session, if any, is all there is.
        return lastSaved
      }
    },
    save: async (farm) => {
      lastSaved = farm
      memoryIsNewer = true
      try {
        const durable = storage()
        if (durable) {
          durable.setItem(key, JSON.stringify(farm))
          memoryIsNewer = false
        }
      } catch {
        // Quota exceeded or private mode. The in-memory copy stays the newer
        // one, so the session carries on; only the reload is lost.
      }
    },
    clear: async () => {
      lastSaved = null
      memoryIsNewer = true
      try {
        storage()?.removeItem(key)
        memoryIsNewer = false
      } catch {
        // Same failure modes as setItem. The blob we could not remove stays on
        // disk, but this session honours the clear and loads no farm.
      }
    },
  }
}
