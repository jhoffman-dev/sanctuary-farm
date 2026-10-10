/**
 * The keeper's way across the farm (SF-77): A* over the tile grid, eight
 * directions, paths cheaper than grass. ADR-0004 expected obstacle avoidance
 * to carry Phase 2 and a navmesh Phase 3; on a tile world the grid already
 * *is* the nav-grid, so a route here is both.
 *
 * Deterministic by construction: the open set is ordered on cost, then the
 * heuristic, then z, then x, and neighbours are expanded in a fixed order, so
 * the same world and the same tiles always give the same route.
 */
import type { TileCoord } from './tile-grid'
import { tileKey } from './tile-grid'
import type { TileWorld } from './tile-world-types'
import { PATH_STEP_COST, nearestWalkable, stepCost, walkable } from './walkability'

/** N, E, S, W, then the diagonals clockwise from NE: the fixed expansion order. */
const STEPS: readonly TileCoord[] = [
  { x: 0, z: -1 },
  { x: 1, z: 0 },
  { x: 0, z: 1 },
  { x: -1, z: 0 },
  { x: 1, z: -1 },
  { x: 1, z: 1 },
  { x: -1, z: 1 },
  { x: -1, z: -1 },
]

/** Octile distance at the cheapest step cost: never more than the true cost, so A* stays optimal. */
function heuristic(from: TileCoord, to: TileCoord): number {
  const dx = Math.abs(from.x - to.x)
  const dz = Math.abs(from.z - to.z)
  return (Math.max(dx, dz) + (Math.SQRT2 - 1) * Math.min(dx, dz)) * PATH_STEP_COST
}

/**
 * A diagonal step only where both tiles it squeezes between are walkable, so
 * the keeper never clips a fence post or a barn corner.
 */
function stepAllowed(world: TileWorld, from: TileCoord, step: TileCoord): boolean {
  if (step.x === 0 || step.z === 0) return true
  return walkable(world, { x: from.x + step.x, z: from.z }) && walkable(world, { x: from.x, z: from.z + step.z })
}

type OpenNode = { readonly tile: TileCoord; readonly cost: number; readonly estimate: number }

function before(one: OpenNode, other: OpenNode): boolean {
  const oneTotal = one.cost + one.estimate
  const otherTotal = other.cost + other.estimate
  if (oneTotal !== otherTotal) return oneTotal < otherTotal
  if (one.estimate !== other.estimate) return one.estimate < other.estimate
  return one.tile.z !== other.tile.z ? one.tile.z < other.tile.z : one.tile.x < other.tile.x
}

function takeBest(open: OpenNode[]): OpenNode {
  let best = 0
  for (let index = 1; index < open.length; index++) {
    if (before(open[index] as OpenNode, open[best] as OpenNode)) best = index
  }
  return open.splice(best, 1)[0] as OpenNode
}

function walkBack(cameFrom: ReadonlyMap<string, TileCoord>, end: TileCoord): TileCoord[] {
  const route = [end]
  for (let at = cameFrom.get(tileKey(end)); at; at = cameFrom.get(tileKey(at))) route.unshift(at)
  return route
}

function search(world: TileWorld, from: TileCoord, to: TileCoord): TileCoord[] | null {
  const best = new Map<string, number>([[tileKey(from), 0]])
  const cameFrom = new Map<string, TileCoord>()
  const open: OpenNode[] = [{ tile: from, cost: 0, estimate: heuristic(from, to) }]
  while (open.length > 0) {
    const current = takeBest(open)
    if (current.tile.x === to.x && current.tile.z === to.z) return walkBack(cameFrom, current.tile)
    if (current.cost > (best.get(tileKey(current.tile)) ?? Infinity)) continue
    for (const step of STEPS) {
      const next = { x: current.tile.x + step.x, z: current.tile.z + step.z }
      const length = step.x !== 0 && step.z !== 0 ? Math.SQRT2 : 1
      const cost = current.cost + length * stepCost(world, next)
      if (cost === Infinity || !stepAllowed(world, current.tile, step)) continue
      if (cost >= (best.get(tileKey(next)) ?? Infinity)) continue
      best.set(tileKey(next), cost)
      cameFrom.set(tileKey(next), current.tile)
      open.push({ tile: next, cost, estimate: heuristic(next, to) })
    }
  }
  return null
}

/**
 * The cheapest walk from `from` to `to`, both ends included, or null when `to`
 * cannot be reached (or either end is not walkable). A route to where the
 * keeper already stands is that one tile.
 */
export function findRoute(world: TileWorld, from: TileCoord, to: TileCoord): TileCoord[] | null {
  if (!walkable(world, from) || !walkable(world, to)) return null
  return search(world, from, to)
}

/**
 * Where a tap sends the keeper: straight to the tapped tile when it can stand
 * there, otherwise to the nearest tile it can — on the keeper's own side of a
 * fence when two are equally near. Null when that tile cannot be reached.
 */
export function planWalk(world: TileWorld, from: TileCoord, tapped: TileCoord): TileCoord[] | null {
  const destination = nearestWalkable(world, tapped, from)
  return destination ? findRoute(world, from, destination) : null
}
