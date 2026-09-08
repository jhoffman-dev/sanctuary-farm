import { STARTING_FEED } from '../economy/coins'
import { MAX_TABLE_DEFAULT } from '../facts/tuning'
import { initialSchedulerState } from '../scheduler/state'
import type { FarmSave } from './farm-save'
import { SAVE_SCHEMA_VERSION } from './farm-save'

/** A brand-new farm: no coins, enough feed for day one, nothing played yet. */
export function emptyFarmSave(maxTable: number = MAX_TABLE_DEFAULT): FarmSave {
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    scheduler: initialSchedulerState(maxTable),
    coins: 0,
    feed: STARTING_FEED,
    sessions: [],
    settings: { muted: false, maxTable },
  }
}
