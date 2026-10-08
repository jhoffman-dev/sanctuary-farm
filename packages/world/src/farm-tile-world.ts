import overridesDocument from '../layouts/overrides.json'
import { loadFarmLayout } from './farm-layout'
import { anchorsFromLayout } from './hotspot-anchors'
import { parseWorldOverrides } from './parse-world-overrides'
import type { RngFactory } from './seeds'
import type { ChunkCoord } from './tile-grid'
import { chunksCoveringGround } from './tile-grid'
import type { WorldSpec } from './tile-world'
import type { WorldOverrides } from './world-overrides'

/** The farm's world seed. Changing it regenerates every path, pond and tree; overrides survive. */
export const FARM_WORLD_SEED = 20261008

/**
 * `layouts/overrides.json` is bundled and parsed once at module load, like
 * `farm.json`. The world editor (#105) writes it; a file that fails to parse
 * is a broken build, which the gate's tests catch first.
 */
const parsed = parseWorldOverrides(overridesDocument)

export function loadWorldOverrides(): WorldOverrides {
  if (!parsed.ok) throw new Error(`layouts/overrides.json is not valid — ${parsed.reason}`)
  return parsed.overrides
}

/** Everything `buildTileWorld` needs for the shipped farm; the caller supplies the seeded `RngFactory`. */
export function farmWorldSpec(rngFor: RngFactory): WorldSpec {
  return {
    seed: FARM_WORLD_SEED,
    anchors: anchorsFromLayout(loadFarmLayout()),
    overrides: loadWorldOverrides(),
    rngFor,
  }
}

/** The land the farm starts with: the chunks under `farm.json`'s ground. */
export function farmStartingChunks(): ChunkCoord[] {
  return chunksCoveringGround(loadFarmLayout().ground.size)
}
