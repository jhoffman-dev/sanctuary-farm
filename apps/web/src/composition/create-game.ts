import { createFarmGame, type FarmGame } from '@sf/application'
import { createWebAudioBus } from '@sf/audio'
import { createLocalSaveStore } from '@sf/persistence'

/**
 * The composition root: the only place in apps/web that may touch adapters.
 * Everything else talks to the `FarmGame` this returns.
 */
export function createGame(): FarmGame {
  return createFarmGame({
    saveStore: createLocalSaveStore(),
    audio: createWebAudioBus(),
    clock: { now: () => Date.now() },
    rng: () => Math.random(),
    ids: { newId: () => crypto.randomUUID() },
  })
}
