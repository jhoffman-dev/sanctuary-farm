export type SoundName =
  | 'correct'
  | 'fluent'
  | 'wrong'
  | 'hatch'
  | 'tap'
  | 'footstep'
  | 'doorOpen'
  | 'chew'

/** Sound output. Best-effort: a bus that can't play must fail silently, never throw. */
export interface AudioBus {
  play(name: SoundName): void
  setMuted(muted: boolean): void
  isMuted(): boolean
}
