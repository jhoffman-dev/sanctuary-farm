import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { COLD_START_CREATURE_FAMILY } from '@/contracts'
import type { GradeResult } from '@/contracts'
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

  it('starts the day with the anchor stall hungry', () => {
    const { result } = setup()
    expect(result.current.choreStalls).toEqual([0])
    expect(result.current.save.lastChoresDate).toBeNull()
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

describe('GameProvider — currency comes only from graded answers', () => {
  it('+1 pellet per correct, +1 coin per FLUENT, nothing on wrong', () => {
    const { result } = setup()
    expect(result.current.save.currency).toEqual({ pellets: 0, coins: 0 })

    act(() => result.current.onGraded(gradeResult({ correct: true, outcome: 'FLUENT' })))
    expect(result.current.save.currency).toEqual({ pellets: 1, coins: 1 })

    act(() => result.current.onGraded(gradeResult({ correct: true, outcome: 'SLOW' })))
    expect(result.current.save.currency).toEqual({ pellets: 2, coins: 1 })

    act(() => result.current.onGraded(gradeResult({ correct: false, outcome: 'WRONG' })))
    expect(result.current.save.currency).toEqual({ pellets: 2, coins: 1 })
  })
})

describe('GameProvider — daily chores', () => {
  it('clearing the last stall stamps the date and routes to the goodnight summary', () => {
    const { result } = setup()
    act(() =>
      result.current.completeSession({
        startedAt: Date.now(),
        endedAt: Date.now(),
        context: 'stall',
        familyContext: COLD_START_CREATURE_FAMILY,
        entries: [],
      }),
    )
    expect(result.current.choreStalls).toEqual([])
    expect(result.current.save.lastChoresDate).not.toBeNull()
    expect(result.current.view.screen).toBe('summary')
  })
})

describe('GameProvider — hatch', () => {
  it('flags a pending hatch when a family is just mastered and has no creature', () => {
    const { result } = setup()
    act(() => result.current.onGraded(gradeResult({ familyJustMastered: 5 })))
    expect(result.current.pendingHatch).toBe(5)

    let born: ReturnType<typeof result.current.claimHatch> = null
    act(() => {
      born = result.current.claimHatch('Sparky')
    })
    expect(born?.family).toBe(5)
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
})
