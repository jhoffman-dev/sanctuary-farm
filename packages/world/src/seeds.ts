/**
 * Randomness enters the tile world through one port. `@sf/world` may not
 * import `@sf/domain` (dependency-cruiser `world-depends-on-nothing`), so the
 * port is declared here with the same shape as the domain's `Rng`, and the
 * composition root passes the domain's seeded `createRng` in as `RngFactory`.
 */

/** Returns a number in [0, 1). */
export type Rng = () => number

/** A fresh, independent stream for a seed. Same seed, same stream — always. */
export type RngFactory = (seed: number) => Rng

/**
 * Folds integers into one 32-bit seed (FNV-1a over each word, then an avalanche).
 * Every chunk, edge and purpose gets its own stream from (world seed, coordinates,
 * purpose), so generating one never shifts the numbers another one sees.
 */
export function mixSeed(...words: readonly number[]): number {
  let hash = 0x811c9dc5
  for (const word of words) {
    hash = Math.imul(hash ^ (word | 0), 0x01000193)
    hash ^= hash >>> 15
  }
  hash = Math.imul(hash ^ (hash >>> 16), 0x85ebca6b)
  hash = Math.imul(hash ^ (hash >>> 13), 0xc2b2ae35)
  return (hash ^ (hash >>> 16)) >>> 0
}

/** The independent streams a chunk draws from. Adding a purpose never moves the others. */
export const STREAM = { pond: 1, pathJitter: 2, decor: 3, edgeConnector: 4 } as const

export function pickIndex(rng: Rng, length: number): number {
  return Math.min(length - 1, Math.floor(rng() * length))
}
