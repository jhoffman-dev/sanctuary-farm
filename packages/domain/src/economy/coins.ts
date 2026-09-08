import type { Outcome } from '../facts/fact'
import type { FarmSave, SessionContext } from '../save/farm-save'

export const COINS_PER_CORRECT = 1
/** Total coins for a fluent answer — not added on top of COINS_PER_CORRECT. */
export const COINS_PER_FLUENT = 2
/** Feed granted on a fresh save so day one can begin. */
export const STARTING_FEED = 12
/** Feed shed: this many feed units for this many coins, fixed price. */
export const FEED_BUNDLE_UNITS = 10
export const FEED_BUNDLE_PRICE = 6
/** Feed consumed by one feeding. Watering / cleaning / play cost no feed. */
export const FEED_PER_FEEDING = 3

/** Coins minted by one graded answer. Speed pays; a wrong answer pays nothing. */
export function coinsFor(outcome: Outcome): number {
  switch (outcome) {
    case 'FLUENT':
      return COINS_PER_FLUENT
    case 'SLOW':
    case 'LABORED':
      return COINS_PER_CORRECT
    case 'WRONG':
      return 0
  }
}

/** Coins come only from the paddock and the nest — care tasks and free play never mint. */
export function contextEarnsCoins(context: SessionContext): boolean {
  return context === 'paddock' || context === 'egg'
}

export type BuyFeedResult =
  | { ok: true; farm: FarmSave }
  | { ok: false; reason: 'not-enough-coins' }

export function buyFeedBundle(farm: FarmSave): BuyFeedResult {
  if (farm.coins < FEED_BUNDLE_PRICE) return { ok: false, reason: 'not-enough-coins' }
  return {
    ok: true,
    farm: { ...farm, coins: farm.coins - FEED_BUNDLE_PRICE, feed: farm.feed + FEED_BUNDLE_UNITS },
  }
}
