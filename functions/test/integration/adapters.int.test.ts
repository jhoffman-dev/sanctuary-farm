import { describe, expect, it } from 'vitest'
import { firebaseTokenMinter, GAME_CLAIMS } from '../../src/auth/adapters/firebaseTokenMinter.js'
import { COUNTER_COLLECTIONS, firestoreCounterStore } from '../../src/auth/adapters/firestoreCounterStore.js'
import { SAVE_CODES, USERNAMES, firestoreCredentialStore } from '../../src/auth/adapters/firestoreCredentialStore.js'
import { auth, db, exchangeCustomToken } from './emulator.js'

let sequence = 0
const unique = (label: string) => `${label}-${Date.now().toString(36)}-${(sequence += 1)}`

/** The payload of a JWT, without verifying it (the emulator signs nothing). */
function jwtPayload(token: string): Record<string, unknown> {
  const [, payload] = token.split('.')
  return JSON.parse(Buffer.from(payload ?? '', 'base64url').toString('utf8')) as Record<string, unknown>
}

describe('firestoreCredentialStore (Firestore emulator, database sanctuary-farm)', () => {
  const store = firestoreCredentialStore(db)

  it('round-trips an account: save code → uid, username → uid + PIN hash', async () => {
    const account = { uid: unique('sf'), saveCodeKey: unique('code'), username: { key: unique('name'), pinHash: 'scrypt$x' } }

    expect(await store.createAccount(account)).toBe('created')

    expect(await store.uidForSaveCode(account.saveCodeKey)).toBe(account.uid)
    expect(await store.usernameRecord(account.username.key)).toEqual({ uid: account.uid, pinHash: 'scrypt$x' })
  })

  it('stores exactly the documented fields and nothing else', async () => {
    const account = { uid: unique('sf'), saveCodeKey: unique('code'), username: { key: unique('name'), pinHash: 'h' } }
    await store.createAccount(account)

    const code = await db.collection(SAVE_CODES).doc(account.saveCodeKey).get()
    const name = await db.collection(USERNAMES).doc(account.username.key).get()

    expect(Object.keys(code.data() ?? {})).toEqual(['uid'])
    expect(Object.keys(name.data() ?? {}).sort()).toEqual(['pinHash', 'uid'])
  })

  it('answers null for codes and usernames nobody holds', async () => {
    expect(await store.uidForSaveCode(unique('missing'))).toBeNull()
    expect(await store.usernameRecord(unique('missing'))).toBeNull()
  })

  it('refuses a taken save code or username and writes nothing for the new account', async () => {
    const first = { uid: unique('sf'), saveCodeKey: unique('code'), username: { key: unique('name'), pinHash: 'h' } }
    await store.createAccount(first)
    const secondUid = unique('sf')

    const codeClash = await store.createAccount({ uid: secondUid, saveCodeKey: first.saveCodeKey })
    const newCode = unique('code')
    const nameClash = await store.createAccount({ uid: secondUid, saveCodeKey: newCode, username: first.username })

    expect(codeClash).toBe('saveCodeTaken')
    expect(nameClash).toBe('usernameTaken')
    expect(await store.uidForSaveCode(newCode)).toBeNull()
    expect(await store.uidForSaveCode(first.saveCodeKey)).toBe(first.uid)
  })

  it('fails loudly on a malformed credential record instead of signing anyone in', async () => {
    const codeKey = unique('code')
    const nameKey = unique('name')
    await db.collection(SAVE_CODES).doc(codeKey).set({ uid: 42 })
    await db.collection(USERNAMES).doc(nameKey).set({ uid: 'sf-x' })

    await expect(store.uidForSaveCode(codeKey)).rejects.toThrow(/malformed credential record/)
    await expect(store.usernameRecord(nameKey)).rejects.toThrow(/malformed credential record/)
  })
})

describe('firestoreCounterStore (Firestore emulator)', () => {
  const counters = firestoreCounterStore(db)

  it('sets, keeps and deletes, with the TTL field stored as a timestamp and hidden from callers', async () => {
    const key = unique('counter')
    const ref = db.collection(COUNTER_COLLECTIONS.rateLimits).doc(key)
    const expiresAt = Date.UTC(2026, 9, 11, 10, 0, 0)

    await counters.update('rateLimits', key, () => ({ write: { kind: 'set', state: { count: 1, windowStartedAt: 5 }, expiresAt }, result: null }))
    const seen = await counters.update('rateLimits', key, (stored) => ({ write: { kind: 'keep' }, result: stored }))
    const stored = await ref.get()

    expect(seen).toEqual({ count: 1, windowStartedAt: 5 })
    expect(stored.get('expiresAt').toMillis()).toBe(expiresAt)

    await counters.update('rateLimits', key, () => ({ write: { kind: 'delete' }, result: null }))
    expect((await ref.get()).exists).toBe(false)
  })

  it('hands a missing document to the caller as null', async () => {
    expect(await counters.update('pinAttempts', unique('none'), (stored) => ({ write: { kind: 'keep' }, result: stored }))).toBeNull()
  })

  it('counts concurrent requests exactly — no lost updates', async () => {
    const key = unique('race')
    const increment = () =>
      counters.update('pinAttempts', key, (stored) => {
        const count = typeof (stored as { n?: unknown } | null)?.n === 'number' ? (stored as { n: number }).n : 0
        return { write: { kind: 'set', state: { n: count + 1 }, expiresAt: 0 }, result: null }
      })

    await Promise.all(Array.from({ length: 10 }, increment))

    expect((await db.collection(COUNTER_COLLECTIONS.pinAttempts).doc(key).get()).get('n')).toBe(10)
  })

  it('propagates a failing decision without writing', async () => {
    const key = unique('throws')
    await expect(
      counters.update('rateLimits', key, () => {
        throw new Error('decision failed')
      }),
    ).rejects.toThrow('decision failed')
    expect((await db.collection(COUNTER_COLLECTIONS.rateLimits).doc(key).get()).exists).toBe(false)
  })
})

describe('firebaseTokenMinter (Auth emulator)', () => {
  const minter = firebaseTokenMinter(auth)

  it('mints a token whose only custom claim is the game, and which signs in as that uid', async () => {
    const uid = unique('sf')
    const token = await minter.mint(uid)

    expect(jwtPayload(token).claims).toEqual({ game: 'sanctuary-farm' })
    expect(GAME_CLAIMS).toEqual({ game: 'sanctuary-farm' })

    const signedIn = await exchangeCustomToken(token)
    expect(signedIn.uid).toBe(uid)
    expect(signedIn.claims.game).toBe('sanctuary-farm')
    for (const personal of ['email', 'name', 'picture', 'phone_number']) expect(signedIn.claims).not.toHaveProperty(personal)
  })

  it('rejects a uid Firebase cannot accept', async () => {
    await expect(minter.mint('x'.repeat(129))).rejects.toThrow()
    await expect(minter.mint('')).rejects.toThrow()
  })
})
