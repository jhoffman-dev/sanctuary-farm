// STUB — Track E replaces with real Web Audio oscillator synthesis.
import type { AudioBus, CreateAudioBus } from '@/contracts'

export const createAudioBus: CreateAudioBus = (opts) => {
  let muted = opts?.muted ?? false
  const bus: AudioBus = {
    play: (name) => {
      if (muted) return
      if (import.meta.env.DEV) console.debug('[audio stub] play', name)
    },
    setMuted: (m) => {
      muted = m
    },
    isMuted: () => muted,
  }
  return bus
}
