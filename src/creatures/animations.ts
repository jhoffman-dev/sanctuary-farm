// Motion targets per mood. Consumers wrap <CreatureSVG> in a `motion` element
// and pass `animate={moodVariants[mood]}`. CreatureSVG itself stays pure SVG and
// draws the mood-specific face; these drive the body's movement.
//
// Each mood is deliberately distinct in *kind* of motion, not just amount:
//   idle     — a slow vertical breathe (looping)
//   happy    — a couple of springy hops
//   eating   — a quick chew bob with a tiny head waggle (looping)
//   puzzled  — a single head tilt that holds, then settles (curious, never sad)
//   sleeping — a long, gentle rise and fall (looping)
//
// Transitions are ≤ ~600 ms except the idle / sleeping / eating loops.
import type { CreatureMood } from '@/contracts'

export type MoodMotion = {
  animate: Record<string, number | number[]>
  transition: Record<string, unknown>
}

export const moodVariants: Record<CreatureMood, MoodMotion> = {
  idle: {
    animate: { y: [0, -1.5, 0], scaleY: [1, 1.03, 1], scaleX: [1, 0.985, 1], rotate: 0 },
    transition: { duration: 3.2, repeat: Infinity, ease: 'easeInOut' },
  },
  happy: {
    animate: { y: [0, -16, 0, -9, 0], scaleY: [1, 0.9, 1.04, 0.95, 1], rotate: 0 },
    transition: { duration: 0.6, repeat: 1, ease: 'easeOut' },
  },
  content: {
    animate: { y: [0, -1, 0], scaleY: [1, 1.02, 1], rotate: 0 },
    transition: { duration: 3.6, repeat: Infinity, ease: 'easeInOut' },
  },
  sad: {
    animate: { y: [0, 1.5, 0], scaleY: [1, 0.985, 1], rotate: 0 },
    transition: { duration: 4.2, repeat: Infinity, ease: 'easeInOut' },
  },
  eating: {
    animate: { y: [0, -2.5, 0], rotate: [0, -2.5, 2.5, 0], scaleY: [1, 0.97, 1] },
    transition: { duration: 0.36, repeat: Infinity, ease: 'easeInOut' },
  },
  puzzled: {
    animate: { rotate: [0, -10, -7, -9], x: [0, 2.5, 2, 2.5], y: 0 },
    transition: { duration: 0.55, ease: 'easeInOut' },
  },
  sleeping: {
    animate: { y: [0, 2.5, 0], scaleY: [1, 1.045, 1], rotate: 0 },
    transition: { duration: 4.4, repeat: Infinity, ease: 'easeInOut' },
  },
}

/** Transform origin that keeps every mood anchored to the creature's feet. */
export const MOOD_TRANSFORM_ORIGIN = '50% 92%'
