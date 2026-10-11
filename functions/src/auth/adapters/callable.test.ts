import { HttpsError } from 'firebase-functions/v2/https'
import { describe, expect, it } from 'vitest'
import { fakeDeps } from '../testing/fakes.js'
import {
  MESSAGES,
  clientIpOf,
  handleCreateAccount,
  handleSignInWithCode,
  handleSignInWithUsernamePin,
  type CallRequest,
} from './callable.js'

function call(data: unknown, ip = '203.0.113.7'): CallRequest {
  return { data, rawRequest: { headers: { 'x-forwarded-for': ip } } }
}

async function refusal(promise: Promise<unknown>): Promise<HttpsError> {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  )
  if (!(error instanceof HttpsError)) throw new Error(`expected an HttpsError, got ${String(error)}`)
  return error
}

describe('clientIpOf', () => {
  it('takes the right-most forwarded address — the one the front end appended', () => {
    expect(clientIpOf({ headers: { 'x-forwarded-for': '6.6.6.6, 203.0.113.7' } })).toBe('203.0.113.7')
    expect(clientIpOf({ headers: { 'x-forwarded-for': ['6.6.6.6', '203.0.113.8 '] } })).toBe('203.0.113.8')
  })

  it('falls back to the socket address, then to one shared bucket', () => {
    expect(clientIpOf({ headers: {}, ip: '198.51.100.2' })).toBe('198.51.100.2')
    expect(clientIpOf({ headers: { 'x-forwarded-for': ' , ' } })).toBe('unknown')
  })
})

describe('handleCreateAccount', () => {
  it('returns the credentials once and nothing about the caller', async () => {
    const { deps } = fakeDeps()
    const result = await handleCreateAccount(deps, call({ withUsername: true }))
    expect(Object.keys(result).sort()).toEqual(['pin', 'saveCode', 'token', 'username'])
  })

  it('defaults to a save code only', async () => {
    const { deps } = fakeDeps()
    expect(Object.keys(await handleCreateAccount(deps, call({}))).sort()).toEqual(['saveCode', 'token'])
  })

  it('refuses a body that is not an object or a non-boolean flag', async () => {
    const { deps } = fakeDeps()
    for (const data of [null, 'x', [], { withUsername: 'yes' }]) {
      const error = await refusal(handleCreateAccount(deps, call(data)))
      expect(error.code).toBe('invalid-argument')
      expect(error.message).toBe(MESSAGES.malformed)
    }
  })
})

describe('sign-in handlers', () => {
  it('return a token on success', async () => {
    const { deps } = fakeDeps()
    const created = await handleCreateAccount(deps, call({ withUsername: true }))

    expect(await handleSignInWithCode(deps, call({ code: created.saveCode }))).toEqual({ token: created.token })
    expect(await handleSignInWithUsernamePin(deps, call({ username: created.username, pin: created.pin }))).toEqual({
      token: created.token,
    })
  })

  it('say the same thing for an unknown code, an unknown username and a wrong PIN', async () => {
    const { deps } = fakeDeps()
    const created = await handleCreateAccount(deps, call({ withUsername: true }))
    const wrongPin = created.pin === '0000' ? '1111' : '0000'

    const errors = [
      await refusal(handleSignInWithCode(deps, call({ code: 'FARM-22222-22222-22222' }))),
      await refusal(handleSignInWithUsernamePin(deps, call({ username: 'QuietZebra99', pin: '1234' }))),
      await refusal(handleSignInWithUsernamePin(deps, call({ username: created.username, pin: wrongPin }))),
    ]

    for (const error of errors) {
      expect(error.code).toBe('unauthenticated')
      expect(error.message).toBe(MESSAGES.notMatched)
      expect(error.details).toBeUndefined()
    }
  })

  it('ask for a break, with a wait in seconds, when locked out', async () => {
    const { deps } = fakeDeps()
    for (let i = 0; i < 5; i++) await refusal(handleSignInWithUsernamePin(deps, call({ username: 'QuietZebra99', pin: '1234' })))

    const error = await refusal(handleSignInWithUsernamePin(deps, call({ username: 'QuietZebra99', pin: '1234' })))

    expect(error.code).toBe('resource-exhausted')
    expect(error.message).toBe(MESSAGES.slowDown)
    expect(error.details).toEqual({ retryAfterSeconds: 60 })
  })

  it('refuse a malformed body', async () => {
    const { deps } = fakeDeps()
    expect((await refusal(handleSignInWithCode(deps, call(undefined)))).code).toBe('invalid-argument')
    expect((await refusal(handleSignInWithUsernamePin(deps, call({ username: 'BraveOtter42' })))).code).toBe(
      'invalid-argument',
    )
  })
})
