import type { Fact } from '../facts/fact'
import { INTERLEAVE_MAX_CONSECUTIVE } from '../facts/tuning'
import type { Card } from './cards'
import type { NextFact, SchedulerState } from './types'

/** Enough history to detect a run of INTERLEAVE_MAX_CONSECUTIVE with room to spare. */
const RECENT_FAMILIES_KEEP = 4

/** The family that would make one-too-many in a row, or null if none is blocked. */
export function blockedFamily(state: SchedulerState): number | null {
  const recent = state.recentFamilies
  if (recent.length < INTERLEAVE_MAX_CONSECUTIVE) return null
  const run = recent.slice(-INTERLEAVE_MAX_CONSECUTIVE)
  const [first] = run
  return first !== undefined && run.every((family) => family === first) ? first : null
}

/**
 * Drop candidates of the blocked family. If that would leave nothing, relax and
 * return the input unchanged — a single-family board cannot interleave.
 */
export function avoidingFamily(cards: readonly Card[], blocked: number | null): readonly Card[] {
  if (blocked === null) return cards
  const kept = cards.filter((card) => card.fact.family !== blocked)
  return kept.length > 0 ? kept : cards
}

/** Record the served fact in the interleave history and hand it out. */
export function serve(state: SchedulerState, fact: Fact): NextFact {
  const recentFamilies = [...state.recentFamilies, fact.family].slice(-RECENT_FAMILIES_KEEP)
  return { fact, state: { ...state, recentFamilies, lastServed: fact.id } }
}
