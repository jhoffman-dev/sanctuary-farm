// The one place game-wide state lives. No state library — a context around a
// Scheduler / AudioBus / SaveStore plus a little React state for the view.
// Persists on every graded answer (sessions get interrupted).
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  CARE_HEALTH_BONUS,
  CARE_TASKS,
  COINS_PER_CORRECT,
  COINS_PER_FLUENT,
  COLD_START_CREATURE_FAMILY,
  FEED_BUNDLE_PRICE,
  FEED_BUNDLE_UNITS,
  FEED_PER_FEEDING,
  HEALTH_DECAY_PER_DAY,
  HEALTH_FLOOR,
  HEALTH_MAX,
  emptyAnimalCare,
  type AnimalCare,
  type CareTask,
  type CreatureHome,
  type GradeResult,
  type HatchedCreature,
  type HotspotId,
  type SaveData,
  type Screen,
  type SessionLog,
} from '@/contracts'
import { createScheduler } from '@/engine/scheduler'
import { createSaveStore } from '@/save/store'
import { createAudioBus } from '@/audio/sounds'
import { idempotentScheduler } from './idempotentScheduler'
import { makeCreature, nextFreeStall } from './creatureFor'
import { daysBetween, todayStr } from './todayStr'

const TOTAL_STALLS = 12

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
  care: Record<number, AnimalCare>
  /** care tasks not yet done today for a given animal */
  tasksRemaining: (family: number) => CareTask[]
  /** families with at least one task left today */
  choreFamilies: number[]
  allChoresDone: boolean
  /** family whose egg has hatched and is waiting for its ceremony at the nest */
  pendingHatch: number | null
  totalStalls: number
  /** the hotspot she last walked into — so returning drops her back there */
  lastHotspot: HotspotId | null

  go: (screen: Screen, params?: { stallIndex?: number }) => void
  enterHotspot: (id: HotspotId, screen: Screen) => void
  back: () => void
  /** per graded answer — persists scheduler progress + detects a hatch. Pass
   *  `{ earnsCoins: true }` from the paddock and the nest (the only coin venues). */
  onGraded: (result: GradeResult, opts?: { earnsCoins?: boolean }) => void
  /** spend coins on a feed bundle. Returns false if she can't afford it. */
  buyFeed: () => boolean
  /** a completed care round in a stall (feed/water/clean/play) */
  completeCare: (family: number, task: CareTask, log: SessionLog) => void
  /** a completed free round (paddock / egg practice) */
  completePractice: (log: SessionLog) => void
  renameCreature: (family: number, name: string) => void
  /** send an animal to the barn or the petting zoo by the pond */
  moveAnimal: (family: number, home: CreatureHome) => void
  claimHatch: (name?: string) => HatchedCreature | null
  setMuted: (muted: boolean) => void
  exportSave: () => string
  resetSave: () => void
}

const GameContext = createContext<GameApi | null>(null)

/** The most recent day any care task was done for this animal, or null. */
function lastCaredDay(care: AnimalCare): string | null {
  const days = Object.values(care.done).filter((d): d is string => !!d)
  return days.length ? days.sort().at(-1)! : null
}

/**
 * One-time normalisation of a loaded save: cold-start gift animal, a care record
 * per animal, and a health drop for any days the animal wasn't tended at all.
 */
function primeSave(raw: SaveData): SaveData {
  const today = todayStr()
  let save = raw
  if (!save.creatures.some((c) => c.family === COLD_START_CREATURE_FAMILY)) {
    save = {
      ...save,
      creatures: [...save.creatures, makeCreature(COLD_START_CREATURE_FAMILY, 0)],
    }
  }

  const care: Record<number, AnimalCare> = {}
  let changed = false
  for (const c of save.creatures) {
    let entry = save.care[c.family] ?? emptyAnimalCare(c.family)
    if (!save.care[c.family]) changed = true

    // Health decay: one hit per missed day, capped, never below the floor.
    const last = lastCaredDay(entry)
    if (last && last < today) {
      const missed = Math.min(5, Math.max(0, daysBetween(last, today) - 1))
      if (missed > 0) {
        const health = Math.max(HEALTH_FLOOR, entry.health - missed * HEALTH_DECAY_PER_DAY)
        if (health !== entry.health) {
          entry = { ...entry, health }
          changed = true
        }
      }
    }
    care[c.family] = entry
  }
  return changed ? { ...save, care } : save
}

function tasksRemainingFor(care: AnimalCare | undefined, today: string): CareTask[] {
  if (!care) return [...CARE_TASKS]
  return CARE_TASKS.filter((t) => care.done[t] !== today)
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
  const [pendingHatch, setPendingHatch] = useState<number | null>(null)
  const [lastHotspot, setLastHotspot] = useState<HotspotId | null>(null)

  const today = todayStr()

  const persist = useCallback(
    (next: SaveData) => {
      store.save(next)
      setSaveState(next)
    },
    [store],
  )

  /** persist, folding the live scheduler snapshot in. */
  const persistWithScheduler = useCallback(
    (patch: Partial<SaveData>) => {
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

  const pushView = useCallback((view: View) => {
    setNav((n) => ({ view, stack: [...n.stack, n.view] }))
  }, [])

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

  const enterHotspot = useCallback<GameApi['enterHotspot']>(
    (id, screen) => {
      setLastHotspot(id)
      pushView({ screen } as View)
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

  const tasksRemaining = useCallback<GameApi['tasksRemaining']>(
    (family) => tasksRemainingFor(save.care[family], today),
    [save.care, today],
  )

  const choreFamilies = useMemo(
    () => save.creatures.filter((c) => tasksRemainingFor(save.care[c.family], today).length > 0).map((c) => c.family),
    [save.creatures, save.care, today],
  )
  const allChoresDone = choreFamilies.length === 0

  const onGraded = useCallback<GameApi['onGraded']>(
    (result, opts) => {
      // Coins are earned ONLY in the paddock and the nest hollow.
      const gained =
        opts?.earnsCoins
          ? result.outcome === 'FLUENT'
            ? COINS_PER_FLUENT
            : result.correct
              ? COINS_PER_CORRECT
              : 0
          : 0
      persistWithScheduler(gained > 0 ? { coins: save.coins + gained } : {})

      if (
        result.familyJustMastered != null &&
        !save.creatures.some((c) => c.family === result.familyJustMastered) &&
        pendingHatch == null
      ) {
        setPendingHatch(result.familyJustMastered)
      }
    },
    [persistWithScheduler, save.coins, save.creatures, pendingHatch],
  )

  const buyFeed = useCallback<GameApi['buyFeed']>(() => {
    if (save.coins < FEED_BUNDLE_PRICE) return false
    audio.play('correct')
    persist({
      ...save,
      coins: save.coins - FEED_BUNDLE_PRICE,
      feed: save.feed + FEED_BUNDLE_UNITS,
    })
    return true
  }, [persist, save, audio])

  const completeCare = useCallback<GameApi['completeCare']>(
    (family, task, log) => {
      const prev = save.care[family] ?? emptyAnimalCare(family)
      const care: Record<number, AnimalCare> = {
        ...save.care,
        [family]: {
          ...prev,
          done: { ...prev.done, [task]: today },
          health: Math.min(HEALTH_MAX, prev.health + CARE_HEALTH_BONUS[task]),
        },
      }
      const feed = task === 'feed' ? Math.max(0, save.feed - FEED_PER_FEEDING) : save.feed
      const sessions = [...save.sessions, log].slice(-200)

      // Are all chores now done?
      const stillPending = save.creatures.some(
        (c) => tasksRemainingFor(care[c.family], today).length > 0,
      )
      const lastChoresDate = stillPending ? save.lastChoresDate : today

      persistWithScheduler({ care, feed, sessions, lastChoresDate })

      // Back to where the animal lives to pick the next task — or the goodnight
      // summary once every animal is cared for.
      const home = save.creatures.find((c) => c.family === family)?.home
      setNav({
        view: { screen: stillPending ? (home === 'zoo' ? 'pettingzoo' : 'barn') : 'summary' },
        stack: [{ screen: 'farmyard' }],
      })
    },
    [persistWithScheduler, save, today],
  )

  const completePractice = useCallback<GameApi['completePractice']>(
    (log) => {
      persistWithScheduler({ sessions: [...save.sessions, log].slice(-200) })
    },
    [persistWithScheduler, save.sessions],
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

  const moveAnimal = useCallback<GameApi['moveAnimal']>(
    (family, home) => {
      persist({
        ...save,
        creatures: save.creatures.map((c) => (c.family === family ? { ...c, home } : c)),
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
      persist({
        ...save,
        creatures: [...save.creatures, creature],
        care: { ...save.care, [creature.family]: emptyAnimalCare(creature.family) },
      })
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
      care: save.care,
      tasksRemaining,
      choreFamilies,
      allChoresDone,
      pendingHatch,
      totalStalls: TOTAL_STALLS,
      lastHotspot,
      go,
      enterHotspot,
      back,
      onGraded,
      buyFeed,
      completeCare,
      completePractice,
      renameCreature,
      moveAnimal,
      claimHatch,
      setMuted,
      exportSave,
      resetSave,
    }),
    [save, scheduler, audio, nav, tasksRemaining, choreFamilies, allChoresDone, pendingHatch, lastHotspot, go, enterHotspot, back, onGraded, buyFeed, completeCare, completePractice, renameCreature, moveAnimal, claimHatch, setMuted, exportSave, resetSave],
  )

  return <GameContext value={api}>{children}</GameContext>
}

export function useGame(): GameApi {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used inside <GameProvider>')
  return ctx
}
