// Seedable RNG so Track A's weighted sampling and interleaving are testable.
// Owned by Phase 0. Track A injects a seeded Rng in tests; production passes
// a Math.random-backed one (or a seed derived from the save).

export type Rng = () => number // returns [0, 1)

/** mulberry32 — small, fast, good enough for game/test use. */
export function createRng(seed: number): Rng {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const systemRng: Rng = () => Math.random()

/** Weighted pick. weights[i] pairs with items[i]. Falls back to uniform. */
export function weightedPick<T>(items: readonly T[], weights: readonly number[], rng: Rng): T {
  if (items.length === 0) throw new Error('weightedPick: empty items')
  const total = weights.reduce((a, w) => a + Math.max(0, w), 0)
  if (total <= 0) return items[Math.floor(rng() * items.length)]
  let r = rng() * total
  for (let i = 0; i < items.length; i++) {
    r -= Math.max(0, weights[i])
    if (r < 0) return items[i]
  }
  return items[items.length - 1]
}

/** In-place Fisher–Yates using the injected Rng. Returns the same array. */
export function shuffle<T>(arr: T[], rng: Rng): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}
