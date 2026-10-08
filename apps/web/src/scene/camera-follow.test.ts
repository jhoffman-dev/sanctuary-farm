import { describe, expect, it } from 'vitest'
import { easeOffset, followOffset, followRadius } from './camera-follow'

const CENTRE = { x: 0, z: 1 }

describe('followRadius', () => {
  it('is wide on a landscape screen, where the whole farm fits, and small on a phone', () => {
    expect(followRadius(1280 / 800)).toBe(14)
    expect(followRadius(360 / 640)).toBeCloseTo(3.625)
  })

  it('never shrinks below a few tiles', () => {
    expect(followRadius(0.1)).toBe(2.5)
  })
})

describe('followOffset', () => {
  it('holds the camera still while the keeper is inside the dead zone', () => {
    expect(followOffset({ keeper: { x: 3, z: 4 }, centre: CENTRE, radius: 5 })).toEqual({ x: 0, z: 0 })
  })

  it('slides just far enough to put the keeper back on the zone’s edge', () => {
    expect(followOffset({ keeper: { x: 8, z: 1 }, centre: CENTRE, radius: 5 })).toEqual({ x: 3, z: 0 })
    const offset = followOffset({ keeper: { x: -6, z: 9 }, centre: CENTRE, radius: 5 })
    expect(Math.hypot(-6 - offset.x - CENTRE.x, 9 - offset.z - CENTRE.z)).toBeCloseTo(5)
  })
})

describe('easeOffset', () => {
  const target = { x: 4, z: -2 }

  it('glides part of the way each frame and gets there in the end', () => {
    let current = { x: 0, z: 0 }
    current = easeOffset({ current, target, delta: 1 / 60, reducedMotion: false })
    expect(current.x).toBeGreaterThan(0)
    expect(current.x).toBeLessThan(4)
    for (let frame = 0; frame < 600; frame++) current = easeOffset({ current, target, delta: 1 / 60, reducedMotion: false })
    expect(current.x).toBeCloseTo(4)
    expect(current.z).toBeCloseTo(-2)
  })

  it('snaps straight there under reduced motion', () => {
    expect(easeOffset({ current: { x: 0, z: 0 }, target, delta: 1 / 60, reducedMotion: true })).toEqual(target)
  })
})
