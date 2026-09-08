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
