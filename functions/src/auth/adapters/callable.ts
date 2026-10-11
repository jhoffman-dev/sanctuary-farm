import { HttpsError } from 'firebase-functions/v2/https'
import {
  createAccount,
  signInWithCode,
  signInWithUsernamePin,
  type AuthDeps,
  type NewCredentials,
  type Refusal,
} from '../application/index.js'

/** The slice of a callable request these handlers read — narrow so tests need no Express. */
export interface CallRequest {
  data: unknown
  rawRequest: { headers: Record<string, string | string[] | undefined>; ip?: string | undefined }
}

/**
 * The address Google's front end saw. It *appends* the real client address to
 * `X-Forwarded-For`, after anything the client sent itself, so the right-most
 * entry is the one a caller cannot forge. (Verify after the first deploy:
 * docs/sign-in.md §After deploying.)
 */
export function clientIpOf(rawRequest: CallRequest['rawRequest']): string {
  const header = rawRequest.headers['x-forwarded-for']
  const joined = Array.isArray(header) ? header.join(',') : (header ?? '')
  const entries = joined.split(',').map((entry) => entry.trim()).filter(Boolean)
  return entries.at(-1) ?? rawRequest.ip ?? 'unknown'
}

/** Kind, non-blaming, and the same whether or not the farm exists. */
export const MESSAGES = {
  malformed: 'Check what you typed and try again.',
  notMatched: "That didn't match. Check it and try again, or use your farm code.",
  slowDown: "Let's take a little break. Try again soon.",
} as const

function refuse(refusal: Refusal): never {
  if (refusal.reason === 'slowDown') {
    throw new HttpsError('resource-exhausted', MESSAGES.slowDown, { retryAfterSeconds: refusal.retryAfterSeconds })
  }
  if (refusal.reason === 'notMatched') throw new HttpsError('unauthenticated', MESSAGES.notMatched)
  throw new HttpsError('invalid-argument', MESSAGES.malformed)
}

function fieldsOf(data: unknown): Record<string, unknown> {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) refuse({ ok: false, reason: 'malformed' })
  return data as Record<string, unknown>
}

export async function handleCreateAccount(deps: AuthDeps, request: CallRequest): Promise<Omit<NewCredentials, 'ok'>> {
  const { withUsername = false } = fieldsOf(request.data)
  if (typeof withUsername !== 'boolean') refuse({ ok: false, reason: 'malformed' })
  const outcome = await createAccount(deps, { withUsername, clientIp: clientIpOf(request.rawRequest) })
  if (!outcome.ok) refuse(outcome)
  const { ok: _ok, ...credentials } = outcome
  return credentials
}

export async function handleSignInWithCode(deps: AuthDeps, request: CallRequest): Promise<{ token: string }> {
  const { code } = fieldsOf(request.data)
  const outcome = await signInWithCode(deps, { code, clientIp: clientIpOf(request.rawRequest) })
  if (!outcome.ok) refuse(outcome)
  return { token: outcome.token }
}

export async function handleSignInWithUsernamePin(deps: AuthDeps, request: CallRequest): Promise<{ token: string }> {
  const { username, pin } = fieldsOf(request.data)
  const outcome = await signInWithUsernamePin(deps, { username, pin, clientIp: clientIpOf(request.rawRequest) })
  if (!outcome.ok) refuse(outcome)
  return { token: outcome.token }
}
