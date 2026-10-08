import { describe, expect, it } from 'vitest'
import { contrast, linearOf } from '../test/contrast'
import { groundHex } from './ground-palette'
import { HOME_VIEW } from './camera-views'
import { cameraForward } from './keyboard-step'
import {
  RING_CORE,
  RING_CORE_RADII,
  RING_OUTLINE,
  RING_OUTLINE_RADII,
  UNREACHABLE_CUE_SECONDS,
  cueFrameSeconds,
  screenRight,
  unreachableCueLook,
} from './target-ring'

/** WCAG 2.2 SC 1.4.11: a non-text UI element against what surrounds it. */
const NON_TEXT_MINIMUM = 3

describe('the target ring', () => {
  it.each(['grass', 'path', 'dirt'] as const)('outlines itself at ≥ 3:1 against %s', (ground) => {
    expect(contrast(linearOf(RING_OUTLINE), linearOf(groundHex(ground)))).toBeGreaterThanOrEqual(NON_TEXT_MINIMUM)
  })

  it('keeps its cream core distinct from its outline', () => {
    expect(contrast(linearOf(RING_CORE), linearOf(RING_OUTLINE))).toBeGreaterThanOrEqual(NON_TEXT_MINIMUM)
  })

  it('is never red: neither band leans red over green by much', () => {
    for (const hex of [RING_OUTLINE, RING_CORE]) {
      const [r, g] = linearOf(hex)
      expect(r / Math.max(g, 1e-6)).toBeLessThan(2.5)
    }
  })

  it('sits inside the tile with the core inside the outline', () => {
    const [outlineInner, outlineOuter] = RING_OUTLINE_RADII
    const [coreInner, coreOuter] = RING_CORE_RADII
    expect(outlineOuter).toBeLessThan(0.5)
    expect(coreInner).toBeGreaterThan(outlineInner)
    expect(coreOuter).toBeLessThan(outlineOuter)
  })
})

describe('unreachableCueLook', () => {
  it('starts fully shown and fades out over the cue', () => {
    expect(unreachableCueLook(0, false)?.opacity).toBe(1)
    const half = unreachableCueLook(UNREACHABLE_CUE_SECONDS / 2, false)
    expect(half?.opacity).toBeCloseTo(0.5, 9)
    expect(unreachableCueLook(UNREACHABLE_CUE_SECONDS * 0.99, false)?.opacity).toBeLessThan(0.02)
  })

  it('is over once its time is up', () => {
    expect(unreachableCueLook(UNREACHABLE_CUE_SECONDS, false)).toBeNull()
    expect(unreachableCueLook(10, true)).toBeNull()
  })

  it('shakes a little from side to side, gentler as it fades', () => {
    const shakes = Array.from({ length: 40 }, (_, frame) => unreachableCueLook((frame / 40) * UNREACHABLE_CUE_SECONDS, false)?.shake ?? 0)
    expect(Math.max(...shakes)).toBeGreaterThan(0.02)
    expect(Math.min(...shakes)).toBeLessThan(-0.02)
    expect(Math.max(...shakes.map(Math.abs))).toBeLessThanOrEqual(0.08)
    expect(Math.abs(shakes.at(-1) ?? 1)).toBeLessThan(0.01)
  })

  it('only fades under reduced motion: no shake at all', () => {
    for (let frame = 0; frame < 24; frame++) {
      const look = unreachableCueLook((frame / 24) * UNREACHABLE_CUE_SECONDS, true)
      expect(look?.shake).toBe(0)
      expect(look?.opacity).toBeCloseTo(1 - frame / 24, 9)
    }
  })
})

describe('cueFrameSeconds', () => {
  it('passes an ordinary frame through', () => {
    expect(cueFrameSeconds(1 / 60)).toBeCloseTo(1 / 60, 12)
  })

  it('caps the long first frame of an on-demand loop, so the cue is still seen', () => {
    expect(cueFrameSeconds(4)).toBeLessThan(UNREACHABLE_CUE_SECONDS / 10)
    expect(cueFrameSeconds(-1)).toBe(0)
  })
})

describe('screenRight', () => {
  it('is east for a camera looking north, and square to the home camera’s view', () => {
    expect(screenRight({ x: 0, z: -1 })).toEqual({ x: 1, z: 0 })
    const forward = cameraForward(HOME_VIEW)
    const right = screenRight(forward)
    expect(right.x * forward.x + right.z * forward.z).toBeCloseTo(0, 12)
    // The home camera sits south-east looking north-west, so screen-right points north-east.
    expect(right.x).toBeGreaterThan(0)
    expect(right.z).toBeLessThan(0)
  })
})
