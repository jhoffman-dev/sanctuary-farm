import { loadFarmLayout } from '@sf/world'
import { describe, expect, it } from 'vitest'
import { buildFarmWorld } from '../composition/build-farm-world'
import { devView, HOME_VIEW, overviewOf } from './camera-views'

const world = buildFarmWorld()

describe('HOME_VIEW', () => {
  it('is farm.json\'s home camera, so the layout rules check the camera the child actually gets', () => {
    expect(HOME_VIEW).toEqual(loadFarmLayout().camera.home)
  })
})

describe('overviewOf', () => {
  it('rises higher to keep a margin of land round the chunks in frame', () => {
    const chunks = world.chunks.map((chunk) => chunk.coord)
    const tight = overviewOf(chunks)
    const roomy = overviewOf(chunks, 8)
    expect(roomy.lookAt).toEqual(tight.lookAt)
    // 32 tiles across become 48, so the camera climbs by half again.
    expect(roomy.position[1]).toBeCloseTo(tight.position[1] * 1.5)
  })
})

describe('devView', () => {
  it('overview: straight down over the middle of the land, high enough to frame every chunk', () => {
    const { position, lookAt } = devView(world, 'overview')
    // The four starting chunks span −16..16 on both axes.
    expect(lookAt).toEqual([0, 0, 0])
    expect(position[0]).toBe(0)
    expect(position[1]).toBeGreaterThan(50)
    expect(position[2]).toBeCloseTo(0, 1)
  })

  it('paddock-corner: low, a few units inside the paddock, looking at one of its fence corners', () => {
    const paddock = world.hotspots.find((hotspot) => hotspot.id === 'paddock')
    if (!paddock) throw new Error('fixture world has no paddock')
    const { position, lookAt } = devView(world, 'paddock-corner')
    const { x, z, width, depth } = paddock.footprint
    const onCorner = (value: number, low: number, size: number) => value === low + 0.5 || value === low + size - 0.5
    expect(onCorner(lookAt[0], x, width) && onCorner(lookAt[2], z, depth)).toBe(true)
    expect(position[1]).toBeLessThan(3)
    expect(position[0]).toBeGreaterThan(x)
    expect(position[0]).toBeLessThan(x + width)
    expect(position[2]).toBeGreaterThan(z)
    expect(position[2]).toBeLessThan(z + depth)
  })
})
