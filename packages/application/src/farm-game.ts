import type { FarmSave, Rng, SessionContext, SessionLog } from '@sf/domain'
import { buyFeedBundle, emptyFarmSave, FLUENT_MAX_MS, gradeAnswer, MIN_TABLE } from '@sf/domain'
import { coinsEarnedFor, feedbackFor, sessionEntryFor } from './feedback'
import type { AudioBus } from './ports/audio-bus'
import type { Clock } from './ports/clock'
import type { SaveStore } from './ports/save-store'
import type {
  AnswerFeedback,
  BuyFeedOutcome,
  FarmSummary,
  Question,
  RoundPlan,
  RoundProgress,
} from './read-models'
import type { ActiveRound, InFlight } from './round'
import {
  beginRound,
  isRoundComplete,
  recordAnswer,
  roundProgress,
  serveQuestion,
  sessionLogFrom,
} from './round'
import { playGradedSounds } from './sounds'
import { summarizeFarm } from './summary'

export type FarmGameDeps = {
  saveStore: SaveStore
  clock: Clock
  rng: Rng
  audio: AudioBus
}

/**
 * The one stateful entry point the UI talks to. Owns "one fact in flight":
 * the scheduler is asked exactly once per question, the same question is
 * returned until it is answered, and latency is read from the injected clock.
 *
 * Every persisting call saves first and commits to memory only once the store
 * has accepted the farm, so a rejected save leaves the game exactly where the
 * caller last saw it. Those calls run one at a time, in order.
 */
export interface FarmGame {
  /** Loads the save or starts a fresh farm. Must be called before anything else. */
  load(): Promise<FarmSummary>
  summary(): FarmSummary
  /**
   * Throws if a round is active (a finished round stays active until endRound),
   * a save is still in progress, or load() hasn't run.
   */
  startRound(plan: RoundPlan): Question
  currentQuestion(): Question | null
  /** Idle (0 of 0) when no round is active. */
  roundProgress(): RoundProgress
  /** Grades the in-flight question; rejects if there is none or the save fails. */
  answer(given: number): Promise<AnswerFeedback>
  /** Closes the round — early is fine — appends its SessionLog to the save and persists. */
  endRound(): Promise<SessionLog>
  buyFeed(): Promise<BuyFeedOutcome>
  setMuted(muted: boolean): Promise<void>
}

/** The farm and round as they will stand once the store has accepted the farm. */
type Snapshot = {
  farm: FarmSave
  round: ActiveRound | null
}

const IDLE_PROGRESS: RoundProgress = { asked: 0, total: 0, complete: false }
const FAMILY_CONTEXTS: readonly SessionContext[] = ['egg', 'stall']

function validatePlan(plan: RoundPlan, maxTable: number): void {
  if (!Number.isInteger(plan.questions) || plan.questions < 1) {
    throw new Error(`startRound: questions must be a positive integer, got ${plan.questions}`)
  }
  if (plan.family === undefined) {
    if (FAMILY_CONTEXTS.includes(plan.context)) {
      throw new Error(`startRound: a '${plan.context}' round needs a family`)
    }
    return
  }
  if (!Number.isInteger(plan.family) || plan.family < MIN_TABLE || plan.family > maxTable) {
    throw new RangeError(
      `startRound: family must be an integer in [${MIN_TABLE}, ${maxTable}], got ${plan.family}`,
    )
  }
}

export function createFarmGame({ saveStore, clock, rng, audio }: FarmGameDeps): FarmGame {
  let farm: FarmSave | null = null
  let round: ActiveRound | null = null
  let queue: Promise<unknown> = Promise.resolve()
  let pendingMutations = 0

  /**
   * Persisting calls run one after another, each against what the previous
   * one committed, so a double-tap grades the question the first tap served —
   * never the same question twice. A rejection reaches its caller through the
   * returned promise; the queue itself carries on.
   */
  function serialized<T>(mutation: () => Promise<T>): Promise<T> {
    pendingMutations += 1
    const result = queue.then(mutation)
    const settle = () => {
      pendingMutations -= 1
    }
    queue = result.then(settle, settle)
    return result
  }

  function requireFarm(): FarmSave {
    if (!farm) throw new Error('FarmGame: call load() first')
    return farm
  }

  function requireRound(): ActiveRound {
    if (!round) throw new Error('FarmGame: no active round')
    return round
  }

  function requireInFlight(): { round: ActiveRound; inFlight: InFlight } {
    const current = requireRound()
    if (!current.inFlight) throw new Error('answer: no question in flight')
    return { round: current, inFlight: current.inFlight }
  }

  /**
   * A clock stepped backwards (NTP correction, a resumed tab) leaves the real
   * latency unknown. The domain rejects a negative one, and 0 would hand out
   * fluency and coins for free, so it grades as correct-but-not-fluent.
   */
  function latencySince(servedAt: number): number {
    const elapsed = clock.now() - servedAt
    return elapsed < 0 ? FLUENT_MAX_MS : elapsed
  }

  /** The store must accept the farm before the game moves; a rejection leaves everything as it was. */
  async function commit(next: Snapshot): Promise<void> {
    await saveStore.save(next.farm)
    farm = next.farm
    round = next.round
  }

  function serve(current: ActiveRound, save: FarmSave): { next: Snapshot; question: Question } {
    const served = serveQuestion({ round: current, scheduler: save.scheduler, rng, now: clock.now() })
    return {
      next: { farm: { ...save, scheduler: served.scheduler }, round: served.round },
      question: served.question,
    }
  }

  /** The next question unless the round is done; either way, the state to commit. */
  function advance(answered: ActiveRound, save: FarmSave): { next: Snapshot; question: Question | null } {
    if (!isRoundComplete(answered)) return serve(answered, save)
    return { next: { farm: save, round: answered }, question: null }
  }

  function load(): Promise<FarmSummary> {
    return serialized(async () => {
      const loaded = (await saveStore.load()) ?? emptyFarmSave()
      farm = loaded
      round = null
      audio.setMuted(loaded.settings.muted)
      return summarizeFarm(loaded)
    })
  }

  function startRound(plan: RoundPlan): Question {
    const save = requireFarm()
    if (round) throw new Error('startRound: a round is already active')
    // Serving is synchronous and unsaved; a commit landing afterwards would overwrite it.
    if (pendingMutations > 0) throw new Error('startRound: a save is still in progress')
    validatePlan(plan, save.scheduler.maxTable)
    const { next, question } = serve(beginRound(plan, clock.now()), save)
    farm = next.farm
    round = next.round
    return question
  }

  function answer(given: number): Promise<AnswerFeedback> {
    return serialized(async () => {
      const { round: current, inFlight } = requireInFlight()
      const save = requireFarm()
      const latencyMs = latencySince(inFlight.servedAt)
      const { question, askedAt } = inFlight
      const graded = gradeAnswer(save.scheduler, { factId: question.factId, given, latencyMs })
      const moment = { question, result: graded.result, given, latencyMs, askedAt }
      const coinsEarned = coinsEarnedFor(current.plan.context, graded.result)
      const answered = recordAnswer(current, sessionEntryFor(moment))
      const { next, question: following } = advance(answered, {
        ...save,
        scheduler: graded.state,
        coins: save.coins + coinsEarned,
      })
      await commit(next)
      playGradedSounds(audio, graded.result)
      return feedbackFor(moment, coinsEarned, following)
    })
  }

  function endRound(): Promise<SessionLog> {
    return serialized(async () => {
      const save = requireFarm()
      const log = sessionLogFrom(requireRound(), clock.now())
      await commit({ farm: { ...save, sessions: [...save.sessions, log] }, round: null })
      return log
    })
  }

  function buyFeed(): Promise<BuyFeedOutcome> {
    return serialized(async () => {
      const bought = buyFeedBundle(requireFarm())
      if (!bought.ok) return bought
      await commit({ farm: bought.farm, round })
      return { ok: true, summary: summarizeFarm(bought.farm) }
    })
  }

  function setMuted(muted: boolean): Promise<void> {
    return serialized(async () => {
      const save = requireFarm()
      await commit({ farm: { ...save, settings: { ...save.settings, muted } }, round })
      audio.setMuted(muted)
    })
  }

  return {
    load,
    summary: () => summarizeFarm(requireFarm()),
    startRound,
    currentQuestion: () => round?.inFlight?.question ?? null,
    roundProgress: () => (round ? roundProgress(round) : IDLE_PROGRESS),
    answer,
    endRound,
    buyFeed,
    setMuted,
  }
}
