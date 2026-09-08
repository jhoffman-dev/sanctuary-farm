import type { FarmSave, FactState } from '@sf/domain'
import {
  ALL_FAMILIES,
  FEED_BUNDLE_PRICE,
  FEED_BUNDLE_UNITS,
  STARTING_FEED,
  emptyFarmSave,
} from '@sf/domain'
import { describe, expect, it } from 'vitest'
import type { Question } from './read-models'
import { harness } from './test-fakes'

const FLUENT_MS = 1500
const SLOW_MS = 5000
const LABORED_MS = 9000

function correctAnswerTo(question: Question): number {
  return question.a * question.b
}

/** 1×1 is the whole of family 1: one fluent answer from box 4 masters both fact and family. */
function farmAboutToMasterFamilyOne(): FarmSave {
  const farm = emptyFarmSave()
  const current = farm.scheduler.facts['1x1']
  if (!current) throw new Error('fixture: fresh save has no 1x1')
  const primed: FactState = { ...current, box: 4, recentLatencies: [1000, 1000], introduced: true }
  return {
    ...farm,
    scheduler: { ...farm.scheduler, facts: { ...farm.scheduler.facts, '1x1': primed } },
  }
}

async function loadedGame(options: Parameters<typeof harness>[0] = {}) {
  const built = harness(options)
  await built.game.load()
  return built
}

describe('load', () => {
  it('starts a fresh farm when the store is empty', async () => {
    const { game, audio } = harness()
    const summary = await game.load()

    expect(summary).toMatchObject({ coins: 0, feed: STARTING_FEED, muted: false })
    expect(summary.families.map((f) => f.family)).toEqual([...ALL_FAMILIES])
    expect(summary.families.every((f) => f.progress === 0 && !f.mastered)).toBe(true)
    expect(audio.isMuted()).toBe(false)
  })

  it('loads an existing farm and applies its mute setting to the audio bus', async () => {
    const saved: FarmSave = {
      ...emptyFarmSave(),
      coins: 7,
      feed: 3,
      settings: { muted: true, maxTable: 12 },
    }
    const { game, audio } = harness({ farm: saved })

    const summary = await game.load()

    expect(summary).toMatchObject({ coins: 7, feed: 3, muted: true })
    expect(game.summary()).toEqual(summary)
    expect(audio.isMuted()).toBe(true)
  })

  it('summarises only families within the save’s maxTable', async () => {
    const { game } = await loadedGame({ farm: emptyFarmSave(5) })
    expect(game.summary().families.map((f) => f.family)).toEqual([1, 2, 3, 4, 5])
  })

  it('refuses to summarise or start a round before load()', () => {
    const { game } = harness()
    expect(() => game.summary()).toThrow(/load\(\)/)
    expect(() => game.startRound({ context: 'paddock', questions: 3 })).toThrow(/load\(\)/)
  })
})

describe('startRound', () => {
  it('serves a real question and keeps it stable until answered', async () => {
    const { game } = await loadedGame()

    const first = game.startRound({ context: 'paddock', questions: 5 })

    expect(first.index).toBe(0)
    expect(first.factId).toBe(`${first.a}x${first.b}`)
    expect(first.family).toBe(Math.max(first.a, first.b))
    expect(game.currentQuestion()).toBe(first)
    expect(game.currentQuestion()).toBe(first)
    expect(game.roundProgress()).toEqual({ asked: 1, total: 5, complete: false })
  })

  it('asks the scheduler exactly once per question', async () => {
    const { game, saveStore } = await loadedGame()
    game.startRound({ context: 'paddock', questions: 3 })
    game.currentQuestion()
    game.currentQuestion()
    await game.answer(0)
    await game.answer(0)
    await game.answer(0)
    await game.endRound()

    // serve() appends one family per served fact, so the history length is the serve count.
    expect(saveStore.stored()?.scheduler.recentFamilies).toHaveLength(3)
  })

  it('draws every question of a family round from that family', async () => {
    const { game } = await loadedGame()
    const first = game.startRound({ context: 'egg', questions: 4, family: 10 })
    expect(first.family).toBe(10)

    const feedback = await game.answer(correctAnswerTo(first))
    expect(feedback.next?.family).toBe(10)
  })

  it('throws while a round is active, even once its questions are all answered', async () => {
    const { game } = await loadedGame()
    game.startRound({ context: 'paddock', questions: 1 })
    expect(() => game.startRound({ context: 'paddock', questions: 1 })).toThrow(/already active/)

    await game.answer(0)
    expect(() => game.startRound({ context: 'paddock', questions: 1 })).toThrow(/already active/)
  })

  it('rejects a family round without a family and a round with no questions', async () => {
    const { game } = await loadedGame()
    expect(() => game.startRound({ context: 'stall', questions: 3 })).toThrow(/needs a family/)
    expect(() => game.startRound({ context: 'egg', questions: 3 })).toThrow(/needs a family/)
    expect(() => game.startRound({ context: 'paddock', questions: 0 })).toThrow(/positive/)
    expect(game.currentQuestion()).toBeNull()
  })

  it('rejects a family outside [1, maxTable] with a RangeError instead of falling back to mixed practice', async () => {
    const { game } = await loadedGame({ farm: emptyFarmSave(5) })
    expect(() => game.startRound({ context: 'egg', questions: 3, family: 6 })).toThrow(RangeError)
    expect(() => game.startRound({ context: 'paddock', questions: 3, family: 0 })).toThrow(RangeError)
    expect(() => game.startRound({ context: 'egg', questions: 3, family: 5 })).not.toThrow()
  })

  it('refuses to start while a save is still in progress, so the commit cannot overwrite the served question', async () => {
    const { game, saveStore } = await loadedGame({ farm: { ...emptyFarmSave(), coins: 10 } })
    let release: () => void = () => undefined
    const saveStarted = new Promise<void>((started) => {
      saveStore.save = () =>
        new Promise<void>((resolve) => {
          release = resolve
          started()
        })
    })

    const buying = game.buyFeed()
    await saveStarted

    expect(() => game.startRound({ context: 'paddock', questions: 1 })).toThrow(/save is still in progress/)
    release()
    await buying
    expect(() => game.startRound({ context: 'paddock', questions: 1 })).not.toThrow()
  })

  it('reports idle progress when no round is active', async () => {
    const { game } = await loadedGame()
    expect(game.roundProgress()).toEqual({ asked: 0, total: 0, complete: false })
  })
})

describe('answer', () => {
  it('measures latency from the clock, not from the caller', async () => {
    const { game, clock } = await loadedGame({ startAt: 1_000 })
    const question = game.startRound({ context: 'paddock', questions: 3 })
    clock.advance(FLUENT_MS)

    const feedback = await game.answer(correctAnswerTo(question))

    expect(feedback.latencyMs).toBe(FLUENT_MS)
    expect(feedback.outcome).toBe('FLUENT')
    expect(feedback.question).toBe(question)
    expect(feedback.correctAnswer).toBe(correctAnswerTo(question))
  })

  it('pays 2 coins for a fluent paddock answer', async () => {
    const { game, clock } = await loadedGame()
    const question = game.startRound({ context: 'paddock', questions: 3 })
    clock.advance(FLUENT_MS)

    const feedback = await game.answer(correctAnswerTo(question))

    expect(feedback.coinsEarned).toBe(2)
    expect(game.summary().coins).toBe(2)
  })

  it('pays 1 coin for a slow or labored answer', async () => {
    const { game, clock } = await loadedGame()
    const first = game.startRound({ context: 'paddock', questions: 3 })
    clock.advance(SLOW_MS)
    const slow = await game.answer(correctAnswerTo(first))
    expect(slow).toMatchObject({ outcome: 'SLOW', coinsEarned: 1 })

    const second = slow.next
    if (!second) throw new Error('round ended early')
    clock.advance(LABORED_MS)
    const labored = await game.answer(correctAnswerTo(second))
    expect(labored).toMatchObject({ outcome: 'LABORED', coinsEarned: 1 })
    expect(game.summary().coins).toBe(2)
  })

  it('pays nothing for a wrong answer and reports the right one', async () => {
    const { game, clock } = await loadedGame()
    const question = game.startRound({ context: 'paddock', questions: 3 })
    clock.advance(FLUENT_MS)

    const feedback = await game.answer(correctAnswerTo(question) + 1)

    expect(feedback).toMatchObject({ outcome: 'WRONG', correct: false, coinsEarned: 0 })
    expect(feedback.correctAnswer).toBe(correctAnswerTo(question))
    expect(game.summary().coins).toBe(0)
  })

  it.each(['stall', 'free'] as const)('mints no coins in a %s round even when fluent', async (context) => {
    const { game, clock } = await loadedGame()
    const question = game.startRound({ context, questions: 2, family: 10 })
    clock.advance(FLUENT_MS)

    const feedback = await game.answer(correctAnswerTo(question))

    expect(feedback.outcome).toBe('FLUENT')
    expect(feedback.coinsEarned).toBe(0)
    expect(game.summary().coins).toBe(0)
  })

  it('plays one sound per outcome', async () => {
    const { game, clock, audio } = await loadedGame()
    const first = game.startRound({ context: 'paddock', questions: 3 })
    clock.advance(FLUENT_MS)
    const fluent = await game.answer(correctAnswerTo(first))
    expect(audio.played).toEqual(['fluent'])

    if (!fluent.next) throw new Error('round ended early')
    clock.advance(SLOW_MS)
    const slow = await game.answer(correctAnswerTo(fluent.next))
    expect(audio.played).toEqual(['fluent', 'correct'])

    if (!slow.next) throw new Error('round ended early')
    await game.answer(-1)
    expect(audio.played).toEqual(['fluent', 'correct', 'wrong'])
  })

  it('reports mastery and plays the hatch sound when an answer finishes a family', async () => {
    const { game, clock, audio } = await loadedGame({ farm: farmAboutToMasterFamilyOne() })
    const question = game.startRound({ context: 'egg', questions: 1, family: 1 })
    expect(question.factId).toBe('1x1')
    clock.advance(FLUENT_MS)

    const feedback = await game.answer(1)

    expect(feedback).toMatchObject({ factMastered: true, familyJustMastered: 1 })
    expect(audio.played).toEqual(['fluent', 'hatch'])
    expect(game.summary().families[0]).toEqual({ family: 1, progress: 1, mastered: true })
  })

  it('completes the round after N questions', async () => {
    const { game } = await loadedGame()
    game.startRound({ context: 'paddock', questions: 3 })

    const first = await game.answer(0)
    expect(first.next?.index).toBe(1)
    expect(first.next).toBe(game.currentQuestion())
    expect(game.roundProgress()).toEqual({ asked: 2, total: 3, complete: false })

    const second = await game.answer(0)
    expect(second.next?.index).toBe(2)

    const third = await game.answer(0)
    expect(third.next).toBeNull()
    expect(game.currentQuestion()).toBeNull()
    expect(game.roundProgress()).toEqual({ asked: 3, total: 3, complete: true })
    await expect(game.answer(0)).rejects.toThrow(/no question in flight/)
  })

  it('throws when nothing is in flight', async () => {
    const { game } = await loadedGame()
    await expect(game.answer(4)).rejects.toThrow(/no active round/)
  })

  it('persists the farm after every answer, with the scheduler advanced', async () => {
    const { game, saveStore } = await loadedGame()
    game.startRound({ context: 'paddock', questions: 3 })
    expect(saveStore.saved).toHaveLength(0)

    await game.answer(0)
    expect(saveStore.saved).toHaveLength(1)
    await game.answer(0)
    expect(saveStore.saved).toHaveLength(2)

    expect(saveStore.stored()?.scheduler.globalCounter).toBe(2)
    expect(saveStore.stored()?.scheduler).not.toBe(emptyFarmSave().scheduler)
  })
})

describe('endRound', () => {
  it('appends a SessionLog with one entry per graded answer and persists it', async () => {
    const { game, clock, saveStore } = await loadedGame({ startAt: 10_000 })
    const first = game.startRound({ context: 'paddock', questions: 2 })
    clock.advance(FLUENT_MS)
    await game.answer(correctAnswerTo(first))
    clock.advance(SLOW_MS)
    const second = game.currentQuestion()
    if (!second) throw new Error('no second question')
    await game.answer(correctAnswerTo(second) + 1)
    clock.advance(500)

    const log = await game.endRound()

    expect(log).toMatchObject({ startedAt: 10_000, endedAt: 17_000, context: 'paddock', family: null })
    expect(log.entries).toEqual([
      {
        factId: first.factId,
        given: correctAnswerTo(first),
        correct: true,
        latencyMs: FLUENT_MS,
        outcome: 'FLUENT',
        askedAt: 0,
      },
      {
        factId: second.factId,
        given: correctAnswerTo(second) + 1,
        correct: false,
        latencyMs: SLOW_MS,
        outcome: 'WRONG',
        askedAt: 1,
      },
    ])
    expect(saveStore.stored()?.sessions).toEqual([log])
    expect(game.currentQuestion()).toBeNull()
    expect(() => game.startRound({ context: 'paddock', questions: 1 })).not.toThrow()
  })

  it('closes early, dropping the unanswered question and recording the family', async () => {
    const { game, saveStore } = await loadedGame()
    game.startRound({ context: 'egg', questions: 5, family: 10 })
    await game.answer(0)

    const log = await game.endRound()

    expect(log.family).toBe(10)
    expect(log.context).toBe('egg')
    expect(log.entries).toHaveLength(1)
    expect(saveStore.stored()?.sessions).toHaveLength(1)
  })

  it('throws when no round is active', async () => {
    const { game } = await loadedGame()
    await expect(game.endRound()).rejects.toThrow(/no active round/)
  })
})

describe('buyFeed', () => {
  it('trades coins for a feed bundle and persists', async () => {
    const { game, saveStore } = await loadedGame({ farm: { ...emptyFarmSave(), coins: 10 } })

    const outcome = await game.buyFeed()

    expect(outcome).toEqual({
      ok: true,
      summary: expect.objectContaining({
        coins: 10 - FEED_BUNDLE_PRICE,
        feed: STARTING_FEED + FEED_BUNDLE_UNITS,
      }),
    })
    expect(saveStore.stored()).toMatchObject({
      coins: 10 - FEED_BUNDLE_PRICE,
      feed: STARTING_FEED + FEED_BUNDLE_UNITS,
    })
  })

  it('refuses without enough coins and writes nothing', async () => {
    const { game, saveStore } = await loadedGame()

    const outcome = await game.buyFeed()

    expect(outcome).toEqual({ ok: false, reason: 'not-enough-coins' })
    expect(saveStore.saved).toHaveLength(0)
    expect(game.summary().feed).toBe(STARTING_FEED)
  })
})

describe('setMuted', () => {
  it('mutes the bus, updates the summary and persists the setting', async () => {
    const { game, audio, saveStore } = await loadedGame()

    await game.setMuted(true)

    expect(audio.isMuted()).toBe(true)
    expect(game.summary().muted).toBe(true)
    expect(saveStore.stored()?.settings.muted).toBe(true)

    await game.setMuted(false)

    expect(audio.isMuted()).toBe(false)
    expect(saveStore.stored()?.settings).toEqual({ muted: false, maxTable: 12 })
    expect(saveStore.saved).toHaveLength(2)
  })
})
