/**
 * generate(seed, anchors) + overrides → `TileWorld`. A chunk is built from
 * the world seed, the anchors, the overrides and its own coordinate — never
 * from which other chunks exist — so adding land never changes land already
 * built, and any chunk can be (re)built alone.
 */
import type { DraftTile, GenerationRequest } from './chunk-base'
import { generateChunkBase } from './chunk-base'
import type { HotspotAnchor } from './hotspot-anchors'
import { facing } from './hotspot-anchors'
import { resolveTile } from './resolve-autotiles'
import { scatterDecor } from './scatter-decor'
import type { RngFactory } from './seeds'
import type { ChunkCoord, TileCoord } from './tile-grid'
import { DIRECTIONS, chunkKey, chunkOf, indexInChunk, neighbour, sameChunk, tileKey, tilesOfChunk } from './tile-grid'
import type { Chunk, PlacedHotspot, Tile, TileWorld } from './tile-world-types'
import type { WorldOverrides } from './world-overrides'
import { applyHotspotMoves, applyTileEdits } from './world-overrides'

export interface WorldSpec {
  readonly seed: number
  /** The hotspots as the layout places them; `move-hotspot` overrides are applied on top. */
  readonly anchors: readonly HotspotAnchor[]
  readonly overrides: WorldOverrides
  readonly rngFor: RngFactory
}

/** Builds chunks for one spec, generating each chunk's base layers at most once. */
function chunkBuilder(spec: WorldSpec): (coord: ChunkCoord) => Chunk {
  const request: GenerationRequest = {
    seed: spec.seed,
    anchors: applyHotspotMoves(spec.anchors, spec.overrides),
    rngFor: spec.rngFor,
  }
  const bases = new Map<string, DraftTile[]>()
  const structural = new Map<string, DraftTile[]>()
  const baseOf = (coord: ChunkCoord): DraftTile[] => {
    const key = chunkKey(coord)
    const cached = bases.get(key) ?? generateChunkBase(coord, request)
    bases.set(key, cached)
    return cached
  }
  // Neighbours are only asked about paths and fences, so their decor is never generated.
  const structuralOf = (coord: ChunkCoord): DraftTile[] => {
    const key = chunkKey(coord)
    const cached = structural.get(key) ?? applyTileEdits(baseOf(coord), coord, spec.overrides)
    structural.set(key, cached)
    return cached
  }
  const at = (source: (coord: ChunkCoord) => DraftTile[]) => (tile: TileCoord) =>
    source(chunkOf(tile))[indexInChunk(tile)] as DraftTile

  return (coord) => {
    const decorated = scatterDecor(baseOf(coord), coord, { ...request, baseTileAt: at(baseOf) })
    const drafts = applyTileEdits(decorated, coord, spec.overrides)
    const lookup = at(structuralOf)
    return { coord, tiles: tilesOfChunk(coord).map((tile, index) => resolveTile(tile, drafts[index] as DraftTile, lookup)) }
  }
}

function placedHotspots(spec: WorldSpec): PlacedHotspot[] {
  return applyHotspotMoves(spec.anchors, spec.overrides).map((anchor) => ({
    ...anchor,
    rotation: facing(anchor.entranceSide),
  }))
}

function byRowThenColumn(one: Chunk, other: Chunk): number {
  return one.coord.cz - other.coord.cz || one.coord.cx - other.coord.cx
}

function distinct(coords: readonly ChunkCoord[]): ChunkCoord[] {
  return coords.filter((coord, at) => coords.findIndex((other) => sameChunk(other, coord)) === at)
}

export function buildTileWorld(spec: WorldSpec, chunks: readonly ChunkCoord[]): TileWorld {
  const build = chunkBuilder(spec)
  return {
    seed: spec.seed,
    hotspots: placedHotspots(spec),
    chunks: distinct(chunks).map(build).sort(byRowThenColumn),
  }
}

/**
 * New land beside the old. Existing chunks are kept as they are — the new one
 * is built alone and is identical to what a full rebuild would produce.
 */
export function addChunk(world: TileWorld, spec: WorldSpec, coord: ChunkCoord): TileWorld {
  if (world.chunks.some((chunk) => sameChunk(chunk.coord, coord))) return world
  const added = chunkBuilder(spec)(coord)
  return { ...world, chunks: [...world.chunks, added].sort(byRowThenColumn) }
}

/** Each edited tile's edits, in order: the only thing a tile edit changes is its own tile. */
function tileEditsByTile(spec: WorldSpec): Map<string, { at: TileCoord; edits: string }> {
  const byTile = new Map<string, { at: TileCoord; edits: string }>()
  for (const edit of spec.overrides.edits) {
    if (edit.op === 'move-hotspot') continue
    const key = tileKey(edit.at)
    byTile.set(key, { at: edit.at, edits: `${byTile.get(key)?.edits ?? ''}${JSON.stringify(edit)}\n` })
  }
  return byTile
}

/**
 * The chunks a change of tile edits can reach: each changed tile's own chunk,
 * and the chunks of its four side neighbours, which autotile against it.
 */
function chunksReachedByTileEdits(previous: WorldSpec, spec: WorldSpec): Set<string> {
  const before = tileEditsByTile(previous)
  const now = tileEditsByTile(spec)
  const reached = new Set<string>()
  for (const key of new Set([...before.keys(), ...now.keys()])) {
    const at = (now.get(key) ?? before.get(key))?.at
    if (at === undefined || before.get(key)?.edits === now.get(key)?.edits) continue
    reached.add(chunkKey(chunkOf(at)))
    for (const side of DIRECTIONS) reached.add(chunkKey(chunkOf(neighbour(at, side))))
  }
  return reached
}

/** Seed, generator and hotspot positions feed every chunk; when one changes, nothing can be kept. */
function sameGeneration(previous: WorldSpec, spec: WorldSpec): boolean {
  return (
    previous.seed === spec.seed &&
    previous.rngFor === spec.rngFor &&
    JSON.stringify(applyHotspotMoves(previous.anchors, previous.overrides)) ===
      JSON.stringify(applyHotspotMoves(spec.anchors, spec.overrides))
  )
}

/**
 * `buildTileWorld(spec, chunks)`, reusing the chunk objects of a world built
 * from `previous.spec` wherever the change cannot reach them, so a renderer
 * that keys on chunk identity redraws only the chunks an edit touched.
 */
export function rebuildTileWorld(
  previous: { readonly world: TileWorld; readonly spec: WorldSpec },
  spec: WorldSpec,
  chunks: readonly ChunkCoord[],
): TileWorld {
  if (!sameGeneration(previous.spec, spec)) return buildTileWorld(spec, chunks)
  const reached = chunksReachedByTileEdits(previous.spec, spec)
  const kept = new Map(previous.world.chunks.map((chunk) => [chunkKey(chunk.coord), chunk]))
  const build = chunkBuilder(spec)
  const chunkFor = (coord: ChunkCoord): Chunk => {
    const key = chunkKey(coord)
    return (reached.has(key) ? undefined : kept.get(key)) ?? build(coord)
  }
  return { seed: spec.seed, hotspots: previous.world.hotspots, chunks: distinct(chunks).map(chunkFor).sort(byRowThenColumn) }
}

/** The tile at a coordinate, or `undefined` off the world's land. */
export function tileOf(world: TileWorld, tile: TileCoord): Tile | undefined {
  const chunk = world.chunks.find((candidate) => sameChunk(candidate.coord, chunkOf(tile)))
  return chunk?.tiles[indexInChunk(tile)]
}
