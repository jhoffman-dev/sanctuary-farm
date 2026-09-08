import { cardsInPlay } from './cards'
import { pickIntroduction } from './introduce'
import type { SchedulerState } from './types'

/**
 * Whether the scheduler has a fact to serve from this state exactly as it
 * stands — one already introduced, or one it may introduce now. When neither
 * holds, nextFact has no candidate and throws, so a restored save that fails
 * this is not playable and the caller should start a fresh farm instead.
 *
 * Deliberately judged on the stored tiers, without running the unlock rule
 * first: a save whose own unlocked tiers reach none of its own facts is one the
 * game never wrote, whatever the scheduler would go on to unlock for it.
 */
export function hasPlayableFact(state: SchedulerState): boolean {
  const cards = cardsInPlay(state)
  return cards.some((card) => card.status.introduced) || pickIntroduction(state, cards) !== null
}
