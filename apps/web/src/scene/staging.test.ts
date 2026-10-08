import type { HotspotId, PlacedHotspot } from '@sf/world'
import { HOTSPOT_IDS } from '@sf/world'
import { describe, expect, it } from 'vitest'
import { footprintCentre } from './piece-placement'
import { stageWorld } from './staging'

const FOOTPRINTS: Record<HotspotId, PlacedHotspot['footprint']> = {
  barn: { x: -2, z: -10, width: 4, depth: 4 },
  'feed-shed': { x: 5, z: -7, width: 3, depth: 3 },
  nest: { x: -8, z: -7, width: 3, depth: 3 },
  paddock: { x: 6, z: -3, width: 8, depth: 10 },
  'training-ring': { x: -2, z: 4, width: 7, depth: 7 },
  'petting-zoo': { x: -14, z: -4, width: 7, depth: 7 },
  farmhouse: { x: -12, z: 6, width: 5, depth: 4 },
}

const hotspots: PlacedHotspot[] = HOTSPOT_IDS.map((id) => ({
  id,
  style: 'open',
  footprint: FOOTPRINTS[id],
  entranceSide: 'south',
  entrance: { x: FOOTPRINTS[id].x, z: FOOTPRINTS[id].z + FOOTPRINTS[id].depth - 1 },
  arrival: { x: FOOTPRINTS[id].x + 1, z: FOOTPRINTS[id].z + FOOTPRINTS[id].depth },
  rotation: 2,
}))

const inside = (point: { x: number; z: number }, rect: PlacedHotspot['footprint']) =>
  point.x > rect.x && point.x < rect.x + rect.width && point.z > rect.z && point.z < rect.z + rect.depth

describe('stageWorld', () => {
  it('puts the four Cube Pets inside their homes: cow and hog the paddock, pig the petting zoo, chick the nest', () => {
    const { animals } = stageWorld(hotspots)
    const homeOf = { cow: 'paddock', hog: 'paddock', pig: 'petting-zoo', chick: 'nest' } as const
    expect(animals.map((animal) => animal.species).toSorted()).toEqual(['chick', 'cow', 'hog', 'pig'])
    for (const animal of animals) {
      expect(inside(animal, FOOTPRINTS[homeOf[animal.species as keyof typeof homeOf]]), animal.species).toBe(true)
    }
  })

  it('keeps every animal off its footprint\'s centre, where an open hotspot\'s marker stands', () => {
    for (const animal of stageWorld(hotspots).animals) {
      const home = hotspots.find((hotspot) => inside(animal, hotspot.footprint))
      const centre = footprintCentre(home?.footprint ?? FOOTPRINTS.barn)
      expect(Math.hypot(animal.x - centre.x, animal.z - centre.z), animal.species).toBeGreaterThan(0.5)
    }
  })

  it('stands the keeper on the farmhouse arrival tile', () => {
    expect(stageWorld(hotspots).keeper).toMatchObject({ x: -10.5, z: 10.5 })
  })

  it('faces everyone towards the camera, so faces read', () => {
    const { animals, keeper } = stageWorld(hotspots)
    expect(new Set([...animals, keeper].map((placed) => placed.rotation))).toEqual(new Set([2]))
  })

  it('says which hotspot is missing rather than staging an animal nowhere', () => {
    expect(() => stageWorld(hotspots.filter((hotspot) => hotspot.id !== 'nest'))).toThrow(/no nest hotspot/)
  })
})
