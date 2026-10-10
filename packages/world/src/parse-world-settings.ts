/**
 * JSON → `WorldSettings`, in the idiom of `parseWorldOverrides`: it never
 * throws, and a bad hand edit or editor save comes back as `{ ok: false, reason }`
 * naming the field that failed.
 */
import { fail, parseOrReason, requireArray, requireInteger, requireOnlyKeys, requireRecord } from './parse-primitives'
import type { ChunkCoord } from './tile-grid'
import { chunkKey } from './tile-grid'
import type { WorldSettings } from './world-settings'
import { MAX_WORLD_SEED, WORLD_SETTINGS_SCHEMA_VERSION } from './world-settings'

export type ParsedWorldSettings = { ok: true; settings: WorldSettings } | { ok: false; reason: string }

function requireChunk(value: unknown, path: string): ChunkCoord {
  const chunk = requireRecord(value, path)
  requireOnlyKeys(chunk, ['cx', 'cz'], path)
  return { cx: requireInteger(chunk.cx, `${path}.cx`), cz: requireInteger(chunk.cz, `${path}.cz`) }
}

function requireSeed(value: unknown): number {
  const seed = requireInteger(value, 'seed')
  if (seed < 0 || seed > MAX_WORLD_SEED) fail('seed', `expected 0 … ${MAX_WORLD_SEED}`)
  return seed
}

function requireLand(value: unknown): ChunkCoord[] {
  const chunks = requireArray(value, 'chunks').map((chunk, index) => requireChunk(chunk, `chunks[${index}]`))
  if (chunks.length === 0) fail('chunks', 'expected at least one chunk')
  const keys = chunks.map(chunkKey)
  const repeated = keys.findIndex((key, index) => keys.indexOf(key) !== index)
  if (repeated !== -1) fail(`chunks[${repeated}]`, 'a chunk listed twice')
  return chunks.sort((one, other) => one.cz - other.cz || one.cx - other.cx)
}

function buildSettings(raw: unknown): WorldSettings {
  const document = requireRecord(raw, 'world')
  requireOnlyKeys(document, ['schemaVersion', 'seed', 'chunks'], 'world')
  if (document.schemaVersion !== WORLD_SETTINGS_SCHEMA_VERSION) fail('schemaVersion', `expected ${WORLD_SETTINGS_SCHEMA_VERSION}`)
  return { schemaVersion: WORLD_SETTINGS_SCHEMA_VERSION, seed: requireSeed(document.seed), chunks: requireLand(document.chunks) }
}

/** The only way into a `WorldSettings`. */
export function parseWorldSettings(raw: unknown): ParsedWorldSettings {
  const built = parseOrReason(() => buildSettings(raw))
  return built.ok ? { ok: true, settings: built.value } : built
}
