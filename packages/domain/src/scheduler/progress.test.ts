import { describe, expect, it } from 'vitest'
import { factStatus, withFact, withFacts } from '../../test/fixtures'
import { factsInFamily } from '../facts/table'
import { familyProgress, isFactMastered, isFamilyMastered } from './progress'
import { initialSchedulerState } from './state'

describe('isFactMastered', () => {
  it('needs the mastery box and three recent fluent answers', () => {
    expect(isFactMastered(undefined)).toBe(false)
    expect(isFactMastered(factStatus({ box: 5, recentLatencies: [900, 900, 900] }))).toBe(true)
    expect(isFactMastered(factStatus({ box: 4, recentLatencies: [900, 900, 900] }))).toBe(false)
    expect(isFactMastered(factStatus({ box: 5, recentLatencies: [900, 900] }))).toBe(false)
    // Only the last three answers count; an older slow one is forgiven.
    expect(isFactMastered(factStatus({ box: 5, recentLatencies: [5000, 900, 900, 900] }))).toBe(true)
    expect(isFactMastered(factStatus({ box: 5, recentLatencies: [900, 900, 5000] }))).toBe(false)
  })
})

describe('familyProgress and isFamilyMastered', () => {
  it('is exactly 1.0 only when every fact in the family is mastered', () => {
    const almost = withFact(initialSchedulerState(), '1x1', { box: 5, recentLatencies: [900, 5000] })
    expect(isFamilyMastered(almost, 1)).toBe(false)
    expect(familyProgress(almost, 1)).toBeCloseTo(0.98)

    const done = withFact(initialSchedulerState(), '1x1', { box: 5, recentLatencies: [900, 900, 900] })
    expect(isFamilyMastered(done, 1)).toBe(true)
    expect(familyProgress(done, 1)).toBe(1)
  })

  it('caps at 0.98 while unmastered even when every fact is at box 5', () => {
    const ids = factsInFamily(3).map((fact) => fact.id)
    const state = withFacts(initialSchedulerState(), ids, { box: 5, recentLatencies: [9000, 9000, 9000] })
    expect(isFamilyMastered(state, 3)).toBe(false)
    expect(familyProgress(state, 3)).toBe(0.98)
  })

  it('is the share of the family at box >= 3', () => {
    const family4 = factsInFamily(4)
    const state = withFact(withFact(initialSchedulerState(), '1x4', { box: 3 }), '2x4', { box: 4 })
    expect(familyProgress(state, 4)).toBeCloseTo(2 / family4.length)
  })

  it('a family with no facts in range is neither mastered nor in progress', () => {
    const state = initialSchedulerState(4)
    expect(isFamilyMastered(state, 9)).toBe(false)
    expect(familyProgress(state, 9)).toBe(0)
  })
})
