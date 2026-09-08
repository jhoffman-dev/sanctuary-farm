import { describe, expect, it } from 'vitest'
import { introducedIds, withFact, withFacts } from '../../test/fixtures'
import { factsInFamily } from '../facts/table'
import { EGG_ROTATION } from '../facts/tuning'
import { createRng } from '../rng'
import { gradeAnswer } from './grade'
import { nextFactInFamily } from './next'
import { familyProgress, isFamilyMastered } from './progress'
import { initialSchedulerState } from './state'
import type { SchedulerState } from './types'

const FAMILY = 3
const familyIds = factsInFamily(FAMILY).map((fact) => fact.id)

type Step = { id: string; state: SchedulerState }

function practise(state: SchedulerState, latencyMs: number, correct = true): Step {
  const served = nextFactInFamily(state, FAMILY, createRng(1))
  const given = correct ? served.fact.answer : served.fact.answer + 1
  const graded = gradeAnswer(served.state, { factId: served.fact.id, given, latencyMs })
  return { id: served.fact.id, state: graded.state }
}

describe('nextFactInFamily — egg practice can drive a family to mastery', () => {
  it('only serves facts from the requested family', () => {
    let state = withFacts(initialSchedulerState(), ['2x3', '3x2'], { box: 1 })
    for (let i = 0; i < 30; i++) {
      const served = nextFactInFamily(state, FAMILY, createRng(i))
      expect(served.fact.family).toBe(FAMILY)
      state = gradeAnswer(served.state, { factId: served.fact.id, given: served.fact.answer, latencyMs: 1200 })
        .state
    }
  })

  it('keeps EGG_ROTATION facts in play, introducing one per call until it has enough', () => {
    let state = withFact(initialSchedulerState(), '1x3', { box: 1 })
    for (let i = 1; i < EGG_ROTATION; i++) {
      state = nextFactInFamily(state, FAMILY, createRng(1)).state
      const inPlay = introducedIds(state).filter((id) => familyIds.includes(id))
      expect(inPlay).toHaveLength(i + 1)
    }
    state = nextFactInFamily(state, FAMILY, createRng(1)).state
    expect(introducedIds(state).filter((id) => familyIds.includes(id))).toHaveLength(EGG_ROTATION)
  })

  it('a single round has variety — several distinct facts, never twice in a row', () => {
    let state = withFact(initialSchedulerState(), '1x3', { box: 1 })
    const round: string[] = []
    for (let q = 0; q < 5; q++) {
      const step = practise(state, 900)
      round.push(step.id)
      state = step.state
    }
    expect(new Set(round).size).toBeGreaterThanOrEqual(3)
    for (let i = 1; i < round.length; i++) expect(round[i]).not.toBe(round[i - 1])
  })

  it('does not repeat a fact just answered wrong, even though it is the neediest', () => {
    let state = withFacts(initialSchedulerState(), familyIds, { box: 3, dueAt: 0 })
    const first = practise(state, 900, false)
    state = first.state
    expect(state.facts[first.id]?.box).toBe(1)
    const second = practise(state, 900)
    expect(second.id).not.toBe(first.id)
  })

  it('ranks by box, then overdue, then the slowest rolling latency', () => {
    const rotation = ['1x3', '2x3', '3x1', '3x2']
    const evenlyPlaced = withFacts(initialSchedulerState(), rotation, { box: 2, dueAt: 0 })
    const latencies: Record<string, number> = { '1x3': 1000, '2x3': 4000, '3x1': 2000, '3x2': 3000 }
    const slowest2x3 = rotation.reduce(
      (acc, id) => withFact(acc, id, { recentLatencies: [latencies[id] ?? 0] }),
      evenlyPlaced,
    )
    expect(nextFactInFamily(slowest2x3, FAMILY, createRng(1)).fact.id).toBe('2x3')

    const slowest3x2 = withFact(slowest2x3, '3x2', { recentLatencies: [9000] })
    expect(nextFactInFamily(slowest3x2, FAMILY, createRng(1)).fact.id).toBe('3x2')

    const lowerBoxWins = withFact(slowest3x2, '1x3', { box: 1 })
    expect(nextFactInFamily(lowerBoxWins, FAMILY, createRng(1)).fact.id).toBe('1x3')

    const moreOverdueWins = withFact(slowest3x2, '1x3', { dueAt: -50 })
    expect(nextFactInFamily(moreOverdueWins, FAMILY, createRng(1)).fact.id).toBe('1x3')
  })

  it('introduces the rest of the family once the known ones are mastered, then hatches', () => {
    let state = withFact(initialSchedulerState(), '1x3', { box: 1 })
    let hatched = false
    for (let i = 0; i < 400 && !hatched; i++) {
      const served = nextFactInFamily(state, FAMILY, createRng(7))
      const graded = gradeAnswer(served.state, {
        factId: served.fact.id,
        given: served.fact.answer,
        latencyMs: 900,
      })
      state = graded.state
      if (graded.result.familyJustMastered === FAMILY) hatched = true
    }
    expect(hatched).toBe(true)
    expect(isFamilyMastered(state, FAMILY)).toBe(true)
    for (const id of familyIds) expect(state.facts[id]?.introduced).toBe(true)
    expect(familyProgress(state, FAMILY)).toBe(1)
  })

  it('keeps serving a fully mastered family rather than stalling', () => {
    const state = withFacts(initialSchedulerState(), familyIds, {
      box: 5,
      recentLatencies: [900, 900, 900],
    })
    const served = nextFactInFamily(state, FAMILY, createRng(1))
    expect(served.fact.family).toBe(FAMILY)
  })

  it('falls back to mixed practice for a family with no facts in range', () => {
    const served = nextFactInFamily(initialSchedulerState(4), 9, createRng(1))
    expect(served.fact.family).not.toBe(9)
  })
})
