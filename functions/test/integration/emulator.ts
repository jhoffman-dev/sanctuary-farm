import { getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

/** The emulator-only project; it cannot reach any real Google API. */
export const PROJECT_ID = 'demo-sanctuary-farm'
const FUNCTIONS_ORIGIN = 'http://127.0.0.1:5001'

if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  throw new Error('Run these through `pnpm test:auth`: the Auth and Firestore emulators are not up.')
}

export const app = getApps()[0] ?? initializeApp({ projectId: PROJECT_ID })
export const db = getFirestore(app, 'sanctuary-farm')
export const auth = getAuth(app)

let addressCounter = 0
/** A fresh TEST-NET address per caller, so each test has its own rate-limit bucket. */
export function freshIp(): string {
  addressCounter += 1
  return `198.51.${Math.floor(addressCounter / 250)}.${(addressCounter % 250) + 1}`
}

export type CallResult =
  | { ok: true; result: Record<string, string> }
  | { ok: false; status: string; message: string; details?: unknown }

/** Calls a deployed-in-the-emulator callable over the wire, as a client would. */
export async function callFunction(name: string, data: unknown, ip: string): Promise<CallResult> {
  const response = await fetch(`${FUNCTIONS_ORIGIN}/${PROJECT_ID}/us-central1/${name}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify({ data }),
  })
  const body = (await response.json()) as { result?: Record<string, string>; error?: { status: string; message: string; details?: unknown } }
  if (body.error) return { ok: false, ...body.error }
  if (!body.result) throw new Error(`${name}: neither result nor error in ${JSON.stringify(body)}`)
  return { ok: true, result: body.result }
}

/**
 * Exchanges a custom token at the Auth emulator, as the game client will, and
 * returns the signed-in user's id and the token's own claims.
 */
export async function exchangeCustomToken(token: string): Promise<{ uid: string; claims: Record<string, unknown> }> {
  const response = await fetch(
    `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=demo-key`,
    { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token, returnSecureToken: true }) },
  )
  const body = (await response.json()) as { idToken?: string; error?: unknown }
  if (!body.idToken) throw new Error(`custom token refused: ${JSON.stringify(body.error)}`)
  const decoded = await auth.verifyIdToken(body.idToken)
  return { uid: decoded.uid, claims: decoded }
}

/** Every document in a collection, as plain objects. */
export async function allDocs(collection: string): Promise<Array<{ id: string; fields: Record<string, unknown> }>> {
  const snapshot = await db.collection(collection).get()
  return snapshot.docs.map((doc) => ({ id: doc.id, fields: doc.data() }))
}

/** Wipes the emulator's `sanctuary-farm` database through the emulator-only REST API. */
export async function clearFirestore(): Promise<void> {
  const url = `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJECT_ID}/databases/sanctuary-farm/documents`
  const response = await fetch(url, { method: 'DELETE' })
  if (!response.ok) throw new Error(`could not clear the Firestore emulator: ${response.status}`)
}
