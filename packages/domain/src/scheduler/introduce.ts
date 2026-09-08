import type { Card } from './cards'
import { withStatus } from './cards'
import { blockedFamily } from './interleave'
import type { SchedulerState } from './types'

function introducible(state: SchedulerState, blocked: number | null): (card: Card) => boolean {
  return (card) =>
    !card.status.introduced &&
    state.unlockedTiers.includes(card.fact.tier) &&
    card.fact.family !== blocked
}

/**
 * The next fact to introduce: lowest unlocked tier first, table order within it.
 * The blocked family is never chosen — introducing it would break the interleave
 * rule — so a tier whose remaining facts are all that family is passed over for
 * a higher unlocked tier, and null means no other family can be introduced yet.
 */
export function pickIntroduction(state: SchedulerState, cards: readonly Card[]): Card | null {
  const candidates = cards.filter(introducible(state, blockedFamily(state)))
  return candidates.toSorted((a, b) => a.fact.tier - b.fact.tier)[0] ?? null
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
