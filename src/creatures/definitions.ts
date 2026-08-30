// Twelve farm animals, one per multiplication family. Storybook look, warm
// palette. Family 10 (Tenner) is the cold-start gift — a friendly cow.
import type { AnimalKind, CreatureParams, DefaultCreatureParams } from '@/contracts'
import { createRng } from '@/contracts'

type Def = { animal: AnimalKind; palette: [string, string, string]; eyeStyle: CreatureParams['eyeStyle'] }

export const HAND_TUNED_CREATURE_PARAMS: Readonly<Record<number, Def>> = {
  1: { animal: 'chick', palette: ['#FFD54F', '#FFF3C4', '#C98A2E'], eyeStyle: 'big' },
  2: { animal: 'duck', palette: ['#FFE082', '#FFF8E1', '#E0912F'], eyeStyle: 'sparkly' },
  3: { animal: 'rabbit', palette: ['#D7CCC8', '#FBEFEA', '#7C6A63'], eyeStyle: 'wide' },
  4: { animal: 'sheep', palette: ['#8D7B66', '#F5F0E6', '#4E4033'], eyeStyle: 'big' },
  5: { animal: 'pig', palette: ['#F4A7C0', '#FCE4EC', '#B23A69'], eyeStyle: 'sparkly' },
  6: { animal: 'cat', palette: ['#FFB74D', '#FFF3E0', '#7A4A24'], eyeStyle: 'sleepy' },
  7: { animal: 'dog', palette: ['#BCAAA4', '#EFEBE9', '#5D4037'], eyeStyle: 'big' },
  8: { animal: 'horse', palette: ['#A1887F', '#D7CCC8', '#4E342E'], eyeStyle: 'wide' },
  9: { animal: 'goat', palette: ['#CFC3B4', '#F0EAE0', '#5F5343'], eyeStyle: 'sparkly' },
  10: { animal: 'cow', palette: ['#F5E7C8', '#FFFBF0', '#6E5C3A'], eyeStyle: 'big' },
  11: { animal: 'goose', palette: ['#ECEFF1', '#FFFFFF', '#78909C'], eyeStyle: 'wide' },
  12: { animal: 'donkey', palette: ['#B0A79A', '#E8E3DA', '#4B4438'], eyeStyle: 'sleepy' },
}

const KINDS: AnimalKind[] = [
  'chick', 'duck', 'rabbit', 'sheep', 'pig', 'cat',
  'dog', 'horse', 'goat', 'cow', 'goose', 'donkey',
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
      `hsl(${hue} 55% 70%)`,
      `hsl(${hue} 45% 92%)`,
      `hsl(${hue} 40% 30%)`,
    ],
    eyeStyle: EYES[Math.floor(r() * EYES.length)],
  }
}

export const ALL_CREATURE_PARAMS: Record<number, CreatureParams> = Object.fromEntries(
  Array.from({ length: 12 }, (_, i) => [i + 1, defaultCreatureParams(i + 1)]),
)
