import { describe, expect, it } from 'vitest'
import { farmStartingChunks, farmWorldSpec } from './farm-tile-world'
import { findRoute, planWalk } from './route-finding'
import { gridWorld, placedHotspot, seededRngFactory } from './test-fixtures'
import type { TileCoord } from './tile-grid'
import { buildTileWorld } from './tile-world'
import { hotspotArrivedAt, walkable } from './walkability'

function isStep(from: TileCoord, to: TileCoord): boolean {
  const dx = Math.abs(from.x - to.x)
  const dz = Math.abs(from.z - to.z)
  return Math.max(dx, dz) === 1
}

describe('findRoute', () => {
  it('is the one tile when the keeper is already there', () => {
    expect(findRoute(gridWorld(['...']), { x: 1, z: 0 }, { x: 1, z: 0 })).toEqual([{ x: 1, z: 0 }])
  })

  it('walks a straight line across open grass', () => {
    expect(findRoute(gridWorld(['....']), { x: 0, z: 0 }, { x: 3, z: 0 })).toEqual([
      { x: 0, z: 0 },
      { x: 1, z: 0 },
      { x: 2, z: 0 },
      { x: 3, z: 0 },
    ])
  })

  it('goes diagonally across open ground rather than round two sides', () => {
    const route = findRoute(gridWorld(['...', '...', '...']), { x: 0, z: 0 }, { x: 2, z: 2 })
    expect(route).toEqual([
      { x: 0, z: 0 },
      { x: 1, z: 1 },
      { x: 2, z: 2 },
    ])
  })

  it('walks round a wall of trees', () => {
    const world = gridWorld(['.T.', '.T.', '...'])
    const route = findRoute(world, { x: 0, z: 0 }, { x: 2, z: 0 })
    expect(route?.at(0)).toEqual({ x: 0, z: 0 })
    expect(route?.at(-1)).toEqual({ x: 2, z: 0 })
    for (const tile of route ?? []) expect(walkable(world, tile)).toBe(true)
  })

  it('never cuts a corner diagonally past something the keeper cannot stand on', () => {
    const world = gridWorld(['.T', '..'])
    expect(findRoute(world, { x: 0, z: 0 }, { x: 1, z: 1 })).toEqual([
      { x: 0, z: 0 },
      { x: 0, z: 1 },
      { x: 1, z: 1 },
    ])
  })

  it('takes a longer path round rather than a shorter walk over grass', () => {
    // Three grass steps straight across cost more than five path steps round.
    const world = gridWorld(['=...=', '=====' ])
    const route = findRoute(world, { x: 0, z: 0 }, { x: 4, z: 0 })
    expect(route?.every((tile) => tile.z === 1 || tile.x === 0 || tile.x === 4)).toBe(true)
  })

  it('enters a fenced pen only through its gate', () => {
    const world = gridWorld(['.....', '.###.', '.G.#.', '.###.', '.....'])
    const route = findRoute(world, { x: 0, z: 2 }, { x: 2, z: 2 })
    expect(route).toEqual([
      { x: 0, z: 2 },
      { x: 1, z: 2 },
      { x: 2, z: 2 },
    ])
  })

  it.each([
    ['the target is water', ['..~'], { x: 2, z: 0 }],
    ['the target is cut off by water', ['.~.'], { x: 2, z: 0 }],
    ['the target is inside a pen with no gate', ['.###', '.#.#', '.###'], { x: 2, z: 1 }],
    ['the target is off the land', ['...'], { x: 0, z: -1 }],
  ])('is null when %s', (_, rows, target) => {
    expect(findRoute(gridWorld(rows), { x: 0, z: 0 }, target)).toBeNull()
  })

  it('is null when the keeper starts somewhere it cannot stand', () => {
    expect(findRoute(gridWorld(['~..']), { x: 0, z: 0 }, { x: 2, z: 0 })).toBeNull()
  })

  it('breaks ties the same way every time: two equal routes round a tree, always the northern one', () => {
    const world = gridWorld(['...', '.T.', '...'])
    const first = findRoute(world, { x: 0, z: 1 }, { x: 2, z: 1 })
    for (let run = 0; run < 5; run++) expect(findRoute(world, { x: 0, z: 1 }, { x: 2, z: 1 })).toEqual(first)
    expect(first).toEqual([
      { x: 0, z: 1 },
      { x: 0, z: 0 },
      { x: 1, z: 0 },
      { x: 2, z: 0 },
      { x: 2, z: 1 },
    ])
  })
})

describe('planWalk', () => {
  it('walks straight to a tile the keeper can stand on', () => {
    expect(planWalk(gridWorld(['...']), { x: 0, z: 0 }, { x: 2, z: 0 })?.at(-1)).toEqual({ x: 2, z: 0 })
  })

  it('walks to the nearest standable tile on the keeper’s side when the tap lands inside a building', () => {
    const barn = placedHotspot({ id: 'barn', style: 'building', footprint: { x: 2, z: 1, width: 3, depth: 3 } })
    const world = gridWorld(['.......', '.......', '.......', '.......', '.......'], [barn])
    expect(planWalk(world, { x: 0, z: 0 }, { x: 3, z: 2 })?.at(-1)).toEqual({ x: 1, z: 2 })
  })

  it('stays on the keeper’s side when the tap lands on a fence', () => {
    expect(planWalk(gridWorld(['...#...']), { x: 6, z: 0 }, { x: 3, z: 0 })?.at(-1)).toEqual({ x: 4, z: 0 })
  })

  it('is null when the nearest standable tile cannot be reached', () => {
    expect(planWalk(gridWorld(['.~T.']), { x: 0, z: 0 }, { x: 2, z: 0 })).toBeNull()
  })

  it('is null when nothing near the tap can be stood on', () => {
    expect(planWalk(gridWorld(['.']), { x: 0, z: 0 }, { x: 12, z: 12 })).toBeNull()
  })
})

describe('on the shipped farm', () => {
  const world = buildTileWorld(farmWorldSpec(seededRngFactory), farmStartingChunks())
  const farmhouse = world.hotspots.find(({ id }) => id === 'farmhouse')
  if (!farmhouse) throw new Error('no farmhouse')

  it('reaches every hotspot’s doorstep from the farmhouse, one step at a time, ending where arrival is recognised', () => {
    for (const placed of world.hotspots) {
      const route = findRoute(world, farmhouse.arrival, placed.arrival)
      expect(route, placed.id).not.toBeNull()
      route?.slice(1).forEach((tile, index) => expect(isStep(route[index] as TileCoord, tile)).toBe(true))
      expect(hotspotArrivedAt(world, placed.arrival)).toBe(placed.id)
    }
  })

  it('walks into the paddock through its gate', () => {
    const paddock = world.hotspots.find(({ id }) => id === 'paddock')
    if (!paddock) throw new Error('no paddock')
    const route = findRoute(world, farmhouse.arrival, paddock.entrance)
    expect(route?.at(-1)).toEqual(paddock.entrance)
    expect(route?.at(-2)).toEqual(paddock.arrival)
  })
})
