import type { Fact, FactState } from '../facts/fact'
import { buildFacts } from '../facts/table'
import type { SchedulerState } from './types'

/** A fact paired with its learning state — the unit the scheduler reasons about. */
export type Card = {
  readonly fact: Fact
  readonly status: FactState
}

/** Every in-range fact that has a learning state. Facts missing from the state are inert. */
export function cardsInPlay(state: SchedulerState): Card[] {
  return buildFacts(state.maxTable).flatMap((fact) => {
    const status = state.facts[fact.id]
    return status ? [{ fact, status }] : []
  })
}

export function cardsInFamily(state: SchedulerState, family: number): Card[] {
  return cardsInPlay(state).filter((card) => card.fact.family === family)
}

/** Questions since the card fell due; negative while it is still waiting. */
export function overdueBy(card: Card, globalCounter: number): number {
  return globalCounter - card.status.dueAt
}

export function isDue(card: Card, globalCounter: number): boolean {
  return overdueBy(card, globalCounter) >= 0
}

export function withStatus(state: SchedulerState, status: FactState): SchedulerState {
  return { ...state, facts: { ...state.facts, [status.id]: status } }
}

export function firstOf(cards: readonly Card[]): Card {
  const first = cards[0]
  if (!first) throw new Error('scheduler: no candidate facts')
  return first
}
