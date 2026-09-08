import { describe, expect, it } from 'vitest'
import { parseFarmSave } from './parse-farm-save'
import { freshFarmSave } from './test-fixtures'

describe('parseFarmSave', () => {
  it('accepts a well-formed v3 save', () => {
    const farm = freshFarmSave({ coins: 3, sessions: [] })
    expect(parseFarmSave(JSON.parse(JSON.stringify(farm)))).toEqual(farm)
  })

  it('accepts a save with a populated scheduler and session log', () => {
    const farm = freshFarmSave({
      scheduler: {
        facts: {
          '7x8': {
            id: '7x8',
            box: 2,
            dueAt: 14,
            lastLatencyMs: 2100,
            recentLatencies: [2100],
            correctStreak: 1,
            totalAttempts: 1,
            totalCorrect: 1,
            introduced: true,
          },
        },
        globalCounter: 12,
        unlockedTiers: [1, 2],
        recentFamilies: [8, 3],
        lastServed: '7x8',
        commuteCredit: { '8x7': 0.5 },
        maxTable: 12,
      },
      sessions: [
        {
          startedAt: 1_000,
          endedAt: 2_000,
          context: 'paddock',
          family: 8,
          entries: [
            { factId: '7x8', given: 56, correct: true, latencyMs: 2100, outcome: 'SLOW', askedAt: 11 },
          ],
        },
      ],
    })
    expect(parseFarmSave(farm)).toEqual(farm)
  })

  it('preserves lastServed through a JSON round-trip', () => {
    const farm = freshFarmSave()
    farm.scheduler.lastServed = '6x8'
    const parsed = parseFarmSave(JSON.parse(JSON.stringify(farm)))
    expect(parsed?.scheduler.lastServed).toBe('6x8')
  })

  it('drops keys that are not part of the schema', () => {
    const parsed = parseFarmSave({ ...freshFarmSave(), creatures: [], lastChoresDate: null })
    expect(parsed).toEqual(freshFarmSave())
  })

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['a string', 'save'],
    ['a number', 3],
    ['an array', []],
    ['an empty object', {}],
    ['a v2 blob', { ...freshFarmSave(), schemaVersion: 2 }],
    ['a future schema', { ...freshFarmSave(), schemaVersion: 4 }],
    ['a string schemaVersion', { ...freshFarmSave(), schemaVersion: '3' }],
    ['no scheduler', { ...freshFarmSave(), scheduler: undefined }],
    ['a scheduler with facts as an array', withScheduler({ facts: [] })],
    ['a scheduler with a non-record fact', withScheduler({ facts: { '7x8': 5 } })],
    ['a scheduler with a string counter', withScheduler({ globalCounter: '0' })],
    ['a scheduler with non-numeric tiers', withScheduler({ unlockedTiers: ['1'] })],
    ['a scheduler missing recentFamilies', withScheduler({ recentFamilies: undefined })],
    ['a scheduler missing lastServed', withScheduler({ lastServed: undefined })],
    ['a scheduler with a numeric lastServed', withScheduler({ lastServed: 56 })],
    ['a scheduler with an object lastServed', withScheduler({ lastServed: { id: '7x8' } })],
    ['a scheduler missing commuteCredit', withScheduler({ commuteCredit: undefined })],
    ['a scheduler missing maxTable', withScheduler({ maxTable: undefined })],
    ['string coins', { ...freshFarmSave(), coins: '0' }],
    ['missing feed', { ...freshFarmSave(), feed: undefined }],
    ['sessions as an object', { ...freshFarmSave(), sessions: {} }],
    ['a session without entries', { ...freshFarmSave(), sessions: [{ startedAt: 1, endedAt: 2, context: 'free', family: null }] }],
    ['settings without muted', { ...freshFarmSave(), settings: { maxTable: 12 } }],
    ['settings with a string maxTable', { ...freshFarmSave(), settings: { muted: false, maxTable: '12' } }],
  ])('rejects %s', (_label, raw) => {
    expect(parseFarmSave(raw)).toBeNull()
  })
})

function withScheduler(overrides: Record<string, unknown>): unknown {
  const farm = freshFarmSave()
  return { ...farm, scheduler: { ...farm.scheduler, ...overrides } }
}
