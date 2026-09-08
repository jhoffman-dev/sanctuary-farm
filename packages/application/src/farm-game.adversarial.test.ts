import type { FarmSave } from '@sf/domain'
import { createRng, emptyFarmSave, FEED_BUNDLE_PRICE, STARTING_FEED } from '@sf/domain'
import { describe, expect, it } from 'vitest'
import { createFarmGame } from './farm-game'
import type { Clock } from './ports/clock'
import type { Question } from './read-models'
import type { FakeSaveStore } from './test-fakes'
import { fakeClock, fakeSaveStore, harness, recordingAudioBus } from './test-fakes'

const FLUENT_MS = 1500

function correctAnswerTo(question: Question): number {
  return question.a * question.b
}

async function loadedGame(options: Parameters<typeof harness>[0] = {}) {
  const built = harness(options)
  await built.game.load()
  return built
}

/**
 * A clock that moves on every reading. A fixed one hides a queued call grading
 * a question it never saw, because that grade lands at 0 ms — free fluency.
 */
function advancingClock(stepMs: number): Clock {
  let elapsed = 0
  return {
    now: () => {
      elapsed += stepMs
      return elapsed
    },
  }
}

/** A store whose save() rejects on demand, so persistence failure can be injected mid-round. */
function rejectingSaveStore(): FakeSaveStore & { failNext(): void } {
  const inner = fakeSaveStore()
  let failing = false
  return {
    ...inner,
    failNext: () => {
      failing = true
    },
    save: async (farm) => {
      if (failing) {
        failing = false
        throw new Error('quota exceeded')
      }
      await inner.save(farm)
    },
  }
}

// ─── Out-of-order use ───

describe('out-of-order use of the facade', () => {
  it('answer() before load() rejects rather than grading against nothing', async () => {
    const { game } = harness()
    await expect(game.answer(1)).rejects.toThrow()
    expect(game.currentQuestion()).toBeNull()
  })

  it('endRound() twice: the second rejects and the log is appended exactly once', async () => {
    const { game, saveStore } = await loadedGame()
    game.startRound({ context: 'paddock', questions: 2 })
    await game.answer(0)
    await game.endRound()
    await expect(game.endRound()).rejects.toThrow(/no active round/)
    expect(saveStore.stored()?.sessions).toHaveLength(1)
  })

  it('answer() after endRound() rejects and changes nothing', async () => {
    const { game, saveStore } = await loadedGame()
    game.startRound({ context: 'paddock', questions: 3 })
    await game.answer(0)
    await game.endRound()
    const writes = saveStore.saved.length
    await expect(game.answer(0)).rejects.toThrow(/no active round/)
    expect(saveStore.saved).toHaveLength(writes)
    expect(game.summary().coins).toBe(0)
  })

  it('buyFeed() mid-round keeps the in-flight question, and the purchase survives the next answer', async () => {
    const { game, saveStore } = await loadedGame({ farm: { ...emptyFarmSave(), coins: 10 } })
    const question = game.startRound({ context: 'paddock', questions: 3 })

    const bought = await game.buyFeed()

    expect(bought.ok).toBe(true)
    expect(game.currentQuestion()).toBe(question)
    expect(game.roundProgress()).toEqual({ asked: 1, total: 3, complete: false })

    await game.answer(correctAnswerTo(question))

    expect(game.summary().feed).toBe(STARTING_FEED + 10)
    expect(game.summary().coins).toBe(10 - FEED_BUNDLE_PRICE + 2)
    expect(saveStore.stored()?.feed).toBe(STARTING_FEED + 10)
  })

  it('setMuted() mid-round does not lose the served question from the scheduler state', async () => {
    const { game, saveStore } = await loadedGame()
    const question = game.startRound({ context: 'paddock', questions: 2 })
    await game.setMuted(true)
    expect(saveStore.stored()?.scheduler.lastServed).toBe(question.factId)
    await game.answer(correctAnswerTo(question))
    expect(saveStore.stored()?.scheduler.facts[question.factId]?.totalAttempts).toBe(1)
  })

  it('two answer() calls issued without awaiting grade the tapped question once, and reject the second', async () => {
    const { game, saveStore } = await loadedGame()
    const first = game.startRound({ context: 'paddock', questions: 3 })
    // A double-tap: both calls answer the question on screen. By the time the
    // second runs, that question has been graded and replaced, so there is
    // nothing left for it to grade.
    const [fa, fb] = await Promise.allSettled([
      game.answer(correctAnswerTo(first)),
      game.answer(correctAnswerTo(first)),
    ])

    expect(fa.status).toBe('fulfilled')
    expect(fb).toMatchObject({ status: 'rejected', reason: expect.any(Error) })
    expect(saveStore.stored()?.scheduler.globalCounter).toBe(1)
    expect(saveStore.stored()?.coins).toBe(2)
  })

  it('a double-tap does not promote or mint against the next question, on a clock that keeps moving', async () => {
    const saveStore = fakeSaveStore()
    const game = createFarmGame({
      saveStore,
      clock: advancingClock(FLUENT_MS),
      rng: createRng(1),
      audio: recordingAudioBus(),
    })
    await game.load()
    const first = game.startRound({ context: 'paddock', questions: 3 })

    await Promise.allSettled([
      game.answer(correctAnswerTo(first)),
      game.answer(correctAnswerTo(first)),
    ])

    const graded = Object.values(saveStore.stored()?.scheduler.facts ?? {}).filter(
      (status) => status.totalAttempts > 0,
    )
    expect(graded.map((status) => status.id)).toEqual([first.factId])
    expect(graded[0]?.box).toBe(2)
    expect(saveStore.stored()?.coins).toBe(2)
    expect(game.roundProgress()).toEqual({ asked: 2, total: 3, complete: false })
  })

  it('load() a second time mid-round does not throw and leaves no round active', async () => {
    const { game } = await loadedGame()
    game.startRound({ context: 'paddock', questions: 3 })
    await game.answer(0)
    await game.load()
    expect(game.currentQuestion()).toBeNull()
    expect(game.roundProgress()).toEqual({ asked: 0, total: 0, complete: false })
  })
})

// ─── Plan validation ───

describe('startRound — plan validation', () => {
  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MIN_VALUE])(
    'rejects questions: %s and leaves no round active',
    async (questions) => {
      const { game } = await loadedGame()
      expect(() => game.startRound({ context: 'paddock', questions })).toThrow(/positive integer/)
      expect(game.currentQuestion()).toBeNull()
      expect(() => game.startRound({ context: 'paddock', questions: 1 })).not.toThrow()
    },
  )

  it.each([0, -1, 13, Number.NaN, 1.5])(
    'rejects an egg round for family %s, which has no facts, instead of silently minting coins on mixed practice',
    async (family) => {
      const { game } = await loadedGame()
      expect(() => game.startRound({ context: 'egg', questions: 3, family })).toThrow()
    },
  )
})

// ─── Latency and the clock ───

describe('latency — the clock is the only source', () => {
  it('a clock that goes backwards never yields a negative latency in the feedback or the log', async () => {
    const { game, clock } = await loadedGame({ startAt: 10_000 })
    const question = game.startRound({ context: 'paddock', questions: 2 })
    clock.set(9_000)

    const feedback = await game.answer(correctAnswerTo(question))
    const log = await game.endRound()

    expect(feedback.latencyMs).toBeGreaterThanOrEqual(0)
    expect(log.entries[0]?.latencyMs).toBeGreaterThanOrEqual(0)
  })

  it('a clock that goes backwards does not award FLUENT and two coins for free', async () => {
    const { game, clock } = await loadedGame({ startAt: 10_000 })
    const question = game.startRound({ context: 'paddock', questions: 2 })
    clock.set(0)

    const feedback = await game.answer(correctAnswerTo(question))

    expect(feedback.outcome).not.toBe('FLUENT')
    expect(feedback.coinsEarned).toBeLessThan(2)
  })

  it('latency is measured from the serve, not from startRound or the previous answer', async () => {
    const { game, clock } = await loadedGame({ startAt: 0 })
    const first = game.startRound({ context: 'paddock', questions: 3 })
    clock.advance(20_000)
    await game.answer(correctAnswerTo(first))
    const second = game.currentQuestion()
    if (!second) throw new Error('no second question')
    clock.advance(FLUENT_MS)
    const feedback = await game.answer(correctAnswerTo(second))
    expect(feedback.latencyMs).toBe(FLUENT_MS)
    expect(feedback.outcome).toBe('FLUENT')
  })

  it('a stalled clock (zero latency) grades FLUENT rather than crashing', async () => {
    const { game } = await loadedGame()
    const question = game.startRound({ context: 'paddock', questions: 1 })
    const feedback = await game.answer(correctAnswerTo(question))
    expect(feedback.latencyMs).toBe(0)
    expect(feedback.outcome).toBe('FLUENT')
  })
})

// ─── Persistence failure ───

describe('a save store that rejects', () => {
  it('answer() does not advance the round behind the caller’s back when the store rejects', async () => {
    const saveStore = rejectingSaveStore()
    const clock = fakeClock(0)
    const game = createFarmGame({ saveStore, clock, rng: createRng(1), audio: recordingAudioBus() })
    await game.load()
    const question = game.startRound({ context: 'paddock', questions: 3 })
    saveStore.failNext()

    let rejected = false
    try {
      await game.answer(correctAnswerTo(question))
    } catch {
      rejected = true
    }

    // Either the call succeeded (feedback returned, round advanced) or it failed and nothing moved.
    // What must never happen: a rejection with the round already advanced past what the caller saw.
    if (rejected) {
      expect(game.currentQuestion()).toBe(question)
      expect(game.roundProgress()).toEqual({ asked: 1, total: 3, complete: false })
    } else {
      expect(game.currentQuestion()).not.toBe(question)
    }
  })

  it('the in-memory farm never gets ahead of the store without the caller being told', async () => {
    const saveStore = rejectingSaveStore()
    const clock = fakeClock(0)
    const game = createFarmGame({ saveStore, clock, rng: createRng(1), audio: recordingAudioBus() })
    await game.load()
    const question = game.startRound({ context: 'paddock', questions: 3 })
    saveStore.failNext()

    const outcome = await game.answer(correctAnswerTo(question)).then(
      () => 'resolved',
      () => 'rejected',
    )

    if (outcome === 'rejected') {
      // A rejected answer must not have minted coins the store never saw.
      expect(game.summary().coins).toBe(saveStore.stored()?.coins ?? 0)
    }
  })

  it('endRound() with a rejecting store does not drop the session log silently', async () => {
    const saveStore = rejectingSaveStore()
    const clock = fakeClock(0)
    const game = createFarmGame({ saveStore, clock, rng: createRng(1), audio: recordingAudioBus() })
    await game.load()
    game.startRound({ context: 'paddock', questions: 2 })
    await game.answer(0)
    saveStore.failNext()

    const outcome = await game.endRound().then(
      () => 'resolved',
      () => 'rejected',
    )

    if (outcome === 'rejected') {
      // If the log could not be persisted, the round must still be closable / retryable.
      await expect(game.endRound()).resolves.toBeDefined()
    }
    expect(saveStore.stored()?.sessions).toHaveLength(1)
  })
})

// ─── Loaded save shapes ───

describe('loading unusual saves', () => {
  it('settings.maxTable and scheduler.maxTable are reconciled on load — the summary follows one of them consistently', async () => {
    const mismatched: FarmSave = { ...emptyFarmSave(5), settings: { muted: false, maxTable: 12 } }
    const { game } = await loadedGame({ farm: mismatched })
    const families = game.summary().families.map((f) => f.family)
    // Whichever wins, the round must be playable and the summary must not list families the scheduler cannot serve.
    expect(families).toEqual([1, 2, 3, 4, 5])
    const question = game.startRound({ context: 'paddock', questions: 1 })
    expect(question.family).toBeLessThanOrEqual(5)
  })
})

// ─── Answer values ───

describe('answer values', () => {
  it.each([Number.NaN, 1.5, -0, Number.POSITIVE_INFINITY])('answer(%s) grades WRONG, pays nothing and serves the next question', async (given) => {
    const { game } = await loadedGame()
    game.startRound({ context: 'paddock', questions: 2 })
    const feedback = await game.answer(given)
    expect(feedback).toMatchObject({ outcome: 'WRONG', correct: false, coinsEarned: 0 })
    expect(feedback.next?.index).toBe(1)
  })
})

// ─── Session log ───

describe('session log correctness', () => {
  it('an early endRound with a question in flight logs only graded answers, with consecutive askedAt values', async () => {
    const { game, clock } = await loadedGame({ startAt: 500 })
    game.startRound({ context: 'paddock', questions: 5 })
    for (let i = 0; i < 3; i++) {
      clock.advance(1000)
      await game.answer(0)
    }
    expect(game.currentQuestion()).not.toBeNull()

    const log = await game.endRound()

    expect(log.entries).toHaveLength(3)
    expect(log.entries.map((entry) => entry.askedAt)).toEqual([0, 1, 2])
    expect(log.entries.every((entry) => entry.latencyMs === 1000)).toBe(true)
    expect(game.currentQuestion()).toBeNull()
  })

  it('a round resumed after an early end starts numbering askedAt where the scheduler left off', async () => {
    const { game } = await loadedGame()
    game.startRound({ context: 'paddock', questions: 5 })
    await game.answer(0)
    await game.answer(0)
    await game.endRound()
    game.startRound({ context: 'paddock', questions: 2 })
    await game.answer(0)
    const log = await game.endRound()
    expect(log.entries.map((entry) => entry.askedAt)).toEqual([2])
  })

  it('the dropped in-flight question is not graded: its fact keeps zero attempts', async () => {
    const { game, saveStore } = await loadedGame()
    game.startRound({ context: 'paddock', questions: 5 })
    await game.answer(0)
    const dropped = game.currentQuestion()
    if (!dropped) throw new Error('no in-flight question')
    await game.endRound()
    const status = saveStore.stored()?.scheduler.facts[dropped.factId]
    expect(status?.totalAttempts).toBe(0)
  })

  it('coins never decrease through answers and feed never changes through answers', async () => {
    const { game, clock } = await loadedGame({ farm: { ...emptyFarmSave(), coins: 5 } })
    game.startRound({ context: 'paddock', questions: 12 })
    let coins = 5
    for (let i = 0; i < 12; i++) {
      clock.advance(i % 2 === 0 ? 900 : 9000)
      const question = game.currentQuestion()
      if (!question) throw new Error('round ended early')
      await game.answer(i % 3 === 0 ? -1 : correctAnswerTo(question))
      expect(game.summary().coins).toBeGreaterThanOrEqual(coins)
      coins = game.summary().coins
      expect(game.summary().feed).toBe(STARTING_FEED)
    }
  })
})

// ─── Determinism ───

describe('determinism through the facade', () => {
  async function script(seed: number): Promise<FarmSave | null> {
    const { game, clock, saveStore } = await loadedGame({ seed, startAt: 1_000 })
    for (let round = 0; round < 4; round++) {
      game.startRound(round % 2 === 0 ? { context: 'paddock', questions: 6 } : { context: 'egg', questions: 6, family: 3 })
      for (let i = 0; i < 6; i++) {
        const question = game.currentQuestion()
        if (!question) throw new Error('round ended early')
        clock.advance(i % 3 === 0 ? 5000 : 1200)
        await game.answer(i % 5 === 0 ? -1 : correctAnswerTo(question))
      }
      await game.endRound()
    }
    return saveStore.stored()
  }

  it('the same seed and clock script produce deep-equal stored farms', async () => {
    expect(await script(11)).toEqual(await script(11))
  })
})
