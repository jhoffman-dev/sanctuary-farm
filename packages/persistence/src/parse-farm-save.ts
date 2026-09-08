import type {
  Box,
  FactId,
  FactState,
  FarmSave,
  FarmSettings,
  SchedulerState,
  SessionContext,
  SessionLog,
} from '@sf/domain'
import {
  MAX_RECENT_LATENCIES,
  MAX_TABLE_DEFAULT,
  MIN_TABLE,
  SAVE_SCHEMA_VERSION,
  TIER_NAMES,
} from '@sf/domain'

type UnknownRecord = Record<string, unknown>

const BOXES: readonly Box[] = [0, 1, 2, 3, 4, 5]
const TIERS: readonly number[] = Object.keys(TIER_NAMES).map(Number)
const CONTEXTS: readonly SessionContext[] = ['stall', 'paddock', 'free', 'egg']

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** A finite integer ≥ 0: counters, question-time due stamps, coins, feed. */
function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

function isDuration(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function isTable(value: unknown): value is number {
  return isCount(value) && value >= MIN_TABLE && value <= MAX_TABLE_DEFAULT
}

/**
 * Own entries minus `__proto__`: JSON.parse makes it an ordinary own key, but
 * copying it onto the rebuilt record would rewrite that record's prototype.
 */
function ownEntries(record: UnknownRecord): [string, unknown][] {
  return Object.entries(record).filter(([key]) => key !== '__proto__')
}

function parseBox(value: unknown): Box | null {
  const box = BOXES.find((candidate) => candidate === value)
  return box === undefined ? null : box
}

function isLatencyWindow(value: unknown): value is number[] {
  return Array.isArray(value) && value.length <= MAX_RECENT_LATENCIES && value.every(isDuration)
}

function parseFactState(key: string, value: unknown): FactState | null {
  if (!isRecord(value) || value.id !== key) return null
  const { dueAt, lastLatencyMs, recentLatencies, correctStreak, totalAttempts, totalCorrect, introduced } = value
  const box = parseBox(value.box)
  if (box === null || typeof introduced !== 'boolean') return null
  // Box 0 means exactly "not yet introduced"; the two fields must agree.
  if (introduced === (box === 0)) return null
  if (!isCount(dueAt) || !isCount(correctStreak) || !isCount(totalAttempts) || !isCount(totalCorrect)) return null
  if (lastLatencyMs !== null && !isDuration(lastLatencyMs)) return null
  if (!isLatencyWindow(recentLatencies)) return null
  return {
    id: key,
    box,
    dueAt,
    lastLatencyMs,
    recentLatencies: [...recentLatencies],
    correctStreak,
    totalAttempts,
    totalCorrect,
    introduced,
  }
}

/** Empty is rejected too: the scheduler has nothing to serve from and throws on the first question. */
function parseFacts(value: unknown): Record<FactId, FactState> | null {
  if (!isRecord(value)) return null
  const facts: Record<FactId, FactState> = {}
  for (const [key, status] of ownEntries(value)) {
    const state = parseFactState(key, status)
    if (!state) return null
    facts[key] = state
  }
  return Object.keys(facts).length === 0 ? null : facts
}

function parseCommuteCredit(value: unknown): Record<FactId, number> | null {
  if (!isRecord(value)) return null
  const credit: Record<FactId, number> = {}
  for (const [key, owed] of ownEntries(value)) {
    // A whole box of credit is promoted on the spot, so what is owed is always a fraction.
    if (!isDuration(owed) || owed >= 1) return null
    credit[key] = owed
  }
  return credit
}

/** Tier 1 is never locked, so a well-formed list always contains it. */
function isUnlockedTiers(value: unknown): value is number[] {
  return Array.isArray(value) && value.includes(1) && value.every((tier) => TIERS.includes(tier))
}

function isFamilyHistory(value: unknown): value is number[] {
  return Array.isArray(value) && value.every(isTable)
}

function parseScheduler(value: unknown): SchedulerState | null {
  if (!isRecord(value)) return null
  const { globalCounter, unlockedTiers, recentFamilies, lastServed, maxTable } = value
  const facts = parseFacts(value.facts)
  const commuteCredit = parseCommuteCredit(value.commuteCredit)
  if (!facts || !commuteCredit || !isTable(maxTable)) return null
  if (!isCount(globalCounter) || !isUnlockedTiers(unlockedTiers) || !isFamilyHistory(recentFamilies)) return null
  // An unknown lastServed is harmless: it only ever stops a fact being asked twice in a row.
  if (lastServed !== null && typeof lastServed !== 'string') return null
  return {
    facts,
    globalCounter,
    unlockedTiers: [...unlockedTiers],
    recentFamilies: [...recentFamilies],
    lastServed,
    commuteCredit,
    maxTable,
  }
}

function isSessionContext(value: unknown): value is SessionContext {
  return CONTEXTS.some((context) => context === value)
}

function parseSessionLog(value: unknown): SessionLog | null {
  if (!isRecord(value)) return null
  const { startedAt, endedAt, context, family, entries } = value
  if (typeof startedAt !== 'number' || typeof endedAt !== 'number' || !isSessionContext(context)) return null
  if (family !== null && typeof family !== 'number') return null
  if (!Array.isArray(entries)) return null
  // Entries are informational and never fed back into the rules, so their shape is not re-checked.
  return { startedAt, endedAt, context, family, entries }
}

function parseSessions(value: unknown): SessionLog[] | null {
  if (!Array.isArray(value)) return null
  const sessions: SessionLog[] = []
  for (const item of value) {
    const log = parseSessionLog(item)
    if (!log) return null
    sessions.push(log)
  }
  return sessions
}

function parseSettings(value: unknown, maxTable: number): FarmSettings | null {
  if (!isRecord(value) || typeof value.muted !== 'boolean') return null
  // The scheduler's table is the one in play; a disagreeing setting would list families it cannot serve.
  if (value.maxTable !== maxTable) return null
  return { muted: value.muted, maxTable }
}

/**
 * Structural guard for a stored save. Anything that isn't a well-formed v3
 * save the domain can actually play — including prototype v1/v2 blobs, which
 * are deliberately not migrated — is `null`, and the caller starts a fresh
 * farm. Every object is rebuilt from validated primitives, so stray keys from
 * an older or hand-edited blob never reach the domain at any depth.
 */
export function parseFarmSave(raw: unknown): FarmSave | null {
  if (!isRecord(raw) || raw.schemaVersion !== SAVE_SCHEMA_VERSION) return null
  const scheduler = parseScheduler(raw.scheduler)
  if (!scheduler) return null
  const settings = parseSettings(raw.settings, scheduler.maxTable)
  const sessions = parseSessions(raw.sessions)
  const { coins, feed } = raw
  if (!settings || !sessions || !isCount(coins) || !isCount(feed)) return null
  return { schemaVersion: SAVE_SCHEMA_VERSION, scheduler, coins, feed, sessions, settings }
}
