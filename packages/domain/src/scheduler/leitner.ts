import type { Box, Outcome } from '../facts/fact'
import { LEITNER_INTERVALS, MASTERY_BOX } from '../facts/tuning'

/** Box 0 (not yet introduced) re-queues like box 1. */
export function intervalFor(box: Box): number {
  return LEITNER_INTERVALS[box === 0 ? 1 : box]
}

/** The cast is safe: the clamp guarantees an integer in 0..MASTERY_BOX. */
export function clampBox(box: number): Box {
  return Math.max(0, Math.min(MASTERY_BOX, box)) as Box
}

/** FLUENT promotes, LABORED demotes (floor 1), WRONG resets to 1, SLOW holds. */
export function boxAfter(outcome: Outcome, previous: Box): Box {
  switch (outcome) {
    case 'FLUENT':
      return clampBox(previous + 1)
    case 'LABORED':
      return clampBox(Math.max(1, previous - 1))
    case 'WRONG':
      return 1
    case 'SLOW':
      return previous
  }
}

/**
 * SLOW keeps its box but comes back sooner: the smaller of the previous box's
 * interval and box 1's. Every other outcome re-queues at the new box's interval.
 */
export function requeueInterval(outcome: Outcome, previous: Box, next: Box): number {
  if (outcome === 'SLOW') return Math.min(intervalFor(previous), intervalFor(1))
  return intervalFor(next)
}
