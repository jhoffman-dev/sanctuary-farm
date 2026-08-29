// Audio contract. Implementation owned by Track E (src/audio/sounds.ts).
// Phase 0 ships a STUB there.

export type SoundName =
  | 'correct'
  | 'fluent'
  | 'wrong'
  | 'hatch'
  | 'tap'
  | 'footstep'
  | 'doorOpen'
  | 'chew'

export interface AudioBus {
  play(name: SoundName): void
  setMuted(muted: boolean): void
  isMuted(): boolean
}

/** Web Audio synth bus. Lazily creates the AudioContext on first play (needs a
 *  user gesture). Track E implements; Phase 0 stubs with a no-op. */
export type CreateAudioBus = (opts?: { muted?: boolean }) => AudioBus
