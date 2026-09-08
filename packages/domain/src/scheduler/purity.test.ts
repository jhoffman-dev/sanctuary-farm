import { describe, expect, it } from 'vitest'
import { deepFreeze, drive, withFact } from '../../test/fixtures'
import { emptyFarmSave } from '../save/empty'
import { buyFeedBundle } from '../economy/coins'
import { createRng } from '../rng'
import { gradeAnswer } from './grade'
import { nextFact, nextFactInFamily } from './next'
import { familyProgress, isFamilyMastered } from './progress'
import { initialSchedulerState } from './state'
import type { SchedulerState } from './types'

describe('purity — inputs are never mutated', () => {
  it('nextFact, nextFactInFamily and gradeAnswer leave a frozen state untouched', () => {
    const played = drive(initialSchedulerState(), createRng(3), 40).state
    const state = deepFreeze(withFact(played, '7x8', { box: 1 }))
    const snapshot = JSON.parse(JSON.stringify(state)) as SchedulerState

    const mixed = nextFact(state, createRng(1))
    const family = nextFactInFamily(state, 8, createRng(1))
    gradeAnswer(state, { factId: '7x8', given: 56, latencyMs: 900 })
    gradeAnswer(state, { factId: '7x8', given: 0, latencyMs: 900 })
    familyProgress(state, 8)
    isFamilyMastered(state, 8)

    expect(state).toEqual(snapshot)
    expect(mixed.state).not.toBe(state)
    expect(family.state).not.toBe(state)
  })

  it('a long driven run never mutates any intermediate state', () => {
    let state = deepFreeze(initialSchedulerState())
    const rng = createRng(99)
    for (let i = 0; i < 120; i++) {
      const served = nextFact(state, rng)
      const graded = gradeAnswer(served.state, {
        factId: served.fact.id,
        given: i % 6 === 0 ? 0 : served.fact.answer,
        latencyMs: i % 4 === 0 ? 6000 : 1200,
      })
      state = deepFreeze(graded.state)
    }
    expect(state.globalCounter).toBe(120)
  })

  it('buyFeedBundle returns a new save and leaves the old one alone', () => {
    const farm = deepFreeze({ ...emptyFarmSave(), coins: 10 })
    const bought = buyFeedBundle(farm)
    expect(bought.ok).toBe(true)
    expect(farm.coins).toBe(10)
    expect(farm.feed).toBe(12)
  })
})
