import { describe, expect, it } from 'vitest'
import { loadFarmLayout } from './farm-layout'
import { farmStartingChunks, farmWorldSpec, loadWorldOverrides, loadWorldSettings } from './farm-tile-world'
import { serializeWorldOverrides, serializeWorldSettings } from './serialize-world'
import { seededRngFactory } from './test-fixtures'
import { chunkKey, chunksCoveringGround } from './tile-grid'
import { buildTileWorld } from './tile-world'
import { HOTSPOT_IDS } from './world-layout'
import overridesText from '../layouts/overrides.json?raw'
import worldText from '../layouts/world.json?raw'

describe('the shipped tile world', () => {
  it('ships an overrides file that parses', () => {
    expect(loadWorldOverrides().schemaVersion).toBe(1)
  })

  it('ships a world file whose land covers the whole of farm.json’s ground', () => {
    const land = new Set(farmStartingChunks().map(chunkKey))
    for (const chunk of chunksCoveringGround(loadFarmLayout().ground.size)) expect(land.has(chunkKey(chunk))).toBe(true)
  })

  it('builds from world.json’s seed, the farm.json hotspots and the overrides file', () => {
    const spec = farmWorldSpec(seededRngFactory)
    expect(spec.seed).toBe(loadWorldSettings().seed)
    const world = buildTileWorld(spec, farmStartingChunks())
    expect(world.hotspots.map(({ id }) => id)).toEqual([...HOTSPOT_IDS])
    expect(world.chunks).toHaveLength(farmStartingChunks().length)
  })

  // A hand edit in another shape would make the editor's next save rewrite lines nobody changed.
  it('keeps both files in the canonical shape the world editor saves', () => {
    expect(overridesText).toBe(serializeWorldOverrides(loadWorldOverrides()))
    expect(worldText).toBe(serializeWorldSettings(loadWorldSettings()))
  })
})
