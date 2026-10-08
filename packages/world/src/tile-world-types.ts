/**
 * The finished tile world: plain, serialisable data the renderer draws and
 * the world editor (#105) paints over. Optional layers are absent, never
 * `undefined`, so a world survives a JSON round trip unchanged.
 */
import type { HotspotAnchor } from './hotspot-anchors'
import type { DecorPiece, GroundPiece, QuarterTurns, StructurePiece } from './tile-kinds'
import type { ChunkCoord } from './tile-grid'

export interface Tile {
  readonly ground: GroundPiece
  readonly structure?: StructurePiece
  readonly decor?: DecorPiece
}

export interface Chunk {
  readonly coord: ChunkCoord
  /** Row-major, `CHUNK_SIZE × CHUNK_SIZE`: index `localZ · CHUNK_SIZE + localX`. */
  readonly tiles: readonly Tile[]
}

/** A hotspot as built: its anchor, plus the turn that faces its model out through the entrance. */
export interface PlacedHotspot extends HotspotAnchor {
  readonly rotation: QuarterTurns
}

export interface TileWorld {
  readonly seed: number
  readonly hotspots: readonly PlacedHotspot[]
  /** Sorted by `cz`, then `cx`. */
  readonly chunks: readonly Chunk[]
}
