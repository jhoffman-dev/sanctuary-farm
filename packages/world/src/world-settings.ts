/**
 * The generation inputs the world editor (#105) can change besides the
 * overrides: the world seed and the land (which chunks exist). They live in
 * their own file, `layouts/world.json`, because they are not edits — the
 * overrides file stays an ordered list of edits applied on top of whatever
 * these settings generate.
 */
import type { ChunkCoord } from './tile-grid'

export const WORLD_SETTINGS_SCHEMA_VERSION = 1

/** Seeds are unsigned 32-bit: the seeded RNGs fold every seed to that range anyway. */
export const MAX_WORLD_SEED = 0xffff_ffff

export interface WorldSettings {
  readonly schemaVersion: typeof WORLD_SETTINGS_SCHEMA_VERSION
  readonly seed: number
  /** The land, sorted by `cz`, then `cx`; never empty, never a chunk twice. */
  readonly chunks: readonly ChunkCoord[]
}
