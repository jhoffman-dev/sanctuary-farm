/**
 * The grid the tile world sits on. Tile `(x, z)` covers world `[x, x+1) × [z, z+1)`
 * — `TILE_SIZE` is 1 unit because the Kenney world kits (ADR-0003) are authored
 * on a 1 × 1 tile and 1 unit = 1 m (art-direction §2). Chunk `(cx, cz)` holds
 * tiles `cx·16 … cx·16+15` on each axis; new land is a new chunk beside the old.
 *
 * Directions follow the layout's convention: north is −Z, the facing of a
 * model at 0°, and turns run clockwise seen from above (N → E → S → W).
 */
import type { Point2 } from './world-layout'

export const TILE_SIZE = 1
export const CHUNK_SIZE = 16

export interface TileCoord {
  readonly x: number
  readonly z: number
}

export interface ChunkCoord {
  readonly cx: number
  readonly cz: number
}

/** An axis-aligned block of tiles, `x … x+width−1` by `z … z+depth−1`. */
export interface TileRect {
  readonly x: number
  readonly z: number
  readonly width: number
  readonly depth: number
}

export const DIRECTIONS = ['north', 'east', 'south', 'west'] as const
export type Direction = (typeof DIRECTIONS)[number]

const STEP: Record<Direction, TileCoord> = {
  north: { x: 0, z: -1 },
  east: { x: 1, z: 0 },
  south: { x: 0, z: 1 },
  west: { x: -1, z: 0 },
}

export function neighbour(tile: TileCoord, direction: Direction): TileCoord {
  return { x: tile.x + STEP[direction].x, z: tile.z + STEP[direction].z }
}

export function chunkOf(tile: TileCoord): ChunkCoord {
  return { cx: Math.floor(tile.x / CHUNK_SIZE), cz: Math.floor(tile.z / CHUNK_SIZE) }
}

/** The tile at the chunk's north-west corner. */
export function chunkOrigin(chunk: ChunkCoord): TileCoord {
  return { x: chunk.cx * CHUNK_SIZE, z: chunk.cz * CHUNK_SIZE }
}

/** Row-major index of a tile inside its own chunk. */
export function indexInChunk(tile: TileCoord): number {
  const localX = tile.x - Math.floor(tile.x / CHUNK_SIZE) * CHUNK_SIZE
  const localZ = tile.z - Math.floor(tile.z / CHUNK_SIZE) * CHUNK_SIZE
  return localZ * CHUNK_SIZE + localX
}

/** Every tile of a chunk in row-major order — the order `Chunk.tiles` is stored in. */
export function tilesOfChunk(chunk: ChunkCoord): TileCoord[] {
  const origin = chunkOrigin(chunk)
  return Array.from({ length: CHUNK_SIZE * CHUNK_SIZE }, (_, index) => ({
    x: origin.x + (index % CHUNK_SIZE),
    z: origin.z + Math.floor(index / CHUNK_SIZE),
  }))
}

export function sameChunk(one: ChunkCoord, other: ChunkCoord): boolean {
  return one.cx === other.cx && one.cz === other.cz
}

export function chunkKey(chunk: ChunkCoord): string {
  return `${chunk.cx},${chunk.cz}`
}

export function tileKey(tile: TileCoord): string {
  return `${tile.x},${tile.z}`
}

export function rectContains(rect: TileRect, tile: TileCoord): boolean {
  return tile.x >= rect.x && tile.x < rect.x + rect.width && tile.z >= rect.z && tile.z < rect.z + rect.depth
}

/** Chebyshev distance from a tile to the nearest tile of a rect: 0 inside, 1 on the ring around it. */
export function distanceToRect(rect: TileRect, tile: TileCoord): number {
  const dx = Math.max(rect.x - tile.x, 0, tile.x - (rect.x + rect.width - 1))
  const dz = Math.max(rect.z - tile.z, 0, tile.z - (rect.z + rect.depth - 1))
  return Math.max(dx, dz)
}

export function tileCentre(tile: TileCoord): Point2 {
  return [(tile.x + 0.5) * TILE_SIZE, (tile.z + 0.5) * TILE_SIZE]
}

export function tileAt(point: Point2): TileCoord {
  return { x: Math.floor(point[0] / TILE_SIZE), z: Math.floor(point[1] / TILE_SIZE) }
}

/** The chunks a `[width, depth]` ground centred on the origin lies on — the farm's starting land. */
export function chunksCoveringGround(size: Point2): ChunkCoord[] {
  const first = chunkOf(tileAt([-size[0] / 2, -size[1] / 2]))
  // The far edge itself belongs to the next tile, so step back off it.
  const last = chunkOf({ x: Math.ceil(size[0] / 2 / TILE_SIZE) - 1, z: Math.ceil(size[1] / 2 / TILE_SIZE) - 1 })
  const chunks: ChunkCoord[] = []
  for (let cz = first.cz; cz <= last.cz; cz++) {
    for (let cx = first.cx; cx <= last.cx; cx++) chunks.push({ cx, cz })
  }
  return chunks
}
