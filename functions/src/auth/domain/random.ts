/**
 * A source of cryptographically random bytes. Production passes
 * `crypto.randomBytes`; tests pass a seeded, repeatable source.
 */
export type RandomBytes = (count: number) => Uint8Array

/**
 * Picks an index in `[0, size)` with every index equally likely, by rejection
 * sampling: a byte is used only if it falls below the largest multiple of
 * `size` that fits in 256, so no index is favoured by the modulo.
 */
export function pickUniformIndex(randomBytes: RandomBytes, size: number): number {
  if (!Number.isInteger(size) || size < 1 || size > 256) {
    throw new RangeError(`pickUniformIndex needs 1..256 choices, got ${size}`)
  }
  const acceptBelow = 256 - (256 % size)
  for (;;) {
    for (const byte of randomBytes(8)) {
      if (byte < acceptBelow) return byte % size
    }
  }
}
