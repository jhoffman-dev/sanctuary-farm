import { describe, expect, it } from 'vitest'
import { COLD_START_FAMILIES } from '../facts/tuning'
import { initialSchedulerState } from './state'

describe('initialSchedulerState', () => {
  it('creates every in-range fact with only the Anchors tier unlocked', () => {
    const state = initialSchedulerState()
    expect(Object.keys(state.facts)).toHaveLength(144)
    expect(state.unlockedTiers).toEqual([1])
    expect(state.globalCounter).toBe(0)
    expect(state.recentFamilies).toEqual([])
    expect(state.lastServed).toBeNull()
    expect(state.commuteCredit).toEqual({})
    expect(state.maxTable).toBe(12)
  })

  it('introduces the cold-start families at box 1, due now, and nothing else', () => {
    const state = initialSchedulerState()
    for (const status of Object.values(state.facts)) {
      const family = Math.max(...status.id.split('x').map(Number))
      const coldStart = COLD_START_FAMILIES.includes(family)
      expect(status.introduced).toBe(coldStart)
      expect(status.box).toBe(coldStart ? 1 : 0)
      expect(status.dueAt).toBe(0)
      expect(status.recentLatencies).toEqual([])
    }
  })

  it('honours a smaller table', () => {
    const state = initialSchedulerState(5)
    expect(Object.keys(state.facts)).toHaveLength(25)
    expect(state.maxTable).toBe(5)
    expect(state.facts['5x5']).toBeDefined()
    expect(state.facts['6x1']).toBeUndefined()
  })
})
