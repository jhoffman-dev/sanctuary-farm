// The hand-laid 25×18 farmyard. Row-major string art → TileType grid.
// Legend: '.' grass · '-' path · 'F' fence · 'W' water · 'B' building.
import { GRID_H, GRID_W } from '@/contracts'
import type { Hotspot, TileType, Tilemap, Vec2 } from '@/contracts'

const LEGEND: Record<string, TileType> = {
  '.': 'grass',
  '-': 'path',
  F: 'fence',
  W: 'water',
  B: 'building',
}

// 18 rows × 25 cols. A path spine drops from the farmhouse door (11,11) to the
// central "main street" at y=9, which every hotspot spur hangs off. The paddock
// (bottom-centre) is fully fenced with a single gate at (18,11).
const ROWS: readonly string[] = [
  'FFFFFFFFFFFFFFFFFFFFFFFFF', //  0
  'F.......................F', //  1
  'F..........-............F', //  2
  'F..........-....F.-.F...F', //  3  nest hollow flanked by fence
  'F..BBBB.BBB-....F.-.F...F', //  4  barn (x3-6) · feed shed (x8-10) · nest (18,4) on-path
  'F..BBBB.BBB-....F.-.F...F', //  5  nest spur down x18
  'F..BBBB.BBB-......-.....F', //  6
  'F..BBBB.BBB-......-.....F', //  7
  'F...-....-.-......-.....F', //  8  barn/feed-shed/spine/paddock spurs
  'F-----------------------F', //  9  main street
  'F......-...-......-.....F', // 10  x7 spur -> petting zoo
  'F......-...-...FFF-FFF..F', // 11  farmhouse door (11,11) · paddock gate (18,11)
  'F..WWW.-..BBBB.F..-..F..F', // 12  pond (x3-5) · petting-zoo spur x7 · farmhouse x10-13
  'F..WWW.-..BBBB.F..-..F..F', // 13  petting zoo (7,13) · paddock hotspot (18,13)
  'F..WWW....BBBB.F.....F..F', // 14
  'F.........BBBB.FFFFFFF..F', // 15  paddock south wall
  'F.......................F', // 16
  'FFFFFFFFFFFFFFFFFFFFFFFFF', // 17
]

const HOTSPOTS: readonly Hotspot[] = [
  { id: 'barn', tile: { x: 4, y: 8 }, label: 'Barn' },
  { id: 'feedshed', tile: { x: 9, y: 8 }, label: 'Feed shed' },
  { id: 'nest', tile: { x: 18, y: 4 }, label: 'Nest hollow' },
  { id: 'paddock', tile: { x: 18, y: 13 }, label: 'Paddock' },
  { id: 'farmhouse', tile: { x: 11, y: 11 }, label: 'Farmhouse' },
  { id: 'training', tile: { x: 11, y: 3 }, label: 'Training ring' },
  { id: 'pettingzoo', tile: { x: 7, y: 13 }, label: 'Petting zoo' },
]

const PLAYER_START: Vec2 = { x: 11, y: 11 } // the farmhouse door

export function createTilemap(): Tilemap {
  if (ROWS.length !== GRID_H || ROWS.some((r) => r.length !== GRID_W)) {
    throw new Error('tilemap: ROWS must be exactly GRID_W × GRID_H')
  }

  const tiles: TileType[] = []
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      tiles.push(LEGEND[ROWS[y][x]] ?? 'grass')
    }
  }

  const at = (x: number, y: number): TileType => {
    if (x < 0 || y < 0 || x >= GRID_W || y >= GRID_H) return 'fence'
    return tiles[y * GRID_W + x]
  }

  return {
    width: GRID_W,
    height: GRID_H,
    tiles,
    hotspots: HOTSPOTS.map((h) => ({ ...h, tile: { ...h.tile } })),
    playerStart: { ...PLAYER_START },
    at,
    isWalkable(x, y) {
      const t = at(x, y)
      return t === 'grass' || t === 'path'
    },
  }
}

export const tilemap = createTilemap()
