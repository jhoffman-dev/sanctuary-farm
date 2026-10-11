import { describe, expect, it } from 'vitest'
import { hmacKeyedHasher, nodeRandomBytes, scryptPinHasher } from './nodeCrypto.js'

// Test-only peppers: obviously fake, never a real secret.
const PEPPER = 'test-pepper-0123456789abcdefghijklmnop'
const OTHER_PEPPER = 'test-pepper-ZYXWVUTSRQPONMLKJIHGFEDCBA'
// The lowest cost the stored-hash parser accepts, so the suite stays fast.
const CHEAP = { log2N: 10 }

describe('hmacKeyedHasher', () => {
  it('is deterministic, hex, and never contains the value it hashes', () => {
    const hasher = hmacKeyedHasher(PEPPER)
    const key = hasher.key('saveCode', 'FARM-7K4QX-MN3TD-9HWAC')
    expect(key).toMatch(/^[0-9a-f]{64}$/)
    expect(hasher.key('saveCode', 'FARM-7K4QX-MN3TD-9HWAC')).toBe(key)
    expect(key).not.toContain('7K4QX')
  })

  it('separates purposes and peppers', () => {
    const hasher = hmacKeyedHasher(PEPPER)
    expect(hasher.key('saveCode', 'x')).not.toBe(hasher.key('pinAttempts', 'x'))
    expect(hmacKeyedHasher(OTHER_PEPPER).key('saveCode', 'x')).not.toBe(hasher.key('saveCode', 'x'))
  })

  it('refuses to run without a real pepper', () => {
    expect(() => hmacKeyedHasher('')).toThrow(/pepper/)
    expect(() => hmacKeyedHasher('short')).toThrow(/pepper/)
  })
})

describe('scryptPinHasher', () => {
  it('round-trips: the right PIN verifies, a wrong one does not', async () => {
    const pins = scryptPinHasher(PEPPER, CHEAP)
    const stored = await pins.hash('4821')
    expect(await pins.verify('4821', stored)).toBe(true)
    expect(await pins.verify('4822', stored)).toBe(false)
  })

  it('salts every hash and stores the cost, never the PIN', async () => {
    const pins = scryptPinHasher(PEPPER, CHEAP)
    const [a, b] = [await pins.hash('4821'), await pins.hash('4821')]
    expect(a).not.toBe(b)
    expect(a).toMatch(/^scrypt\$10\$8\$1\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/)
    expect(a).not.toContain('4821')
  })

  it('needs the pepper: the same hash does not verify under another pepper', async () => {
    const stored = await scryptPinHasher(PEPPER, CHEAP).hash('4821')
    expect(await scryptPinHasher(OTHER_PEPPER, CHEAP).verify('4821', stored)).toBe(false)
  })

  it('does the work and says no when there is no stored hash', async () => {
    expect(await scryptPinHasher(PEPPER, CHEAP).verify('4821', null)).toBe(false)
  })

  it('verifies a hash made at a different cost, read from the hash itself', async () => {
    const stored = await scryptPinHasher(PEPPER, { log2N: 11 }).hash('4821')
    expect(await scryptPinHasher(PEPPER, CHEAP).verify('4821', stored)).toBe(true)
  })

  it('fails loudly on a malformed stored hash rather than letting anyone in', async () => {
    const pins = scryptPinHasher(PEPPER, CHEAP)
    for (const bad of ['', 'bcrypt$10$8$1$c2FsdA==$aGFzaA==', 'scrypt$40$8$1$c2FsdA==$aGFzaA==', 'scrypt$10$8$1$c2FsdA==$dG9vc2hvcnQ=']) {
      await expect(pins.verify('4821', bad)).rejects.toThrow(/malformed/)
    }
  })
})

describe('nodeRandomBytes', () => {
  it('returns the requested number of bytes, different each call', () => {
    const [a, b] = [nodeRandomBytes(16), nodeRandomBytes(16)]
    expect(a).toHaveLength(16)
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(false)
  })
})
