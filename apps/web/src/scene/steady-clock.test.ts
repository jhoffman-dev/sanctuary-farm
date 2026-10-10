import { afterEach, describe, expect, it, vi } from 'vitest'
import { MAX_FRAME_SECONDS } from './frameloop'
import { SteadyClock } from './steady-clock'

afterEach(() => vi.restoreAllMocks())

describe('SteadyClock', () => {
  it('reports ordinary frames as they are, and a frame after a long idle as one capped step', () => {
    let nowMs = 1_000
    vi.spyOn(performance, 'now').mockImplementation(() => nowMs)
    const clock = new SteadyClock()
    clock.start()

    nowMs += 16
    expect(clock.getDelta()).toBeCloseTo(0.016)
    nowMs += 60_000
    expect(clock.getDelta()).toBe(MAX_FRAME_SECONDS)
  })
})
