import farmLayoutDocument from '../layouts/farm.json'
import type { HotspotId } from './world-layout'
import { CHUNK_SIZE } from './tile-grid'
import type { PlacedHotspot, Tile, TileWorld } from './tile-world-types'

type JsonRecord = Record<string, unknown>

/** A deep, mutable copy of the shipped layout document, so a test can break one field. */
export function farmDocument(): JsonRecord {
  return structuredClone(farmLayoutDocument) as unknown as JsonRecord
}

export function documentWith(overrides: JsonRecord): JsonRecord {
  return { ...farmDocument(), ...overrides }
}

export function documentWithHotspots(overrides: Partial<Record<HotspotId, JsonRecord>>): JsonRecord {
  const document = farmDocument()
  const hotspots = (document.hotspots as JsonRecord[]).map((hotspot) => {
    const override = overrides[hotspot.id as HotspotId]
    return override === undefined ? hotspot : { ...hotspot, ...override }
  })
  return { ...document, hotspots }
}

export function documentWithHotspot(id: HotspotId, overrides: JsonRecord): JsonRecord {
  return documentWithHotspots({ [id]: overrides })
}

/**
 * A seeded `RngFactory` fake (mulberry32, the algorithm the composition root
 * passes in from `@sf/domain`, which this package may not import).
 */
export function seededRngFactory(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state)
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296
  }
}

const GRID_TILES: Record<string, Tile> = {
  '.': { ground: { kind: 'grass' } },
  ',': { ground: { kind: 'dirt' } },
  '=': { ground: { kind: 'path', role: 'straight', rotation: 0 } },
  '~': { ground: { kind: 'water' } },
  '#': { ground: { kind: 'grass' }, structure: { kind: 'fence', role: 'straight', rotation: 0 } },
  G: { ground: { kind: 'grass' }, structure: { kind: 'fence-gate', rotation: 0 } },
  T: { ground: { kind: 'grass' }, decor: { kind: 'tree', rotation: 0 } },
  W: { ground: { kind: 'grass' }, structure: { kind: 'building-wall', rotation: 0 } },
}

/**
 * A one-chunk world drawn as text, for the walking rules: `.` grass, `,` dirt,
 * `=` path, `~` water, `#` fence, `G` gate, `T` tree, `W` wall. Row 0 is the
 * north edge at z = 0; everything the rows leave out is water, so the land is
 * exactly what the test drew.
 */
export function gridWorld(rows: readonly string[], hotspots: readonly PlacedHotspot[] = []): TileWorld {
  const tiles = Array.from({ length: CHUNK_SIZE * CHUNK_SIZE }, (_, index) => {
    const symbol = rows[Math.floor(index / CHUNK_SIZE)]?.[index % CHUNK_SIZE] ?? '~'
    const tile = GRID_TILES[symbol]
    if (!tile) throw new Error(`gridWorld: unknown symbol "${symbol}"`)
    return tile
  })
  return { seed: 1, hotspots, chunks: [{ coord: { cx: 0, cz: 0 }, tiles }] }
}

/** A hotspot whose entrance is the middle of its west side, with the keeper's arrival tile just outside. */
export function placedHotspot({ id, style, footprint }: Pick<PlacedHotspot, 'id' | 'style' | 'footprint'>): PlacedHotspot {
  const entrance = { x: footprint.x, z: footprint.z + Math.floor(footprint.depth / 2) }
  return { id, style, footprint, entranceSide: 'west', entrance, arrival: { x: entrance.x - 1, z: entrance.z }, rotation: 3 }
}
