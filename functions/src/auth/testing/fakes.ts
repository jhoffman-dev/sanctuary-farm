import type { RandomBytes } from '../domain/index.js'
import type {
  AuthDeps,
  CounterBucket,
  CounterStore,
  CredentialStore,
  KeyedHasher,
  NewAccount,
  PinHasher,
  TokenMinter,
} from '../application/index.js'

/** A repeatable byte stream (mulberry32) so generated codes are the same every run. */
export function seededBytes(seed: number): RandomBytes {
  let state = seed >>> 0
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) & 0xff
  }
  return (count) => Uint8Array.from({ length: count }, next)
}

/** Replays the given bytes in order, then fails loudly if asked for more. */
export function scriptedBytes(bytes: number[]): RandomBytes {
  let index = 0
  return (count) => {
    if (index + count > bytes.length) throw new Error('scripted bytes exhausted')
    const slice = bytes.slice(index, index + count)
    index += count
    return Uint8Array.from(slice)
  }
}

export class FixedClock {
  constructor(public time: number) {}
  now = () => this.time
  advance(ms: number) {
    this.time += ms
  }
}

/** Readable stand-in for the HMAC: `purpose|value`. */
export const fakeHasher: KeyedHasher = { key: (purpose, value) => `${purpose}|${value}` }

/** Stores `hashed:<pin>`; counts verifications so tests can check the timing-equaliser path runs. */
export class FakePinHasher implements PinHasher {
  verifications = 0
  hash = async (pin: string) => `hashed:${pin}`
  verify = async (pin: string, storedHash: string | null) => {
    this.verifications++
    return storedHash === `hashed:${pin}`
  }
}

export class InMemoryCredentials implements CredentialStore {
  saveCodes = new Map<string, { uid: string }>()
  usernames = new Map<string, { uid: string; pinHash: string }>()

  async createAccount(account: NewAccount) {
    if (this.saveCodes.has(account.saveCodeKey)) return 'saveCodeTaken' as const
    if (account.username && this.usernames.has(account.username.key)) return 'usernameTaken' as const
    this.saveCodes.set(account.saveCodeKey, { uid: account.uid })
    if (account.username) {
      this.usernames.set(account.username.key, { uid: account.uid, pinHash: account.username.pinHash })
    }
    return 'created' as const
  }

  uidForSaveCode = async (key: string) => this.saveCodes.get(key)?.uid ?? null
  usernameRecord = async (key: string) => this.usernames.get(key) ?? null
}

export class InMemoryCounters implements CounterStore {
  stored = new Map<string, { state: Record<string, number>; expiresAt: number }>()

  async update<Result>(
    bucket: CounterBucket,
    key: string,
    apply: Parameters<CounterStore['update']>[2],
  ): Promise<Result> {
    const id = `${bucket}/${key}`
    const { write, result } = apply(this.stored.get(id)?.state ?? null)
    if (write.kind === 'delete') this.stored.delete(id)
    if (write.kind === 'set') this.stored.set(id, { state: write.state, expiresAt: write.expiresAt })
    return result as Result
  }
}

export const fakeTokens: TokenMinter = { mint: async (uid) => `token-for:${uid}` }

export function fakeDeps(overrides: Partial<AuthDeps> = {}) {
  const clock = new FixedClock(Date.UTC(2026, 9, 11, 9, 0, 0))
  const credentials = new InMemoryCredentials()
  const counters = new InMemoryCounters()
  const pins = new FakePinHasher()
  const deps: AuthDeps = {
    clock,
    randomBytes: seededBytes(42),
    hasher: fakeHasher,
    pins,
    credentials,
    counters,
    tokens: fakeTokens,
    ...overrides,
  }
  return { deps, clock, credentials, counters, pins }
}
