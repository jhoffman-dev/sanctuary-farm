import { isStoredCount } from './storedNumber.js'

/** A fixed-window request counter for one caller, as stored between requests. */
export interface WindowCounter {
  windowStartedAt: number
  count: number
}

export interface RateLimitPolicy {
  limit: number
  windowMs: number
}

const MINUTE = 60_000

/**
 * Per network address (hashed). A whole classroom shares one school IP, so the
 * limits are sized for 30 children at once, not for one. Numbers and the
 * enumeration maths: docs/sign-in.md §Rate limits.
 */
export const SIGN_IN_PER_IP: RateLimitPolicy = { limit: 100, windowMs: 10 * MINUTE }
export const CREATE_PER_IP: RateLimitPolicy = { limit: 60, windowMs: 60 * MINUTE }

export type RateDecision =
  | { allowed: true; next: WindowCounter }
  | { allowed: false; retryAfterMs: number }

/** Counts one request, or refuses it if the window is already full. */
export function decideRate(current: WindowCounter | null, now: number, policy: RateLimitPolicy): RateDecision {
  const windowOpen = current !== null && now >= current.windowStartedAt && now - current.windowStartedAt < policy.windowMs
  if (!windowOpen) return { allowed: true, next: { windowStartedAt: now, count: 1 } }
  if (current.count >= policy.limit) {
    return { allowed: false, retryAfterMs: current.windowStartedAt + policy.windowMs - now }
  }
  return { allowed: true, next: { windowStartedAt: current.windowStartedAt, count: current.count + 1 } }
}

/** Reads a stored counter back; anything malformed starts a fresh window. */
export function readWindowCounter(stored: unknown): WindowCounter | null {
  if (typeof stored !== 'object' || stored === null) return null
  const { windowStartedAt, count } = stored as Record<string, unknown>
  if (!isStoredCount(windowStartedAt) || !isStoredCount(count)) return null
  return { windowStartedAt, count }
}
