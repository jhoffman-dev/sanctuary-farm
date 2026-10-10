import { describe, expect, it } from 'vitest'
import { loadFarmLayout } from './farm-layout'
import { HOTSPOT_STYLES, anchorsFromLayout, facing, moveAnchor } from './hotspot-anchors'
import { distanceToRect, neighbour, rectContains } from './tile-grid'
import { HOTSPOT_IDS } from './world-layout'

const anchors = anchorsFromLayout(loadFarmLayout())
const anchor = (id: string) => anchors.find((candidate) => candidate.id === id)!

describe('hotspot anchors from farm.json', () => {
  it('anchors all seven hotspots, each on a multi-tile footprint', () => {
    expect(anchors.map(({ id }) => id)).toEqual([...HOTSPOT_IDS])
    for (const { footprint } of anchors) expect(footprint.width * footprint.depth).toBeGreaterThan(1)
  })

  it('snaps a footprint to the tiles whose centres lie inside it', () => {
    expect(anchor('paddock').footprint).toEqual({ x: 6, z: -3, width: 8, depth: 10 })
    expect(anchor('training-ring').footprint).toEqual({ x: -1, z: 5, width: 6, depth: 6 })
  })

  it('puts the entrance on the side the layout arrives from, never on a corner when the side has a middle', () => {
    expect(anchor('paddock')).toMatchObject({ entranceSide: 'west', entrance: { x: 6, z: 1 }, arrival: { x: 5, z: 1 } })
    expect(anchor('barn')).toMatchObject({ entranceSide: 'south', entrance: { x: 0, z: -7 }, arrival: { x: 0, z: -6 } })
  })

  it('leaves every arrival outside every footprint, one step out from its own entrance', () => {
    for (const each of anchors) {
      expect(neighbour(each.entrance, each.entranceSide)).toEqual(each.arrival)
      expect(distanceToRect(each.footprint, each.entrance)).toBe(0)
      for (const other of anchors) expect(rectContains(other.footprint, each.arrival)).toBe(false)
    }
  })

  it('keeps footprints apart, so no two hotspots share a tile', () => {
    for (const one of anchors) {
      for (const other of anchors) {
        if (one === other) continue
        const overlaps = Array.from({ length: one.footprint.width * one.footprint.depth }, (_, at) => ({
          x: one.footprint.x + (at % one.footprint.width),
          z: one.footprint.z + Math.floor(at / one.footprint.width),
        })).some((tile) => rectContains(other.footprint, tile))
        expect(overlaps, `${one.id} overlaps ${other.id}`).toBe(false)
      }
    }
  })

  it('fences the paddock and training ring and builds the barn, shed and farmhouse', () => {
    expect(anchor('paddock').style).toBe('fenced')
    expect(anchor('training-ring').style).toBe('fenced')
    expect(['barn', 'feed-shed', 'farmhouse'].map((id) => HOTSPOT_STYLES[id as 'barn'])).toEqual(['building', 'building', 'building'])
  })

  it('moves a footprint with its entrance and arrival', () => {
    const moved = moveAnchor(anchor('barn'), { x: 10, z: 10 })
    expect(moved.footprint).toEqual({ x: 10, z: 10, width: 4, depth: 4 })
    expect(moved.entrance).toEqual({ x: 12, z: 13 })
    expect(moved.arrival).toEqual({ x: 12, z: 14 })
  })

  it('faces a model out of each side in clockwise quarter turns from north', () => {
    expect(['north', 'east', 'south', 'west'].map((side) => facing(side as 'north'))).toEqual([0, 1, 2, 3])
  })
})
