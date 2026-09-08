import type { AudioBus } from '@sf/application'

export interface SilentAudioBusOptions {
  muted?: boolean
}

/**
 * An AudioBus that plays nothing but still tracks mute state, so the mute
 * toggle keeps working when audio is unavailable (tests, SSR, no Web Audio).
 */
export function createSilentAudioBus(options: SilentAudioBusOptions = {}): AudioBus {
  let muted = options.muted ?? false
  return {
    play: () => undefined,
    setMuted: (next) => {
      muted = next
    },
    isMuted: () => muted,
  }
}
