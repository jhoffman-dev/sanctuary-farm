export type { Clock } from './ports/clock'
export type { SaveStore } from './ports/save-store'
export type { AudioBus, SoundName } from './ports/audio-bus'
export type { Rng } from '@sf/domain'
/**
 * The domain's seeded generator, for the composition root to hand the tile
 * world as its `RngFactory`: apps may not import domain behaviour directly,
 * and a copy could drift from the stream the domain draws.
 */
export { createRng } from '@sf/domain'

export type {
  AnswerFeedback,
  BuyFeedOutcome,
  FamilySummary,
  FarmSummary,
  Question,
  RoundPlan,
  RoundProgress,
} from './read-models'
export { PADDOCK_ROUND } from './round-presets'
export type { ArrivalOutcome, HotspotArrivals } from './hotspot-arrival'
export { createHotspotArrivals } from './hotspot-arrival'
export type { FarmGame, FarmGameDeps } from './farm-game'
export { createFarmGame } from './farm-game'
