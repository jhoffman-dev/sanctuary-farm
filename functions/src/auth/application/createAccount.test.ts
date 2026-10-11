import { describe, expect, it } from 'vitest'
import { normalizeSaveCode } from '../domain/index.js'
import { fakeDeps, scriptedBytes } from '../testing/fakes.js'
import { createAccount } from './createAccount.js'
import type { CredentialStore } from './ports.js'

const IP = '203.0.113.7'

describe('createAccount', () => {
  it('mints a save code, stores only its hash against a fresh uid, and signs the child in', async () => {
    const { deps, credentials } = fakeDeps()

    const created = await createAccount(deps, { withUsername: false, clientIp: IP })

    if (!created.ok) throw new Error('expected an account')
    expect(normalizeSaveCode(created.saveCode)).toBe(created.saveCode)
    expect(created).not.toHaveProperty('username')
    expect(created).not.toHaveProperty('pin')
    const [key, record] = [...credentials.saveCodes][0] ?? []
    if (!record) throw new Error('expected a stored save code')
    expect(key).toBe(`saveCode|${created.saveCode}`)
    expect(record.uid).toMatch(/^sf-[0-9a-f]{32}$/)
    expect(created.token).toBe(`token-for:${record.uid}`)
    expect(credentials.usernames.size).toBe(0)
  })

  it('adds a generated username and PIN for the same farm when asked', async () => {
    const { deps, credentials } = fakeDeps()

    const created = await createAccount(deps, { withUsername: true, clientIp: IP })

    if (!created.ok) throw new Error('expected an account')
    expect(created.username).toMatch(/^[A-Z][a-z]+[A-Z][a-z]+\d{2}$/)
    expect(created.pin).toMatch(/^\d{4}$/)
    const record = credentials.usernames.get((created.username as string).toLowerCase())
    expect(record).toEqual({ uid: [...credentials.saveCodes.values()][0]?.uid, pinHash: `hashed:${created.pin}` })
  })

  it('draws again when the username is taken', async () => {
    const { deps } = fakeDeps()
    const outcomes: string[] = []
    const credentials: CredentialStore = {
      ...deps.credentials,
      createAccount: async (account) => {
        const result = outcomes.length < 2 ? 'usernameTaken' : await deps.credentials.createAccount(account)
        outcomes.push(result)
        return result
      },
    }

    const created = await createAccount({ ...deps, credentials }, { withUsername: true, clientIp: IP })

    expect(created.ok).toBe(true)
    expect(outcomes).toEqual(['usernameTaken', 'usernameTaken', 'created'])
  })

  it('gives up loudly after five collisions rather than loop for ever', async () => {
    const { deps } = fakeDeps()
    const credentials: CredentialStore = { ...deps.credentials, createAccount: async () => 'saveCodeTaken' }

    await expect(createAccount({ ...deps, credentials }, { withUsername: false, clientIp: IP })).rejects.toThrow(
      /no free save code/,
    )
  })

  it('refuses the 61st account from one address within the hour, then allows it later', async () => {
    const { deps, clock } = fakeDeps()
    for (let i = 0; i < 60; i++) {
      expect((await createAccount(deps, { withUsername: false, clientIp: IP })).ok).toBe(true)
    }

    const refused = await createAccount(deps, { withUsername: false, clientIp: IP })
    const fromElsewhere = await createAccount(deps, { withUsername: false, clientIp: '198.51.100.1' })
    clock.advance(60 * 60_000)
    const later = await createAccount(deps, { withUsername: false, clientIp: IP })

    expect(refused).toEqual({ ok: false, reason: 'slowDown', retryAfterSeconds: 3600 })
    expect(fromElsewhere.ok).toBe(true)
    expect(later.ok).toBe(true)
  })

  it('propagates a random source failure instead of minting a weak code', async () => {
    const { deps } = fakeDeps({ randomBytes: scriptedBytes([]) })
    await expect(createAccount(deps, { withUsername: false, clientIp: IP })).rejects.toThrow(/exhausted/)
  })
})
