/**
 * Hotspots on the tile grid. The seven places come from `layouts/farm.json`
 * (SF-74); here each becomes a block of tiles plus the one tile outside it
 * where the keeper arrives. The generator builds everything else around them.
 */
import type { Area, HotspotId, Point2, WorldLayout } from './world-layout'
import type { Direction, TileCoord, TileRect } from './tile-grid'
import { neighbour } from './tile-grid'
import type { QuarterTurns } from './tile-kinds'

/**
 * How a footprint is built. `fenced` pens get an autotiled fence and a gate;
 * `building` footprints get placeholder walls, a door and a roof until the
 * structure itself is sourced; `open` ground is left for its hotspot model.
 */
export type FootprintStyle = 'fenced' | 'building' | 'open'

export const HOTSPOT_STYLES: Record<HotspotId, FootprintStyle> = {
  barn: 'building',
  'feed-shed': 'building',
  nest: 'open',
  paddock: 'fenced',
  'training-ring': 'fenced',
  'petting-zoo': 'open',
  farmhouse: 'building',
}

export interface HotspotAnchor {
  readonly id: HotspotId
  readonly style: FootprintStyle
  readonly footprint: TileRect
  /** Which side of the footprint the keeper arrives on; the gate or door is on that side. */
  readonly entranceSide: Direction
  /** The border tile the gate or door sits on. */
  readonly entrance: TileCoord
  /** The tile just outside the entrance: where the path ends and the keeper stands. */
  readonly arrival: TileCoord
}

/** The tiles whose centres lie strictly inside the area's bounding box. */
function footprintRect(area: Area): TileRect {
  const [halfWidth, halfDepth] = area.shape === 'circle' ? [area.radius, area.radius] : [area.size[0] / 2, area.size[1] / 2]
  const x = Math.floor(area.centre[0] - halfWidth + 0.5)
  const z = Math.floor(area.centre[1] - halfDepth + 0.5)
  const width = Math.max(1, Math.ceil(area.centre[0] + halfWidth - 0.5) - x)
  const depth = Math.max(1, Math.ceil(area.centre[1] + halfDepth - 0.5) - z)
  return { x, z, width, depth }
}

/** The side of the rect a point lies towards, measured against the rect's own proportions. */
function sideFacing(rect: TileRect, point: Point2): Direction {
  const dx = (point[0] - (rect.x + rect.width / 2)) / rect.width
  const dz = (point[1] - (rect.z + rect.depth / 2)) / rect.depth
  if (Math.abs(dx) > Math.abs(dz)) return dx > 0 ? 'east' : 'west'
  return dz > 0 ? 'south' : 'north'
}

/** Clamp to the border's inner tiles, so an entrance is never on a corner when the side has a middle. */
function clampAlongSide(value: number, start: number, length: number): number {
  const [low, high] = length >= 3 ? [start + 1, start + length - 2] : [start, start + length - 1]
  return Math.min(Math.max(Math.floor(value), low), high)
}

export function entranceOn(rect: TileRect, side: Direction, along: Point2): TileCoord {
  const x = clampAlongSide(along[0], rect.x, rect.width)
  const z = clampAlongSide(along[1], rect.z, rect.depth)
  if (side === 'north') return { x, z: rect.z }
  if (side === 'south') return { x, z: rect.z + rect.depth - 1 }
  if (side === 'west') return { x: rect.x, z }
  return { x: rect.x + rect.width - 1, z }
}

function anchorOn(id: HotspotId, footprint: TileRect, towards: Point2): HotspotAnchor {
  const entranceSide = sideFacing(footprint, towards)
  const entrance = entranceOn(footprint, entranceSide, towards)
  return { id, style: HOTSPOT_STYLES[id], footprint, entranceSide, entrance, arrival: neighbour(entrance, entranceSide) }
}

/** The layout's hotspots, snapped to tiles. The layout's arrival point picks the entrance side. */
export function anchorsFromLayout(layout: WorldLayout): HotspotAnchor[] {
  return layout.hotspots.map((hotspot) => anchorOn(hotspot.id, footprintRect(hotspot.footprint), hotspot.arrival))
}

/** The same hotspot with its footprint's north-west corner at `to`; entrance and arrival travel with it. */
export function moveAnchor(anchor: HotspotAnchor, to: TileCoord): HotspotAnchor {
  const dx = to.x - anchor.footprint.x
  const dz = to.z - anchor.footprint.z
  const shift = (tile: TileCoord): TileCoord => ({ x: tile.x + dx, z: tile.z + dz })
  return {
    ...anchor,
    footprint: { ...anchor.footprint, x: to.x, z: to.z },
    entrance: shift(anchor.entrance),
    arrival: shift(anchor.arrival),
  }
}

const FACING: Record<Direction, QuarterTurns> = { north: 0, east: 1, south: 2, west: 3 }

/** The turn that points a model's authored front (−Z) out of the given side. */
export function facing(side: Direction): QuarterTurns {
  return FACING[side]
}
