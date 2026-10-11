import { Timestamp, type Firestore } from 'firebase-admin/firestore'
import type { CounterBucket, CounterStore } from '../application/index.js'

/**
 * Throttle state, server-only like the credentials (`firestore.rules` denies
 * every path it does not name). Document ids are HMACs, so neither a network
 * address nor whatever was typed as a username is stored.
 */
export const COUNTER_COLLECTIONS: Record<CounterBucket, string> = {
  rateLimits: 'authRateLimits',
  pinAttempts: 'authPinAttempts',
}

/** The TTL field; a Firestore TTL policy on it deletes stale counters (docs/sign-in.md). */
export const EXPIRES_AT = 'expiresAt'

export function firestoreCounterStore(db: Firestore): CounterStore {
  return {
    update(bucket, key, apply) {
      const ref = db.collection(COUNTER_COLLECTIONS[bucket]).doc(key)
      return db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(ref)
        const { write, result } = apply(snapshot.exists ? withoutExpiry(snapshot.data()) : null)
        if (write.kind === 'delete') transaction.delete(ref)
        if (write.kind === 'set') {
          transaction.set(ref, { ...write.state, [EXPIRES_AT]: Timestamp.fromMillis(write.expiresAt) })
        }
        return result
      })
    },
  }
}

function withoutExpiry(stored: Record<string, unknown> | undefined): Record<string, unknown> | null {
  if (!stored) return null
  const { [EXPIRES_AT]: _expiresAt, ...state } = stored
  return state
}
