import { describe, expect, it } from 'vitest'
import { GRID_H, GRID_W, WALK_SPEED_TPS } from '@/contracts'
import type { HotspotId, Vec2 } from '@/contracts'
import { findPath } from './pathfind'
import { createTilemap, tilemap } from './tilemap'

const HOTSPOT_IDS: HotspotId[] = [
  'barn',
  'paddock',
  'nest',
  'feedshed',
  'farmhouse',
  'training',
  'pettingzoo',
]

describe('tilemap', () => {
  it('is exactly GRID_W × GRID_H', () => {
    expect(tilemap.width).toBe(GRID_W)
    expect(tilemap.height).toBe(GRID_H)
    expect(tilemap.tiles).toHaveLength(GRID_W * GRID_H)
  })

  it('at() returns fence outside the grid', () => {
    expect(tilemap.at(-1, 0)).toBe('fence')
    expect(tilemap.at(0, -1)).toBe('fence')
    expect(tilemap.at(GRID_W, 0)).toBe('fence')
    expect(tilemap.at(0, GRID_H)).toBe('fence')
  })

  it('isWalkable is true only for grass and path', () => {
    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        const t = tilemap.at(x, y)
        expect(tilemap.isWalkable(x, y)).toBe(t === 'grass' || t === 'path')
      }
    }
  })

  it('playerStart is the farmhouse door and is walkable', () => {
    const farmhouse = tilemap.hotspots.find((h) => h.id === 'farmhouse')
    expect(farmhouse?.tile).toEqual(tilemap.playerStart)
    expect(tilemap.isWalkable(tilemap.playerStart.x, tilemap.playerStart.y)).toBe(true)
  })

  it('has all seven hotspots, each on a walkable tile', () => {
    const ids = tilemap.hotspots.map((h) => h.id).sort()
    expect(ids).toEqual([...HOTSPOT_IDS].sort())
    for (const h of tilemap.hotspots) {
      expect(tilemap.isWalkable(h.tile.x, h.tile.y)).toBe(true)
    }
  })

  it('every hotspot is path-reachable from playerStart', () => {
    for (const h of tilemap.hotspots) {
      const path = findPath(tilemap, tilemap.playerStart, h.tile)
      expect(path, `${h.id} unreachable`).not.toBeNull()
    }
  })

  it('crosses corner-to-corner in about 8 seconds or less', () => {
    const nearestWalkable = (target: Vec2): Vec2 => {
      let best: Vec2 | null = null
      let bestD = Infinity
      for (let y = 0; y < GRID_H; y++) {
        for (let x = 0; x < GRID_W; x++) {
          if (!tilemap.isWalkable(x, y)) continue
          const d = Math.hypot(x - target.x, y - target.y)
          if (d < bestD) {
            bestD = d
            best = { x, y }
          }
        }
      }
      return best as Vec2
    }
    const nw = nearestWalkable({ x: 0, y: 0 })
    const se = nearestWalkable({ x: GRID_W - 1, y: GRID_H - 1 })
    const path = findPath(tilemap, nw, se)
    expect(path).not.toBeNull()
    const seconds = (path as Vec2[]).length / WALK_SPEED_TPS
    expect(seconds).toBeLessThanOrEqual(8)
  })

  it('createTilemap() produces an independent instance', () => {
    const a = createTilemap()
    const b = createTilemap()
    expect(a.tiles).toEqual(b.tiles)
    a.hotspots[0].tile.x = -99
    expect(b.hotspots[0].tile.x).not.toBe(-99)
  })
})
