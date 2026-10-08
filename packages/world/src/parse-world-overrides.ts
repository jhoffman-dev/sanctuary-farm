/**
 * JSON → `WorldOverrides`, in the idiom of `parseFarmLayout`: every value is
 * re-checked and the edits rebuilt from validated primitives, and it never
 * throws — a bad hand edit or a bad save from the world editor (#105) comes
 * back as `{ ok: false, reason }` naming the edit that failed.
 */
import {
  parseOrReason,
  requireArray,
  requireInteger,
  requireOneOf,
  requireOnlyKeys,
  requireRecord,
  fail,
} from './parse-primitives'
import type { QuarterTurns } from './tile-kinds'
import { DECOR_KINDS, GROUND_KINDS, STRUCTURE_KINDS } from './tile-kinds'
import type { TileCoord } from './tile-grid'
import type { WorldEdit, WorldOverrides } from './world-overrides'
import { OVERRIDES_SCHEMA_VERSION, WORLD_EDIT_OPS } from './world-overrides'
import { HOTSPOT_IDS } from './world-layout'

export type ParsedWorldOverrides = { ok: true; overrides: WorldOverrides } | { ok: false; reason: string }

function requireTile(value: unknown, path: string): TileCoord {
  const tile = requireRecord(value, path)
  requireOnlyKeys(tile, ['x', 'z'], path)
  return { x: requireInteger(tile.x, `${path}.x`), z: requireInteger(tile.z, `${path}.z`) }
}

function requireQuarterTurns(value: unknown, path: string): QuarterTurns {
  if (value !== 0 && value !== 1 && value !== 2 && value !== 3) fail(path, 'expected quarter turns 0, 1, 2 or 3')
  return value
}

const EDIT_KEYS: Record<WorldEdit['op'], readonly string[]> = {
  'set-ground': ['op', 'at', 'ground'],
  'place-structure': ['op', 'at', 'kind', 'rotation'],
  'remove-structure': ['op', 'at'],
  'place-decor': ['op', 'at', 'kind', 'rotation'],
  'remove-decor': ['op', 'at'],
  'move-hotspot': ['op', 'hotspot', 'to'],
}

function parseEdit(value: unknown, index: number): WorldEdit {
  const path = `edits[${index}]`
  const edit = requireRecord(value, path)
  const op = requireOneOf(edit.op, WORLD_EDIT_OPS, `${path}.op`)
  requireOnlyKeys(edit, EDIT_KEYS[op], path)
  if (op === 'move-hotspot') {
    return { op, hotspot: requireOneOf(edit.hotspot, HOTSPOT_IDS, `${path}.hotspot`), to: requireTile(edit.to, `${path}.to`) }
  }
  const at = requireTile(edit.at, `${path}.at`)
  switch (op) {
    case 'set-ground':
      return { op, at, ground: requireOneOf(edit.ground, GROUND_KINDS, `${path}.ground`) }
    case 'place-structure': {
      const kind = requireOneOf(edit.kind, STRUCTURE_KINDS, `${path}.kind`)
      return { op, at, kind, rotation: requireQuarterTurns(edit.rotation, `${path}.rotation`) }
    }
    case 'place-decor': {
      const kind = requireOneOf(edit.kind, DECOR_KINDS, `${path}.kind`)
      return { op, at, kind, rotation: requireQuarterTurns(edit.rotation, `${path}.rotation`) }
    }
    case 'remove-structure':
    case 'remove-decor':
      return { op, at }
  }
}

function buildOverrides(raw: unknown): WorldOverrides {
  const document = requireRecord(raw, 'overrides')
  requireOnlyKeys(document, ['schemaVersion', 'edits'], 'overrides')
  if (document.schemaVersion !== OVERRIDES_SCHEMA_VERSION) fail('schemaVersion', `expected ${OVERRIDES_SCHEMA_VERSION}`)
  return { schemaVersion: OVERRIDES_SCHEMA_VERSION, edits: requireArray(document.edits, 'edits').map(parseEdit) }
}

/** The only way into a `WorldOverrides`. */
export function parseWorldOverrides(raw: unknown): ParsedWorldOverrides {
  const built = parseOrReason(() => buildOverrides(raw))
  return built.ok ? { ok: true, overrides: built.value } : built
}
