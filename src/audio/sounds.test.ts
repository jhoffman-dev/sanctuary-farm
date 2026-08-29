import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createAudioBus } from './sounds'

class FakeParam {
  setValueAtTime = vi.fn()
  exponentialRampToValueAtTime = vi.fn()
  linearRampToValueAtTime = vi.fn()
}
class FakeOsc {
  type = 'sine'
  frequency = new FakeParam()
  connect = vi.fn((node: unknown) => node)
  start = vi.fn()
  stop = vi.fn()
}
class FakeGain {
  gain = new FakeParam()
  connect = vi.fn((node: unknown) => node)
}

const instances: FakeCtx[] = []

class FakeCtx {
  state: 'running' | 'suspended' = 'running'
  currentTime = 0
  destination = {}
  resume = vi.fn(() => Promise.resolve())
  createOscillator = vi.fn(() => new FakeOsc())
  createGain = vi.fn(() => new FakeGain())
  constructor() {
    instances.push(this)
  }
}

beforeEach(() => {
  instances.length = 0
  vi.stubGlobal('AudioContext', FakeCtx)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('createAudioBus', () => {
  it('produces no AudioContext activity while muted', () => {
    const bus = createAudioBus({ muted: true })
    bus.play('correct')
    bus.play('fluent')
    bus.play('wrong')
    expect(instances).toHaveLength(0)
  })

  it('setMuted(false) restores playback', () => {
    const bus = createAudioBus({ muted: true })
    bus.play('correct')
    expect(instances).toHaveLength(0)

    bus.setMuted(false)
    bus.play('correct')
    expect(instances).toHaveLength(1)
    expect(instances[0].createOscillator).toHaveBeenCalled()
  })

  it('lazily creates a single AudioContext and reuses it', () => {
    const bus = createAudioBus()
    expect(instances).toHaveLength(0)
    bus.play('tap')
    bus.play('hatch')
    bus.play('footstep')
    expect(instances).toHaveLength(1)
  })

  it('resumes a suspended context', () => {
    class SuspendedCtx extends FakeCtx {
      override state = 'suspended' as const
    }
    vi.stubGlobal('AudioContext', SuspendedCtx)
    const bus = createAudioBus()
    bus.play('correct')
    expect(instances[0].resume).toHaveBeenCalled()
  })

  it('fluent is richer than correct (more oscillator voices)', () => {
    const bus = createAudioBus()
    bus.play('correct')
    const correctVoices = instances[0].createOscillator.mock.calls.length
    bus.play('fluent')
    const fluentVoices = instances[0].createOscillator.mock.calls.length - correctVoices
    expect(fluentVoices).toBeGreaterThan(correctVoices)
  })

  it('reports and toggles mute state', () => {
    const bus = createAudioBus({ muted: true })
    expect(bus.isMuted()).toBe(true)
    bus.setMuted(false)
    expect(bus.isMuted()).toBe(false)
  })

  it('never throws if AudioContext is unavailable', () => {
    vi.stubGlobal('AudioContext', undefined)
    vi.stubGlobal('webkitAudioContext', undefined)
    const bus = createAudioBus()
    expect(() => bus.play('correct')).not.toThrow()
    expect(instances).toHaveLength(0)
  })
})
