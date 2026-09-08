import type { FarmSave } from '@sf/domain'
import { createRng } from '@sf/domain'
import type { FarmGame } from './farm-game'
import { createFarmGame } from './farm-game'
import type { AudioBus, SoundName } from './ports/audio-bus'
import type { Clock } from './ports/clock'
import type { SaveStore } from './ports/save-store'

export type FakeClock = Clock & {
  set(epochMs: number): void
  advance(ms: number): void
}

export function fakeClock(start = 0): FakeClock {
  let current = start
  return {
    now: () => current,
    set: (epochMs) => {
      current = epochMs
    },
    advance: (ms) => {
      current += ms
    },
  }
}

export type FakeSaveStore = SaveStore & {
  /** Every save, in order, so tests can count writes and inspect the latest. */
  saved: FarmSave[]
  stored(): FarmSave | null
}

/** In-memory store. Deliberately not @sf/persistence — application tests own their fakes. */
export function fakeSaveStore(initial: FarmSave | null = null): FakeSaveStore {
  let current = initial
  const saved: FarmSave[] = []
  return {
    saved,
    stored: () => current,
    load: async () => current,
    save: async (farm) => {
      current = farm
      saved.push(farm)
    },
    clear: async () => {
      current = null
    },
  }
}

export type RecordingAudioBus = AudioBus & { played: SoundName[] }

export function recordingAudioBus(): RecordingAudioBus {
  let muted = false
  const played: SoundName[] = []
  return {
    played,
    play: (name) => {
      played.push(name)
    },
    setMuted: (next) => {
      muted = next
    },
    isMuted: () => muted,
  }
}

export type Harness = {
  game: FarmGame
  clock: FakeClock
  saveStore: FakeSaveStore
  audio: RecordingAudioBus
}

type HarnessOptions = {
  farm?: FarmSave | null
  seed?: number
  startAt?: number
}

/** A game wired to fakes only: seeded RNG, settable clock, in-memory store, recording audio. */
export function harness({ farm = null, seed = 1, startAt = 0 }: HarnessOptions = {}): Harness {
  const clock = fakeClock(startAt)
  const saveStore = fakeSaveStore(farm)
  const audio = recordingAudioBus()
  const game = createFarmGame({
    saveStore,
    clock,
    rng: createRng(seed),
    audio,
  })
  return { game, clock, saveStore, audio }
}
