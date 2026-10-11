import { SIGN_IN_PER_IP, isWellFormedPin, normalizeSaveCode, usernameKey } from '../domain/index.js'
import { MALFORMED, NOT_MATCHED, slowDown, type SignInOutcome } from './outcomes.js'
import type { AuthDeps } from './ports.js'
import { beginPinAttempt, clearPinAttempts, consumeRate } from './throttle.js'

export interface CodeSignIn {
  code: unknown
  clientIp: string
}

/** Signs in with a save code. Codes are reusable bearer credentials. */
export async function signInWithCode(deps: AuthDeps, request: CodeSignIn): Promise<SignInOutcome> {
  const gate = await consumeRate(deps, request.clientIp, SIGN_IN_PER_IP)
  if (!gate.allowed) return slowDown(gate)

  const code = normalizeSaveCode(request.code)
  if (code === null) return MALFORMED
  const uid = await deps.credentials.uidForSaveCode(deps.hasher.key('saveCode', code))
  if (uid === null) return NOT_MATCHED
  return { ok: true, token: await deps.tokens.mint(uid) }
}

export interface UsernamePinSignIn {
  username: unknown
  pin: unknown
  clientIp: string
}

/**
 * Signs in with a generated username + PIN. Every path past the format check
 * does one PIN-hash verification and counts against the typed name's lockout,
 * so an unknown name and a wrong PIN are indistinguishable in answer and time.
 */
export async function signInWithUsernamePin(deps: AuthDeps, request: UsernamePinSignIn): Promise<SignInOutcome> {
  const gate = await consumeRate(deps, request.clientIp, SIGN_IN_PER_IP)
  if (!gate.allowed) return slowDown(gate)

  const key = usernameKey(request.username)
  if (key === null || !isWellFormedPin(request.pin)) return MALFORMED

  const attempt = await beginPinAttempt(deps, key)
  if (!attempt.allowed) return slowDown(attempt)

  const record = await deps.credentials.usernameRecord(key)
  const matched = await deps.pins.verify(request.pin, record?.pinHash ?? null)
  if (!record || !matched) return NOT_MATCHED

  await clearPinAttempts(deps, key)
  return { ok: true, token: await deps.tokens.mint(record.uid) }
}
