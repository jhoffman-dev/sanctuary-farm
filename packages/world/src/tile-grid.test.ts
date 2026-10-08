import { describe, expect, it } from 'vitest'
import {
  CHUNK_SIZE,
  TILE_SIZE,
  chunkOf,
  chunkOrigin,
  chunksCoveringGround,
  distanceToRect,
  indexInChunk,
  neighbour,
  rectContains,
  tileAt,
  tileCentre,
  tilesOfChunk,
} from './tile-grid'

describe('the tile grid', () => {
  it('uses 1-unit tiles in 16 × 16 chunks', () => {
    expect(TILE_SIZE).toBe(1)
    expect(CHUNK_SIZE).toBe(16)
  })

  it('puts negative tiles in negative chunks, floor-wise', () => {
    expect(chunkOf({ x: -1, z: -16 })).toEqual({ cx: -1, cz: -1 })
    expect(chunkOf({ x: -17, z: 0 })).toEqual({ cx: -2, cz: 0 })
    expect(chunkOf({ x: 15, z: 16 })).toEqual({ cx: 0, cz: 1 })
    expect(chunkOrigin({ cx: -1, cz: 2 })).toEqual({ x: -16, z: 32 })
  })

  it('indexes tiles row-major inside their chunk, the order tilesOfChunk lists them', () => {
    const tiles = tilesOfChunk({ cx: -1, cz: 0 })
    expect(tiles).toHaveLength(256)
    tiles.forEach((tile, index) => expect(indexInChunk(tile)).toBe(index))
    expect(tiles[17]).toEqual({ x: -15, z: 1 })
  })

  it('steps north to −Z and east to +X', () => {
    expect(neighbour({ x: 0, z: 0 }, 'north')).toEqual({ x: 0, z: -1 })
    expect(neighbour({ x: 0, z: 0 }, 'east')).toEqual({ x: 1, z: 0 })
    expect(neighbour({ x: 0, z: 0 }, 'south')).toEqual({ x: 0, z: 1 })
    expect(neighbour({ x: 0, z: 0 }, 'west')).toEqual({ x: -1, z: 0 })
  })

  it('maps world points to tiles and back to tile centres', () => {
    expect(tileAt([-0.2, 3.9])).toEqual({ x: -1, z: 3 })
    expect(tileCentre({ x: -1, z: 3 })).toEqual([-0.5, 3.5])
  })

  it('measures Chebyshev distance to a rect: 0 inside, 1 on the ring', () => {
    const rect = { x: 0, z: 0, width: 2, depth: 3 }
    expect(rectContains(rect, { x: 1, z: 2 })).toBe(true)
    expect(rectContains(rect, { x: 2, z: 2 })).toBe(false)
    expect(distanceToRect(rect, { x: 1, z: 1 })).toBe(0)
    expect(distanceToRect(rect, { x: -1, z: 3 })).toBe(1)
    expect(distanceToRect(rect, { x: 4, z: -1 })).toBe(3)
  })

  it('starts the 30 × 30 farm on the four chunks around the origin', () => {
    expect(chunksCoveringGround([30, 30])).toEqual([
      { cx: -1, cz: -1 },
      { cx: 0, cz: -1 },
      { cx: -1, cz: 0 },
      { cx: 0, cz: 0 },
    ])
    expect(chunksCoveringGround([40, 10])).toHaveLength(4 * 2)
  })
})
