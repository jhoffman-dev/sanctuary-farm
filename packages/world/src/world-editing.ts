/**
 * The world editor's operations (#105), as pure functions over the overrides.
 * The editor UI only turns pointer and key input into these calls; every rule
 * about what an edit means lives here.
 *
 * The overrides file stays minimal: an edit replaces any earlier edit of the
 * same layer on the same tile, and an edit that leaves the tile as the world
 * would build it anyway is not stored at all — so painting a tile back to
 * what was generated removes its override rather than adding a second one.
 */
import type { HotspotAnchor } from './hotspot-anchors'
import { moveAnchor } from './hotspot-anchors'
import type { ChunkCoord, TileCoord, TileRect } from './tile-grid'
import { DIRECTIONS, chunkKey, chunkOf, rectContains } from './tile-grid'
import type { WorldSpec } from './tile-world'
import { buildTileWorld, tileOf } from './tile-world'
import type { PlacedHotspot, Tile, TileWorld } from './tile-world-types'
import type { TileEdit, WorldEdit, WorldOverrides } from './world-overrides'
import type { HotspotId } from './world-layout'

export type TileLayer = 'ground' | 'structure' | 'decor'

const LAYER_OF: Record<TileEdit['op'], TileLayer> = {
  'set-ground': 'ground',
  'place-structure': 'structure',
  'remove-structure': 'structure',
  'place-decor': 'decor',
  'remove-decor': 'decor',
}

function sameTile(one: TileCoord, other: TileCoord): boolean {
  return one.x === other.x && one.z === other.z
}

/** Paths and water clear decor (`applyTileEdit`), so a decor edit beneath one is already dead. */
function clearsDecor(edit: TileEdit): boolean {
  return edit.op === 'set-ground' && (edit.ground === 'path' || edit.ground === 'water')
}

/** Whether `next` makes `earlier` irrelevant, so keeping both would only grow the file. */
function supersedes(next: WorldEdit, earlier: WorldEdit): boolean {
  if (next.op === 'move-hotspot' || earlier.op === 'move-hotspot') {
    return next.op === 'move-hotspot' && earlier.op === 'move-hotspot' && next.hotspot === earlier.hotspot
  }
  if (!sameTile(next.at, earlier.at)) return false
  return LAYER_OF[next.op] === LAYER_OF[earlier.op] || (clearsDecor(next) && LAYER_OF[earlier.op] === 'decor')
}

function withEdits(overrides: WorldOverrides, edits: readonly WorldEdit[]): WorldOverrides {
  return { ...overrides, edits }
}

/** One tile as the spec builds it. Only its own chunk is generated. */
export function builtTileAt(spec: WorldSpec, at: TileCoord): Tile {
  const tile = tileOf(buildTileWorld(spec, [chunkOf(at)]), at)
  if (tile === undefined) throw new Error(`Building chunk ${chunkKey(chunkOf(at))} did not produce tile ${at.x},${at.z}`)
  return tile
}

/** Key order is irrelevant to a tile's meaning, so compare with keys sorted. */
function canonical(value: unknown): string {
  if (typeof value !== 'object' || value === null) return JSON.stringify(value)
  const entries = Object.entries(value).sort(([one], [other]) => (one < other ? -1 : 1))
  return `{${entries.map(([key, inner]) => `${key}:${canonical(inner)}`).join(',')}}`
}

function originOf(anchors: readonly HotspotAnchor[], hotspot: HotspotId): TileCoord | undefined {
  const anchor = anchors.find((candidate) => candidate.id === hotspot)
  return anchor && { x: anchor.footprint.x, z: anchor.footprint.z }
}

/**
 * The overrides with `edit` recorded. Earlier edits it supersedes are dropped,
 * and the edit itself is dropped when the world would look the same without it.
 */
export function applyEdit(spec: WorldSpec, edit: WorldEdit): WorldOverrides {
  const kept = withEdits(
    spec.overrides,
    spec.overrides.edits.filter((earlier) => !supersedes(edit, earlier)),
  )
  const recorded = withEdits(kept, [...kept.edits, edit])
  if (edit.op === 'move-hotspot') {
    const origin = originOf(spec.anchors, edit.hotspot)
    return origin && sameTile(origin, edit.to) ? kept : recorded
  }
  const without = builtTileAt({ ...spec, overrides: kept }, edit.at)
  const withIt = builtTileAt({ ...spec, overrides: recorded }, edit.at)
  return canonical(without) === canonical(withIt) ? kept : recorded
}

/**
 * The erase tool: takes the top thing off a tile — its decor, else its
 * structure, else a painted ground. A piece the editor placed simply loses its
 * override; a generated piece gets a `remove-…` override.
 */
export function eraseAt(spec: WorldSpec, at: TileCoord): WorldOverrides {
  const tile = builtTileAt(spec, at)
  if (tile.decor) return applyEdit(spec, { op: 'remove-decor', at })
  if (tile.structure) return applyEdit(spec, { op: 'remove-structure', at })
  return withEdits(
    spec.overrides,
    spec.overrides.edits.filter((edit) => !(edit.op === 'set-ground' && sameTile(edit.at, at))),
  )
}

/** Every override on one tile dropped: the tile goes back to what the seed generates. */
export function removeEditsAt(overrides: WorldOverrides, at: TileCoord): WorldOverrides {
  return withEdits(
    overrides,
    overrides.edits.filter((edit) => edit.op === 'move-hotspot' || !sameTile(edit.at, at)),
  )
}

/** Which of a tile's layers an override decides, for the inspector's "generated / overridden". */
export function overriddenLayersAt(overrides: WorldOverrides, at: TileCoord): Record<TileLayer, boolean> {
  const layers = { ground: false, structure: false, decor: false }
  for (const edit of overrides.edits) {
    if (edit.op !== 'move-hotspot' && sameTile(edit.at, at)) layers[LAYER_OF[edit.op]] = true
  }
  return layers
}

export function isHotspotMoved(overrides: WorldOverrides, hotspot: HotspotId): boolean {
  return overrides.edits.some((edit) => edit.op === 'move-hotspot' && edit.hotspot === hotspot)
}

/** The hotspot whose footprint covers a tile, if any. */
export function hotspotAt(world: TileWorld, at: TileCoord): PlacedHotspot | undefined {
  return world.hotspots.find((hotspot) => rectContains(hotspot.footprint, at))
}

function rectTiles(rect: TileRect): TileCoord[] {
  return Array.from({ length: rect.width * rect.depth }, (_, index) => ({
    x: rect.x + (index % rect.width),
    z: rect.z + Math.floor(index / rect.width),
  }))
}

function rectsOverlap(one: TileRect, other: TileRect): boolean {
  return (
    one.x < other.x + other.width && other.x < one.x + one.width && one.z < other.z + other.depth && other.z < one.z + one.depth
  )
}

/**
 * Why a hotspot cannot move to `to` (its footprint's new north-west corner),
 * or `null` when it can: the footprint and the arrival must be on the land,
 * clear of every other hotspot's footprint and arrival.
 */
export function hotspotMoveProblem(world: TileWorld, hotspot: HotspotId, to: TileCoord): string | null {
  const current = world.hotspots.find((candidate) => candidate.id === hotspot)
  if (!current) return `${hotspot} is not on this farm`
  const moved = moveAnchor(current, to)
  const onLand = [...rectTiles(moved.footprint), moved.arrival].every((tile) => tileOf(world, tile) !== undefined)
  if (!onLand) return `${hotspot} would leave the land`
  for (const other of world.hotspots.filter((candidate) => candidate.id !== hotspot)) {
    const clash =
      rectsOverlap(moved.footprint, other.footprint) ||
      rectContains(other.footprint, moved.arrival) ||
      rectContains(moved.footprint, other.arrival)
    if (clash) return `${hotspot} would overlap ${other.id}`
  }
  return null
}

/** Chunks beside the land that are not land yet — where the editor offers to add more. */
export function neighbouringChunks(land: readonly ChunkCoord[]): ChunkCoord[] {
  const taken = new Set(land.map(chunkKey))
  const offered = new Map<string, ChunkCoord>()
  const steps: Record<(typeof DIRECTIONS)[number], ChunkCoord> = {
    north: { cx: 0, cz: -1 },
    east: { cx: 1, cz: 0 },
    south: { cx: 0, cz: 1 },
    west: { cx: -1, cz: 0 },
  }
  for (const chunk of land) {
    for (const side of DIRECTIONS) {
      const next = { cx: chunk.cx + steps[side].cx, cz: chunk.cz + steps[side].cz }
      if (!taken.has(chunkKey(next))) offered.set(chunkKey(next), next)
    }
  }
  return [...offered.values()].sort((one, other) => one.cz - other.cz || one.cx - other.cx)
}
