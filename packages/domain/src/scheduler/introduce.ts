import type { Card } from './cards'
import { withStatus } from './cards'
import { avoidingFamily, blockedFamily } from './interleave'
import type { SchedulerState } from './types'

function lowestTierWithUnintroduced(state: SchedulerState, cards: readonly Card[]): number | null {
  const tiers = [...state.unlockedTiers].sort((a, b) => a - b)
  return (
    tiers.find((tier) =>
      cards.some((card) => card.fact.tier === tier && !card.status.introduced),
    ) ?? null
  )
}

/**
 * The first un-introduced fact (table order) in the lowest unlocked tier that
 * still has one, steered away from the blocked family when the tier offers a choice.
 */
export function pickIntroduction(state: SchedulerState, cards: readonly Card[]): Card | null {
  const tier = lowestTierWithUnintroduced(state, cards)
  if (tier === null) return null
  const candidates = cards.filter((card) => card.fact.tier === tier && !card.status.introduced)
  return avoidingFamily(candidates, blockedFamily(state))[0] ?? null
}

/** Mark a card introduced at box 1 and due right now. */
export function introduce(state: SchedulerState, card: Card): SchedulerState {
  return withStatus(state, {
    ...card.status,
    introduced: true,
    box: 1,
    dueAt: state.globalCounter,
  })
}
