import { describe, expect, it } from 'vitest'
import { fakeDeps } from '../testing/fakes.js'
import { createAccount } from './createAccount.js'
import { signInWithCode, signInWithUsernamePin } from './signIn.js'

const IP = '203.0.113.7'
const MINUTE = 60_000

async function farmWithUsername() {
  const setup = fakeDeps()
  const created = await createAccount(setup.deps, { withUsername: true, clientIp: '192.0.2.1' })
  if (!created.ok || !created.username || !created.pin) throw new Error('expected credentials')
  const uid = [...setup.credentials.saveCodes.values()][0]?.uid
  return { ...setup, saveCode: created.saveCode, username: created.username, pin: created.pin, uid }
}

describe('signInWithCode', () => {
  it('signs in with the code as shown, and again as a child might type it', async () => {
    const { deps, saveCode, uid } = await farmWithUsername()

    const exact = await signInWithCode(deps, { code: saveCode, clientIp: IP })
    const typed = await signInWithCode(deps, { code: saveCode.toLowerCase().replaceAll('-', ' '), clientIp: IP })

    expect(exact).toEqual({ ok: true, token: `token-for:${uid}` })
    expect(typed).toEqual(exact)
  })

  it('answers "not matched" for a well-formed code nobody holds', async () => {
    const { deps } = await farmWithUsername()
    expect(await signInWithCode(deps, { code: 'FARM-22222-22222-22222', clientIp: IP })).toEqual({
      ok: false,
      reason: 'notMatched',
    })
  })

  it('answers "malformed" for something that cannot be a code', async () => {
    const { deps } = await farmWithUsername()
    for (const code of ['FARM-0000', 42, undefined]) {
      expect(await signInWithCode(deps, { code, clientIp: IP })).toEqual({ ok: false, reason: 'malformed' })
    }
  })

  it('slows an address down after 100 tries in ten minutes, malformed ones included', async () => {
    const { deps, saveCode } = await farmWithUsername()
    for (let i = 0; i < 100; i++) await signInWithCode(deps, { code: i % 2 ? 'nope' : 'FARM-22222-22222-22222', clientIp: IP })

    expect(await signInWithCode(deps, { code: saveCode, clientIp: IP })).toEqual({
      ok: false,
      reason: 'slowDown',
      retryAfterSeconds: 600,
    })
    expect((await signInWithCode(deps, { code: saveCode, clientIp: '198.51.100.9' })).ok).toBe(true)
  })
})

describe('signInWithUsernamePin', () => {
  it('signs in with the right PIN, whatever the case of the username', async () => {
    const { deps, username, pin, uid } = await farmWithUsername()
    expect(await signInWithUsernamePin(deps, { username: username.toLowerCase(), pin, clientIp: IP })).toEqual({
      ok: true,
      token: `token-for:${uid}`,
    })
  })

  it('gives the same answer, after the same PIN check, for a wrong PIN and an unknown username', async () => {
    const { deps, pins, username, pin } = await farmWithUsername()
    const wrongPin = pin === '0000' ? '1111' : '0000'

    const wrong = await signInWithUsernamePin(deps, { username, pin: wrongPin, clientIp: IP })
    const before = pins.verifications
    const unknown = await signInWithUsernamePin(deps, { username: 'QuietZebra99', pin, clientIp: IP })

    expect(wrong).toEqual({ ok: false, reason: 'notMatched' })
    expect(unknown).toEqual(wrong)
    expect(pins.verifications).toBe(before + 1)
  })

  it('locks a username for a minute after five wrong PINs — even against the right one — then lets it in', async () => {
    const { deps, clock, username, pin } = await farmWithUsername()
    const wrongPin = pin === '0000' ? '1111' : '0000'
    for (let i = 0; i < 5; i++) {
      expect((await signInWithUsernamePin(deps, { username, pin: wrongPin, clientIp: IP })).ok).toBe(false)
    }

    const locked = await signInWithUsernamePin(deps, { username, pin, clientIp: IP })
    clock.advance(MINUTE)
    const after = await signInWithUsernamePin(deps, { username, pin, clientIp: IP })

    expect(locked).toEqual({ ok: false, reason: 'slowDown', retryAfterSeconds: 60 })
    expect(after.ok).toBe(true)
  })

  it('forgets the failures after a correct PIN', async () => {
    const { deps, counters, username, pin } = await farmWithUsername()
    const wrongPin = pin === '0000' ? '1111' : '0000'
    for (let i = 0; i < 4; i++) await signInWithUsernamePin(deps, { username, pin: wrongPin, clientIp: IP })

    await signInWithUsernamePin(deps, { username, pin, clientIp: IP })

    expect([...counters.stored.keys()].filter((id) => id.startsWith('pinAttempts/'))).toEqual([])
  })

  it('locks an unknown username exactly as it would a real one', async () => {
    const { deps } = await farmWithUsername()
    for (let i = 0; i < 5; i++) await signInWithUsernamePin(deps, { username: 'QuietZebra99', pin: '1234', clientIp: IP })
    expect(await signInWithUsernamePin(deps, { username: 'QuietZebra99', pin: '1234', clientIp: IP })).toEqual({
      ok: false,
      reason: 'slowDown',
      retryAfterSeconds: 60,
    })
  })

  it('refuses a malformed username or PIN without touching the lockout', async () => {
    const { deps, counters, username } = await farmWithUsername()
    for (const attempt of [
      { username: 'Bob', pin: '1234' },
      { username, pin: '12' },
      { username, pin: 1234 },
      { username: undefined, pin: undefined },
    ]) {
      expect(await signInWithUsernamePin(deps, { ...attempt, clientIp: IP })).toEqual({ ok: false, reason: 'malformed' })
    }
    expect([...counters.stored.keys()].filter((id) => id.startsWith('pinAttempts/'))).toEqual([])
  })

  it('shares the per-address limit with code sign-in', async () => {
    const { deps, username, pin } = await farmWithUsername()
    for (let i = 0; i < 100; i++) await signInWithCode(deps, { code: 'x', clientIp: IP })
    expect(await signInWithUsernamePin(deps, { username, pin, clientIp: IP })).toMatchObject({ reason: 'slowDown' })
  })
})
