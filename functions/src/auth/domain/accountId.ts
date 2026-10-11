import type { RandomBytes } from './random.js'

const ACCOUNT_ID_BYTES = 16

/**
 * An opaque farm id: 128 random bits as hex behind an `sf-` prefix. The prefix
 * marks our users apart in Auth, which is shared with other games; nothing in
 * the id says anything about the child.
 */
export function generateAccountId(randomBytes: RandomBytes): string {
  const bytes = randomBytes(ACCOUNT_ID_BYTES)
  if (bytes.length < ACCOUNT_ID_BYTES) throw new RangeError('random source returned too few bytes')
  return `sf-${Array.from(bytes.subarray(0, ACCOUNT_ID_BYTES), (b) => b.toString(16).padStart(2, '0')).join('')}`
}
