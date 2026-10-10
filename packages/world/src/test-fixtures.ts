import farmLayoutDocument from '../layouts/farm.json'
import type { HotspotId } from './world-layout'

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
