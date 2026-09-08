import { describe, expect, it } from 'vitest'
import { withFact } from '../../test/fixtures'
import type { LeitnerBox } from '../facts/tuning'
import { LEITNER_INTERVALS, MASTERY_BOX } from '../facts/tuning'
import { gradeAnswer } from './grade'
import { initialSchedulerState } from './state'
import type { SchedulerState } from './types'

const fluent = (state: SchedulerState, factId: string, given?: number) =>
  gradeAnswer(state, { factId, given: given ?? answerOf(factId), latencyMs: 1000 })

function answerOf(factId: string): number {
  const [a, b] = factId.split('x').map(Number)
  return (a ?? 0) * (b ?? 0)
}

describe('grading — latency is the primary promotion signal', () => {
  it('a correct-but-slow (5000 ms) answer holds the box', () => {
    const state = withFact(initialSchedulerState(), '5x6', { box: 4 })
    const { result, state: after } = gradeAnswer(state, { factId: '5x6', given: 30, latencyMs: 5000 })
    expect(result.outcome).toBe('SLOW')
    expect(result.correct).toBe(true)
    expect(result.previousBox).toBe(4)
    expect(result.newBox).toBe(4)
    expect(after.facts['5x6']?.box).toBe(4)
  })

  it('a SLOW answer re-queues at the smaller of its box interval and box 1', () => {
    const state = withFact(initialSchedulerState(), '5x6', { box: 4, dueAt: 0 })
    const { state: after } = gradeAnswer(state, { factId: '5x6', given: 30, latencyMs: 4000 })
    expect(after.facts['5x6']?.dueAt).toBe(after.globalCounter + LEITNER_INTERVALS[1])
  })

  it('a FLUENT answer promotes one box and re-queues at the new box interval', () => {
    for (const box of [1, 2, 3, 4] as const) {
      const state = withFact(initialSchedulerState(), '6x7', { box })
      const { result, state: after } = fluent(state, '6x7')
      const promoted = (box + 1) as LeitnerBox
      expect(result.outcome).toBe('FLUENT')
      expect(result.newBox).toBe(promoted)
      expect(after.facts['6x7']?.dueAt).toBe(after.globalCounter + LEITNER_INTERVALS[promoted])
    }
  })

  it('a FLUENT answer at the mastery box stays there', () => {
    const state = withFact(initialSchedulerState(), '6x7', { box: MASTERY_BOX })
    const { result, state: after } = fluent(state, '6x7')
    expect(result.newBox).toBe(MASTERY_BOX)
    expect(after.facts['6x7']?.dueAt).toBe(after.globalCounter + LEITNER_INTERVALS[MASTERY_BOX])
  })

  it('a LABORED answer demotes one box', () => {
    const state = withFact(initialSchedulerState(), '6x7', { box: 3 })
    const { result, state: after } = gradeAnswer(state, { factId: '6x7', given: 42, latencyMs: 9000 })
    expect(result.outcome).toBe('LABORED')
    expect(result.newBox).toBe(2)
    expect(after.facts['6x7']?.box).toBe(2)
    expect(after.facts['6x7']?.dueAt).toBe(after.globalCounter + LEITNER_INTERVALS[2])
  })

  it('a LABORED answer on a box-1 fact leaves it at box 1', () => {
    const state = withFact(initialSchedulerState(), '6x7', { box: 1 })
    const { result } = gradeAnswer(state, { factId: '6x7', given: 42, latencyMs: 12000 })
    expect(result.outcome).toBe('LABORED')
    expect(result.newBox).toBe(1)
  })

  it('a WRONG answer resets to box 1 regardless of prior box', () => {
    const state = withFact(initialSchedulerState(), '8x9', { box: 5, recentLatencies: [900, 900, 900] })
    const { result, state: after } = gradeAnswer(state, { factId: '8x9', given: 71, latencyMs: 500 })
    expect(result.outcome).toBe('WRONG')
    expect(result.correct).toBe(false)
    expect(result.correctAnswer).toBe(72)
    expect(result.newBox).toBe(1)
    expect(after.facts['8x9']?.box).toBe(1)
    expect(after.facts['8x9']?.correctStreak).toBe(0)
  })

  it('advances the global counter by exactly 1 and records the attempt', () => {
    const state = initialSchedulerState()
    const { state: after } = fluent(state, '1x2')
    const status = after.facts['1x2']
    expect(after.globalCounter).toBe(state.globalCounter + 1)
    expect(status?.totalAttempts).toBe(1)
    expect(status?.totalCorrect).toBe(1)
    expect(status?.correctStreak).toBe(1)
    expect(status?.lastLatencyMs).toBe(1000)
    expect(status?.recentLatencies).toEqual([1000])
  })

  it('keeps only the most recent latencies', () => {
    let state = initialSchedulerState()
    for (let i = 0; i < 7; i++) {
      state = gradeAnswer(state, { factId: '1x2', given: 2, latencyMs: 1000 + i }).state
    }
    expect(state.facts['1x2']?.recentLatencies).toEqual([1002, 1003, 1004, 1005, 1006])
  })

  it('throws for a fact the state does not know', () => {
    expect(() => gradeAnswer(initialSchedulerState(), { factId: '13x13', given: 1, latencyMs: 1 })).toThrow(
      /unknown fact/,
    )
    expect(() => gradeAnswer(initialSchedulerState(4), { factId: '7x8', given: 56, latencyMs: 1 })).toThrow(
      /unknown fact/,
    )
  })
})

describe('commutativity — the twin is half-promoted, never demoted', () => {
  it('two correct answers on 7×8 move 8×7 up one box', () => {
    let state = withFact(withFact(initialSchedulerState(), '7x8', { box: 1 }), '8x7', { box: 1 })
    state = fluent(state, '7x8').state
    expect(state.facts['8x7']?.box).toBe(1)
    expect(state.commuteCredit['8x7']).toBe(0.5)
    state = fluent(state, '7x8').state
    expect(state.facts['8x7']?.box).toBe(2)
    expect(state.commuteCredit['8x7']).toBe(0)
    expect(state.facts['8x7']?.dueAt).toBe(state.globalCounter + LEITNER_INTERVALS[2])
  })

  it('across a mixed run the twin’s box never decreases and reaches mastery', () => {
    let state = withFact(withFact(initialSchedulerState(), '7x8', { box: 1 }), '8x7', { box: 1 })
    state = fluent(fluent(state, '7x8').state, '7x8').state
    const boxes: number[] = []
    for (let i = 0; i < 30; i++) {
      state = fluent(state, '7x8', i % 4 === 0 ? 0 : 56).state
      boxes.push(state.facts['8x7']?.box ?? -1)
    }
    for (let i = 1; i < boxes.length; i++) expect(boxes[i]).toBeGreaterThanOrEqual(boxes[i - 1] ?? 0)
    expect(state.facts['8x7']?.box).toBe(MASTERY_BOX)
  })

  it('credit survives a serialisation round-trip of the state', () => {
    let state = withFact(withFact(initialSchedulerState(), '7x8', { box: 1 }), '8x7', { box: 1 })
    state = fluent(state, '7x8').state
    const reloaded = JSON.parse(JSON.stringify(state)) as SchedulerState
    const after = fluent(reloaded, '7x8').state
    expect(after.facts['8x7']?.box).toBe(2)
  })

  it('a wrong answer earns no credit', () => {
    const state = withFact(withFact(initialSchedulerState(), '7x8', { box: 1 }), '8x7', { box: 1 })
    const after = fluent(state, '7x8', 0).state
    expect(after.commuteCredit['8x7']).toBeUndefined()
  })

  it('an un-introduced or already-mastered twin is left alone', () => {
    const unintroduced = withFact(initialSchedulerState(), '7x8', { box: 1 })
    const afterA = fluent(unintroduced, '7x8').state
    expect(afterA.facts['8x7']?.introduced).toBe(false)
    expect(afterA.commuteCredit['8x7']).toBeUndefined()

    const mastered = withFact(unintroduced, '8x7', { box: MASTERY_BOX, dueAt: 40 })
    const afterB = fluent(mastered, '7x8').state
    expect(afterB.facts['8x7']?.dueAt).toBe(40)
    expect(afterB.commuteCredit['8x7']).toBeUndefined()
  })

  it('a square (7×7) has no distinct twin to promote', () => {
    const state = withFact(initialSchedulerState(), '7x7', { box: 1 })
    const { state: after } = fluent(state, '7x7')
    expect(after.facts['7x7']?.box).toBe(2)
    expect(after.commuteCredit).toEqual({})
  })
})

describe('grading reports mastery milestones', () => {
  it('factMastered and familyJustMastered fire on the completing answer only', () => {
    const state = withFact(initialSchedulerState(), '1x1', { box: 4, recentLatencies: [900, 900] })
    const first = gradeAnswer(state, { factId: '1x1', given: 1, latencyMs: 900 })
    expect(first.result.newBox).toBe(5)
    expect(first.result.factMastered).toBe(true)
    expect(first.result.familyJustMastered).toBe(1)

    const second = gradeAnswer(first.state, { factId: '1x1', given: 1, latencyMs: 900 })
    expect(second.result.factMastered).toBe(false)
    expect(second.result.familyJustMastered).toBeNull()
  })

  it('unlocks the next tier when the current one crosses the 80% gate', () => {
    const base = initialSchedulerState()
    const tier1 = Object.keys(base.facts).filter((id) => {
      const [a, b] = id.split('x').map(Number)
      return [a, b].some((n) => n === 1 || n === 2 || n === 10)
    })
    const state = tier1.reduce((acc, id) => withFact(acc, id, { box: 4 }), base)
    const { state: after } = gradeAnswer(state, { factId: '1x1', given: 1, latencyMs: 900 })
    expect(after.unlockedTiers).toEqual([1, 2])
  })
})
