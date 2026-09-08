import type { AudioBus } from '@sf/application'
import { RECIPES, type Voice } from './recipes'

export interface WebAudioBusOptions {
  muted?: boolean
  /**
   * How to obtain an AudioContext. Defaults to the browser's global
   * (`AudioContext` / `webkitAudioContext`); return null when none is available.
   * Injected so tests can observe the synth without a real audio device.
   */
  createContext?: () => AudioContext | null
}

const DEFAULT_PEAK = 0.15
const ATTACK_SECONDS = 0.015
/** Exponential ramps can't reach 0, so this is "silent". */
const SILENCE = 0.0001
/** Keep the oscillator alive briefly past the envelope so the tail isn't clipped. */
const RELEASE_TAIL_SECONDS = 0.05
/** Exponential ramps also can't target 0 Hz. */
const MIN_GLIDE_HZ = 1

function createBrowserContext(): AudioContext | null {
  const scope = globalThis as {
    AudioContext?: typeof AudioContext
    webkitAudioContext?: typeof AudioContext
  }
  const Ctor = scope.AudioContext ?? scope.webkitAudioContext
  return Ctor ? new Ctor() : null
}

function playVoice(context: AudioContext, voice: Voice): void {
  const osc = context.createOscillator()
  const gain = context.createGain()
  const startAt = context.currentTime + voice.delay
  const endAt = startAt + voice.duration

  osc.type = voice.type ?? 'sine'
  osc.frequency.setValueAtTime(voice.freq, startAt)
  if (voice.glideTo != null) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(MIN_GLIDE_HZ, voice.glideTo), endAt)
  }
  gain.gain.setValueAtTime(SILENCE, startAt)
  gain.gain.exponentialRampToValueAtTime(voice.peak ?? DEFAULT_PEAK, startAt + ATTACK_SECONDS)
  gain.gain.exponentialRampToValueAtTime(SILENCE, endAt)

  osc.connect(gain).connect(context.destination)
  osc.start(startAt)
  osc.stop(endAt + RELEASE_TAIL_SECONDS)
}

export function createWebAudioBus(options: WebAudioBusOptions = {}): AudioBus {
  let muted = options.muted ?? false
  const createContext = options.createContext ?? createBrowserContext
  let context: AudioContext | null = null

  // Created lazily on the first un-muted play: an AudioContext needs a user
  // gesture, and a muted player should never be asked for one. A failed
  // creation leaves `context` null so the next play retries — the failure may
  // have been transient (e.g. too early in the page's life).
  const acquireContext = (): AudioContext | null => {
    context ??= createContext()
    if (context?.state === 'suspended') {
      // Browsers suspend contexts created before a gesture; resuming is
      // best-effort and its rejection is not something the game can act on.
      context.resume().catch(() => undefined)
    }
    return context
  }

  return {
    play: (name) => {
      if (muted) return
      try {
        const active = acquireContext()
        if (!active) return
        for (const voice of RECIPES[name]) playVoice(active, voice)
      } catch {
        // Audio is best-effort: a missing device, a throwing constructor or a
        // failed voice must never disrupt the game.
      }
    },
    setMuted: (next) => {
      muted = next
    },
    isMuted: () => muted,
  }
}
