// Web Audio oscillator synthesis for Sanctuary Farm. No audio files — every
// sound is a short stack of enveloped oscillator voices built here.
import type { AudioBus, CreateAudioBus, SoundName } from '@/contracts'

type Voice = {
  freq: number
  /** seconds after play() */
  delay: number
  /** seconds */
  duration: number
  type?: OscillatorType
  /** peak gain (0..1) */
  peak?: number
  /** optional exponential pitch glide target */
  glideTo?: number
}

// `fluent` is deliberately the richest recipe: the `correct` chime plus a third
// note and two shimmering overtones, so it reads as clearly better than `correct`.
const RECIPES: Record<SoundName, Voice[]> = {
  correct: [
    { freq: 523.25, delay: 0, duration: 0.14, peak: 0.16 },
    { freq: 659.25, delay: 0.1, duration: 0.18, peak: 0.16 },
  ],
  fluent: [
    { freq: 523.25, delay: 0, duration: 0.14, peak: 0.16 },
    { freq: 659.25, delay: 0.09, duration: 0.16, peak: 0.16 },
    { freq: 783.99, delay: 0.18, duration: 0.3, peak: 0.17 },
    { freq: 1567.98, delay: 0.2, duration: 0.34, type: 'triangle', peak: 0.06 },
    { freq: 2093.0, delay: 0.27, duration: 0.28, type: 'triangle', peak: 0.04 },
  ],
  wrong: [
    // Soft, neutral, low — a gentle downward sigh. Never a buzzer.
    { freq: 311.13, delay: 0, duration: 0.34, type: 'sine', peak: 0.1, glideTo: 261.63 },
  ],
  hatch: [
    { freq: 523.25, delay: 0, duration: 0.12, peak: 0.14 },
    { freq: 659.25, delay: 0.1, duration: 0.12, peak: 0.14 },
    { freq: 783.99, delay: 0.2, duration: 0.12, peak: 0.14 },
    { freq: 1046.5, delay: 0.3, duration: 0.26, peak: 0.15 },
  ],
  tap: [{ freq: 660, delay: 0, duration: 0.05, type: 'triangle', peak: 0.12 }],
  footstep: [{ freq: 120, delay: 0, duration: 0.07, type: 'sine', peak: 0.12, glideTo: 80 }],
  doorOpen: [{ freq: 220, delay: 0, duration: 0.3, type: 'triangle', peak: 0.08, glideTo: 110 }],
  chew: [
    { freq: 90, delay: 0, duration: 0.04, type: 'triangle', peak: 0.1 },
    { freq: 84, delay: 0.08, duration: 0.04, type: 'triangle', peak: 0.09 },
  ],
}

function playVoice(ac: AudioContext, v: Voice): void {
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  const t0 = ac.currentTime + v.delay
  const peak = v.peak ?? 0.15
  osc.type = v.type ?? 'sine'
  osc.frequency.setValueAtTime(v.freq, t0)
  if (v.glideTo != null) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, v.glideTo), t0 + v.duration)
  }
  gain.gain.setValueAtTime(0.0001, t0)
  gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.015)
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + v.duration)
  osc.connect(gain).connect(ac.destination)
  osc.start(t0)
  osc.stop(t0 + v.duration + 0.05)
}

export const createAudioBus: CreateAudioBus = (opts) => {
  let muted = opts?.muted ?? false
  let ctx: AudioContext | null = null

  // Lazily created on first play — an AudioContext needs a user gesture.
  const context = (): AudioContext | null => {
    if (!ctx) {
      const scope = globalThis as {
        AudioContext?: typeof AudioContext
        webkitAudioContext?: typeof AudioContext
      }
      const Ctor = scope.AudioContext ?? scope.webkitAudioContext
      if (!Ctor) return null
      try {
        ctx = new Ctor()
      } catch {
        ctx = null
        return null
      }
    }
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  }

  const bus: AudioBus = {
    play: (name) => {
      if (muted) return
      try {
        const ac = context()
        if (!ac) return
        for (const voice of RECIPES[name]) playVoice(ac, voice)
      } catch {
        /* audio is best-effort — never let it disrupt the game */
      }
    },
    setMuted: (m) => {
      muted = m
    },
    isMuted: () => muted,
  }
  return bus
}
