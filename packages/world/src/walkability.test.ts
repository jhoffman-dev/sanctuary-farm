import { describe, expect, it } from 'vitest'
import { hotspotAt } from './world-editing'
import { farmStartingChunks, farmWorldSpec } from './farm-tile-world'
import { seededRngFactory } from './test-fixtures'
import { buildTileWorld } from './tile-world'
import { GROUND_STEP_COST, PATH_STEP_COST, hotspotArrivedAt, nearestWalkable, stepCost, walkable } from './walkability'
import { gridWorld, placedHotspot } from './test-fixtures'

describe('walkable', () => {
  const world = gridWorld(['.,=~#GTW'])

  it.each([
    ['grass', 0, true],
    ['dirt', 1, true],
    ['path', 2, true],
    ['water', 3, false],
    ['a fence', 4, false],
    ['a fence gate', 5, true],
    ['a tree', 6, false],
    ['a building wall', 7, false],
  ])('%s → %s', (_, x, expected) => {
    expect(walkable(world, { x, z: 0 })).toBe(expected)
  })

  it('is false off the land', () => {
    expect(walkable(world, { x: -1, z: 0 })).toBe(false)
    expect(walkable(world, { x: 0, z: 16 })).toBe(false)
  })

  it('blocks a building footprint and an open hotspot footprint, but not the floor of a fenced pen', () => {
    const footprinted = gridWorld(['.....', '.....', '.....'], [
      placedHotspot({ id: 'barn', style: 'building', footprint: { x: 0, z: 0, width: 1, depth: 1 } }),
      placedHotspot({ id: 'nest', style: 'open', footprint: { x: 2, z: 0, width: 1, depth: 1 } }),
      placedHotspot({ id: 'paddock', style: 'fenced', footprint: { x: 4, z: 0, width: 1, depth: 1 } }),
    ])
    expect(walkable(footprinted, { x: 0, z: 0 })).toBe(false)
    expect(walkable(footprinted, { x: 2, z: 0 })).toBe(false)
    expect(walkable(footprinted, { x: 4, z: 0 })).toBe(true)
    expect(walkable(footprinted, { x: 1, z: 0 })).toBe(true)
  })
})

describe('stepCost', () => {
  const world = gridWorld(['=.~'])

  it('makes a path step cheaper than a grass step, and water impassable', () => {
    expect(stepCost(world, { x: 0, z: 0 })).toBe(PATH_STEP_COST)
    expect(stepCost(world, { x: 1, z: 0 })).toBe(GROUND_STEP_COST)
    expect(PATH_STEP_COST).toBeLessThan(GROUND_STEP_COST)
    expect(stepCost(world, { x: 2, z: 0 })).toBe(Infinity)
  })
})

describe('hotspotArrivedAt', () => {
  const paddock = placedHotspot({ id: 'paddock', style: 'fenced', footprint: { x: 2, z: 0, width: 3, depth: 3 } })
  const world = gridWorld(['.....', '.....', '.....'], [paddock])

  it('names the hotspot whose arrival tile the keeper stands on', () => {
    expect(hotspotArrivedAt(world, paddock.arrival)).toBe('paddock')
  })

  it('names the hotspot whose entrance (a pen’s gate) the keeper stands on', () => {
    expect(hotspotArrivedAt(world, paddock.entrance)).toBe('paddock')
  })

  it('is null anywhere else, including inside the pen', () => {
    expect(hotspotArrivedAt(world, { x: 0, z: 2 })).toBeNull()
    expect(hotspotArrivedAt(world, { x: 3, z: 1 })).toBeNull()
  })
})

describe('nearestWalkable', () => {
  it('is the tile itself when it is walkable', () => {
    expect(nearestWalkable(gridWorld(['...']), { x: 1, z: 0 })).toEqual({ x: 1, z: 0 })
  })

  it('steps off a tree to the closest walkable tile, north-west first when equally near', () => {
    const world = gridWorld(['...', '.T.', '...'])
    expect(nearestWalkable(world, { x: 1, z: 1 })).toEqual({ x: 1, z: 0 })
  })

  it('prefers the side of a fence nearer the keeper when both sides are equally near', () => {
    const world = gridWorld(['.#.'])
    expect(nearestWalkable(world, { x: 1, z: 0 }, { x: 2, z: 0 })).toEqual({ x: 2, z: 0 })
    expect(nearestWalkable(world, { x: 1, z: 0 }, { x: 0, z: 0 })).toEqual({ x: 0, z: 0 })
  })

  it('leaves a building for the nearest tile outside it', () => {
    const barn = placedHotspot({ id: 'barn', style: 'building', footprint: { x: 1, z: 1, width: 3, depth: 3 } })
    const world = gridWorld(['.....', '.....', '.....', '.....', '.....'], [barn])
    expect(nearestWalkable(world, { x: 2, z: 2 })).toEqual({ x: 2, z: 0 })
  })

  it('is null when nothing within reach is walkable', () => {
    expect(nearestWalkable(gridWorld(['~~~']), { x: 1, z: 0 })).toBeNull()
  })
})

describe('on the shipped farm', () => {
  const world = buildTileWorld(farmWorldSpec(seededRngFactory), farmStartingChunks())

  it('lets the keeper stand on every hotspot’s arrival tile and through the paddock gate', () => {
    for (const placed of world.hotspots) expect(walkable(world, placed.arrival), placed.id).toBe(true)
    const paddock = world.hotspots.find(({ id }) => id === 'paddock')
    expect(paddock && walkable(world, paddock.entrance)).toBe(true)
  })

  it('never lets the keeper stand inside the barn', () => {
    const barn = world.hotspots.find(({ id }) => id === 'barn')
    if (!barn) throw new Error('no barn')
    const inside = { x: barn.footprint.x + 1, z: barn.footprint.z + 1 }
    expect(walkable(world, inside)).toBe(false)
    const nearest = nearestWalkable(world, inside)
    expect(nearest && hotspotAt(world, nearest)?.id).not.toBe('barn')
  })
})
