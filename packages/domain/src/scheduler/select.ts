import {
  WEIGHT_HARD_CORE_BONUS,
  WEIGHT_LOW_BOX_BONUS,
  WEIGHT_LOW_BOX_MAX,
  WEIGHT_OVERDUE_MULTIPLIER,
} from '../facts/tuning'
import type { Card } from './cards'
import { firstOf, overdueBy } from './cards'
import { rollingMeanLatency } from './latency'

/** Ties keep the earlier candidate, so table order is the final tiebreak. */
export function mostOverdue(cards: readonly Card[], globalCounter: number): Card {
  return cards.reduce(
    (best, card) => (overdueBy(card, globalCounter) > overdueBy(best, globalCounter) ? card : best),
    firstOf(cards),
  )
}

export function selectionWeight(card: Card, globalCounter: number): number {
  const overdue = Math.max(0, overdueBy(card, globalCounter))
  return (
    overdue * WEIGHT_OVERDUE_MULTIPLIER +
    (card.fact.hardCore ? WEIGHT_HARD_CORE_BONUS : 0) +
    (card.status.box <= WEIGHT_LOW_BOX_MAX ? WEIGHT_LOW_BOX_BONUS : 0)
  )
}

function meanLatencyOf(card: Card): number {
  return rollingMeanLatency(card.status.recentLatencies)
}

export function worstRollingMean(cards: readonly Card[]): Card {
  return cards.reduce(
    (worst, card) => (meanLatencyOf(card) > meanLatencyOf(worst) ? card : worst),
    firstOf(cards),
  )
}

/** Lower box first, then most overdue, then the slowest rolling latency. */
export function byNeed(globalCounter: number): (a: Card, b: Card) => number {
  return (a, b) => {
    if (a.status.box !== b.status.box) return a.status.box - b.status.box
    const overdueGap = overdueBy(b, globalCounter) - overdueBy(a, globalCounter)
    if (overdueGap !== 0) return overdueGap
    const meanA = meanLatencyOf(a)
    const meanB = meanLatencyOf(b)
    if (meanA === meanB) return 0
    return meanB > meanA ? 1 : -1
  }
}
