import { describe, expect, it } from 'vitest'
import { createSilentAudioBus } from './silent-audio-bus'

describe('createSilentAudioBus', () => {
  it('is unmuted by default and honours the muted option', () => {
    expect(createSilentAudioBus().isMuted()).toBe(false)
    expect(createSilentAudioBus({ muted: true }).isMuted()).toBe(true)
  })

  it('round-trips mute state', () => {
    const bus = createSilentAudioBus()
    bus.setMuted(true)
    expect(bus.isMuted()).toBe(true)
    bus.setMuted(false)
    expect(bus.isMuted()).toBe(false)
  })

  it('plays nothing and never throws, muted or not', () => {
    const bus = createSilentAudioBus()
    expect(() => bus.play('fluent')).not.toThrow()
    bus.setMuted(true)
    expect(() => bus.play('wrong')).not.toThrow()
  })
})
