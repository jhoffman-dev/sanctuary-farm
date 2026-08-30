import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import {
  CARE_TASKS,
  COINS_PER_CORRECT,
  COINS_PER_FLUENT,
  COLD_START_CREATURE_FAMILY,
  FEED_BUNDLE_PRICE,
  FEED_BUNDLE_UNITS,
  FEED_PER_FEEDING,
} from '@/contracts'
import type { GradeResult, HatchedCreature, SessionLog } from '@/contracts'
import { GameProvider, useGame } from './gameState'

function setup() {
  return renderHook(() => useGame(), { wrapper: GameProvider })
}

function gradeResult(over: Partial<GradeResult>): GradeResult {
  return {
    outcome: 'FLUENT',
    correct: true,
    fact: { id: '3x4', a: 3, b: 4, answer: 12, family: 4, tier: 3, hardCore: false },
    correctAnswer: 12,
    previousBox: 1,
    newBox: 2,
    factMastered: false,
    familyJustMastered: null,
    ...over,
  }
}

beforeEach(() => {
  try {
    localStorage.clear()
  } catch {
    /* jsdom opaque origin — provider falls back to memory */
  }
})
afterEach(() => vi.useRealTimers())

describe('GameProvider — cold start', () => {
  it('opens with exactly one creature: the anchor family, no egg', () => {
    const { result } = setup()
    expect(result.current.creatures).toHaveLength(1)
    expect(result.current.creatures[0].family).toBe(COLD_START_CREATURE_FAMILY)
    expect(result.current.creatures[0].stallIndex).toBe(0)
  })

  it('starts the day with the anchor animal needing every care task', () => {
    const { result } = setup()
    expect(result.current.choreFamilies).toEqual([COLD_START_CREATURE_FAMILY])
    expect(result.current.tasksRemaining(COLD_START_CREATURE_FAMILY)).toEqual([...CARE_TASKS])
    expect(result.current.allChoresDone).toBe(false)
    expect(result.current.save.lastChoresDate).toBeNull()
  })

  it('grants starting feed', () => {
    const { result } = setup()
    expect(result.current.save.feed).toBeGreaterThan(0)
    expect(result.current.save.coins).toBe(0)
  })

  it('introduces the anchor families in the scheduler', () => {
    const { result } = setup()
    const facts = result.current.scheduler.snapshot().facts
    expect(facts['1x1'].introduced).toBe(true)
    expect(facts['2x2'].introduced).toBe(true)
    expect(facts['10x10'].introduced).toBe(true)
    expect(facts['7x8'].introduced).toBe(false)
  })
})

const emptyLog = (over: Partial<SessionLog> = {}): SessionLog => ({
  startedAt: Date.now(),
  endedAt: Date.now(),
  context: 'stall',
  familyContext: COLD_START_CREATURE_FAMILY,
  entries: [],
  ...over,
})

describe('GameProvider — coins come only from the paddock and the nest', () => {
  it('a graded answer with earnsCoins pays; a plain stall answer pays nothing', () => {
    const { result } = setup()
    expect(result.current.save.coins).toBe(0)

    // stall care answers earn no coins
    act(() => result.current.onGraded(gradeResult({ correct: true, outcome: 'FLUENT' })))
    expect(result.current.save.coins).toBe(0)

    // paddock / nest answers do
    act(() => result.current.onGraded(gradeResult({ correct: true, outcome: 'FLUENT' }), { earnsCoins: true }))
    expect(result.current.save.coins).toBe(COINS_PER_FLUENT)

    act(() => result.current.onGraded(gradeResult({ correct: true, outcome: 'SLOW' }), { earnsCoins: true }))
    expect(result.current.save.coins).toBe(COINS_PER_FLUENT + COINS_PER_CORRECT)

    const held = result.current.save.coins
    act(() => result.current.onGraded(gradeResult({ correct: false, outcome: 'WRONG' }), { earnsCoins: true }))
    expect(result.current.save.coins).toBe(held)
  })
})

describe('GameProvider — the feed shed economy', () => {
  it('buyFeed spends coins for feed, and refuses when she cannot afford it', () => {
    const { result } = setup()
    // not enough coins yet
    let bought = true
    act(() => {
      bought = result.current.buyFeed()
    })
    expect(bought).toBe(false)

    // earn enough (paddock/nest answers)
    for (let i = 0; i < FEED_BUNDLE_PRICE; i++) {
      act(() => result.current.onGraded(gradeResult({ correct: true, outcome: 'SLOW' }), { earnsCoins: true }))
    }
    const feedBefore = result.current.save.feed
    const coinsBefore = result.current.save.coins
    act(() => {
      bought = result.current.buyFeed()
    })
    expect(bought).toBe(true)
    expect(result.current.save.feed).toBe(feedBefore + FEED_BUNDLE_UNITS)
    expect(result.current.save.coins).toBe(coinsBefore - FEED_BUNDLE_PRICE)
  })
})

describe('GameProvider — care + daily chores', () => {
  it('a care round marks that task done today; feeding consumes feed; health rises', () => {
    const { result } = setup()
    const fam = COLD_START_CREATURE_FAMILY
    const feedBefore = result.current.save.feed
    const healthBefore = result.current.care[fam].health

    act(() => result.current.completeCare(fam, 'water', emptyLog()))
    expect(result.current.tasksRemaining(fam)).not.toContain('water')
    expect(result.current.save.feed).toBe(feedBefore) // watering is free
    expect(result.current.care[fam].health).toBeGreaterThan(healthBefore)

    act(() => result.current.completeCare(fam, 'feed', emptyLog()))
    expect(result.current.save.feed).toBe(feedBefore - FEED_PER_FEEDING)
  })

  it('health never exceeds the max', () => {
    const { result } = setup()
    const fam = COLD_START_CREATURE_FAMILY
    for (let i = 0; i < 20; i++) {
      act(() => result.current.completeCare(fam, 'play', emptyLog()))
    }
    expect(result.current.care[fam].health).toBeLessThanOrEqual(100)
  })

  it('finishing every task for every animal stamps the day and shows the goodnight summary', () => {
    const { result } = setup()
    const fam = COLD_START_CREATURE_FAMILY
    for (const t of CARE_TASKS) {
      act(() => result.current.completeCare(fam, t, emptyLog()))
    }
    expect(result.current.allChoresDone).toBe(true)
    expect(result.current.save.lastChoresDate).not.toBeNull()
    expect(result.current.view.screen).toBe('summary')
  })
})

describe('GameProvider — hatch', () => {
  it('flags a pending hatch when a family is just mastered and has no creature', () => {
    const { result } = setup()
    act(() => result.current.onGraded(gradeResult({ familyJustMastered: 5 })))
    expect(result.current.pendingHatch).toBe(5)

    let born: HatchedCreature | null = null
    act(() => {
      born = result.current.claimHatch('Sparky')
    })
    expect((born as HatchedCreature | null)?.family).toBe(5)
    expect(result.current.creatures.some((c) => c.family === 5 && c.name === 'Sparky')).toBe(true)
    expect(result.current.pendingHatch).toBeNull()
  })
})

describe('GameProvider — navigation', () => {
  it('go / back walk the screen stack', () => {
    const { result } = setup()
    expect(result.current.view.screen).toBe('farmyard')
    act(() => result.current.go('barn'))
    expect(result.current.view.screen).toBe('barn')
    act(() => result.current.go('stall', { stallIndex: 0 }))
    expect(result.current.view).toEqual({ screen: 'stall', stallIndex: 0 })
    act(() => result.current.back())
    expect(result.current.view.screen).toBe('barn')
    act(() => result.current.back())
    expect(result.current.view.screen).toBe('farmyard')
  })

  it('moveAnimal sends an animal to the petting zoo and back', () => {
    const { result } = setup()
    const fam = COLD_START_CREATURE_FAMILY
    expect(result.current.creatures.find((c) => c.family === fam)?.home).toBe('barn')

    act(() => result.current.moveAnimal(fam, 'zoo'))
    expect(result.current.creatures.find((c) => c.family === fam)?.home).toBe('zoo')

    act(() => result.current.moveAnimal(fam, 'barn'))
    expect(result.current.creatures.find((c) => c.family === fam)?.home).toBe('barn')
  })

  it('enterHotspot records the hotspot so the return trip spawns her there', () => {
    const { result } = setup()
    expect(result.current.lastHotspot).toBeNull()
    act(() => result.current.enterHotspot('nest', 'nest'))
    expect(result.current.view.screen).toBe('nest')
    expect(result.current.lastHotspot).toBe('nest')
    act(() => result.current.back())
    expect(result.current.view.screen).toBe('farmyard')
    // lastHotspot stays 'nest' — FarmyardScreen uses it to place the keeper
    expect(result.current.lastHotspot).toBe('nest')
  })
})
