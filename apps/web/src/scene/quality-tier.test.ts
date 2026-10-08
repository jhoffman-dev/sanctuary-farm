import { describe, expect, it } from 'vitest'
import {
  classifyDevice,
  type DeviceSignals,
  FrameSampler,
  isQualityTier,
  LOW_TIER_FRAME_MS,
  lowTierFromSignals,
  medianFrameMs,
  SAMPLE_FRAMES,
  WARM_UP_FRAMES,
} from './quality-tier'

const frames = (ms: number, count = SAMPLE_FRAMES) => Array.from({ length: count }, () => ms)

/**
 * Signal sets as each browser reports them. The Chromebook and laptop strings
 * are Chrome's ANGLE renderer format; Safari masks the renderer as "Apple GPU"
 * and WebKit clamps hardwareConcurrency to 2 on iOS, with no deviceMemory.
 * Frame times are what each device would plausibly draw on the high tier —
 * to be recalibrated on the SF-34 reference device.
 */
const DEVICES: ReadonlyArray<{ name: string; signals: DeviceSignals; frameMs: number[]; tier: 'low' | 'high' }> = [
  {
    name: 'reference Chromebook (Celeron N4000, UHD 600, 4 GB)',
    signals: { gpuRenderer: 'ANGLE (Intel, Mesa Intel(R) UHD Graphics 600 (GLK 2), OpenGL 4.6)', logicalCores: 2, memoryGb: 4 },
    frameMs: frames(40),
    tier: 'low',
  },
  {
    name: '2018 iPad (A10, Safari)',
    signals: { gpuRenderer: 'Apple GPU', logicalCores: 2, memoryGb: null },
    frameMs: frames(28),
    tier: 'low',
  },
  {
    name: 'a recent iPad (Safari), same masked signals, fast frames',
    signals: { gpuRenderer: 'Apple GPU', logicalCores: 2, memoryGb: null },
    frameMs: frames(16.7),
    tier: 'high',
  },
  {
    name: 'modern laptop (M2, Chrome)',
    signals: { gpuRenderer: 'ANGLE (Apple, ANGLE Metal Renderer: Apple M2, Unspecified Version)', logicalCores: 8, memoryGb: 8 },
    frameMs: frames(8.3),
    tier: 'high',
  },
  {
    name: 'headless Chromium (SwiftShader)',
    signals: { gpuRenderer: 'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)', logicalCores: 10, memoryGb: 8 },
    frameMs: frames(16.7),
    tier: 'low',
  },
]

describe('classifyDevice', () => {
  it.each(DEVICES)('$name → $tier', ({ signals, frameMs, tier }) => {
    expect(classifyDevice(signals, frameMs).tier).toBe(tier)
  })

  it('keeps the high tier with no hard signal and no frames to time (reduced motion)', () => {
    expect(classifyDevice({ gpuRenderer: 'Apple GPU', logicalCores: 2, memoryGb: null }, [])).toEqual({
      tier: 'high',
      reason: 'no hard signal, no frame sample',
    })
  })

  it('draws the line at 45 fps: a median just under the frame budget stays high, just over goes low', () => {
    const fast = { gpuRenderer: null, logicalCores: 8, memoryGb: 8 }
    expect(classifyDevice(fast, frames(LOW_TIER_FRAME_MS)).tier).toBe('high')
    expect(classifyDevice(fast, frames(LOW_TIER_FRAME_MS + 0.1)).tier).toBe('low')
  })

  it('reads the median, so a few shader-compile spikes do not demote a fast device', () => {
    const sample = [...frames(10, 55), ...frames(200, 5)]
    expect(classifyDevice({ gpuRenderer: null, logicalCores: 8, memoryGb: 8 }, sample).tier).toBe('high')
  })
})

describe('lowTierFromSignals', () => {
  it.each([
    ['a software renderer', { gpuRenderer: 'llvmpipe (LLVM 15.0.7, 256 bits)', logicalCores: 16, memoryGb: 8 }, 'software renderer'],
    ['an entry-level Intel GPU', { gpuRenderer: 'Intel(R) HD Graphics 500', logicalCores: 4, memoryGb: 4 }, 'entry-level GPU'],
    ['an old Mali', { gpuRenderer: 'Mali-G52 MC2', logicalCores: 8, memoryGb: 4 }, 'entry-level GPU'],
    ['two cores off iOS', { gpuRenderer: null, logicalCores: 2, memoryGb: null }, 'two cores or fewer'],
    ['2 GB of memory', { gpuRenderer: null, logicalCores: 4, memoryGb: 2 }, '2 GB of memory or less'],
  ] satisfies [string, DeviceSignals, string][])('says low for %s', (_, signals, reason) => {
    expect(lowTierFromSignals(signals)).toEqual({ tier: 'low', reason })
  })

  it('cannot tell from signals alone for a mid-range Intel, an iPad or a browser that says nothing', () => {
    expect(lowTierFromSignals({ gpuRenderer: 'Intel(R) UHD Graphics 620', logicalCores: 8, memoryGb: 8 })).toBeNull()
    expect(lowTierFromSignals({ gpuRenderer: 'Apple GPU', logicalCores: 2, memoryGb: null })).toBeNull()
    expect(lowTierFromSignals({ gpuRenderer: null, logicalCores: null, memoryGb: null })).toBeNull()
  })
})

describe('medianFrameMs', () => {
  it('is null for no frames, the middle for odd counts and the mean of the middle two for even', () => {
    expect(medianFrameMs([])).toBeNull()
    expect(medianFrameMs([30, 10, 20])).toBe(20)
    expect(medianFrameMs([40, 10, 20, 30])).toBe(25)
  })
})

describe('FrameSampler', () => {
  it('skips the warm-up frames, then hands back exactly one full sample', () => {
    const sampler = new FrameSampler()
    const results = Array.from({ length: WARM_UP_FRAMES + SAMPLE_FRAMES + 5 }, (_, frame) =>
      sampler.add(frame < WARM_UP_FRAMES ? 500 : 16),
    )
    const full = results.filter((result) => result !== null)
    expect(full).toHaveLength(1)
    expect(results.indexOf(full[0] ?? null)).toBe(WARM_UP_FRAMES + SAMPLE_FRAMES - 1)
    expect(full[0]).toEqual(frames(16))
  })
})

describe('isQualityTier', () => {
  it('accepts only the two tiers', () => {
    expect(isQualityTier('low')).toBe(true)
    expect(isQualityTier('high')).toBe(true)
    expect(isQualityTier('medium')).toBe(false)
    expect(isQualityTier(null)).toBe(false)
  })
})
