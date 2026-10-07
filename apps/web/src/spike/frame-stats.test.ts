import { describe, expect, it } from 'vitest'
import { FrameStats } from './frame-stats'

describe('FrameStats', () => {
  it('reports nothing before the first frame', () => {
    const stats = new FrameStats()
    expect(stats.frames).toBe(0)
    expect(stats.averageFps).toBe(0)
    expect(stats.worstFps).toBe(0)
  })

  it('averages frames per second over the window', () => {
    const stats = new FrameStats()
    for (let i = 0; i < 120; i++) stats.record(1 / 60)
    expect(stats.frames).toBe(120)
    expect(stats.elapsedSeconds).toBeCloseTo(2, 6)
    expect(stats.averageFps).toBeCloseTo(60, 6)
  })

  it('reports the slowest frame as the worst fps', () => {
    const stats = new FrameStats()
    stats.record(1 / 60)
    stats.record(1 / 12)
    stats.record(1 / 60)
    expect(stats.worstFps).toBeCloseTo(12, 6)
  })

  it('ignores non-positive and non-finite deltas', () => {
    const stats = new FrameStats()
    stats.record(0)
    stats.record(-1)
    stats.record(Number.NaN)
    stats.record(Number.POSITIVE_INFINITY)
    expect(stats.frames).toBe(0)
  })

  it('clears everything on reset', () => {
    const stats = new FrameStats()
    stats.record(1 / 30)
    stats.reset()
    expect(stats.frames).toBe(0)
    expect(stats.elapsedSeconds).toBe(0)
    expect(stats.worstFps).toBe(0)
  })
})
