// STUB — Track D replaces with real motion variants per mood.
import type { CreatureMood } from '@/contracts'

/** Framer Motion (`motion`) variants keyed by mood. */
export const moodVariants: Record<CreatureMood, object> = {
  idle: { scale: [1, 1.03, 1], transition: { duration: 2.4, repeat: Infinity } },
  happy: { y: [0, -8, 0], transition: { duration: 0.5, repeat: 2 } },
  eating: { rotate: [0, -3, 3, 0], transition: { duration: 0.4, repeat: Infinity } },
  puzzled: { rotate: [0, 8, 0], transition: { duration: 0.6 } },
  sleeping: { scale: [1, 1.01, 1], transition: { duration: 4, repeat: Infinity } },
}
