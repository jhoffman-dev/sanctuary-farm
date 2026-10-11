import { isStoredCount } from './storedNumber.js'

/** Consecutive PIN failures for one username, as stored between attempts. */
export interface PinAttempts {
  failures: number
  lastFailureAt: number
}

export interface PinLockoutPolicy {
  /** Wrong PINs allowed before any wait: room for a seven-year-old's typos. */
  freeFailures: number
  /** The first wait; each further failure doubles it. */
  firstCooldownMs: number
  maxCooldownMs: number
  /** Quiet time after which old failures are forgotten. */
  forgetAfterMs: number
}

const MINUTE = 60_000
const DAY = 24 * 60 * MINUTE

/**
 * 5 free tries, then 1, 2, 4 … minutes, capped at a day. Numbers and the
 * attack maths behind them: docs/sign-in.md §Lockout.
 */
export const PIN_LOCKOUT_POLICY: PinLockoutPolicy = {
  freeFailures: 5,
  firstCooldownMs: MINUTE,
  maxCooldownMs: DAY,
  forgetAfterMs: 30 * DAY,
}

export type PinAttemptDecision =
  | { allowed: true; next: PinAttempts }
  | { allowed: false; retryAfterMs: number }

/** How long to wait after `failures` consecutive failures (0 = no wait). */
export function cooldownAfter(failures: number, policy: PinLockoutPolicy): number {
  if (failures < policy.freeFailures) return 0
  const doublings = failures - policy.freeFailures
  // 2^31 minutes is far past any cap; stops the shift from overflowing.
  return Math.min(policy.firstCooldownMs * 2 ** Math.min(doublings, 31), policy.maxCooldownMs)
}

/**
 * Decides whether a PIN attempt may run. An allowed attempt is counted as a
 * failure *before* the PIN is checked, and cleared only on success — so two
 * guesses sent at once cannot both slip past the count.
 */
export function decidePinAttempt(
  current: PinAttempts | null,
  now: number,
  policy: PinLockoutPolicy,
): PinAttemptDecision {
  const live = current && now - current.lastFailureAt < policy.forgetAfterMs ? current : null
  if (live) {
    const waitUntil = live.lastFailureAt + cooldownAfter(live.failures, policy)
    if (now < waitUntil) return { allowed: false, retryAfterMs: waitUntil - now }
  }
  return { allowed: true, next: { failures: (live?.failures ?? 0) + 1, lastFailureAt: now } }
}

/** Reads stored attempts back; anything malformed counts as no history. */
export function readPinAttempts(stored: unknown): PinAttempts | null {
  if (typeof stored !== 'object' || stored === null) return null
  const { failures, lastFailureAt } = stored as Record<string, unknown>
  if (!isStoredCount(failures) || !isStoredCount(lastFailureAt)) return null
  return { failures, lastFailureAt }
}
