/**
 * Where paths cross from one chunk to the next. Each chunk edge gets at most one
 * connector, picked from (world seed, edge) alone — so the chunks either side
 * agree on it without ever seeing each other, and land added later meets the
 * path stub that was already waiting at the edge.
 */
import type { HotspotAnchor } from './hotspot-anchors'
import type { RngFactory } from './seeds'
import { STREAM, mixSeed, pickIndex } from './seeds'
import type { ChunkCoord, Direction, TileCoord } from './tile-grid'
import { CHUNK_SIZE, chunkOrigin, rectContains } from './tile-grid'

export interface ConnectorRequest {
  readonly seed: number
  readonly anchors: readonly HotspotAnchor[]
  readonly rngFor: RngFactory
}

/** One side of the edge as a pair of tiles: the inner one is in the chunk asking. */
interface EdgeTiles {
  readonly inner: TileCoord
  readonly outer: TileCoord
}

/** A connector keeps one tile clear of each corner, so it never lands where two edges meet. */
const FIRST_OFFSET = 1
const OFFSET_COUNT = CHUNK_SIZE - 2

function edgeTiles(chunk: ChunkCoord, side: Direction, offset: number): EdgeTiles {
  const origin = chunkOrigin(chunk)
  const last = CHUNK_SIZE - 1
  if (side === 'north') return { inner: { x: origin.x + offset, z: origin.z }, outer: { x: origin.x + offset, z: origin.z - 1 } }
  if (side === 'south') return { inner: { x: origin.x + offset, z: origin.z + last }, outer: { x: origin.x + offset, z: origin.z + last + 1 } }
  if (side === 'west') return { inner: { x: origin.x, z: origin.z + offset }, outer: { x: origin.x - 1, z: origin.z + offset } }
  return { inner: { x: origin.x + last, z: origin.z + offset }, outer: { x: origin.x + last + 1, z: origin.z + offset } }
}

/** The same edge, named the same way from both chunks: `[axis, boundary, row]`. */
function edgeIdentity(chunk: ChunkCoord, side: Direction): readonly [number, number, number] {
  if (side === 'north') return [1, chunk.cz, chunk.cx]
  if (side === 'south') return [1, chunk.cz + 1, chunk.cx]
  if (side === 'west') return [0, chunk.cx, chunk.cz]
  return [0, chunk.cx + 1, chunk.cz]
}

function insideAnyFootprint(anchors: readonly HotspotAnchor[], tile: TileCoord): boolean {
  return anchors.some((anchor) => rectContains(anchor.footprint, tile))
}

/** This chunk's tile of the connector on one side, or `undefined` when the whole edge is built over. */
export function edgeConnector(request: ConnectorRequest, chunk: ChunkCoord, side: Direction): TileCoord | undefined {
  const open = Array.from({ length: OFFSET_COUNT }, (_, at) => edgeTiles(chunk, side, FIRST_OFFSET + at)).filter(
    ({ inner, outer }) => !insideAnyFootprint(request.anchors, inner) && !insideAnyFootprint(request.anchors, outer),
  )
  if (open.length === 0) return undefined
  const rng = request.rngFor(mixSeed(request.seed, STREAM.edgeConnector, ...edgeIdentity(chunk, side)))
  return open[pickIndex(rng, open.length)]?.inner
}
