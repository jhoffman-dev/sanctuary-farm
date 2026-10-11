import { beforeAll, describe, expect, it } from 'vitest'
import { allDocs, auth, clearFirestore, callFunction, exchangeCustomToken, freshIp } from './emulator.js'

const NOT_MATCHED = "That didn't match. Check it and try again, or use your farm code."

async function newFarm(withUsername: boolean) {
  const created = await callFunction('createAccount', { withUsername }, freshIp())
  if (!created.ok) throw new Error(`createAccount failed: ${created.message}`)
  return created.result as { token: string; saveCode: string; username?: string; pin?: string }
}

function otherPin(pin: string): string {
  return pin === '0000' ? '1111' : '0000'
}

describe('createAccount (Functions + Firestore + Auth emulators)', () => {
  it('returns a save code and a token that signs in with only the game claim', async () => {
    const farm = await newFarm(false)

    expect(farm.saveCode).toMatch(/^FARM-[2-9A-Z]{5}-[2-9A-Z]{5}-[2-9A-Z]{5}$/)
    expect(Object.keys(farm).sort()).toEqual(['saveCode', 'token'])
    const signedIn = await exchangeCustomToken(farm.token)
    expect(signedIn.uid).toMatch(/^sf-[0-9a-f]{32}$/)
    expect(signedIn.claims.game).toBe('sanctuary-farm')
  })

  it('creates an Auth user with no personal data at all', async () => {
    const { uid } = await exchangeCustomToken((await newFarm(true)).token)
    const user = await auth.getUser(uid)

    expect(user.email).toBeUndefined()
    expect(user.displayName).toBeUndefined()
    expect(user.photoURL).toBeUndefined()
    expect(user.phoneNumber).toBeUndefined()
    expect(user.customClaims ?? {}).toEqual({})
  })

  it('refuses a malformed request body', async () => {
    const refused = await callFunction('createAccount', { withUsername: 'yes please' }, freshIp())
    expect(refused).toMatchObject({ ok: false, status: 'INVALID_ARGUMENT' })
  })
})

describe('signInWithCode (emulators)', () => {
  it('signs into the same farm with the code, typed loosely, as many times as asked', async () => {
    const farm = await newFarm(false)
    const { uid } = await exchangeCustomToken(farm.token)
    const ip = freshIp()

    for (const code of [farm.saveCode, farm.saveCode.toLowerCase().replaceAll('-', ' '), farm.saveCode]) {
      const signedIn = await callFunction('signInWithCode', { code }, ip)
      if (!signedIn.ok) throw new Error(signedIn.message)
      expect((await exchangeCustomToken(signedIn.result.token as string)).uid).toBe(uid)
    }
  })

  it('answers "didn\'t match" for an unknown code and "check what you typed" for a malformed one', async () => {
    const ip = freshIp()
    expect(await callFunction('signInWithCode', { code: 'FARM-22222-22222-22222' }, ip)).toEqual({
      ok: false,
      status: 'UNAUTHENTICATED',
      message: NOT_MATCHED,
    })
    for (const data of [{ code: 'FARM-0000' }, { code: 12 }, null]) {
      expect(await callFunction('signInWithCode', data, ip)).toMatchObject({ ok: false, status: 'INVALID_ARGUMENT' })
    }
  })

  it('slows an address down after 100 attempts in ten minutes; another address is unaffected', async () => {
    const farm = await newFarm(false)
    const ip = freshIp()
    for (let i = 0; i < 100; i++) await callFunction('signInWithCode', { code: 'FARM-22222-22222-22222' }, ip)

    const limited = await callFunction('signInWithCode', { code: farm.saveCode }, ip)
    const elsewhere = await callFunction('signInWithCode', { code: farm.saveCode }, freshIp())

    expect(limited).toMatchObject({ ok: false, status: 'RESOURCE_EXHAUSTED' })
    expect(limited.ok ? 0 : (limited.details as { retryAfterSeconds: number }).retryAfterSeconds).toBeGreaterThan(500)
    expect(elsewhere.ok).toBe(true)
  })
})

describe('signInWithUsernamePin (emulators)', () => {
  it('signs into the farm the username belongs to', async () => {
    const farm = await newFarm(true)
    const { uid } = await exchangeCustomToken(farm.token)

    const signedIn = await callFunction('signInWithUsernamePin', { username: farm.username?.toLowerCase(), pin: farm.pin }, freshIp())

    if (!signedIn.ok) throw new Error(signedIn.message)
    expect((await exchangeCustomToken(signedIn.result.token as string)).uid).toBe(uid)
  })

  it('gives a wrong PIN and an unknown username the very same answer', async () => {
    const farm = await newFarm(true)
    const ip = freshIp()

    const wrongPin = await callFunction('signInWithUsernamePin', { username: farm.username, pin: otherPin(farm.pin as string) }, ip)
    const unknown = await callFunction('signInWithUsernamePin', { username: 'QuietZebra98', pin: '4321' }, ip)

    expect(wrongPin).toEqual({ ok: false, status: 'UNAUTHENTICATED', message: NOT_MATCHED })
    expect(unknown).toEqual(wrongPin)
  })

  it('locks the username after five wrong PINs — the right PIN is refused too — with a wait to show', async () => {
    const farm = await newFarm(true)
    const ip = freshIp()
    for (let i = 0; i < 5; i++) {
      const wrong = await callFunction('signInWithUsernamePin', { username: farm.username, pin: otherPin(farm.pin as string) }, ip)
      expect(wrong).toMatchObject({ status: 'UNAUTHENTICATED' })
    }

    const locked = await callFunction('signInWithUsernamePin', { username: farm.username, pin: farm.pin }, freshIp())

    expect(locked).toMatchObject({ ok: false, status: 'RESOURCE_EXHAUSTED' })
    const wait = locked.ok ? 0 : (locked.details as { retryAfterSeconds: number }).retryAfterSeconds
    expect(wait).toBeGreaterThan(0)
    expect(wait).toBeLessThanOrEqual(60)
    // The save code still works: a locked PIN never locks a child out of their farm.
    expect((await callFunction('signInWithCode', { code: farm.saveCode }, freshIp())).ok).toBe(true)
  })

  it('refuses a malformed username or PIN', async () => {
    for (const data of [{ username: 'Bob', pin: '1234' }, { username: 'BraveOtter42', pin: 'abcd' }, { username: 'BraveOtter42' }]) {
      expect(await callFunction('signInWithUsernamePin', data, freshIp())).toMatchObject({ ok: false, status: 'INVALID_ARGUMENT' })
    }
  })
})

describe('what is stored (emulators)', () => {
  // Start empty, so every document below was written by these function calls.
  beforeAll(clearFirestore)

  it('holds no plaintext code, PIN, username-as-typed or address — only the documented keys', async () => {
    const ip = '203.0.113.77'
    const farm = await callFunction('createAccount', { withUsername: true }, ip)
    if (!farm.ok) throw new Error(farm.message)
    const { saveCode, pin, username } = farm.result as { saveCode: string; pin: string; username: string }
    await callFunction('signInWithUsernamePin', { username: 'CalmLlama10', pin: '9999' }, ip)
    await callFunction('signInWithCode', { code: saveCode }, ip)

    const collections = {
      saveCodes: ['uid'],
      usernames: ['pinHash', 'uid'],
      authRateLimits: ['count', 'expiresAt', 'windowStartedAt'],
      authPinAttempts: ['expiresAt', 'failures', 'lastFailureAt'],
    }
    for (const [collection, keys] of Object.entries(collections)) {
      const docs = await allDocs(collection)
      expect(docs.length, collection).toBeGreaterThan(0)
      for (const doc of docs) {
        expect(Object.keys(doc.fields).sort(), `${collection}/${doc.id}`).toEqual(keys)
        const everything = `${doc.id} ${JSON.stringify(doc.fields)}`
        for (const secret of [saveCode, saveCode.replaceAll('-', ''), ip, 'calmllama10']) expect(everything).not.toContain(secret)
        expect(Object.values(doc.fields)).not.toContain(pin)
      }
    }
    // The username itself is the document id — generated, not chosen, and not secret.
    expect((await allDocs('usernames')).map((doc) => doc.id)).toContain(username.toLowerCase())
  })
})
