import { describe, expect, it } from 'vitest'
import { areaContains, areasOverlap, areaWithinGround, distance2, pointWithinGround } from './geometry'
import type { Area } from './world-layout'

const circle: Area = { shape: 'circle', centre: [0, 0], radius: 2 }
const box: Area = { shape: 'box', centre: [0, 0], size: [4, 2] }

describe('distance2', () => {
  it('measures across the ground plane', () => {
    expect(distance2([0, 0], [3, 4])).toBe(5)
    expect(distance2([-1, -1], [-1, -1])).toBe(0)
  })
})

describe('areaContains — the rim counts as inside, so a trigger triggers on its edge', () => {
  it('answers for a circle', () => {
    expect(areaContains(circle, [0, 0])).toBe(true)
    expect(areaContains(circle, [2, 0])).toBe(true)
    expect(areaContains(circle, [2.001, 0])).toBe(false)
  })

  it('answers for a box', () => {
    expect(areaContains(box, [2, 1])).toBe(true)
    expect(areaContains(box, [-2, -1])).toBe(true)
    expect(areaContains(box, [2, 1.001])).toBe(false)
    expect(areaContains(box, [2.001, 0])).toBe(false)
  })
})

describe('areasOverlap — sharing a boundary is neighbouring, not overlapping', () => {
  it('compares two circles', () => {
    expect(areasOverlap(circle, { shape: 'circle', centre: [3.9, 0], radius: 2 })).toBe(true)
    expect(areasOverlap(circle, { shape: 'circle', centre: [4, 0], radius: 2 })).toBe(false)
  })

  it('compares two boxes', () => {
    expect(areasOverlap(box, { shape: 'box', centre: [3.9, 0], size: [4, 2] })).toBe(true)
    expect(areasOverlap(box, { shape: 'box', centre: [4, 0], size: [4, 2] })).toBe(false)
    expect(areasOverlap(box, { shape: 'box', centre: [0, 2], size: [4, 2] })).toBe(false)
  })

  it('compares a circle with a box, either way round', () => {
    const near: Area = { shape: 'circle', centre: [3, 0], radius: 1.5 }
    const touching: Area = { shape: 'circle', centre: [3, 0], radius: 1 }
    expect(areasOverlap(near, box)).toBe(true)
    expect(areasOverlap(box, near)).toBe(true)
    expect(areasOverlap(touching, box)).toBe(false)
    expect(areasOverlap(box, touching)).toBe(false)
  })

  it('sees a circle swallowed by a box', () => {
    expect(areasOverlap({ shape: 'circle', centre: [0, 0], radius: 0.2 }, box)).toBe(true)
  })
})

describe('areaWithinGround / pointWithinGround', () => {
  const ground: [number, number] = [30, 30]

  it('lets an area touch the edge but not cross it', () => {
    expect(areaWithinGround({ shape: 'circle', centre: [13, 0], radius: 2 }, ground)).toBe(true)
    expect(areaWithinGround({ shape: 'circle', centre: [13.1, 0], radius: 2 }, ground)).toBe(false)
    expect(areaWithinGround({ shape: 'box', centre: [0, 13], size: [4, 4] }, ground)).toBe(true)
    expect(areaWithinGround({ shape: 'box', centre: [0, 13.1], size: [4, 4] }, ground)).toBe(false)
  })

  it('lets a point stand on the edge', () => {
    expect(pointWithinGround([15, -15], ground)).toBe(true)
    expect(pointWithinGround([15.1, 0], ground)).toBe(false)
    expect(pointWithinGround([0, -15.1], ground)).toBe(false)
  })
})
