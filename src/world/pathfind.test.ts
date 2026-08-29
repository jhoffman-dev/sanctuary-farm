import { describe, expect, it } from 'vitest'
import type { TileType, Tilemap, Vec2 } from '@/contracts'
import { findPath } from './pathfind'
import { tilemap } from './tilemap'

const CH: Record<string, TileType> = {
  '.': 'grass',
  '#': 'path',
  F: 'fence',
  W: 'water',
  B: 'building',
}

/** Build a Tilemap from ASCII rows. Every row must be the same length. */
function makeMap(rows: string[]): Tilemap {
  const height = rows.length
  const width = rows[0].length
  const tiles: TileType[] = []
  for (const row of rows) for (const c of row) tiles.push(CH[c] ?? 'grass')
  const at = (x: number, y: number): TileType =>
    x < 0 || y < 0 || x >= width || y >= height ? 'fence' : tiles[y * width + x]
  return {
    width,
    height,
    tiles,
    hotspots: [],
    playerStart: { x: 0, y: 0 },
    at,
    isWalkable: (x, y) => at(x, y) === 'grass' || at(x, y) === 'path',
  }
}

const adjacent = (a: Vec2, b: Vec2) =>
  Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) === 1

function assertContiguous(from: Vec2, path: Vec2[]) {
  let prev = from
  for (const step of path) {
    expect(adjacent(prev, step)).toBe(true)
    prev = step
  }
}

describe('findPath — A*', () => {
  it('never returns a path across fence, water or building tiles', () => {
    const targets: Vec2[] = tilemap.hotspots.map((h) => h.tile)
    for (const to of targets) {
      const path = findPath(tilemap, tilemap.playerStart, to)
      expect(path).not.toBeNull()
      for (const step of path as Vec2[]) {
        const t = tilemap.at(step.x, step.y)
        expect(t === 'fence' || t === 'water' || t === 'building').toBe(false)
        expect(tilemap.isWalkable(step.x, step.y)).toBe(true)
      }
    }
  })

  it('returns a contiguous path that excludes the start and ends on the target', () => {
    const to = { x: 18, y: 13 } // paddock, only reachable via the gate
    const path = findPath(tilemap, tilemap.playerStart, to) as Vec2[]
    expect(path.length).toBeGreaterThan(0)
    expect(path[0]).not.toEqual(tilemap.playerStart)
    expect(path[path.length - 1]).toEqual(to)
    assertContiguous(tilemap.playerStart, path)
  })

  it('returns null (no throw) for an unwalkable target', () => {
    expect(() => findPath(tilemap, tilemap.playerStart, { x: 0, y: 0 })).not.toThrow()
    expect(findPath(tilemap, tilemap.playerStart, { x: 0, y: 0 })).toBeNull()
  })

  it('returns null (no throw) for an out-of-bounds target', () => {
    expect(() => findPath(tilemap, tilemap.playerStart, { x: 999, y: 999 })).not.toThrow()
    expect(findPath(tilemap, tilemap.playerStart, { x: -1, y: 5 })).toBeNull()
  })

  it('returns null for a walkable but walled-off tile', () => {
    const map = makeMap([
      '.....',
      '.FFF.',
      '.F.F.',
      '.FFF.',
      '.....',
    ])
    expect(findPath(map, { x: 0, y: 0 }, { x: 2, y: 2 })).toBeNull()
  })

  it('returns [] when already on the target tile', () => {
    expect(findPath(tilemap, { x: 11, y: 11 }, { x: 11, y: 11 })).toEqual([])
  })

  it('rejects a diagonal step when either shared orthogonal is blocked', () => {
    // (0,0) → (1,1): the only 1-step route is the diagonal, but (1,0) is fence,
    // so the path must detour through (0,1) and be length 2.
    const map = makeMap(['.F', '..'])
    const path = findPath(map, { x: 0, y: 0 }, { x: 1, y: 1 }) as Vec2[]
    expect(path).not.toBeNull()
    expect(path).toEqual([
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ])
    assertContiguous({ x: 0, y: 0 }, path)
  })

  it('allows a diagonal step when both shared orthogonals are clear', () => {
    const map = makeMap(['..', '..'])
    const path = findPath(map, { x: 0, y: 0 }, { x: 1, y: 1 }) as Vec2[]
    expect(path).toEqual([{ x: 1, y: 1 }])
  })

  it('re-paths from a mid-route position to a fresh target (valid path)', () => {
    const first = findPath(tilemap, tilemap.playerStart, { x: 18, y: 4 }) as Vec2[]
    expect(first.length).toBeGreaterThan(3)
    const mid = first[Math.floor(first.length / 2)]

    const rerouted = findPath(tilemap, mid, { x: 4, y: 8 }) as Vec2[] // now head to the barn
    expect(rerouted).not.toBeNull()
    expect(rerouted.length).toBeGreaterThan(0)
    expect(rerouted[rerouted.length - 1]).toEqual({ x: 4, y: 8 })
    assertContiguous(mid, rerouted)
    for (const step of rerouted) expect(tilemap.isWalkable(step.x, step.y)).toBe(true)
  })
})
