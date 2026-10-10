import overridesDocument from '../layouts/overrides.json'
import worldDocument from '../layouts/world.json'
import { loadFarmLayout } from './farm-layout'
import { anchorsFromLayout } from './hotspot-anchors'
import { parseWorldOverrides } from './parse-world-overrides'
import { parseWorldSettings } from './parse-world-settings'
import type { RngFactory } from './seeds'
import type { ChunkCoord } from './tile-grid'
import type { WorldSpec } from './tile-world'
import type { WorldOverrides } from './world-overrides'
import type { WorldSettings } from './world-settings'

/**
 * `layouts/overrides.json` and `layouts/world.json` are bundled and parsed
 * once at module load, like `farm.json`. The world editor (#105) writes both;
 * a file that fails to parse is a broken build, which the gate's tests catch first.
 */
const parsedOverrides = parseWorldOverrides(overridesDocument)
const parsedSettings = parseWorldSettings(worldDocument)

export function loadWorldOverrides(): WorldOverrides {
  if (!parsedOverrides.ok) throw new Error(`layouts/overrides.json is not valid — ${parsedOverrides.reason}`)
  return parsedOverrides.overrides
}

/** The farm's seed and land. Changing the seed regenerates every path, pond and tree; overrides survive. */
export function loadWorldSettings(): WorldSettings {
  if (!parsedSettings.ok) throw new Error(`layouts/world.json is not valid — ${parsedSettings.reason}`)
  return parsedSettings.settings
}

/** Everything `buildTileWorld` needs for the shipped farm; the caller supplies the seeded `RngFactory`. */
export function farmWorldSpec(rngFor: RngFactory): WorldSpec {
  return {
    seed: loadWorldSettings().seed,
    anchors: anchorsFromLayout(loadFarmLayout()),
    overrides: loadWorldOverrides(),
    rngFor,
  }
}

/** The farm's land: the chunks `layouts/world.json` lists. */
export function farmStartingChunks(): ChunkCoord[] {
  return [...loadWorldSettings().chunks]
}
