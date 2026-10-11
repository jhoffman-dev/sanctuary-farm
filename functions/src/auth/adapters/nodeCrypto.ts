import { createHmac, randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto'
import type { RandomBytes } from '../domain/index.js'
import type { KeyPurpose, KeyedHasher, PinHasher } from '../application/index.js'

/** The platform CSPRNG. */
export const nodeRandomBytes: RandomBytes = (count) => new Uint8Array(randomBytes(count))

/** HMAC-SHA256 under the pepper, purpose-separated, as lowercase hex. */
export function hmacKeyedHasher(pepper: string): KeyedHasher {
  requirePepper(pepper)
  return {
    key: (purpose: KeyPurpose, value: string) =>
      createHmac('sha256', pepper).update(`${purpose}\u0000${value}`).digest('hex'),
  }
}

/** scrypt cost as log2(N); r and p stay at the RFC 7914 interactive defaults. */
export interface ScryptCost {
  log2N: number
}

/** N = 2^15, r = 8 → 32 MiB and roughly 50–100 ms per check on a function instance. */
export const PRODUCTION_SCRYPT_COST: ScryptCost = { log2N: 15 }

const SALT_BYTES = 16
const KEY_BYTES = 32
const BLOCK_SIZE = 8
const PARALLELISM = 1
const FORMAT = 'scrypt'

/**
 * Salted scrypt over HMAC(pepper, pin). The pepper matters most here: a
 * four-digit PIN has only 10,000 values, so without it a leaked hash falls in
 * seconds however slow scrypt is. Stored as
 * `scrypt$<log2N>$<r>$<p>$<salt b64>$<hash b64>` so the cost can be raised later.
 */
export function scryptPinHasher(pepper: string, cost: ScryptCost = PRODUCTION_SCRYPT_COST): PinHasher {
  requirePepper(pepper)
  const peppered = (pin: string) => createHmac('sha256', pepper).update(`pin\u0000${pin}`).digest()
  // Hashed once at start-up so an unknown username costs the same work as a real one.
  const decoyHash = deriveStoredHash(peppered('decoy'), randomBytes(SALT_BYTES), cost.log2N)

  return {
    hash: (pin) => deriveStoredHash(peppered(pin), randomBytes(SALT_BYTES), cost.log2N),
    async verify(pin, storedHash) {
      const target = parseStoredHash(storedHash ?? (await decoyHash))
      const actual = await scryptAsync(peppered(pin), target.salt, target.log2N)
      return storedHash !== null && timingSafeEqual(actual, target.hash)
    },
  }
}

async function deriveStoredHash(secret: Buffer, salt: Buffer, log2N: number): Promise<string> {
  const derived = await scryptAsync(secret, salt, log2N)
  return [FORMAT, log2N, BLOCK_SIZE, PARALLELISM, salt.toString('base64'), derived.toString('base64')].join('$')
}

function parseStoredHash(stored: string): { log2N: number; salt: Buffer; hash: Buffer } {
  const [format, log2N, blockSize, parallelism, salt, hash] = stored.split('$')
  const cost = Number(log2N)
  const wellFormed =
    format === FORMAT && Number.isInteger(cost) && cost >= 10 && cost <= 20 &&
    blockSize === String(BLOCK_SIZE) && parallelism === String(PARALLELISM) && salt && hash
  const derived = wellFormed ? Buffer.from(hash, 'base64') : null
  if (!wellFormed || derived?.length !== KEY_BYTES) throw new Error('stored PIN hash is malformed')
  return { log2N: cost, salt: Buffer.from(salt, 'base64'), hash: derived }
}

function scryptAsync(secret: Buffer, salt: Buffer, log2N: number): Promise<Buffer> {
  const N = 2 ** log2N
  // Node's default 32 MiB memory cap is exactly 128·N·r at N = 2^15; leave headroom.
  const options: ScryptOptions = { N, r: BLOCK_SIZE, p: PARALLELISM, maxmem: 256 * N * BLOCK_SIZE }
  return new Promise((resolve, reject) => {
    scrypt(secret, salt, KEY_BYTES, options, (error, key) => (error ? reject(error) : resolve(key)))
  })
}

function requirePepper(pepper: string): void {
  // A short or empty pepper means the secret was never set: refuse to run rather than hash weakly.
  if (pepper.length < 32) throw new Error('auth pepper is missing or shorter than 32 characters')
}
