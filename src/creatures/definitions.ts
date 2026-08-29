// Twelve hand-tuned procedural creatures, one per multiplication family.
// Soft-vector storybook look: three warm, readable colours each
// (body / belly / dark accent), distinct silhouettes and faces.
import type { CreatureParams, DefaultCreatureParams } from '@/contracts'

/**
 * Hand-tuned parameter sets. Every family gets a different combination of
 * silhouette, palette, ears, eyes, pattern and tail so no two read alike and
 * none looks unfinished. Family 10 (`Tenner`) is the cold-start gift — warm
 * gold, floppy ears, star on the belly: the friendliest of the set.
 */
export const HAND_TUNED_CREATURE_PARAMS: Readonly<Record<number, CreatureParams>> = {
  // 1 — Pip: a tiny honey-yellow dumpling.
  1: {
    bodyShape: 'round',
    palette: ['#F6D365', '#FFF3D6', '#C98A2E'],
    earType: 'round',
    eyeStyle: 'big',
    pattern: 'none',
    tail: 'puff',
  },
  // 2 — Dobble: a tall mint fellow with a long tail and freckles.
  2: {
    bodyShape: 'tall',
    palette: ['#7FD1C1', '#E8F7F2', '#3E8C7C'],
    earType: 'floppy',
    eyeStyle: 'wide',
    pattern: 'spots',
    tail: 'long',
  },
  // 3 — Trefoil: a broad leaf-green sprite, star-marked, with a curly tail.
  3: {
    bodyShape: 'wide',
    palette: ['#9CCC7A', '#EAF6DF', '#4E8B3D'],
    earType: 'pointy',
    eyeStyle: 'sparkly',
    pattern: 'star',
    tail: 'curl',
  },
  // 4 — Quill: a lumpy apricot critter with antennae and tiger stripes.
  4: {
    bodyShape: 'lumpy',
    palette: ['#F0A868', '#FCE8D6', '#B5632C'],
    earType: 'antenna',
    eyeStyle: 'big',
    pattern: 'stripes',
    tail: 'none',
  },
  // 5 — Cinq: a round lavender dreamer, sleepy-eyed, star-dusted.
  5: {
    bodyShape: 'round',
    palette: ['#C3A6E0', '#F2E9FB', '#7B5AA6'],
    earType: 'round',
    eyeStyle: 'sleepy',
    pattern: 'star',
    tail: 'curl',
  },
  // 6 — Hexley: a wide rosy-brown character with pointy ears and spots.
  6: {
    bodyShape: 'wide',
    palette: ['#D98E7A', '#FBE6DF', '#9C4F3C'],
    earType: 'pointy',
    eyeStyle: 'wide',
    pattern: 'spots',
    tail: 'puff',
  },
  // 7 — Sept: a tall dusty-blue creature, sparkly-eyed, pin-striped.
  7: {
    bodyShape: 'tall',
    palette: ['#8FB3D9', '#E6EFF8', '#4A6E96'],
    earType: 'floppy',
    eyeStyle: 'sparkly',
    pattern: 'stripes',
    tail: 'long',
  },
  // 8 — Otto: a lumpy coral blob with big eyes and a curly tail.
  8: {
    bodyShape: 'lumpy',
    palette: ['#F2A0A0', '#FCE4E4', '#B85C5C'],
    earType: 'round',
    eyeStyle: 'big',
    pattern: 'spots',
    tail: 'curl',
  },
  // 9 — Nova: a round periwinkle creature with antennae and a starry back.
  9: {
    bodyShape: 'round',
    palette: ['#A5A8E0', '#E9EAFB', '#5A5EA6'],
    earType: 'antenna',
    eyeStyle: 'sparkly',
    pattern: 'star',
    tail: 'long',
  },
  // 10 — Tenner: THE GIFT. Warm gold, cream belly, floppy ears, big kind eyes,
  //      a star on the chest and a soft puff tail.
  10: {
    bodyShape: 'round',
    palette: ['#F7C873', '#FFF6E4', '#C77E3A'],
    earType: 'floppy',
    eyeStyle: 'big',
    pattern: 'star',
    tail: 'puff',
  },
  // 11 — Elvin: a tall sage-olive sprite with pointy ears and stripes.
  11: {
    bodyShape: 'tall',
    palette: ['#B7C98A', '#EEF3DE', '#6E8248'],
    earType: 'pointy',
    eyeStyle: 'wide',
    pattern: 'stripes',
    tail: 'curl',
  },
  // 12 — Dozen: a broad russet bruiser, sleepy-eyed and spotted.
  12: {
    bodyShape: 'wide',
    palette: ['#D98452', '#F6DEC9', '#8F4A28'],
    earType: 'round',
    eyeStyle: 'sleepy',
    pattern: 'spots',
    tail: 'long',
  },
}

const BODY: CreatureParams['bodyShape'][] = ['round', 'tall', 'wide', 'lumpy']
const EAR: CreatureParams['earType'][] = ['none', 'pointy', 'floppy', 'round', 'antenna']
const EYE: CreatureParams['eyeStyle'][] = ['big', 'sleepy', 'sparkly', 'wide']
const PAT: CreatureParams['pattern'][] = ['none', 'spots', 'stripes', 'star']
const TAIL: CreatureParams['tail'][] = ['none', 'puff', 'long', 'curl']

/** Deterministic fallback for families outside 1..12 (keeps the type total). */
function proceduralParams(family: number): CreatureParams {
  let s = (family * 2654435761) >>> 0
  const rand = () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const pick = <T,>(xs: T[]): T => xs[Math.floor(rand() * xs.length)]
  const hue = Math.floor(rand() * 360)
  return {
    bodyShape: pick(BODY),
    palette: [
      `hsl(${hue} 68% 72%)`,
      `hsl(${hue} 70% 92%)`,
      `hsl(${(hue + 8) % 360} 45% 38%)`,
    ],
    earType: pick(EAR),
    eyeStyle: pick(EYE),
    pattern: pick(PAT),
    tail: pick(TAIL),
  }
}

/** Deterministic params for a family. 1..12 are hand-tuned; others fall back. */
export const defaultCreatureParams: DefaultCreatureParams = (family) =>
  HAND_TUNED_CREATURE_PARAMS[family] ?? proceduralParams(family)

export const ALL_CREATURE_PARAMS: Record<number, CreatureParams> = Object.fromEntries(
  Array.from({ length: 12 }, (_, i) => [i + 1, defaultCreatureParams(i + 1)]),
)
