/**
 * Grid routing inside one chunk. The goal is a *set* of tiles — the path
 * network laid so far — so this is Dijkstra (A* with a zero heuristic): a
 * Manhattan heuristic to the nearest of many goals would buy nothing on a
 * 16 × 16 grid. Ties break on tile index, so the same costs give the same route.
 */
import { CHUNK_SIZE } from './tile-grid'

const TILE_COUNT = CHUNK_SIZE * CHUNK_SIZE

function neighbourIndices(index: number): number[] {
  const x = index % CHUNK_SIZE
  const z = Math.floor(index / CHUNK_SIZE)
  const found: number[] = []
  if (z > 0) found.push(index - CHUNK_SIZE)
  if (x < CHUNK_SIZE - 1) found.push(index + 1)
  if (z < CHUNK_SIZE - 1) found.push(index + CHUNK_SIZE)
  if (x > 0) found.push(index - 1)
  return found
}

function cheapestOpen(distance: readonly number[], settled: readonly boolean[]): number {
  let best = -1
  for (let index = 0; index < TILE_COUNT; index++) {
    if (settled[index] || distance[index] === Infinity) continue
    if (best === -1 || (distance[index] as number) < (distance[best] as number)) best = index
  }
  return best
}

function walkBack(previous: readonly number[], end: number): number[] {
  const route = [end]
  for (let at = previous[end] as number; at !== -1; at = previous[at] as number) route.unshift(at)
  return route
}

export interface RouteRequest {
  /** Chunk-local index the route starts from. */
  readonly from: number
  /** Chunk-local indices already on the network; the route stops at the first one it reaches. */
  readonly network: ReadonlySet<number>
  /** Cost of stepping onto a tile. Finite everywhere, so a route always exists. */
  readonly stepCost: (index: number) => number
}

/** The cheapest route from `from` to the network, both ends included. */
export function routeToNetwork({ from, network, stepCost }: RouteRequest): number[] {
  const distance: number[] = Array.from({ length: TILE_COUNT }, () => Infinity)
  const previous: number[] = Array.from({ length: TILE_COUNT }, () => -1)
  const settled: boolean[] = Array.from({ length: TILE_COUNT }, () => false)
  distance[from] = 0
  for (let at = from; at !== -1; at = cheapestOpen(distance, settled)) {
    if (network.has(at)) return walkBack(previous, at)
    settled[at] = true
    for (const next of neighbourIndices(at)) {
      const through = (distance[at] as number) + stepCost(next)
      if (through < (distance[next] as number)) {
        distance[next] = through
        previous[next] = at
      }
    }
  }
  return []
}
