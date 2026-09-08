import type { FarmSave, FarmSettings, SchedulerState, SessionLog } from '@sf/domain'
import { SAVE_SCHEMA_VERSION } from '@sf/domain'

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'number')
}

function isSchedulerState(value: unknown): value is SchedulerState {
  return (
    isRecord(value) &&
    isRecord(value.facts) &&
    Object.values(value.facts).every(isRecord) &&
    typeof value.globalCounter === 'number' &&
    isNumberArray(value.unlockedTiers) &&
    isNumberArray(value.recentFamilies) &&
    (typeof value.lastServed === 'string' || value.lastServed === null) &&
    isRecord(value.commuteCredit) &&
    typeof value.maxTable === 'number'
  )
}

function isSessionLog(value: unknown): value is SessionLog {
  return (
    isRecord(value) &&
    typeof value.startedAt === 'number' &&
    typeof value.endedAt === 'number' &&
    typeof value.context === 'string' &&
    Array.isArray(value.entries)
  )
}

function isSessionLogArray(value: unknown): value is SessionLog[] {
  return Array.isArray(value) && value.every(isSessionLog)
}

function isFarmSettings(value: unknown): value is FarmSettings {
  return isRecord(value) && typeof value.muted === 'boolean' && typeof value.maxTable === 'number'
}

/**
 * Structural guard for a stored save. Anything that isn't a well-formed v3
 * save — including prototype v1/v2 blobs, which are deliberately not migrated —
 * is `null`, and the caller starts a fresh farm. Rebuilds the object so stray
 * keys from an older or hand-edited blob don't leak into the domain.
 */
export function parseFarmSave(raw: unknown): FarmSave | null {
  if (!isRecord(raw) || raw.schemaVersion !== SAVE_SCHEMA_VERSION) return null
  const { scheduler, coins, feed, sessions, settings } = raw
  if (!isSchedulerState(scheduler)) return null
  if (typeof coins !== 'number' || typeof feed !== 'number') return null
  if (!isSessionLogArray(sessions) || !isFarmSettings(settings)) return null
  return { schemaVersion: SAVE_SCHEMA_VERSION, scheduler, coins, feed, sessions, settings }
}
