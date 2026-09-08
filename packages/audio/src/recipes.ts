// Every sound is a short stack of enveloped oscillator voices — no audio files.
// The numbers are tuned by ear; change them deliberately, not incidentally.
import type { SoundName } from '@sf/application'

export interface Voice {
  /** Hz */
  freq: number
  /** seconds after play() */
  delay: number
  /** seconds */
  duration: number
  type?: OscillatorType
  /** peak gain (0..1) */
  peak?: number
  /** optional exponential pitch glide target, Hz */
  glideTo?: number
}

// `fluent` is deliberately the richest recipe: the `correct` chime plus a third
// note and two shimmering overtones, so it reads as clearly better than `correct`.
export const RECIPES: Record<SoundName, readonly Voice[]> = {
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
