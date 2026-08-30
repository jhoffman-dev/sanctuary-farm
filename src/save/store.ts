// Versioned localStorage save store for Sanctuary Farm.
// One key (`SAVE_KEY`), value is `JSON.stringify(SaveData)`. `migrate()` best-effort
// upgrades any blob to the current schema and never throws.
import { MAX_TABLE_DEFAULT, SAVE_KEY, SCHEMA_VERSION, STARTING_FEED } from '@/contracts'
import type {
  AnimalCare,
  EmptySave,
  FactState,
  HatchedCreature,
  SaveData,
  SaveStore,
  SchedulerState,
  SessionLog,
} from '@/contracts'
import { initialSchedulerState } from '@/engine/scheduler'

export const emptySave: EmptySave = () => {
  const scheduler = initialSchedulerState(MAX_TABLE_DEFAULT)
  return {
    schemaVersion: SCHEMA_VERSION,
    facts: scheduler.facts,
    scheduler,
    globalCounter: 0,
    creatures: [],
    care: {},
    coins: 0,
    feed: STARTING_FEED,
    sessions: [],
    settings: { muted: false, maxTable: MAX_TABLE_DEFAULT },
    lastChoresDate: null,
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function isSchedulerState(v: unknown): v is SchedulerState {
  return (
    isRecord(v) &&
    isRecord(v.facts) &&
    typeof v.globalCounter === 'number' &&
    Array.isArray(v.unlockedTiers) &&
    Array.isArray(v.recentFamilies) &&
    typeof v.maxTable === 'number'
  )
}

function isAnimalCare(v: unknown): v is AnimalCare {
  return isRecord(v) && typeof v.family === 'number' && isRecord(v.done)
}

function coerceCare(v: unknown): Record<number, AnimalCare> {
  if (!isRecord(v)) return {}
  const out: Record<number, AnimalCare> = {}
  for (const [k, val] of Object.entries(v)) {
    const fam = Number(k)
    if (Number.isFinite(fam) && isAnimalCare(val)) out[fam] = val as AnimalCare
  }
  return out
}

/**
 * Best-effort upgrade of an arbitrary blob (parsed value, raw JSON string, or
 * junk) to a valid current-schema `SaveData`. Never throws — worst case it
 * returns a fresh `emptySave()`.
 */
export function migrate(raw: unknown): SaveData {
  try {
    let value: unknown = raw
    if (typeof value === 'string') {
      try {
        value = JSON.parse(value)
      } catch {
        return emptySave()
      }
    }
    if (!isRecord(value)) return emptySave()

    const rawVersion = typeof value.schemaVersion === 'number' ? value.schemaVersion : 0

    // ── Forward migrations, one schema version at a time. ──
    let working: Record<string, unknown> = value
    if (rawVersion < 1) {
      // v0 -> v1: the pre-versioned blob simply had no `schemaVersion`.
      working = { ...working, schemaVersion: 1 }
    }
    if (rawVersion < 2) {
      // v1 -> v2: currency:{pellets,coins} -> coins + feed; add `care`.
      const currency = isRecord(working.currency) ? working.currency : {}
      working = {
        ...working,
        coins: typeof currency.coins === 'number' ? currency.coins : 0,
        feed: STARTING_FEED,
        care: {},
        schemaVersion: 2,
      }
    }

    const base = emptySave()
    const scheduler = isSchedulerState(working.scheduler) ? working.scheduler : base.scheduler
    const facts = isRecord(working.facts)
      ? (working.facts as Record<string, FactState>)
      : scheduler.facts
    const settings = isRecord(working.settings) ? working.settings : {}

    return {
      schemaVersion: SCHEMA_VERSION,
      facts,
      scheduler,
      globalCounter:
        typeof working.globalCounter === 'number' ? working.globalCounter : base.globalCounter,
      creatures: Array.isArray(working.creatures)
        ? (working.creatures as HatchedCreature[])
        : base.creatures,
      care: coerceCare(working.care),
      coins: typeof working.coins === 'number' ? working.coins : base.coins,
      feed: typeof working.feed === 'number' ? working.feed : base.feed,
      sessions: Array.isArray(working.sessions)
        ? (working.sessions as SessionLog[])
        : base.sessions,
      settings: {
        muted: typeof settings.muted === 'boolean' ? settings.muted : base.settings.muted,
        maxTable: typeof settings.maxTable === 'number' ? settings.maxTable : base.settings.maxTable,
      },
      lastChoresDate:
        typeof working.lastChoresDate === 'string' || working.lastChoresDate === null
          ? (working.lastChoresDate as string | null)
          : base.lastChoresDate,
    }
  } catch {
    return emptySave()
  }
}

export function createSaveStore(): SaveStore {
  let mem: SaveData | null = null

  const readRaw = (): string | null => {
    try {
      return localStorage.getItem(SAVE_KEY)
    } catch {
      return null
    }
  }

  const writeRaw = (data: SaveData): void => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data))
    } catch {
      /* private mode / quota — the in-memory copy is the fallback */
    }
  }

  const load = (): SaveData => {
    if (mem) return mem
    const raw = readRaw()
    mem = raw === null ? emptySave() : migrate(raw)
    return mem
  }

  const save = (data: SaveData): void => {
    mem = data
    writeRaw(data)
  }

  return {
    load,
    save,
    migrate,
    exportJSON: () => JSON.stringify(load(), null, 2),
    importJSON: (json: string) => {
      let parsed: unknown
      try {
        parsed = JSON.parse(json)
      } catch {
        return false
      }
      if (!isRecord(parsed)) return false
      save(migrate(parsed))
      return true
    },
    reset: () => save(emptySave()),
  }
}
