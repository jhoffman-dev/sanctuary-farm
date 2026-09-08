import { describe, expect, it } from 'vitest'
import { emptyFarmSave } from '../save/empty'
import {
  FEED_BUNDLE_PRICE,
  FEED_BUNDLE_UNITS,
  buyFeedBundle,
  coinsFor,
  contextEarnsCoins,
} from './coins'

describe('coinsFor — speed pays, wrong pays nothing', () => {
  it('maps every outcome', () => {
    expect(coinsFor('FLUENT')).toBe(2)
    expect(coinsFor('SLOW')).toBe(1)
    expect(coinsFor('LABORED')).toBe(1)
    expect(coinsFor('WRONG')).toBe(0)
  })
})

describe('contextEarnsCoins — only the paddock and the nest mint', () => {
  it('paddock and egg earn; stall and free play do not', () => {
    expect(contextEarnsCoins('paddock')).toBe(true)
    expect(contextEarnsCoins('egg')).toBe(true)
    expect(contextEarnsCoins('stall')).toBe(false)
    expect(contextEarnsCoins('free')).toBe(false)
  })
})

describe('buyFeedBundle', () => {
  it('swaps the fixed price for the bundle', () => {
    const farm = { ...emptyFarmSave(), coins: FEED_BUNDLE_PRICE + 1, feed: 2 }
    const bought = buyFeedBundle(farm)
    expect(bought.ok).toBe(true)
    if (bought.ok) {
      expect(bought.farm.coins).toBe(1)
      expect(bought.farm.feed).toBe(2 + FEED_BUNDLE_UNITS)
      expect(bought.farm.scheduler).toBe(farm.scheduler)
    }
  })

  it('refuses when the farm cannot afford it', () => {
    const farm = { ...emptyFarmSave(), coins: FEED_BUNDLE_PRICE - 1 }
    expect(buyFeedBundle(farm)).toEqual({ ok: false, reason: 'not-enough-coins' })
  })

  it('can spend the last coin exactly', () => {
    const bought = buyFeedBundle({ ...emptyFarmSave(), coins: FEED_BUNDLE_PRICE })
    expect(bought.ok && bought.farm.coins).toBe(0)
  })
})
