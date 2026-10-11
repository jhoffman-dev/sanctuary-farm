import { describe, expect, it } from 'vitest'
import { PIN_LOCKOUT_POLICY, cooldownAfter, decidePinAttempt, readPinAttempts } from './pinLockout.js'
import { CREATE_PER_IP, SIGN_IN_PER_IP, decideRate, readWindowCounter } from './rateLimit.js'

const MINUTE = 60_000
const DAY = 24 * 60 * MINUTE
const T0 = Date.UTC(2026, 9, 11, 9, 0, 0)

describe('PIN lockout schedule', () => {
  it('gives five free tries, then waits 1, 2, 4 … minutes, capped at a day', () => {
    const waits = Array.from({ length: 18 }, (_, failures) => cooldownAfter(failures, PIN_LOCKOUT_POLICY) / MINUTE)
    expect(waits).toEqual([0, 0, 0, 0, 0, 1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 1440, 1440])
  })

  it('does not overflow for an absurd failure count', () => {
    expect(cooldownAfter(10_000, PIN_LOCKOUT_POLICY)).toBe(DAY)
  })
})

describe('decidePinAttempt', () => {
  it('allows a first attempt and counts it as a failure up front', () => {
    expect(decidePinAttempt(null, T0, PIN_LOCKOUT_POLICY)).toEqual({
      allowed: true,
      next: { failures: 1, lastFailureAt: T0 },
    })
  })

  it('allows the fifth attempt straight after four failures', () => {
    const decision = decidePinAttempt({ failures: 4, lastFailureAt: T0 }, T0, PIN_LOCKOUT_POLICY)
    expect(decision).toEqual({ allowed: true, next: { failures: 5, lastFailureAt: T0 } })
  })

  it('refuses a sixth attempt for one minute after five failures, and says how long', () => {
    const state = { failures: 5, lastFailureAt: T0 }
    expect(decidePinAttempt(state, T0 + 20_000, PIN_LOCKOUT_POLICY)).toEqual({ allowed: false, retryAfterMs: 40_000 })
    expect(decidePinAttempt(state, T0 + MINUTE, PIN_LOCKOUT_POLICY)).toEqual({
      allowed: true,
      next: { failures: 6, lastFailureAt: T0 + MINUTE },
    })
  })

  it('forgets failures after 30 quiet days', () => {
    const old = { failures: 40, lastFailureAt: T0 }
    expect(decidePinAttempt(old, T0 + 30 * DAY, PIN_LOCKOUT_POLICY)).toEqual({
      allowed: true,
      next: { failures: 1, lastFailureAt: T0 + 30 * DAY },
    })
    expect(decidePinAttempt(old, T0 + 30 * DAY - 1, PIN_LOCKOUT_POLICY).allowed).toBe(true)
    expect(decidePinAttempt(old, T0 + DAY - 1, PIN_LOCKOUT_POLICY).allowed).toBe(false)
  })
})

describe('readPinAttempts', () => {
  it('reads a well-formed record and treats anything else as no history', () => {
    expect(readPinAttempts({ failures: 3, lastFailureAt: T0 })).toEqual({ failures: 3, lastFailureAt: T0 })
    for (const bad of [null, 'x', { failures: -1, lastFailureAt: T0 }, { failures: 1.5, lastFailureAt: T0 }, { failures: 2 }, { failures: '2', lastFailureAt: T0 }]) {
      expect(readPinAttempts(bad)).toBeNull()
    }
  })
})

describe('rate limit policies', () => {
  it('are sized for a classroom behind one address', () => {
    expect(SIGN_IN_PER_IP).toEqual({ limit: 100, windowMs: 10 * MINUTE })
    expect(CREATE_PER_IP).toEqual({ limit: 60, windowMs: 60 * MINUTE })
  })
})

describe('decideRate', () => {
  const policy = { limit: 3, windowMs: MINUTE }

  it('opens a window on the first request and counts up to the limit', () => {
    let counter = null
    for (let i = 1; i <= 3; i++) {
      const decision = decideRate(counter, T0 + i, policy)
      expect(decision.allowed).toBe(true)
      if (decision.allowed) counter = decision.next
    }
    expect(counter).toEqual({ windowStartedAt: T0 + 1, count: 3 })
    expect(decideRate(counter, T0 + 10_000, policy)).toEqual({ allowed: false, retryAfterMs: MINUTE + 1 - 10_000 })
  })

  it('starts a fresh window once the old one has passed', () => {
    const full = { windowStartedAt: T0, count: 3 }
    expect(decideRate(full, T0 + MINUTE, policy)).toEqual({ allowed: true, next: { windowStartedAt: T0 + MINUTE, count: 1 } })
  })

  it('starts fresh if a stored window claims to begin in the future', () => {
    const skewed = { windowStartedAt: T0 + DAY, count: 3 }
    expect(decideRate(skewed, T0, policy)).toEqual({ allowed: true, next: { windowStartedAt: T0, count: 1 } })
  })
})

describe('readWindowCounter', () => {
  it('reads a well-formed counter and treats anything else as a fresh window', () => {
    expect(readWindowCounter({ windowStartedAt: T0, count: 2 })).toEqual({ windowStartedAt: T0, count: 2 })
    for (const bad of [undefined, 7, { count: 2 }, { windowStartedAt: T0, count: Number.NaN }]) {
      expect(readWindowCounter(bad)).toBeNull()
    }
  })
})
