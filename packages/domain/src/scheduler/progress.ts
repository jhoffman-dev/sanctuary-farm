import type { FactState } from '../facts/fact'
import { factsInFamily } from '../facts/table'
import { FLUENT_MAX_MS, MASTERY_BOX, MASTERY_RECENT_FLUENT_COUNT } from '../facts/tuning'
import type { SchedulerState } from './types'

/** Progress can show "almost" but never 1.0 until the family is truly mastered. */
const UNMASTERED_PROGRESS_CAP = 0.98
const PROGRESS_BOX = 3

/** Mastered = at the mastery box with the last few answers all fluent. */
export function isFactMastered(status: FactState | undefined): boolean {
  if (!status || status.box !== MASTERY_BOX) return false
  const recent = status.recentLatencies.slice(-MASTERY_RECENT_FLUENT_COUNT)
  return recent.length >= MASTERY_RECENT_FLUENT_COUNT && recent.every((ms) => ms < FLUENT_MAX_MS)
}

export function isFamilyMastered(state: SchedulerState, family: number): boolean {
  const facts = factsInFamily(family, state.maxTable)
  if (facts.length === 0) return false
  return facts.every((fact) => isFactMastered(state.facts[fact.id]))
}

/** Share of the family at box 3+, capped below 1.0 until every fact is mastered. */
export function familyProgress(state: SchedulerState, family: number): number {
  const facts = factsInFamily(family, state.maxTable)
  if (facts.length === 0) return 0
  if (isFamilyMastered(state, family)) return 1
  const atBox3 = facts.filter((fact) => (state.facts[fact.id]?.box ?? 0) >= PROGRESS_BOX).length
  return Math.min(atBox3 / facts.length, UNMASTERED_PROGRESS_CAP)
}
