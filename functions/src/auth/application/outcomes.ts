import type { Gate } from './throttle.js'

/**
 * Why a request was refused. Deliberately coarse: "not matched" covers an
 * unknown code, an unknown username and a wrong PIN alike, so a refusal never
 * reveals whether a farm exists.
 */
export type Refusal =
  | { ok: false; reason: 'malformed' }
  | { ok: false; reason: 'notMatched' }
  | { ok: false; reason: 'slowDown'; retryAfterSeconds: number }

export type SignInOutcome = { ok: true; token: string } | Refusal

export function slowDown(gate: Extract<Gate, { allowed: false }>): Refusal {
  return { ok: false, reason: 'slowDown', retryAfterSeconds: Math.max(1, Math.ceil(gate.retryAfterMs / 1000)) }
}

export const MALFORMED: Refusal = { ok: false, reason: 'malformed' }
export const NOT_MATCHED: Refusal = { ok: false, reason: 'notMatched' }
