import type { AudioBus, FarmGame, SaveStore } from '@sf/application'
import { createFarmGame } from '@sf/application'
import type { FarmSave } from '@sf/domain'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'

// The 3D world needs WebGL, which jsdom has none of, and its loading status
// would compete with the app's own. Its rules are covered elsewhere: the
// frameloop by the a11y hook tests and an e2e case, the lazy chunk's fallback
// and failure by LazyFarmScene.test.tsx.
vi.mock('./scene/LazyFarmScene', () => ({ LazyFarmScene: () => null }))

type RecordingAudioBus = AudioBus & { muted: boolean }

function recordingAudioBus(): RecordingAudioBus {
  const bus: RecordingAudioBus = {
    muted: false,
    play: () => undefined,
    setMuted: (next) => {
      bus.muted = next
    },
    isMuted: () => bus.muted,
  }
  return bus
}

type MemorySaveStore = SaveStore & { stored(): FarmSave | null; failNextSave(): void }

function memorySaveStore(): MemorySaveStore {
  let current: FarmSave | null = null
  let failing = false
  return {
    stored: () => current,
    failNextSave: () => {
      failing = true
    },
    load: async () => current,
    save: async (farm) => {
      if (failing) {
        failing = false
        throw new Error('quota exceeded')
      }
      current = farm
    },
    clear: async () => {
      current = null
    },
  }
}

/** The real game, wired to fakes, so a mute really does reach the audio port. */
function playableGame(): { game: FarmGame; audio: RecordingAudioBus; saveStore: MemorySaveStore } {
  const audio = recordingAudioBus()
  const saveStore = memorySaveStore()
  const game = createFarmGame({ saveStore, audio, clock: { now: () => 0 }, rng: () => 0.5 })
  return { game, audio, saveStore }
}

/** The scene is mocked out above, so the world is never asked for. */
const unusedWorldLoader = () => new Promise<never>(() => {})

function renderApp(game: FarmGame) {
  render(<App game={game} loadWorld={unusedWorldLoader} />)
  return userEvent.setup()
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('App', () => {
  it('says the farm is waking up until the save has loaded', async () => {
    const { game } = playableGame()
    renderApp(game)

    expect(screen.getByRole('status')).toHaveTextContent('Waking up the farm')

    expect(await screen.findByTestId('coins')).toHaveTextContent('0')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('asks the player to reload, and reports why, when the save store throws', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const failure = new Error('storage unavailable')
    const game = createFarmGame({
      saveStore: { ...memorySaveStore(), load: () => Promise.reject(failure) },
      audio: recordingAudioBus(),
      clock: { now: () => 0 },
      rng: () => 0.5,
    })

    renderApp(game)

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('could not wake up')
    })
    expect(screen.queryByTestId('coins')).not.toBeInTheDocument()
    expect(consoleError).toHaveBeenCalledWith('Farm failed to load', failure)
  })

  it('mutes and unmutes: the audio bus, the saved farm and the control all agree', async () => {
    const { game, audio, saveStore } = playableGame()
    const user = renderApp(game)
    await screen.findByTestId('mute')

    await user.click(screen.getByTestId('mute'))

    await waitFor(() => expect(screen.getByTestId('mute')).toHaveAttribute('aria-pressed', 'true'))
    expect(audio.isMuted()).toBe(true)
    expect(saveStore.stored()?.settings.muted).toBe(true)

    await user.click(screen.getByTestId('mute'))

    await waitFor(() => expect(screen.getByTestId('mute')).toHaveAttribute('aria-pressed', 'false'))
    expect(audio.isMuted()).toBe(false)
    expect(saveStore.stored()?.settings.muted).toBe(false)
  })

  it('leaves the sound control telling the truth when the setting cannot be saved', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const { game, audio, saveStore } = playableGame()
    const user = renderApp(game)
    await screen.findByTestId('mute')
    saveStore.failNextSave()

    await user.click(screen.getByTestId('mute'))

    await waitFor(() => expect(consoleError).toHaveBeenCalledWith(
      'Could not change the sound setting',
      expect.any(Error),
    ))
    expect(screen.getByTestId('mute')).toHaveAttribute('aria-pressed', 'false')
    expect(audio.isMuted()).toBe(false)
  })
})
