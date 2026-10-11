import { getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import type { AuthDeps } from './application/index.js'
import { firebaseTokenMinter } from './adapters/firebaseTokenMinter.js'
import { firestoreCounterStore } from './adapters/firestoreCounterStore.js'
import { firestoreCredentialStore } from './adapters/firestoreCredentialStore.js'
import { hmacKeyedHasher, nodeRandomBytes, scryptPinHasher } from './adapters/nodeCrypto.js'

/** Our named database — never `(default)`, which belongs to the other games in the project. */
export const DATABASE_ID = 'sanctuary-farm'

/** The game's Hosting origins (`docs/deploy.md`); the emulator adds its local hosting port. */
export function allowedOrigins(inEmulator: boolean): string[] {
  const deployed = ['https://sanctuary-farm.web.app', 'https://sanctuary-farm.firebaseapp.com']
  return inEmulator ? [...deployed, 'http://localhost:5000', 'http://127.0.0.1:5000'] : deployed
}

let built: { pepper: string; deps: AuthDeps } | null = null

/**
 * Wires the ports to Firebase once per instance. The pepper is a secret only
 * readable inside a request, so wiring waits for the first call.
 */
export function authDeps(pepper: string): AuthDeps {
  if (built?.pepper === pepper) return built.deps
  const app = getApps()[0] ?? initializeApp()
  const db = getFirestore(app, DATABASE_ID)
  const deps: AuthDeps = {
    clock: { now: () => Date.now() },
    randomBytes: nodeRandomBytes,
    hasher: hmacKeyedHasher(pepper),
    pins: scryptPinHasher(pepper),
    credentials: firestoreCredentialStore(db),
    counters: firestoreCounterStore(db),
    tokens: firebaseTokenMinter(getAuth(app)),
  }
  built = { pepper, deps }
  return deps
}
