import { createRng } from '@sf/application'
import { buildTileWorld, farmStartingChunks, farmWorldSpec, type TileWorld } from '@sf/world'

/**
 * The shipped farm: generated from its seed over the starting chunks, with
 * `layouts/overrides.json` (read by `farmWorldSpec` through
 * `loadWorldOverrides`) painted on top. Pure and deterministic — the same
 * build gives every player the same farm.
 */
export function buildFarmWorld(): TileWorld {
  return buildTileWorld(farmWorldSpec(createRng), farmStartingChunks())
}
