import { describe, expect, it } from 'vitest'
import { FARM_WORLD_SEED, farmStartingChunks, farmWorldSpec, loadWorldOverrides } from './farm-tile-world'
import { seededRngFactory } from './test-fixtures'
import { buildTileWorld } from './tile-world'
import { HOTSPOT_IDS } from './world-layout'

describe('the shipped tile world', () => {
  it('ships an overrides file that parses', () => {
    expect(loadWorldOverrides().schemaVersion).toBe(1)
  })

  it('starts on the four chunks under farm.json', () => {
    expect(farmStartingChunks()).toHaveLength(4)
  })

  it('builds from the farm seed, the farm.json hotspots and the overrides file', () => {
    const spec = farmWorldSpec(seededRngFactory)
    expect(spec.seed).toBe(FARM_WORLD_SEED)
    const world = buildTileWorld(spec, farmStartingChunks())
    expect(world.hotspots.map(({ id }) => id)).toEqual([...HOTSPOT_IDS])
    expect(world.chunks).toHaveLength(4)
  })
})
