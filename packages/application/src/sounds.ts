import type { Outcome } from '@sf/domain'
import type { AudioBus, SoundName } from './ports/audio-bus'

export function soundForOutcome(outcome: Outcome): SoundName {
  switch (outcome) {
    case 'FLUENT':
      return 'fluent'
    case 'SLOW':
    case 'LABORED':
      return 'correct'
    case 'WRONG':
      return 'wrong'
  }
}

type GradedMoment = {
  outcome: Outcome
  familyJustMastered: number | null
}

/** The outcome's sound, plus the hatch fanfare when this answer finished a family. */
export function playGradedSounds(audio: AudioBus, moment: GradedMoment): void {
  audio.play(soundForOutcome(moment.outcome))
  if (moment.familyJustMastered !== null) audio.play('hatch')
}
