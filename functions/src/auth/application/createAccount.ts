import {
  CREATE_PER_IP,
  generateAccountId,
  generatePin,
  generateSaveCode,
  generateUsername,
  usernameKey,
} from '../domain/index.js'
import { slowDown, type Refusal } from './outcomes.js'
import type { AuthDeps, NewAccount } from './ports.js'
import { consumeRate } from './throttle.js'

export interface CreateAccountRequest {
  /** Also mint a username + PIN — a convenience on top of the save code. */
  withUsername: boolean
  clientIp: string
}

/** Shown to the child exactly once; never stored in this form. */
export interface NewCredentials {
  ok: true
  token: string
  saveCode: string
  username?: string
  pin?: string
}

/** Collisions are near-impossible for codes and rare for usernames; a few redraws suffice. */
const MAX_DRAWS = 5

/**
 * Makes a farm account: an opaque uid, a save code (always — it is the root
 * credential, and "delete my farm" needs it), and optionally a generated
 * username + PIN. Returns the credentials once plus a token to sign in now.
 */
export async function createAccount(deps: AuthDeps, request: CreateAccountRequest): Promise<NewCredentials | Refusal> {
  const gate = await consumeRate(deps, request.clientIp, CREATE_PER_IP)
  if (!gate.allowed) return slowDown(gate)

  for (let draw = 0; draw < MAX_DRAWS; draw++) {
    const drafted = await draftAccount(deps, request.withUsername)
    const stored = await deps.credentials.createAccount(drafted.account)
    if (stored === 'created') {
      return { ok: true, token: await deps.tokens.mint(drafted.account.uid), ...drafted.shown }
    }
  }
  throw new Error(`createAccount: no free save code or username after ${MAX_DRAWS} draws`)
}

async function draftAccount(
  deps: AuthDeps,
  withUsername: boolean,
): Promise<{ account: NewAccount; shown: { saveCode: string; username?: string; pin?: string } }> {
  const uid = generateAccountId(deps.randomBytes)
  const saveCode = generateSaveCode(deps.randomBytes)
  const account: NewAccount = { uid, saveCodeKey: deps.hasher.key('saveCode', saveCode) }
  if (!withUsername) return { account, shown: { saveCode } }

  const username = generateUsername(deps.randomBytes)
  const pin = generatePin(deps.randomBytes)
  const key = usernameKey(username)
  if (key === null) throw new Error(`generated username ${username} fails the username shape`)
  account.username = { key, pinHash: await deps.pins.hash(pin) }
  return { account, shown: { saveCode, username, pin } }
}
