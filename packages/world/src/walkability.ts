/**
 * Where the keeper may stand (SF-77). A world rule, so it lives beside the
 * world: the renderer asks, it never decides.
 *
 * Walkable: grass, dirt and path ground, fence gates, and the floor inside a
 * fenced pen. Not walkable: water, every other structure (fences, walls), decor
 * (a tree or a rock is something you walk round), a building's whole footprint,
 * and an open hotspot's footprint, where its model stands. Off the land is not
 * walkable either.
 */
import type { HotspotId } from './world-layout'
import type { TileCoord } from './tile-grid'
import { rectContains } from './tile-grid'
import type { PlacedHotspot, TileWorld } from './tile-world-types'
import { tileOf } from './tile-world'

/** What one step onto a tile costs. Paths are cheapest, so routes keep to them where they can. */
export const PATH_STEP_COST = 1
export const GROUND_STEP_COST = 1.6

function footprintBlocks(hotspot: PlacedHotspot, tile: TileCoord): boolean {
  return hotspot.style !== 'fenced' && rectContains(hotspot.footprint, tile)
}

export function walkable(world: TileWorld, tile: TileCoord): boolean {
  const found = tileOf(world, tile)
  if (!found || found.ground.kind === 'water' || found.decor) return false
  if (found.structure && found.structure.kind !== 'fence-gate') return false
  return !world.hotspots.some((hotspot) => footprintBlocks(hotspot, tile))
}

/** The cost of stepping onto `tile`, or `Infinity` where the keeper cannot stand. */
export function stepCost(world: TileWorld, tile: TileCoord): number {
  if (!walkable(world, tile)) return Infinity
  return tileOf(world, tile)?.ground.kind === 'path' ? PATH_STEP_COST : GROUND_STEP_COST
}

function sameTile(one: TileCoord, other: TileCoord): boolean {
  return one.x === other.x && one.z === other.z
}

/**
 * The hotspot whose doorstep the keeper is standing on: its arrival tile, or
 * the entrance itself (a pen's gate is walkable). The first in world order
 * wins if two ever share a tile.
 */
export function hotspotArrivedAt(world: TileWorld, tile: TileCoord): HotspotId | null {
  const found = world.hotspots.find((hotspot) => sameTile(hotspot.arrival, tile) || sameTile(hotspot.entrance, tile))
  return found?.id ?? null
}

/** How far out `nearestWalkable` looks before giving up: wider than any footprint's half-width. */
export const NEAREST_WALKABLE_RADIUS = 8

function squaredDistance(one: TileCoord, other: TileCoord): number {
  return (one.x - other.x) ** 2 + (one.z - other.z) ** 2
}

/**
 * Nearer the target first; then nearer `prefer`; then north before south and
 * west before east, so the answer never depends on search order.
 */
function closerTo(target: TileCoord, prefer: TileCoord) {
  return (one: TileCoord, other: TileCoord): number =>
    squaredDistance(one, target) - squaredDistance(other, target) ||
    squaredDistance(one, prefer) - squaredDistance(other, prefer) ||
    one.z - other.z ||
    one.x - other.x
}

/**
 * The walkable tile closest to `tile` (itself when walkable), so a tap on a
 * tree, a fence or a barn sends the keeper to the nearest place it can stand.
 * Equally near tiles go to the one nearer `prefer` (the keeper's own tile, so
 * a tapped fence keeps the keeper on its side). Null when nothing within
 * `NEAREST_WALKABLE_RADIUS` is walkable.
 */
export function nearestWalkable(world: TileWorld, tile: TileCoord, prefer: TileCoord = tile): TileCoord | null {
  if (walkable(world, tile)) return tile
  const candidates: TileCoord[] = []
  for (let dz = -NEAREST_WALKABLE_RADIUS; dz <= NEAREST_WALKABLE_RADIUS; dz++) {
    for (let dx = -NEAREST_WALKABLE_RADIUS; dx <= NEAREST_WALKABLE_RADIUS; dx++) {
      const candidate = { x: tile.x + dx, z: tile.z + dz }
      if (walkable(world, candidate)) candidates.push(candidate)
    }
  }
  return candidates.sort(closerTo(tile, prefer))[0] ?? null
}
