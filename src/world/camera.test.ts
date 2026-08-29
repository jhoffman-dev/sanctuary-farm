import { describe, expect, it } from 'vitest'
import { CAMERA_DEADZONE, MAP_PX_H, MAP_PX_W } from '@/contracts'
import { cameraOffset } from './camera'

describe('cameraOffset', () => {
  it('never lets the view show outside the map', () => {
    const vw = 640
    const vh = 480
    for (let tx = -200; tx <= MAP_PX_W + 200; tx += 37) {
      for (let ty = -200; ty <= MAP_PX_H + 200; ty += 41) {
        const noPrev = cameraOffset({ x: tx, y: ty }, { w: vw, h: vh })
        expect(noPrev.x).toBeGreaterThanOrEqual(0)
        expect(noPrev.x).toBeLessThanOrEqual(MAP_PX_W - vw)
        expect(noPrev.y).toBeGreaterThanOrEqual(0)
        expect(noPrev.y).toBeLessThanOrEqual(MAP_PX_H - vh)

        const withPrev = cameraOffset({ x: tx, y: ty }, { w: vw, h: vh }, { x: 123, y: 45 })
        expect(withPrev.x).toBeGreaterThanOrEqual(0)
        expect(withPrev.x).toBeLessThanOrEqual(MAP_PX_W - vw)
        expect(withPrev.y).toBeGreaterThanOrEqual(0)
        expect(withPrev.y).toBeLessThanOrEqual(MAP_PX_H - vh)
      }
    }
  })

  it('centres and locks an axis when the viewport is at least the map size', () => {
    const wideX = MAP_PX_W + 400
    const a = cameraOffset({ x: 0, y: 400 }, { w: wideX, h: 480 })
    const b = cameraOffset({ x: MAP_PX_W, y: 400 }, { w: wideX, h: 480 })
    expect(a.x).toBe((MAP_PX_W - wideX) / 2)
    expect(b.x).toBe(a.x) // does not scroll with the target
    // y still follows
    expect(a.y).toBeGreaterThanOrEqual(0)
    expect(a.y).toBeLessThanOrEqual(MAP_PX_H - 480)
  })

  it('holds still while the target stays inside the dead zone', () => {
    const vw = 400
    const vh = 400
    const prev = { x: 300, y: 300 }
    // target sits at prev + centre of viewport → dead centre
    const centreTarget = { x: prev.x + vw / 2, y: prev.y + vh / 2 }
    const held = cameraOffset(centreTarget, { w: vw, h: vh }, prev)
    expect(held).toEqual(prev)

    // nudge within the middle third → still no movement
    const dead = vw * CAMERA_DEADZONE
    const nudged = cameraOffset(
      { x: centreTarget.x + dead / 2 - 1, y: centreTarget.y },
      { w: vw, h: vh },
      prev,
    )
    expect(nudged).toEqual(prev)
  })

  it('drags the camera once the target leaves the dead zone', () => {
    const vw = 400
    const vh = 400
    const prev = { x: 300, y: 300 }
    const centreTarget = { x: prev.x + vw / 2, y: prev.y + vh / 2 }
    const far = cameraOffset(
      { x: centreTarget.x + vw, y: centreTarget.y },
      { w: vw, h: vh },
      prev,
    )
    expect(far.x).toBeGreaterThan(prev.x)
  })
})
