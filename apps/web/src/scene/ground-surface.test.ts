import type { Chunk, GroundPiece, Tile } from '@sf/world'
import { CHUNK_SIZE } from '@sf/world'
import { describe, expect, it } from 'vitest'
import { buildGroundSurface, type Surface } from './ground-surface'

const TILES = CHUNK_SIZE * CHUNK_SIZE
const GRASS: Surface = { colour: [0, 1, 0], height: 0 }
const WATER: Surface = { colour: [0, 0, 1], height: -0.06 }
const surfaceOf = (ground: GroundPiece): Surface => (ground.kind === 'water' ? WATER : GRASS)

function chunk(cx: number, cz: number, water: readonly number[] = []): Chunk {
  const tiles: Tile[] = Array.from({ length: TILES }, (_, index) => ({
    ground: water.includes(index) ? { kind: 'water' } : { kind: 'grass' },
  }))
  return { coord: { cx, cz }, tiles }
}

type Vec3 = [number, number, number]
const vertex = (array: Float32Array, index: number): Vec3 => [array[index * 3] ?? Number.NaN, array[index * 3 + 1] ?? Number.NaN, array[index * 3 + 2] ?? Number.NaN]

describe('buildGroundSurface', () => {
  it('makes one quad per tile: four vertices, two triangles', () => {
    const surface = buildGroundSurface(chunk(0, 0), surfaceOf)
    expect(surface.positions).toHaveLength(TILES * 4 * 3)
    expect(surface.colours).toHaveLength(TILES * 4 * 3)
    expect(surface.indices).toHaveLength(TILES * 6)
  })

  it('covers exactly the chunk\'s square of the world, edge to edge with no gaps', () => {
    const surface = buildGroundSurface(chunk(-1, 0), surfaceOf)
    const xs = Array.from({ length: TILES * 4 }, (_, index) => vertex(surface.positions, index)[0])
    const zs = Array.from({ length: TILES * 4 }, (_, index) => vertex(surface.positions, index)[2])
    expect(Math.min(...xs)).toBe(-CHUNK_SIZE)
    expect(Math.max(...xs)).toBe(0)
    expect(Math.min(...zs)).toBe(0)
    expect(Math.max(...zs)).toBe(CHUNK_SIZE)
    // The first tile's quad spans its whole tile, so neighbours share edges exactly.
    expect([0, 1, 2, 3].map((index) => vertex(surface.positions, index))).toEqual([
      [-16, 0, 0],
      [-15, 0, 0],
      [-16, 0, 1],
      [-15, 0, 1],
    ])
  })

  it('faces every triangle up, so the ground is lit and never back-face culled', () => {
    const surface = buildGroundSurface(chunk(0, 0), surfaceOf)
    for (let triangle = 0; triangle < surface.indices.length / 3; triangle++) {
      const [[ax, , az], [bx, , bz], [cx, , cz]] = [0, 1, 2].map((corner) =>
        vertex(surface.positions, surface.indices[triangle * 3 + corner] ?? Number.NaN),
      ) as [Vec3, Vec3, Vec3]
      // y of (b − a) × (c − a): positive means the face points up.
      expect((bz - az) * (cx - ax) - (bx - ax) * (cz - az)).toBeGreaterThan(0)
    }
    expect(new Set(surface.normals)).toEqual(new Set([0, 1]))
  })

  it('colours and sinks each tile by its own surface, without bleeding into its neighbours', () => {
    const surface = buildGroundSurface(chunk(0, 0, [1]), surfaceOf)
    for (const index of [4, 5, 6, 7]) {
      expect(vertex(surface.colours, index)).toEqual([0, 0, 1])
      expect(vertex(surface.positions, index)[1]).toBeCloseTo(-0.06, 6)
    }
    for (const index of [0, 1, 2, 3, 8, 9, 10, 11]) {
      expect(vertex(surface.colours, index)).toEqual([0, 1, 0])
      expect(vertex(surface.positions, index)[1]).toBe(0)
    }
  })

  it('refuses a chunk with tiles missing rather than drawing a hole', () => {
    const short: Chunk = { coord: { cx: 0, cz: 0 }, tiles: chunk(0, 0).tiles.slice(1) }
    expect(() => buildGroundSurface(short, surfaceOf)).toThrow(/missing tile 255/)
  })
})
