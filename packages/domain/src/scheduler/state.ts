import type { FactId, FactState } from '../facts/fact'
import { buildFacts } from '../facts/table'
import { COLD_START_FAMILIES, MAX_TABLE_DEFAULT } from '../facts/tuning'
import type { SchedulerState } from './types'

function freshFactState(id: FactId, introduced: boolean): FactState {
  return {
    id,
    box: introduced ? 1 : 0,
    dueAt: 0,
    lastLatencyMs: null,
    recentLatencies: [],
    correctStreak: 0,
    totalAttempts: 0,
    totalCorrect: 0,
    introduced,
  }
}

/**
 * Fresh state: every in-range fact created, only the Anchors tier unlocked, and
 * the cold-start families already introduced at box 1 and due now. Throws a
 * RangeError (from buildFacts) for a table size outside MIN_TABLE..MAX_TABLE_DEFAULT.
 */
export function initialSchedulerState(maxTable: number = MAX_TABLE_DEFAULT): SchedulerState {
  const facts: Record<FactId, FactState> = {}
  for (const fact of buildFacts(maxTable)) {
    facts[fact.id] = freshFactState(fact.id, COLD_START_FAMILIES.includes(fact.family))
  }
  return {
    facts,
    globalCounter: 0,
    unlockedTiers: [1],
    recentFamilies: [],
    lastServed: null,
    commuteCredit: {},
    maxTable,
  }
}
