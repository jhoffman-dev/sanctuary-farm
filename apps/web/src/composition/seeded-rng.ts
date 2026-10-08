import type { Rng } from '@sf/world'

/**
 * The tile world's `RngFactory`: mulberry32, the same generator as
 * `@sf/domain`'s `createRng`. apps/web may import only domain *types*
 * (dependency-cruiser `presentation-domain-types-only`), so the composition
 * root carries its own copy rather than reaching into the domain.
 */
export function createSeededRng(seed: number): Rng {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state)
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296
  }
}
