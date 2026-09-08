/** Returns a number in [0, 1). Every random choice in the domain goes through one of these. */
export type Rng = () => number

/** mulberry32 — small, fast, deterministic. Tests seed it; production seeds from entropy. */
export function createRng(seed: number): Rng {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Weighted pick. `weights[i]` pairs with `items[i]`; non-positive totals fall back to uniform. */
export function weightedPick<T>(items: readonly T[], weights: readonly number[], rng: Rng): T {
  const first = items[0]
  if (first === undefined) throw new Error('weightedPick: empty items')
  const total = weights.reduce((sum, w) => sum + Math.max(0, w), 0)
  if (total <= 0) return items[Math.floor(rng() * items.length)] ?? first
  let r = rng() * total
  for (let i = 0; i < items.length; i++) {
    r -= Math.max(0, weights[i] ?? 0)
    if (r < 0) return items[i] ?? first
  }
  return items[items.length - 1] ?? first
}

/** Fisher–Yates shuffle into a new array using the injected Rng. */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const a = out[i] as T
    out[i] = out[j] as T
    out[j] = a
  }
  return out
}
