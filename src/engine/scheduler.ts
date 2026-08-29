// STUB — Track A replaces this with the real Leitner/latency engine.
// Signatures and return shapes here are load-bearing: keep them.

import {
  COLD_START_FAMILIES,
  FLUENT_MAX_MS,
  LABORED_MIN_MS,
  MASTERY_BOX,
  MAX_RECENT_LATENCIES,
  MAX_TABLE_DEFAULT,
  systemRng,
} from '@/contracts'
import type {
  Fact,
  FactState,
  GradeResult,
  Outcome,
  Scheduler,
  SchedulerDeps,
  SchedulerState,
} from '@/contracts'
import { ALL_FACTS, buildFacts, getFact } from './facts'

function freshFactState(id: string, introduced: boolean): FactState {
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

/** STUB: introduces the Anchors families so consumers have something to show. */
export function initialSchedulerState(maxTable: number = MAX_TABLE_DEFAULT): SchedulerState {
  const facts: Record<string, FactState> = {}
  for (const f of buildFacts(maxTable)) {
    facts[f.id] = freshFactState(f.id, COLD_START_FAMILIES.includes(f.family))
  }
  return {
    facts,
    globalCounter: 0,
    unlockedTiers: [1],
    recentFamilies: [],
    maxTable,
  }
}

export function createScheduler(
  state: SchedulerState,
  deps?: Partial<SchedulerDeps>,
): Scheduler {
  const rng = deps?.rng ?? systemRng
  let lastServed: Fact = ALL_FACTS[0]

  const introduced = () =>
    ALL_FACTS.filter((f) => state.facts[f.id]?.introduced && f.a <= state.maxTable && f.b <= state.maxTable)

  return {
    next(): Fact {
      const pool = introduced()
      lastServed = pool[Math.floor(rng() * pool.length)] ?? ALL_FACTS[0]
      return lastServed
    },

    grade(id: string, given: number, latencyMs: number): GradeResult {
      const fact = getFact(id) ?? lastServed
      const fs = state.facts[fact.id]
      const correct = given === fact.answer
      let outcome: Outcome
      if (!correct) outcome = 'WRONG'
      else if (latencyMs < FLUENT_MAX_MS) outcome = 'FLUENT'
      else if (latencyMs <= LABORED_MIN_MS) outcome = 'SLOW'
      else outcome = 'LABORED'

      const previousBox: number = fs.box
      let newBox: number = previousBox
      if (outcome === 'FLUENT') newBox = Math.min(MASTERY_BOX, previousBox + 1)
      else if (outcome === 'LABORED') newBox = Math.max(1, previousBox - 1)
      else if (outcome === 'WRONG') newBox = 1

      fs.box = newBox as FactState['box']
      fs.lastLatencyMs = latencyMs
      fs.recentLatencies = [...fs.recentLatencies, latencyMs].slice(-MAX_RECENT_LATENCIES)
      fs.correctStreak = correct ? fs.correctStreak + 1 : 0
      fs.totalAttempts += 1
      if (correct) fs.totalCorrect += 1
      state.globalCounter += 1
      state.recentFamilies = [...state.recentFamilies, fact.family].slice(-4)

      return {
        outcome,
        correct,
        fact,
        correctAnswer: fact.answer,
        previousBox,
        newBox,
        factMastered: false,
        familyJustMastered: null,
      }
    },

    familyProgress(family: number): number {
      const fs = ALL_FACTS.filter((f) => f.family === family).map((f) => state.facts[f.id])
      if (fs.length === 0) return 0
      const atBox3 = fs.filter((s) => s.box >= 3).length
      return Math.min(0.98, atBox3 / fs.length)
    },

    isMastered(_family: number): boolean {
      return false
    },

    snapshot(): SchedulerState {
      return structuredClone(state)
    },
  }
}
