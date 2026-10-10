import { describe, expect, it } from 'vitest'
import { drive, withFacts } from '../../test/fixtures'
import type { Box, FactId } from '../facts/fact'
import { buildFacts, factsInTier } from '../facts/table'
import { MAX_TABLE_DEFAULT, MIN_TABLE } from '../facts/tuning'
import { createRng } from '../rng'
import { cardsInPlay } from './cards'
import { initialSchedulerState } from './state'
import { withUnlockedTiers } from './tiers'
import type { SchedulerState } from './types'

const SEED = 7
/**
 * Fluent cycles per fact. Seed 7 serves the whole table by 7.3 cycles per fact at 12×12 (the
 * worst size; 4.4 or fewer below it), so 16 keeps over 2× headroom without the cost of 40 (SF-81).
 */
const CYCLES_PER_FACT = 16

function everyFactAtBox(state: SchedulerState, box: Box): SchedulerState {
  return withFacts(state, Object.keys(state.facts), { box })
}

function servedFactIds(maxTable: number): Set<FactId> {
  const budget = maxTable * maxTable * CYCLES_PER_FACT
  const { trace } = drive(initialSchedulerState(maxTable), createRng(SEED), budget)
  return new Set(trace.map((cycle) => cycle.factId))
}

describe('withUnlockedTiers', () => {
  it('does not let a tier with no facts in play wall off the tiers above it', () => {
    // An 8×8 table has no "has a 9" fact at all, so tier 4 can never reach box 3.
    expect(factsInTier(4, 8)).toHaveLength(0)
    const state = everyFactAtBox(initialSchedulerState(8), 3)

    const unlocked = withUnlockedTiers(state, cardsInPlay(state)).unlockedTiers

    expect(unlocked).toContain(5)
  })

  it('still holds a tier back while its own facts sit below box 3', () => {
    const state = everyFactAtBox(initialSchedulerState(12), 1)

    const unlocked = withUnlockedTiers(state, cardsInPlay(state)).unlockedTiers

    expect(unlocked).toEqual([1])
  })
})

describe('introduction reaches the whole table', () => {
  it('serves every fact of an 8×8 table, including 6×7 and 7×8', () => {
    const served = servedFactIds(8)

    expect(served.size).toBe(64)
    for (const id of ['6x7', '7x6', '6x8', '8x6', '7x8', '8x7']) expect(served).toContain(id)
  })

  const tables = Array.from(
    { length: MAX_TABLE_DEFAULT - MIN_TABLE + 1 },
    (_, index) => MIN_TABLE + index,
  )

  it.each(tables)('serves every fact of a table up to %i', (maxTable) => {
    const served = servedFactIds(maxTable)

    expect([...served].toSorted()).toEqual(buildFacts(maxTable).map((fact) => fact.id).toSorted())
  })
})
