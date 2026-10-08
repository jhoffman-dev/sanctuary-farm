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

    await expect(arrivals.arriveAt('paddock')).resolves.toEqual({ kind: 'practice', started: true })
    expect(game.currentQuestion()).not.toBeNull()
    expect(game.roundProgress()).toEqual({ asked: 1, total: PADDOCK_ROUND.questions, complete: false })
  })

  it('keeps the round already running instead of starting another', async () => {
    const { game, arrivals } = await loadedArrivals()
    await arrivals.arriveAt('paddock')
    const inFlight = game.currentQuestion()

    await expect(arrivals.arriveAt('paddock')).resolves.toEqual({ kind: 'practice', started: false })
    expect(game.currentQuestion()).toEqual(inFlight)
  })

  it('starts a fresh round once the last one has ended', async () => {
    const { game, arrivals } = await loadedArrivals()
    await arrivals.arriveAt('paddock')
    await game.endRound()

    await expect(arrivals.arriveAt('paddock')).resolves.toEqual({ kind: 'practice', started: true })
  })

  it.each(['barn', 'feed-shed', 'nest', 'training-ring', 'petting-zoo', 'farmhouse'])(
    'has nothing to open at the %s yet, and starts no round',
    async (place) => {
      const { game, arrivals } = await loadedArrivals()

      await expect(arrivals.arriveAt(place)).resolves.toEqual({ kind: 'coming-soon', place })
      expect(game.roundProgress().total).toBe(0)
    },
  )

  // Arriving just after toggling mute used to hit startRound's "save still in
  // progress" guard, and the keeper stood at the gate with nothing opening.
  it('waits for a save still landing, then opens practice', async () => {
    const { game, arrivals, saveStore } = await loadedArrivals()
    const saving = game.setMuted(true)

    const arriving = arrivals.arriveAt('paddock')

    await expect(arriving).resolves.toEqual({ kind: 'practice', started: true })
    await saving
    expect(saveStore.stored()?.settings.muted).toBe(true)
    expect(game.roundProgress()).toEqual({ asked: 1, total: PADDOCK_ROUND.questions, complete: false })
  })

  it('still opens practice when the save it waited for failed', async () => {
    const { game, arrivals, saveStore } = await loadedArrivals()
    saveStore.save = async () => {
      throw new Error('disk full')
    }
    const saving = game.setMuted(true)

    await expect(arrivals.arriveAt('paddock')).resolves.toEqual({ kind: 'practice', started: true })
    await expect(saving).rejects.toThrow('disk full')
  })

  it('opens one round when two arrivals wait on the same save', async () => {
    const { game, arrivals } = await loadedArrivals()
    const saving = game.setMuted(true)

    const outcomes = await Promise.all([arrivals.arriveAt('paddock'), arrivals.arriveAt('paddock')])

    expect(outcomes).toEqual([
      { kind: 'practice', started: true },
      { kind: 'practice', started: false },
    ])
    await saving
  })

  it('rejects when the farm has not loaded, as starting a round would', async () => {
    const { game } = harness()

    await expect(createHotspotArrivals(game).arriveAt('paddock')).rejects.toThrow(/load\(\) first/)
  })
})
