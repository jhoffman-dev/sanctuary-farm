import type { SaveStore } from '@sf/application'
import type { FarmSave } from '@sf/domain'

/**
 * A SaveStore that lives only as long as the process. For tests, and for the
 * composition root when no durable storage is available at all.
 */
export function createInMemorySaveStore(initial: FarmSave | null = null): SaveStore {
  let farm = initial
  return {
    load: async () => farm,
    save: async (next) => {
      farm = next
    },
    clear: async () => {
      farm = null
    },
  }
}
