import type { FarmSave, Rng, SessionContext, SessionLog } from '@sf/domain'
import { buyFeedBundle, emptyFarmSave, gradeAnswer } from '@sf/domain'
import { coinsEarnedFor, feedbackFor, sessionEntryFor } from './feedback'
import type { AudioBus } from './ports/audio-bus'
import type { Clock } from './ports/clock'
import type { IdProvider } from './ports/id-provider'
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
  /** Not consumed yet — reserved for Phase 4 save codes. */
  ids: IdProvider
}

/**
 * The one stateful entry point the UI talks to. Owns "one fact in flight":
 * the scheduler is asked exactly once per question, the same question is
 * returned until it is answered, and latency is read from the injected clock.
 */
export interface FarmGame {
  /** Loads the save or starts a fresh farm. Must be called before anything else. */
  load(): Promise<FarmSummary>
  summary(): FarmSummary
  /** Throws if a round is active (a finished round stays active until endRound) or load() hasn't run. */
  startRound(plan: RoundPlan): Question
  currentQuestion(): Question | null
  /** Idle (0 of 0) when no round is active. */
  roundProgress(): RoundProgress
  /** Grades the in-flight question; throws if there is none. */
  answer(given: number): Promise<AnswerFeedback>
  /** Closes the round — early is fine — appends its SessionLog to the save and persists. */
  endRound(): Promise<SessionLog>
  buyFeed(): Promise<BuyFeedOutcome>
  setMuted(muted: boolean): Promise<void>
}

const IDLE_PROGRESS: RoundProgress = { asked: 0, total: 0, complete: false }
const FAMILY_CONTEXTS: readonly SessionContext[] = ['egg', 'stall']

function validatePlan(plan: RoundPlan): void {
  if (!Number.isInteger(plan.questions) || plan.questions < 1) {
    throw new Error(`startRound: questions must be a positive integer, got ${plan.questions}`)
  }
  if (plan.family === undefined && FAMILY_CONTEXTS.includes(plan.context)) {
    throw new Error(`startRound: a '${plan.context}' round needs a family`)
  }
}

export function createFarmGame({ saveStore, clock, rng, audio }: FarmGameDeps): FarmGame {
  let farm: FarmSave | null = null
  let round: ActiveRound | null = null

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

  async function persist(next: FarmSave): Promise<void> {
    farm = next
    await saveStore.save(next)
  }

  function serve(current: ActiveRound, save: FarmSave): Question {
    const served = serveQuestion({ round: current, scheduler: save.scheduler, rng, now: clock.now() })
    round = served.round
    farm = { ...save, scheduler: served.scheduler }
    return served.question
  }

  /** Serve the next question unless the round is done; commits round + farm either way. */
  function advance(answered: ActiveRound, save: FarmSave): Question | null {
    if (!isRoundComplete(answered)) return serve(answered, save)
    round = answered
    farm = save
    return null
  }

  async function load(): Promise<FarmSummary> {
    const loaded = (await saveStore.load()) ?? emptyFarmSave()
    farm = loaded
    round = null
    audio.setMuted(loaded.settings.muted)
    return summarizeFarm(loaded)
  }

  function startRound(plan: RoundPlan): Question {
    const save = requireFarm()
    if (round) throw new Error('startRound: a round is already active')
    validatePlan(plan)
    return serve(beginRound(plan, clock.now()), save)
  }

  async function answer(given: number): Promise<AnswerFeedback> {
    const { round: current, inFlight } = requireInFlight()
    const save = requireFarm()
    const latencyMs = clock.now() - inFlight.servedAt
    const { question, askedAt } = inFlight
    const graded = gradeAnswer(save.scheduler, { factId: question.factId, given, latencyMs })
    const moment = { question, result: graded.result, given, latencyMs, askedAt }
    const coinsEarned = coinsEarnedFor(current.plan.context, graded.result)
    const answered = recordAnswer(current, sessionEntryFor(moment))
    const next = advance(answered, {
      ...save,
      scheduler: graded.state,
      coins: save.coins + coinsEarned,
    })
    playGradedSounds(audio, graded.result)
    await saveStore.save(requireFarm())
    return feedbackFor(moment, coinsEarned, next)
  }

  async function endRound(): Promise<SessionLog> {
    const save = requireFarm()
    const log = sessionLogFrom(requireRound(), clock.now())
    round = null
    await persist({ ...save, sessions: [...save.sessions, log] })
    return log
  }

  async function buyFeed(): Promise<BuyFeedOutcome> {
    const bought = buyFeedBundle(requireFarm())
    if (!bought.ok) return bought
    await persist(bought.farm)
    return { ok: true, summary: summarizeFarm(bought.farm) }
  }

  async function setMuted(muted: boolean): Promise<void> {
    const save = requireFarm()
    audio.setMuted(muted)
    await persist({ ...save, settings: { ...save.settings, muted } })
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
