import type { RandomBytes } from '../domain/index.js'

export interface Clock {
  /** Milliseconds since the epoch. */
  now(): number
}

/**
 * Why a value is being hashed. Each purpose is a separate keyed hash, so a
 * save-code hash can never be replayed as a username or network-address key.
 */
export type KeyPurpose = 'saveCode' | 'pinAttempts' | 'clientAddress'

/**
 * A keyed one-way hash (HMAC with a server-held pepper). Deterministic, so it
 * can be a document id; useless to anyone who has the database but not the
 * pepper.
 */
export interface KeyedHasher {
  key(purpose: KeyPurpose, value: string): string
}

/** A deliberately slow, salted hash for PINs. */
export interface PinHasher {
  hash(pin: string): Promise<string>
  /**
   * Checks a PIN. With no stored hash it does the same work and returns
   * false, so "no such username" takes as long as "wrong PIN".
   */
  verify(pin: string, storedHash: string | null): Promise<boolean>
}

export interface NewAccount {
  uid: string
  saveCodeKey: string
  username?: { key: string; pinHash: string }
}

export type CreateAccountResult = 'created' | 'saveCodeTaken' | 'usernameTaken'

/** The server-only credential records. Never readable by a client. */
export interface CredentialStore {
  /** Writes every record of the account at once, or none of them. */
  createAccount(account: NewAccount): Promise<CreateAccountResult>
  uidForSaveCode(saveCodeKey: string): Promise<string | null>
  usernameRecord(usernameKey: string): Promise<{ uid: string; pinHash: string } | null>
}

export type CounterBucket = 'rateLimits' | 'pinAttempts'

/** What to do with the stored counter, and what to hand back to the caller. */
export type CounterWrite =
  | { kind: 'keep' }
  | { kind: 'delete' }
  /** `expiresAt`: when the stored state may be garbage-collected (Firestore TTL). */
  | { kind: 'set'; state: Record<string, number>; expiresAt: number }

export interface CounterUpdate<Result> {
  write: CounterWrite
  result: Result
}

/**
 * Atomic read-modify-write of one small counter document. The decision is
 * the caller's (a domain rule); the store only guarantees two concurrent
 * requests cannot both read the same old value.
 */
export interface CounterStore {
  update<Result>(bucket: CounterBucket, key: string, apply: (stored: unknown) => CounterUpdate<Result>): Promise<Result>
}

export interface TokenMinter {
  /** A Firebase custom token for `uid`, carrying only the game claim. */
  mint(uid: string): Promise<string>
}

export interface AuthDeps {
  clock: Clock
  randomBytes: RandomBytes
  hasher: KeyedHasher
  pins: PinHasher
  credentials: CredentialStore
  counters: CounterStore
  tokens: TokenMinter
}
