import { describe, expect, it } from 'vitest'
import { loadFarmLayout } from './farm-layout'
import { hotspotContaining } from './hotspot-containing'

const layout = loadFarmLayout()

describe('hotspotContaining', () => {
  it('names the hotspot the keeper is standing in', () => {
    for (const hotspot of layout.hotspots) {
      expect(hotspotContaining(layout, hotspot.arrival)?.id).toBe(hotspot.id)
    }
  })

  it('answers on the rim of a trigger, so arriving does not depend on a rounding error', () => {
    const barn = layout.hotspots.find((hotspot) => hotspot.id === 'barn')
    const trigger = barn?.trigger
    if (trigger?.shape !== 'circle') throw new Error('the barn trigger is expected to be a circle')
    const onTheRim: [number, number] = [trigger.centre[0] + trigger.radius, trigger.centre[1]]
    expect(hotspotContaining(layout, onTheRim)?.id).toBe('barn')
  })

  it('is null out in the open', () => {
    expect(hotspotContaining(layout, [0, 0])).toBeNull()
    expect(hotspotContaining(layout, [15, 15])).toBeNull()
  })
})
