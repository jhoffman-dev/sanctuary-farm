/**
 * Everything the world editor (#105) can change, as one document: the
 * settings (seed and land) and the overrides. Saving writes both files.
 */
import { serializeWorldOverrides, serializeWorldSettings } from './serialize-world'
import type { ChunkCoord } from './tile-grid'
import { chunkKey } from './tile-grid'
import type { WorldEdit, WorldOverrides } from './world-overrides'
import type { WorldSettings } from './world-settings'

export interface WorldDraft {
  readonly settings: WorldSettings
  readonly overrides: WorldOverrides
}

/** Same files on disk — the comparison a save, undo or "nothing changed" check needs. */
export function sameDraft(one: WorldDraft, other: WorldDraft): boolean {
  return (
    serializeWorldSettings(one.settings) === serializeWorldSettings(other.settings) &&
    serializeWorldOverrides(one.overrides) === serializeWorldOverrides(other.overrides)
  )
}

/** The same land and edits, generated from another seed. Overrides are inputs, so they all survive. */
export function withSeed(draft: WorldDraft, seed: number): WorldDraft {
  return { ...draft, settings: { ...draft.settings, seed } }
}

/** One more chunk of land, kept in the settings' `cz`-then-`cx` order. */
export function withChunk(draft: WorldDraft, chunk: ChunkCoord): WorldDraft {
  if (draft.settings.chunks.some((existing) => chunkKey(existing) === chunkKey(chunk))) return draft
  const chunks = [...draft.settings.chunks, chunk].sort((one, other) => one.cz - other.cz || one.cx - other.cx)
  return { ...draft, settings: { ...draft.settings, chunks } }
}

export function withOverrides(draft: WorldDraft, overrides: WorldOverrides): WorldDraft {
  return { ...draft, overrides }
}

/** Counts each copy, so two identical edits are two. */
function multiset(lines: readonly string[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const line of lines) counts.set(line, (counts.get(line) ?? 0) + 1)
  return counts
}

function symmetricDifference(one: readonly string[], other: readonly string[]): number {
  const left = multiset(one)
  const right = multiset(other)
  const keys = new Set([...left.keys(), ...right.keys()])
  return [...keys].reduce((sum, key) => sum + Math.abs((left.get(key) ?? 0) - (right.get(key) ?? 0)), 0)
}

function editKey(edit: WorldEdit): string {
  return serializeWorldOverrides({ schemaVersion: 1, edits: [edit] })
}

/**
 * How many changes a save would write: edits added or removed, chunks added,
 * and a changed seed. An edit changed in place counts as one removed and one added.
 */
export function countPendingChanges(saved: WorldDraft, current: WorldDraft): number {
  const edits = symmetricDifference(saved.overrides.edits.map(editKey), current.overrides.edits.map(editKey))
  const land = symmetricDifference(saved.settings.chunks.map(chunkKey), current.settings.chunks.map(chunkKey))
  const seed = saved.settings.seed === current.settings.seed ? 0 : 1
  return edits + land + seed
}
