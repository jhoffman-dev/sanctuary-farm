import { describe, expect, it } from 'vitest'
import { STARTING_FEED } from '../economy/coins'
import { initialSchedulerState } from '../scheduler/state'
import { emptyFarmSave } from './empty'
import { SAVE_SCHEMA_VERSION } from './farm-save'

describe('emptyFarmSave', () => {
  it('starts with no coins, day-one feed, no sessions and default settings', () => {
    const farm = emptyFarmSave()
    expect(farm.schemaVersion).toBe(SAVE_SCHEMA_VERSION)
    expect(farm.coins).toBe(0)
    expect(farm.feed).toBe(STARTING_FEED)
    expect(farm.sessions).toEqual([])
    expect(farm.settings).toEqual({ muted: false, maxTable: 12 })
    expect(farm.scheduler).toEqual(initialSchedulerState())
  })

  it('threads maxTable into both the settings and the scheduler', () => {
    const farm = emptyFarmSave(6)
    expect(farm.settings.maxTable).toBe(6)
    expect(farm.scheduler.maxTable).toBe(6)
    expect(Object.keys(farm.scheduler.facts)).toHaveLength(36)
  })
})
