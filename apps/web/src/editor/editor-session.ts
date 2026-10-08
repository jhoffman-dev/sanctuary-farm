import type { HotspotAnchor, RngFactory, WorldDraft } from '@sf/world'

/**
 * Everything the world editor starts from, supplied by the composition root:
 * the hotspots as `farm.json` places them, the files as last saved, and the
 * two sources of chance — the generator's seeded RNG and a fresh random seed.
 */
export type WorldEditorSession = {
  readonly anchors: readonly HotspotAnchor[]
  readonly saved: WorldDraft
  readonly rngFor: RngFactory
  readonly randomSeed: () => number
}

export type WorldEditorSessionLoader = () => Promise<WorldEditorSession>
