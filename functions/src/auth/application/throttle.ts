import {
  PIN_LOCKOUT_POLICY,
  decidePinAttempt,
  decideRate,
  readPinAttempts,
  readWindowCounter,
  type RateLimitPolicy,
} from '../domain/index.js'
import type { AuthDeps } from './ports.js'

/** Allowed, or how long to wait. */
export type Gate = { allowed: true } | { allowed: false; retryAfterMs: number }

type ThrottleDeps = Pick<AuthDeps, 'clock' | 'hasher' | 'counters'>

/** Counts one request from `clientIp` against `policy`. */
export function consumeRate(deps: ThrottleDeps, clientIp: string, policy: RateLimitPolicy): Promise<Gate> {
  const now = deps.clock.now()
  // The window length is part of the key so each policy counts on its own.
  const key = deps.hasher.key('clientAddress', `${policy.windowMs}:${clientIp}`)
  return deps.counters.update<Gate>('rateLimits', key, (stored) => {
    const decision = decideRate(readWindowCounter(stored), now, policy)
    if (!decision.allowed) return { write: { kind: 'keep' }, result: decision }
    const expiresAt = decision.next.windowStartedAt + policy.windowMs
    return { write: { kind: 'set', state: { ...decision.next }, expiresAt }, result: { allowed: true } }
  })
}

/**
 * Reserves one PIN attempt for a username, counting it as a failure up front
 * (see `decidePinAttempt`). Keyed by a hash of the typed name, whether or not
 * the account exists, so a locked-out unknown name looks exactly like a
 * locked-out real one.
 */
export function beginPinAttempt(deps: ThrottleDeps, usernameKey: string): Promise<Gate> {
  const now = deps.clock.now()
  const key = deps.hasher.key('pinAttempts', usernameKey)
  return deps.counters.update<Gate>('pinAttempts', key, (stored) => {
    const decision = decidePinAttempt(readPinAttempts(stored), now, PIN_LOCKOUT_POLICY)
    if (!decision.allowed) return { write: { kind: 'keep' }, result: decision }
    const expiresAt = now + PIN_LOCKOUT_POLICY.forgetAfterMs
    return { write: { kind: 'set', state: { ...decision.next }, expiresAt }, result: { allowed: true } }
  })
}

/** Forgets a username's failures after a correct PIN. */
export function clearPinAttempts(deps: ThrottleDeps, usernameKey: string): Promise<void> {
  const key = deps.hasher.key('pinAttempts', usernameKey)
  return deps.counters.update<void>('pinAttempts', key, () => ({ write: { kind: 'delete' }, result: undefined }))
}
