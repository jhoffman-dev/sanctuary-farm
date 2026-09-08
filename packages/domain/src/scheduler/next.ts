import { DUE_WEIGHTING_THRESHOLD, EGG_ROTATION, MIN_DUE_BEFORE_INTRODUCE } from '../facts/tuning'
import type { Rng } from '../rng'
import { weightedPick } from '../rng'
import type { Card } from './cards'
import { cardsInFamily, cardsInPlay, firstOf, isDue } from './cards'
import { avoidingFamily, blockedFamily, serve } from './interleave'
import { introduce, pickIntroduction } from './introduce'
import { isFactMastered } from './progress'
import { byNeed, mostOverdue, selectionWeight, worstRollingMean } from './select'
import { withUnlockedTiers } from './tiers'
import type { NextFact, SchedulerState } from './types'

function introduceNext(state: SchedulerState, cards: readonly Card[]): NextFact | null {
  const pick = pickIntroduction(state, cards)
  return pick ? serve(introduce(state, pick), pick.fact) : null
}

type DueRound = {
  state: SchedulerState
  cards: readonly Card[]
  introduced: readonly Card[]
  due: readonly Card[]
  rng: Rng
}

/**
 * Every due fact is the blocked family. Rather than break the interleave rule,
 * introduce a fresh fact or pull another family's soonest-due fact forward.
 * Null only when the board has a single family.
 */
function pullAnotherFamilyForward(
  { state, cards, introduced }: DueRound,
  blocked: number,
): NextFact | null {
  const pick = pickIntroduction(state, cards)
  if (pick && pick.fact.family !== blocked) return serve(introduce(state, pick), pick.fact)
  const elsewhere = introduced
    .filter((card) => card.fact.family !== blocked)
    .toSorted((a, b) => a.status.dueAt - b.status.dueAt)
  const soonest = elsewhere[0]
  return soonest ? serve(state, soonest.fact) : null
}

function serveDue(round: DueRound): NextFact {
  const { state, due, rng } = round
  const blocked = blockedFamily(state)
  const unblocked = due.filter((card) => card.fact.family !== blocked)
  if (unblocked.length === 0 && blocked !== null) {
    const pulled = pullAnotherFamilyForward(round, blocked)
    if (pulled) return pulled
  }
  const pool = unblocked.length > 0 ? unblocked : due
  // Weight only when comfortably many are due; otherwise the most overdue wins.
  if (due.length > DUE_WEIGHTING_THRESHOLD) {
    const weights = pool.map((card) => selectionWeight(card, state.globalCounter))
    return serve(state, weightedPick(pool, weights, rng).fact)
  }
  return serve(state, mostOverdue(pool, state.globalCounter).fact)
}

/** The next fact for mixed practice: introduce, or serve what is due, or drill the slowest. */
export function nextFact(initial: SchedulerState, rng: Rng): NextFact {
  const cards = cardsInPlay(initial)
  const state = withUnlockedTiers(initial, cards)
  const introduced = cards.filter((card) => card.status.introduced)
  const due = introduced.filter((card) => isDue(card, state.globalCounter))

  if (due.length < MIN_DUE_BEFORE_INTRODUCE) {
    const fresh = introduceNext(state, cards)
    if (fresh) return fresh
  }
  if (due.length === 0) {
    const pool = avoidingFamily(introduced, blockedFamily(state))
    return serve(state, worstRollingMean(pool).fact)
  }
  return serveDue({ state, cards, introduced, due, rng })
}

function needingWork(cards: readonly Card[]): Card[] {
  return cards.filter((card) => card.status.introduced && !isFactMastered(card.status))
}

/** Keep ~EGG_ROTATION unmastered facts of the family in play, introducing in table order. */
function topUpRotation(state: SchedulerState, family: readonly Card[]): SchedulerState {
  if (needingWork(family).length >= EGG_ROTATION) return state
  const next = family.find((card) => !card.status.introduced)
  return next ? introduce(state, next) : state
}

/**
 * The next fact for practising one family (an egg). Drives the family towards
 * mastery with variety: a rotation of its facts, never the same one twice in a row.
 * Falls back to mixed practice when the family has no facts in range.
 */
export function nextFactInFamily(initial: SchedulerState, family: number, rng: Rng): NextFact {
  if (cardsInFamily(initial, family).length === 0) return nextFact(initial, rng)
  const state = topUpRotation(initial, cardsInFamily(initial, family))
  const cards = cardsInFamily(state, family)
  const unmastered = needingWork(cards)
  const pool = unmastered.length > 0 ? unmastered : cards.filter((card) => card.status.introduced)
  const notJustAsked = pool.filter((card) => card.fact.id !== state.lastServed)
  const candidates = notJustAsked.length > 0 ? notJustAsked : pool
  return serve(state, firstOf(candidates.toSorted(byNeed(state.globalCounter))).fact)
}
