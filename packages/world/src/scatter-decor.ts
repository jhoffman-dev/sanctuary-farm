/**
 * Decor scattered over generated ground. Density and mix depend on what is
 * nearby — crops by the farmhouse, crates and hay by the barn, trees out in
 * the wild — and keep-clear zones leave paths walkable and every gate, door
 * and arrival open to the camera.
 */
import type { DraftTile } from './chunk-base'
import type { HotspotAnchor } from './hotspot-anchors'
import type { Rng, RngFactory } from './seeds'
import { STREAM, mixSeed, pickIndex } from './seeds'
import type { DecorKind, QuarterTurns } from './tile-kinds'
import type { ChunkCoord, TileCoord } from './tile-grid'
import { DIRECTIONS, distanceToRect, neighbour, rectContains, tilesOfChunk } from './tile-grid'
import type { HotspotId } from './world-layout'

interface DecorZone {
  /** The zone is the ring within `within` tiles of any of these hotspots' footprints. */
  readonly near: readonly HotspotId[]
  readonly within: number
  /** Chance an eligible tile gets a piece. */
  readonly density: number
  readonly weights: Partial<Record<DecorKind, number>>
}

/** First match wins, so the order is the priority. */
const DECOR_ZONES: readonly DecorZone[] = [
  { near: ['farmhouse'], within: 3, density: 0.3, weights: { crop: 6, crate: 1 } },
  { near: ['barn', 'feed-shed'], within: 2, density: 0.25, weights: { crate: 3, barrel: 3, 'hay-bale': 4 } },
  { near: ['paddock', 'training-ring', 'petting-zoo', 'nest'], within: 2, density: 0.1, weights: { 'hay-bale': 2, bush: 2, rock: 1 } },
]

const WILD_ZONE: DecorZone = {
  near: [],
  within: 0,
  density: 0.12,
  weights: { tree: 4, 'tree-tall': 2, bush: 3, rock: 2 },
}

/** No decor within this many tiles (Chebyshev) of a gate, door or arrival. */
const ENTRANCE_KEEP_CLEAR = 2

export interface DecorRequest {
  readonly seed: number
  readonly anchors: readonly HotspotAnchor[]
  readonly rngFor: RngFactory
  /** The generated tile anywhere in the world, so keep-clear zones reach across chunk edges. */
  readonly baseTileAt: (tile: TileCoord) => DraftTile
}

function zoneFor(tile: TileCoord, anchors: readonly HotspotAnchor[]): DecorZone {
  const near = (zone: DecorZone): boolean =>
    anchors.some((anchor) => zone.near.includes(anchor.id) && distanceToRect(anchor.footprint, tile) <= zone.within)
  return DECOR_ZONES.find(near) ?? WILD_ZONE
}

/** No decor on, or edge-on beside, a path tile — the keeper's route stays walkable. */
function nearPath(tile: TileCoord, baseTileAt: DecorRequest['baseTileAt']): boolean {
  return [tile, ...DIRECTIONS.map((side) => neighbour(tile, side))].some((spot) => baseTileAt(spot).ground === 'path')
}

function nearEntrance(tile: TileCoord, anchors: readonly HotspotAnchor[]): boolean {
  return anchors.some((anchor) =>
    [anchor.entrance, anchor.arrival].some(
      (spot) => distanceToRect({ ...spot, width: 1, depth: 1 }, tile) <= ENTRANCE_KEEP_CLEAR,
    ),
  )
}

function eligible(tile: TileCoord, draft: DraftTile, request: DecorRequest): boolean {
  return (
    draft.ground === 'grass' &&
    draft.structure === undefined &&
    !request.anchors.some((anchor) => rectContains(anchor.footprint, tile)) &&
    !nearEntrance(tile, request.anchors) &&
    !nearPath(tile, request.baseTileAt)
  )
}

function weightedKind(weights: DecorZone['weights'], rng: Rng): DecorKind {
  const entries = Object.entries(weights) as [DecorKind, number][]
  let roll = rng() * entries.reduce((sum, [, weight]) => sum + weight, 0)
  for (const [kind, weight] of entries) {
    roll -= weight
    if (roll < 0) return kind
  }
  return (entries[entries.length - 1] as [DecorKind, number])[0]
}

/** The same tiles with decor added. Every eligible tile draws, in row-major order, from the chunk's decor stream. */
export function scatterDecor(base: readonly DraftTile[], chunk: ChunkCoord, request: DecorRequest): DraftTile[] {
  const rng = request.rngFor(mixSeed(request.seed, STREAM.decor, chunk.cx, chunk.cz))
  return tilesOfChunk(chunk).map((tile, index) => {
    const draft = base[index] as DraftTile
    if (!eligible(tile, draft, request)) return draft
    const zone = zoneFor(tile, request.anchors)
    if (rng() >= zone.density) return draft
    const kind = weightedKind(zone.weights, rng)
    return { ...draft, decor: { kind, rotation: pickIndex(rng, 4) as QuarterTurns } }
  })
}
