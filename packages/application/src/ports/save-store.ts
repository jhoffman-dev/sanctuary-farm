import type { FarmSave } from '@sf/domain'

/**
 * Where a farm is kept between visits. Adapters: localStorage now, Firestore
 * later (ADR-0002). A store never throws on a missing or unreadable save — it
 * resolves `null` and the use-case starts a fresh farm.
 */
export interface SaveStore {
  load(): Promise<FarmSave | null>
  save(farm: FarmSave): Promise<void>
  clear(): Promise<void>
}
