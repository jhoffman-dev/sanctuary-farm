// STUB — Track C replaces with the real hand-laid 25×18 farmyard map.
import { GRID_H, GRID_W } from '@/contracts'
import type { Hotspot, TileType, Tilemap, Vec2 } from '@/contracts'

const HOTSPOTS: Hotspot[] = [
  { id: 'barn', tile: { x: 6, y: 5 }, label: 'Barn' },
  { id: 'nest', tile: { x: 18, y: 5 }, label: 'Nest hollow' },
  { id: 'paddock', tile: { x: 18, y: 12 }, label: 'Paddock' },
  { id: 'feedshed', tile: { x: 6, y: 12 }, label: 'Feed shed' },
  { id: 'farmhouse', tile: { x: 12, y: 15 }, label: 'Farmhouse' },
]

export function createTilemap(): Tilemap {
  const tiles: TileType[] = Array.from({ length: GRID_W * GRID_H }, (_, i) => {
    const x = i % GRID_W
    const y = Math.floor(i / GRID_W)
    if (x === 0 || y === 0 || x === GRID_W - 1 || y === GRID_H - 1) return 'fence'
    return 'grass'
  })
  const playerStart: Vec2 = { x: 12, y: 14 }
  return {
    width: GRID_W,
    height: GRID_H,
    tiles,
    hotspots: HOTSPOTS,
    playerStart,
    at(x, y) {
      return tiles[y * GRID_W + x] ?? 'fence'
    },
    isWalkable(x, y) {
      const t = this.at(x, y)
      return t === 'grass' || t === 'path'
    },
  }
}

export const tilemap = createTilemap()
