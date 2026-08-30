// Twelve baby farm animals, one per multiplication family. Chibi storybook look:
// big round head, tiny body, warm palette. Family 10 (Tenner) is the cold-start
// gift — a friendly butter-yellow calf.
import type { AnimalKind, CreatureParams, DefaultCreatureParams } from '@/contracts'
import { createRng } from '@/contracts'

type Def = { animal: AnimalKind; palette: [string, string, string]; eyeStyle: CreatureParams['eyeStyle'] }

export const HAND_TUNED_CREATURE_PARAMS: Readonly<Record<number, Def>> = {
  1: { animal: 'chick', palette: ['#FFD54F', '#FFF3C4', '#C98A2E'], eyeStyle: 'big' },
  2: { animal: 'duckling', palette: ['#FFE082', '#FFF8E1', '#E0912F'], eyeStyle: 'sparkly' },
  3: { animal: 'bunny', palette: ['#D7CCC8', '#FBEFEA', '#7C6A63'], eyeStyle: 'wide' },
  4: { animal: 'lamb', palette: ['#F5F0E6', '#FFFFFF', '#8D7B66'], eyeStyle: 'big' },
  5: { animal: 'piglet', palette: ['#F8BBD0', '#FCE4EC', '#C2185B'], eyeStyle: 'sparkly' },
  6: { animal: 'kitten', palette: ['#FFCC80', '#FFF3E0', '#8D5524'], eyeStyle: 'sleepy' },
  7: { animal: 'puppy', palette: ['#BCAAA4', '#EFEBE9', '#5D4037'], eyeStyle: 'big' },
  8: { animal: 'foal', palette: ['#A1887F', '#D7CCC8', '#4E342E'], eyeStyle: 'wide' },
  9: { animal: 'fawn', palette: ['#D2A679', '#F0E0CC', '#6D4C33'], eyeStyle: 'sparkly' },
  10: { animal: 'calf', palette: ['#FFE0A3', '#FFF6E5', '#8D6E3A'], eyeStyle: 'big' },
  11: { animal: 'gosling', palette: ['#DCE775', '#F9FBE7', '#827717'], eyeStyle: 'wide' },
  12: { animal: 'kid', palette: ['#B0BEC5', '#ECEFF1', '#455A64'], eyeStyle: 'sleepy' },
}

// Fixed order so a family outside 1..12 still resolves deterministically.
const KINDS: AnimalKind[] = [
  'chick', 'duckling', 'bunny', 'lamb', 'piglet', 'kitten',
  'puppy', 'foal', 'fawn', 'calf', 'gosling', 'kid',
]
const EYES: CreatureParams['eyeStyle'][] = ['big', 'sleepy', 'sparkly', 'wide']

export const defaultCreatureParams: DefaultCreatureParams = (family) => {
  const tuned = HAND_TUNED_CREATURE_PARAMS[family]
  if (tuned) return { ...tuned }
  const r = createRng(family * 2654435761)
  const hue = Math.floor(r() * 360)
  return {
    animal: KINDS[Math.floor(r() * KINDS.length)],
    palette: [
      `hsl(${hue} 70% 72%)`,
      `hsl(${hue} 60% 92%)`,
      `hsl(${hue} 45% 32%)`,
    ],
    eyeStyle: EYES[Math.floor(r() * EYES.length)],
  }
}

export const ALL_CREATURE_PARAMS: Record<number, CreatureParams> = Object.fromEntries(
  Array.from({ length: 12 }, (_, i) => [i + 1, defaultCreatureParams(i + 1)]),
)
