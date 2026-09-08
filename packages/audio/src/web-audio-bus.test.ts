import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SoundName } from '@sf/application'
import { RECIPES } from './recipes'
import { createWebAudioBus } from './web-audio-bus'

class FakeParam {
  setValueAtTime = vi.fn()
  exponentialRampToValueAtTime = vi.fn()
}
class FakeOscillator {
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
class FakeContext {
  state: 'running' | 'suspended' = 'running'
  currentTime = 10
  destination = {}
  oscillators: FakeOscillator[] = []
  gains: FakeGain[] = []
  resume = vi.fn(() => Promise.resolve())
  createOscillator = vi.fn(() => {
    const osc = new FakeOscillator()
    this.oscillators.push(osc)
    return osc
  })
  createGain = vi.fn(() => {
    const gain = new FakeGain()
    this.gains.push(gain)
    return gain
  })
}

/** A `createContext` that records every context it hands out. */
function fakeContextFactory(state: FakeContext['state'] = 'running') {
  const created: FakeContext[] = []
  const createContext = vi.fn((): AudioContext => {
    const context = new FakeContext()
    context.state = state
    created.push(context)
    // The fake implements only the slice of AudioContext the synth touches.
    return context as unknown as AudioContext
  })
  return { created, createContext }
}

const SOUND_NAMES = Object.keys(RECIPES) as SoundName[]

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('createWebAudioBus — synthesis', () => {
  it.each(SOUND_NAMES)('%s plays one started+stopped oscillator per voice', (name) => {
    const { created, createContext } = fakeContextFactory()
    createWebAudioBus({ createContext }).play(name)

    const [context] = created
    expect(context?.oscillators).toHaveLength(RECIPES[name].length)
    for (const osc of context?.oscillators ?? []) {
      expect(osc.start).toHaveBeenCalledTimes(1)
      expect(osc.stop).toHaveBeenCalledTimes(1)
    }
  })

  it.each(SOUND_NAMES)('%s sets each voice frequency and waveform', (name) => {
    const { created, createContext } = fakeContextFactory()
    createWebAudioBus({ createContext }).play(name)

    RECIPES[name].forEach((voice, index) => {
      const osc = created[0]?.oscillators[index]
      expect(osc?.frequency.setValueAtTime).toHaveBeenCalledWith(voice.freq, 10 + voice.delay)
      expect(osc?.type).toBe(voice.type ?? 'sine')
    })
  })

  it('shapes each voice with an attack/decay envelope offset by its delay', () => {
    const { created, createContext } = fakeContextFactory()
    createWebAudioBus({ createContext }).play('correct')

    const second = RECIPES.correct[1]
    const startAt = 10 + (second?.delay ?? 0)
    const endAt = startAt + (second?.duration ?? 0)
    const gain = created[0]?.gains[1]?.gain
    expect(gain?.setValueAtTime).toHaveBeenCalledWith(0.0001, startAt)
    expect(gain?.exponentialRampToValueAtTime).toHaveBeenNthCalledWith(1, second?.peak, startAt + 0.015)
    expect(gain?.exponentialRampToValueAtTime).toHaveBeenNthCalledWith(2, 0.0001, endAt)

    const osc = created[0]?.oscillators[1]
    expect(osc?.start).toHaveBeenCalledWith(startAt)
    expect(osc?.stop).toHaveBeenCalledWith(endAt + 0.05)
    expect(osc?.connect).toHaveBeenCalledWith(created[0]?.gains[1])
    expect(created[0]?.gains[1]?.connect).toHaveBeenCalledWith(created[0]?.destination)
  })

  it('fluent is richer than correct (more oscillator voices)', () => {
    const { created, createContext } = fakeContextFactory()
    const bus = createWebAudioBus({ createContext })
    bus.play('correct')
    const correctVoices = created[0]?.oscillators.length ?? 0
    bus.play('fluent')
    const fluentVoices = (created[0]?.oscillators.length ?? 0) - correctVoices
    expect(fluentVoices).toBeGreaterThan(correctVoices)
  })

  it('wrong is a single soft sine that glides downward — never a buzzer', () => {
    const { created, createContext } = fakeContextFactory()
    createWebAudioBus({ createContext }).play('wrong')

    const [osc] = created[0]?.oscillators ?? []
    expect(created[0]?.oscillators).toHaveLength(1)
    expect(osc?.type).toBe('sine')
    const [glideTarget] = osc?.frequency.exponentialRampToValueAtTime.mock.calls[0] ?? []
    expect(glideTarget).toBeLessThan(311.13)
    const [peak] = created[0]?.gains[0]?.gain.exponentialRampToValueAtTime.mock.calls[0] ?? []
    expect(peak).toBeLessThan(0.15)
  })
})

describe('createWebAudioBus — context lifecycle', () => {
  it('muted plays nothing and never creates a context', () => {
    const { created, createContext } = fakeContextFactory()
    const bus = createWebAudioBus({ muted: true, createContext })
    bus.play('correct')
    bus.play('fluent')
    bus.play('wrong')
    expect(createContext).not.toHaveBeenCalled()
    expect(created).toHaveLength(0)
  })

  it('unmuting then playing creates exactly one context, reused on later plays', () => {
    const { created, createContext } = fakeContextFactory()
    const bus = createWebAudioBus({ muted: true, createContext })
    bus.play('correct')
    expect(created).toHaveLength(0)

    bus.setMuted(false)
    bus.play('tap')
    bus.play('hatch')
    bus.play('footstep')
    expect(createContext).toHaveBeenCalledTimes(1)
    expect(created).toHaveLength(1)
    expect(created[0]?.oscillators.length).toBe(
      RECIPES.tap.length + RECIPES.hatch.length + RECIPES.footstep.length,
    )
  })

  it('does not create a context until the first play', () => {
    const { createContext } = fakeContextFactory()
    createWebAudioBus({ createContext })
    expect(createContext).not.toHaveBeenCalled()
  })

  it('resumes a suspended context before playing', () => {
    const { created, createContext } = fakeContextFactory('suspended')
    createWebAudioBus({ createContext }).play('correct')
    expect(created[0]?.resume).toHaveBeenCalled()
    expect(created[0]?.oscillators).toHaveLength(RECIPES.correct.length)
  })

  it('leaves a running context alone', () => {
    const { created, createContext } = fakeContextFactory('running')
    createWebAudioBus({ createContext }).play('correct')
    expect(created[0]?.resume).not.toHaveBeenCalled()
  })

  it('reports and toggles mute state', () => {
    const bus = createWebAudioBus({ muted: true, createContext: () => null })
    expect(bus.isMuted()).toBe(true)
    bus.setMuted(false)
    expect(bus.isMuted()).toBe(false)
  })
})

describe('createWebAudioBus — best-effort failure', () => {
  it('is silent when createContext returns null', () => {
    const createContext = vi.fn(() => null)
    const bus = createWebAudioBus({ createContext })
    expect(() => bus.play('correct')).not.toThrow()
    expect(createContext).toHaveBeenCalled()
  })

  it('is silent when createContext throws, and later plays still do not throw', () => {
    const createContext = vi.fn((): AudioContext | null => {
      throw new Error('NotAllowedError')
    })
    const bus = createWebAudioBus({ createContext })
    expect(() => bus.play('correct')).not.toThrow()
    expect(() => bus.play('fluent')).not.toThrow()
    expect(createContext).toHaveBeenCalledTimes(2)
  })

  it('does not throw when a voice fails mid-play', () => {
    const { created, createContext } = fakeContextFactory()
    const bus = createWebAudioBus({ createContext })
    bus.play('tap')
    created[0]?.createOscillator.mockImplementationOnce(() => {
      throw new Error('device lost')
    })
    expect(() => bus.play('correct')).not.toThrow()
  })

  it('does not throw when resume() rejects', async () => {
    const { created, createContext } = fakeContextFactory('suspended')
    const bus = createWebAudioBus({ createContext })
    bus.play('tap')
    created[0]?.resume.mockImplementation(() => Promise.reject(new Error('blocked')))
    expect(() => bus.play('correct')).not.toThrow()
    // Let the rejected promise settle; an unhandled rejection would fail the run.
    await Promise.resolve()
  })
})

describe('createWebAudioBus — default browser context', () => {
  it('uses the global AudioContext when no factory is injected', () => {
    const instances: FakeContext[] = []
    vi.stubGlobal(
      'AudioContext',
      class extends FakeContext {
        constructor() {
          super()
          instances.push(this)
        }
      },
    )
    createWebAudioBus().play('correct')
    expect(instances).toHaveLength(1)
    expect(instances[0]?.oscillators).toHaveLength(RECIPES.correct.length)
  })

  it('never throws if no AudioContext global exists', () => {
    vi.stubGlobal('AudioContext', undefined)
    vi.stubGlobal('webkitAudioContext', undefined)
    const bus = createWebAudioBus()
    expect(() => bus.play('correct')).not.toThrow()
  })
})
