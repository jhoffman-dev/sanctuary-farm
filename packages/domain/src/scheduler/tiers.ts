import { TIER_UNLOCK_BOX3_SHARE } from '../facts/tuning'
import type { Card } from './cards'
import type { SchedulerState } from './types'

const HIGHEST_TIER = 6
const UNLOCK_BOX = 3

function box3Share(cards: readonly Card[], tier: number): number {
  const inTier = cards.filter((card) => card.fact.tier === tier)
  if (inTier.length === 0) return 0
  const atBox3 = inTier.filter((card) => card.status.box >= UNLOCK_BOX).length
  return atBox3 / inTier.length
}

/**
 * Unlock every tier whose predecessor has reached the box-3 share. Returns the
 * same state object when nothing changed.
 */
export function withUnlockedTiers(state: SchedulerState, cards: readonly Card[]): SchedulerState {
  let unlocked = state.unlockedTiers
  let highest = Math.max(...unlocked)
  while (highest < HIGHEST_TIER && box3Share(cards, highest) >= TIER_UNLOCK_BOX3_SHARE) {
    highest += 1
    unlocked = [...unlocked, highest]
  }
  return unlocked === state.unlockedTiers ? state : { ...state, unlockedTiers: unlocked }
}
