// STUB — Track D replaces with 12 hand-tuned procedural creature definitions.
import { createRng } from '@/contracts'
import type { CreatureParams, DefaultCreatureParams } from '@/contracts'

const BODY: CreatureParams['bodyShape'][] = ['round', 'tall', 'wide', 'lumpy']
const EAR: CreatureParams['earType'][] = ['none', 'pointy', 'floppy', 'round', 'antenna']
const EYE: CreatureParams['eyeStyle'][] = ['big', 'sleepy', 'sparkly', 'wide']
const PAT: CreatureParams['pattern'][] = ['none', 'spots', 'stripes', 'star']
const TAIL: CreatureParams['tail'][] = ['none', 'puff', 'long', 'curl']

export const defaultCreatureParams: DefaultCreatureParams = (family) => {
  const r = createRng(family * 2654435761)
  const pick = <T,>(xs: T[]): T => xs[Math.floor(r() * xs.length)]
  const hue = Math.floor(r() * 360)
  return {
    bodyShape: pick(BODY),
    palette: [
      `hsl(${hue} 65% 70%)`,
      `hsl(${(hue + 30) % 360} 60% 55%)`,
      `hsl(${(hue + 200) % 360} 55% 40%)`,
    ],
    earType: pick(EAR),
    eyeStyle: pick(EYE),
    pattern: pick(PAT),
    tail: pick(TAIL),
  }
}

export const ALL_CREATURE_PARAMS: Record<number, CreatureParams> = Object.fromEntries(
  Array.from({ length: 12 }, (_, i) => [i + 1, defaultCreatureParams(i + 1)]),
)
