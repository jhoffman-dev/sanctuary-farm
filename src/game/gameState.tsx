// The one place game-wide state lives. No state library — a context around a
// ref-held Scheduler / AudioBus / SaveStore plus a little React state for the
// view. Persists on every graded answer (sessions get interrupted).
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  COLD_START_CREATURE_FAMILY,
  type GradeResult,
  type HatchedCreature,
  type SaveData,
  type Screen,
  type SessionLog,
} from '@/contracts'
import { createScheduler } from '@/engine/scheduler'
import { createSaveStore } from '@/save/store'
import { createAudioBus } from '@/audio/sounds'
import { idempotentScheduler } from './idempotentScheduler'
import { makeCreature, nextFreeStall } from './creatureFor'
import { todayStr } from './todayStr'

const TOTAL_STALLS = 12
const PELLETS_PER_CORRECT = 1
const COINS_PER_FLUENT = 1

type View =
  | { screen: Exclude<Screen, 'stall'> }
  | { screen: 'stall'; stallIndex: number }

export type GameApi = {
  save: SaveData
  scheduler: ReturnType<typeof idempotentScheduler>
  audio: ReturnType<typeof createAudioBus>
  view: View
  history: View[]
  creatures: HatchedCreature[]
  /** stall indices with a hungry creature right now */
  choreStalls: number[]
  /** family whose egg has hatched and is waiting for its ceremony at the nest */
  pendingHatch: number | null
  totalStalls: number

  go: (screen: Screen, params?: { stallIndex?: number }) => void
  back: () => void
  /** called by QuizPanel.onQuestionGraded — currency + hatch detection */
  onGraded: (result: GradeResult) => void
  /** called by QuizPanel.onComplete — logs the session, clears the chore */
  completeSession: (log: SessionLog) => void
  renameCreature: (family: number, name: string) => void
  /** run the pending hatch ceremony: add the creature (optionally named), clear the flag */
  claimHatch: (name?: string) => HatchedCreature | null
  setMuted: (muted: boolean) => void
  exportSave: () => string
  resetSave: () => void
}

const GameContext = createContext<GameApi | null>(null)

/** One-time normalisation of a loaded save: cold-start creature + daily chores. */
function primeSave(raw: SaveData): SaveData {
  let save = raw
  // Cold start — the anchor creature is a gift, no egg ceremony (D6).
  if (!save.creatures.some((c) => c.family === COLD_START_CREATURE_FAMILY)) {
    save = {
      ...save,
      creatures: [...save.creatures, makeCreature(COLD_START_CREATURE_FAMILY, 0)],
    }
  }
  return save
}

function choresFor(save: SaveData): number[] {
  if (save.lastChoresDate === todayStr()) return []
  return save.creatures.map((c) => c.stallIndex).sort((a, b) => a - b)
}

export function GameProvider({ children }: { children: ReactNode }) {
  // Singletons — lazy init so StrictMode's double render never rebuilds them.
  const [store] = useState(() => createSaveStore())
  const [save, setSaveState] = useState<SaveData>(() => primeSave(store.load()))
  const [scheduler] = useState(() => idempotentScheduler(createScheduler(save.scheduler)))
  const [audio] = useState(() => createAudioBus({ muted: save.settings.muted }))

  const [nav, setNav] = useState<{ view: View; stack: View[] }>({
    view: { screen: 'farmyard' },
    stack: [],
  })
  const [choreStalls, setChoreStalls] = useState<number[]>(() => choresFor(save))
  const [pendingHatch, setPendingHatch] = useState<number | null>(null)

  const persist = useCallback(
    (next: SaveData) => {
      store.save(next)
      setSaveState(next)
    },
    [store],
  )

  const pushView = useCallback((view: View) => {
    setNav((n) => ({ view, stack: [...n.stack, n.view] }))
  }, [])

  /** Fold the live scheduler snapshot back into the save and persist. */
  const syncScheduler = useCallback(
    (patch?: Partial<SaveData>) => {
      const snap = scheduler.snapshot()
      persist({
        ...save,
        ...patch,
        scheduler: snap,
        facts: snap.facts,
        globalCounter: snap.globalCounter,
      })
    },
    [persist, save, scheduler],
  )

  const go = useCallback<GameApi['go']>(
    (screen, params) => {
      pushView(
        screen === 'stall'
          ? { screen: 'stall', stallIndex: params?.stallIndex ?? 0 }
          : { screen },
      )
    },
    [pushView],
  )

  const back = useCallback(() => {
    setNav((n) =>
      n.stack.length === 0
        ? { view: { screen: 'farmyard' }, stack: [] }
        : { view: n.stack[n.stack.length - 1], stack: n.stack.slice(0, -1) },
    )
  }, [])

  const onGraded = useCallback<GameApi['onGraded']>(
    (result) => {
      // Currency — the ONLY source (exploration reveals; math advances).
      const pellets = save.currency.pellets + (result.correct ? PELLETS_PER_CORRECT : 0)
      const coins = save.currency.coins + (result.outcome === 'FLUENT' ? COINS_PER_FLUENT : 0)
      const snap = scheduler.snapshot()
      persist({
        ...save,
        currency: { pellets, coins },
        scheduler: snap,
        facts: snap.facts,
        globalCounter: snap.globalCounter,
      })

      if (
        result.familyJustMastered != null &&
        !save.creatures.some((c) => c.family === result.familyJustMastered) &&
        pendingHatch == null
      ) {
        setPendingHatch(result.familyJustMastered)
      }
    },
    [persist, save, pendingHatch, scheduler],
  )

  const completeSession = useCallback<GameApi['completeSession']>(
    (log) => {
      const sessions = [...save.sessions, log].slice(-200)
      let lastChoresDate = save.lastChoresDate
      let nextChores = choreStalls

      if (log.context === 'stall' && log.familyContext != null) {
        const creature = save.creatures.find((c) => c.family === log.familyContext)
        if (creature) nextChores = choreStalls.filter((s) => s !== creature.stallIndex)
      }
      const choresJustFinished = choreStalls.length > 0 && nextChores.length === 0
      if (choresJustFinished) lastChoresDate = todayStr()

      setChoreStalls(nextChores)
      syncScheduler({ sessions, lastChoresDate })

      if (log.context === 'stall') {
        // Return to the barn to pick the next hungry stall — or the day's
        // summary once every stall is clear (the game says goodnight, rule 6).
        setNav({
          view: { screen: choresJustFinished ? 'summary' : 'barn' },
          stack: [{ screen: 'farmyard' }],
        })
      }
    },
    [save, choreStalls, syncScheduler],
  )

  const renameCreature = useCallback<GameApi['renameCreature']>(
    (family, name) => {
      const trimmed = name.trim()
      if (!trimmed) return
      persist({
        ...save,
        creatures: save.creatures.map((c) => (c.family === family ? { ...c, name: trimmed } : c)),
      })
    },
    [persist, save],
  )

  const claimHatch = useCallback<GameApi['claimHatch']>(
    (name) => {
      if (pendingHatch == null) return null
      if (save.creatures.some((c) => c.family === pendingHatch)) {
        setPendingHatch(null)
        return null
      }
      const creature = makeCreature(pendingHatch, nextFreeStall(save.creatures))
      if (name && name.trim()) creature.name = name.trim()
      audio.play('hatch')
      persist({ ...save, creatures: [...save.creatures, creature] })
      setPendingHatch(null)
      return creature
    },
    [persist, save, pendingHatch, audio],
  )

  const setMuted = useCallback<GameApi['setMuted']>(
    (muted) => {
      audio.setMuted(muted)
      persist({ ...save, settings: { ...save.settings, muted } })
    },
    [persist, save, audio],
  )

  const exportSave = useCallback(() => store.exportJSON(), [store])

  const resetSave = useCallback(() => {
    // The Scheduler is built once from the loaded save; a clean reload is the
    // safe way to rebuild every singleton around a fresh save.
    store.reset()
    if (typeof location !== 'undefined') location.reload()
  }, [store])

  const api = useMemo<GameApi>(
    () => ({
      save,
      scheduler,
      audio,
      view: nav.view,
      history: nav.stack,
      creatures: save.creatures,
      choreStalls,
      pendingHatch,
      totalStalls: TOTAL_STALLS,
      go,
      back,
      onGraded,
      completeSession,
      renameCreature,
      claimHatch,
      setMuted,
      exportSave,
      resetSave,
    }),
    [save, scheduler, audio, nav, choreStalls, pendingHatch, go, back, onGraded, completeSession, renameCreature, claimHatch, setMuted, exportSave, resetSave],
  )

  return <GameContext value={api}>{children}</GameContext>
}

export function useGame(): GameApi {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used inside <GameProvider>')
  return ctx
}
