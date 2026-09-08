import { TIER_UNLOCK_BOX3_SHARE } from '../facts/tuning'
import type { Card } from './cards'
import type { SchedulerState } from './types'

const HIGHEST_TIER = 6
const UNLOCK_BOX = 3

/**
 * Whether a tier has been taken far enough to open the next one. A tier with no
 * cards in play — every "has a 9" fact on an 8×8 table, say — is vacuously
 * satisfied: it can never reach box 3, and treating it as unmet would wall off
 * every tier above it for good.
 */
function tierIsCleared(cards: readonly Card[], tier: number): boolean {
  const inTier = cards.filter((card) => card.fact.tier === tier)
  if (inTier.length === 0) return true
  const atBox3 = inTier.filter((card) => card.status.box >= UNLOCK_BOX).length
  return atBox3 / inTier.length >= TIER_UNLOCK_BOX3_SHARE
}

/**
 * Unlock every tier whose predecessor has reached the box-3 share. Returns the
 * same state object when nothing changed.
 */
export function withUnlockedTiers(state: SchedulerState, cards: readonly Card[]): SchedulerState {
  let unlocked = state.unlockedTiers
  let highest = Math.max(...unlocked)
  while (highest < HIGHEST_TIER && tierIsCleared(cards, highest)) {
    highest += 1
    unlocked = [...unlocked, highest]
  }
  return unlocked === state.unlockedTiers ? state : { ...state, unlockedTiers: unlocked }
}
