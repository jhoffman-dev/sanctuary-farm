import { defineSecret } from 'firebase-functions/params'
import { onCall, onRequest, type CallableOptions } from 'firebase-functions/v2/https'
import {
  handleCreateAccount,
  handleSignInWithCode,
  handleSignInWithUsernamePin,
} from './auth/adapters/callable.js'
import { allowedOrigins, authDeps } from './auth/composition.js'
import { respondHealth } from './health.js'

/**
 * Liveness probe for the deploy pipeline and the emulator. Returns no data
 * about anyone.
 */
export const health = onRequest({ region: 'us-central1', cors: false }, respondHealth)

/**
 * The HMAC pepper for save codes, PINs and throttle keys. Set once by James
 * with `firebase functions:secrets:set SANCTUARY_FARM_AUTH_PEPPER` — never in
 * git. Named for the game because Secret Manager is shared with the project's
 * other games.
 */
const authPepper = defineSecret('SANCTUARY_FARM_AUTH_PEPPER')

const callableOptions: CallableOptions = {
  region: 'us-central1',
  cors: allowedOrigins(process.env.FUNCTIONS_EMULATOR === 'true'),
  secrets: [authPepper],
  // A cold scrypt instance is the slow path; keep a burst from fanning out wide.
  maxInstances: 10,
}

/** Mints a save code (and optionally username + PIN) for a new farm. Returns them once. */
export const createAccount = onCall(callableOptions, (request) =>
  handleCreateAccount(authDeps(authPepper.value()), request),
)

export const signInWithCode = onCall(callableOptions, (request) =>
  handleSignInWithCode(authDeps(authPepper.value()), request),
)

export const signInWithUsernamePin = onCall(callableOptions, (request) =>
  handleSignInWithUsernamePin(authDeps(authPepper.value()), request),
)
