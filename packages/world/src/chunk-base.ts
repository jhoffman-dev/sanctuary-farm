/**
 * The generated layers of one chunk before decor, overrides and autotiling:
 * ground, the hotspots' fences and placeholder buildings, a pond, and the path
 * network. Everything here is a function of (world seed, anchors, chunk) only,
 * so any chunk — including one not in the world yet — can be generated alone.
 */
import { edgeConnector } from './edge-connectors'
import type { ConnectorRequest } from './edge-connectors'
import type { HotspotAnchor } from './hotspot-anchors'
import { facing } from './hotspot-anchors'
import { routeToNetwork } from './route-paths'
import type { Rng } from './seeds'
import { STREAM, mixSeed, pickIndex } from './seeds'
import type { DecorPiece, GroundKind, QuarterTurns, StructureKind } from './tile-kinds'
import type { ChunkCoord, Direction, TileCoord, TileRect } from './tile-grid'
import { CHUNK_SIZE, DIRECTIONS, chunkOrigin, distanceToRect, indexInChunk, rectContains, sameChunk, chunkOf, tilesOfChunk } from './tile-grid'
import type { HotspotId } from './world-layout'

export interface DraftStructure {
  readonly kind: StructureKind
  readonly rotation: QuarterTurns
  readonly enclosure?: HotspotId
}

/** A tile on its way to being a `Tile`: autotiled pieces have no role yet. */
export interface DraftTile {
  ground: GroundKind
  structure?: DraftStructure
  decor?: DecorPiece
}

export type GenerationRequest = ConnectorRequest

/** Generated ponds stay this far inside the chunk, so they never block an edge connector. */
const POND_EDGE_MARGIN = 2
/** …and this far from any footprint or arrival, so they never wall one off. */
const POND_CLEARANCE = 2
const POND_CHANCE = 0.3
const POND_ATTEMPTS = 8

/** Stepping onto a footprint or water is allowed only when nothing else reaches — routing never fails. */
const BLOCKED_STEP_COST = 1000
const REUSED_PATH_STEP_COST = 0.3
const PATH_JITTER = 0.5

function sideOf(rect: TileRect, tile: TileCoord): Direction {
  if (tile.z === rect.z) return 'north'
  if (tile.z === rect.z + rect.depth - 1) return 'south'
  if (tile.x === rect.x) return 'west'
  return 'east'
}

function onBorder(rect: TileRect, tile: TileCoord): boolean {
  return distanceToRect({ x: rect.x + 1, z: rect.z + 1, width: rect.width - 2, depth: rect.depth - 2 }, tile) > 0
}

function sameTile(one: TileCoord, other: TileCoord): boolean {
  return one.x === other.x && one.z === other.z
}

/** Windows on every other wall tile along a side, so a long wall reads as a building. */
function wallKind(rect: TileRect, tile: TileCoord): StructureKind {
  const along = tile.x - rect.x + tile.z - rect.z
  return along % 2 === 1 ? 'building-wall-window' : 'building-wall'
}

function footprintStructure(anchor: HotspotAnchor, tile: TileCoord): DraftStructure | undefined {
  const { footprint, entrance } = anchor
  if (anchor.style === 'open') return undefined
  if (anchor.style === 'fenced') {
    if (!onBorder(footprint, tile)) return undefined
    return { kind: sameTile(tile, entrance) ? 'fence-gate' : 'fence', rotation: 0, enclosure: anchor.id }
  }
  if (!onBorder(footprint, tile)) return { kind: 'building-roof', rotation: facing(anchor.entranceSide) }
  if (sameTile(tile, entrance)) return { kind: 'building-wall-door', rotation: facing(anchor.entranceSide) }
  return { kind: wallKind(footprint, tile), rotation: facing(sideOf(footprint, tile)) }
}

function layFootprints(tiles: DraftTile[], chunk: ChunkCoord, anchors: readonly HotspotAnchor[]): void {
  tilesOfChunk(chunk).forEach((tile, index) => {
    const anchor = anchors.find((candidate) => rectContains(candidate.footprint, tile))
    if (anchor === undefined) return
    const structure = footprintStructure(anchor, tile)
    tiles[index] = structure === undefined ? { ground: 'dirt' } : { ground: 'dirt', structure }
  })
}

function pondFits(pond: TileRect, anchors: readonly HotspotAnchor[]): boolean {
  const keepClear = anchors.flatMap((anchor) => [anchor.footprint, { ...anchor.arrival, width: 1, depth: 1 }])
  return tilesOfRect(pond).every((tile) => keepClear.every((rect) => distanceToRect(rect, tile) > POND_CLEARANCE))
}

function tilesOfRect(rect: TileRect): TileCoord[] {
  return Array.from({ length: rect.width * rect.depth }, (_, at) => ({
    x: rect.x + (at % rect.width),
    z: rect.z + Math.floor(at / rect.width),
  }))
}

function rollPond(rng: Rng, chunk: ChunkCoord): TileRect {
  const origin = chunkOrigin(chunk)
  const width = 2 + pickIndex(rng, 2)
  const depth = 2 + pickIndex(rng, 2)
  const span = (size: number): number => CHUNK_SIZE - 2 * POND_EDGE_MARGIN - size + 1
  return {
    x: origin.x + POND_EDGE_MARGIN + pickIndex(rng, span(width)),
    z: origin.z + POND_EDGE_MARGIN + pickIndex(rng, span(depth)),
    width,
    depth,
  }
}

function layPond(tiles: DraftTile[], chunk: ChunkCoord, request: GenerationRequest): void {
  const rng = request.rngFor(mixSeed(request.seed, STREAM.pond, chunk.cx, chunk.cz))
  if (rng() >= POND_CHANCE) return
  for (let attempt = 0; attempt < POND_ATTEMPTS; attempt++) {
    const pond = rollPond(rng, chunk)
    if (!pondFits(pond, request.anchors)) continue
    for (const tile of tilesOfRect(pond)) tiles[indexInChunk(tile)] = { ground: 'water' }
    return
  }
}

/** The arrivals in this chunk, in hotspot order, then the edge connectors north, east, south, west. */
function pathTerminals(chunk: ChunkCoord, request: GenerationRequest): number[] {
  const arrivals = request.anchors.map((anchor) => anchor.arrival).filter((tile) => sameChunk(chunkOf(tile), chunk))
  const connectors = DIRECTIONS.map((side) => edgeConnector(request, chunk, side)).filter(
    (tile): tile is TileCoord => tile !== undefined,
  )
  return [...arrivals, ...connectors].map(indexInChunk)
}

function layPaths(tiles: DraftTile[], chunk: ChunkCoord, request: GenerationRequest): void {
  const rng = request.rngFor(mixSeed(request.seed, STREAM.pathJitter, chunk.cx, chunk.cz))
  const jitter = tiles.map(() => rng() * PATH_JITTER)
  const network = new Set<number>()
  const stepCost = (index: number): number => {
    if (network.has(index)) return REUSED_PATH_STEP_COST
    const tile = tiles[index] as DraftTile
    return tile.ground === 'grass' ? 1 + (jitter[index] as number) : BLOCKED_STEP_COST
  }
  const [first, ...rest] = pathTerminals(chunk, request)
  if (first === undefined) return
  network.add(first)
  for (const from of rest) {
    for (const index of routeToNetwork({ from, network, stepCost })) network.add(index)
  }
  for (const index of network) tiles[index] = { ...(tiles[index] as DraftTile), ground: 'path' }
}

export function generateChunkBase(chunk: ChunkCoord, request: GenerationRequest): DraftTile[] {
  const tiles: DraftTile[] = tilesOfChunk(chunk).map(() => ({ ground: 'grass' }))
  layFootprints(tiles, chunk, request.anchors)
  layPond(tiles, chunk, request)
  layPaths(tiles, chunk, request)
  return tiles
}
