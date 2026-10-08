import { CHUNK_SIZE, HOTSPOT_IDS, farmStartingChunks } from '@sf/world'
import { describe, expect, it } from 'vitest'
import { buildFarmWorld } from './build-farm-world'
import { loadFarmWorld } from './load-farm-world'

describe('buildFarmWorld', () => {
  it('builds every starting chunk, full of tiles, with all seven hotspots', () => {
    const world = buildFarmWorld()
    expect(world.chunks.map((chunk) => chunk.coord)).toEqual(farmStartingChunks())
    for (const chunk of world.chunks) expect(chunk.tiles).toHaveLength(CHUNK_SIZE * CHUNK_SIZE)
    expect(world.hotspots.map((hotspot) => hotspot.id).toSorted()).toEqual([...HOTSPOT_IDS].toSorted())
  })

  it('is the same farm every time it is built', () => {
    expect(buildFarmWorld()).toEqual(buildFarmWorld())
  })

  it('lays paths: the seeded generator ran, not an empty grid', () => {
    const paths = buildFarmWorld().chunks.flatMap((chunk) => chunk.tiles.filter((tile) => tile.ground.kind === 'path'))
    expect(paths.length).toBeGreaterThan(20)
  })
})

describe('loadFarmWorld', () => {
  it('resolves to the same world the composition root builds', async () => {
    expect(await loadFarmWorld()).toEqual(buildFarmWorld())
  })
})
