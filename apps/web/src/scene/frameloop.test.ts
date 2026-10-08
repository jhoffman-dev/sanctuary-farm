import { describe, expect, it } from 'vitest'
import { capFrameSeconds, type FrameloopInputs, isSettled, MAX_FRAME_SECONDS, SETTLE_SECONDS, sceneFrameloop } from './frameloop'
import { qualitySettings } from './quality-settings'

const LOW_AT_REST: FrameloopInputs = { reducedMotion: false, probing: false, settled: true, ...qualitySettings('low') }
const HIGH_AT_REST: FrameloopInputs = { reducedMotion: false, probing: false, settled: true, ...qualitySettings('high') }

describe('sceneFrameloop', () => {
  it('draws nothing on the low tier once the keeper and camera have settled', () => {
    expect(sceneFrameloop(LOW_AT_REST)).toBe('demand')
  })

  it('draws every frame on the low tier while the keeper walks or the camera eases', () => {
    expect(sceneFrameloop({ ...LOW_AT_REST, settled: false })).toBe('always')
  })

  it('draws every frame on the high tier even at rest: its animals breathe and its camera sways', () => {
    expect(sceneFrameloop(HIGH_AT_REST)).toBe('always')
    expect(sceneFrameloop({ ...LOW_AT_REST, idleLoops: true })).toBe('always')
    expect(sceneFrameloop({ ...LOW_AT_REST, cameraSway: true })).toBe('always')
  })

  it('keeps drawing while the tier probe times frames', () => {
    expect(sceneFrameloop({ ...LOW_AT_REST, probing: true })).toBe('always')
  })

  it('stays on demand under reduced motion, whatever the tier, mid-walk or probing (game rule 8)', () => {
    expect(sceneFrameloop({ ...HIGH_AT_REST, reducedMotion: true })).toBe('demand')
    expect(sceneFrameloop({ ...LOW_AT_REST, reducedMotion: true, settled: false, probing: true })).toBe('demand')
  })
})

describe('isSettled', () => {
  it('waits out the walk → idle crossfade before calling the farm still', () => {
    expect(isSettled(0)).toBe(false)
    expect(isSettled(SETTLE_SECONDS - 0.01)).toBe(false)
    expect(isSettled(SETTLE_SECONDS)).toBe(true)
  })
})

describe('capFrameSeconds', () => {
  it('passes ordinary frames through and caps a frame that waited on demand', () => {
    expect(capFrameSeconds(1 / 60)).toBe(1 / 60)
    expect(capFrameSeconds(42)).toBe(MAX_FRAME_SECONDS)
  })
})
