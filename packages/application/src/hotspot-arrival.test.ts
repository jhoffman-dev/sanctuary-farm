import { describe, expect, it } from 'vitest'
import { createHotspotArrivals } from './hotspot-arrival'
import { PADDOCK_ROUND } from './round-presets'
import { harness } from './test-fakes'

async function loadedArrivals() {
  const built = harness()
  await built.game.load()
  return { ...built, arrivals: createHotspotArrivals(built.game) }
}

describe('arriving at a hotspot', () => {
  it('starts a paddock practice round at the paddock', async () => {
    const { game, arrivals } = await loadedArrivals()

    expect(arrivals.arriveAt('paddock')).toEqual({ kind: 'practice', started: true })
    expect(game.currentQuestion()).not.toBeNull()
    expect(game.roundProgress()).toEqual({ asked: 1, total: PADDOCK_ROUND.questions, complete: false })
  })

  it('keeps the round already running instead of starting another', async () => {
    const { game, arrivals } = await loadedArrivals()
    arrivals.arriveAt('paddock')
    const inFlight = game.currentQuestion()

    expect(arrivals.arriveAt('paddock')).toEqual({ kind: 'practice', started: false })
    expect(game.currentQuestion()).toEqual(inFlight)
  })

  it('starts a fresh round once the last one has ended', async () => {
    const { game, arrivals } = await loadedArrivals()
    arrivals.arriveAt('paddock')
    await game.endRound()

    expect(arrivals.arriveAt('paddock')).toEqual({ kind: 'practice', started: true })
  })

  it.each(['barn', 'feed-shed', 'nest', 'training-ring', 'petting-zoo', 'farmhouse'])(
    'has nothing to open at the %s yet, and starts no round',
    async (place) => {
      const { game, arrivals } = await loadedArrivals()

      expect(arrivals.arriveAt(place)).toEqual({ kind: 'coming-soon', place })
      expect(game.roundProgress().total).toBe(0)
    },
  )

  it('passes on the game’s refusal when a save is still in progress', async () => {
    const { game, arrivals } = await loadedArrivals()
    const saving = game.setMuted(true)

    expect(() => arrivals.arriveAt('paddock')).toThrow(/save is still in progress/)
    await saving
  })
})
