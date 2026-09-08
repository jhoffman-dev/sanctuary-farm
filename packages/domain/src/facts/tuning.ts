// Every learning + economy tuning number in one place. World / UI constants
// (grid, camera, egg glow, creature names) belong to presentation, not here.

import type { FactId, Tier } from './fact'

// ─── Latency grading ───
export const FLUENT_MAX_MS = 3000
export const LABORED_MIN_MS = 8000

// ─── Leitner schedule, counted in questions asked (globalCounter), never wall-clock ───
export type LeitnerBox = 1 | 2 | 3 | 4 | 5
export const LEITNER_INTERVALS: Readonly<Record<LeitnerBox, number>> = {
  1: 3,
  2: 8,
  3: 20,
  4: 60,
  5: 150,
}
export const MASTERY_BOX = 5 as const
/** A fact is mastered at MASTERY_BOX with its last N latencies all < FLUENT_MAX_MS. */
export const MASTERY_RECENT_FLUENT_COUNT = 3
export const MAX_RECENT_LATENCIES = 5

// ─── Commutativity ───
/** A correct a×b promotes b×a by this fraction of a box; it never demotes. */
export const COMMUTATIVE_PROMOTION = 0.5

// ─── Interleaving ───
export const INTERLEAVE_MAX_CONSECUTIVE = 2

// ─── Selection weighting ───
/** Weighted pick only when more than this many facts are due; otherwise the most overdue. */
export const DUE_WEIGHTING_THRESHOLD = 6
export const MIN_DUE_BEFORE_INTRODUCE = 2
export const WEIGHT_OVERDUE_MULTIPLIER = 2
export const WEIGHT_HARD_CORE_BONUS = 3
export const WEIGHT_LOW_BOX_BONUS = 2
export const WEIGHT_LOW_BOX_MAX = 2

// ─── Introduction tiers ───
/** The next tier unlocks once this share of the current tier sits at box 3 or higher. */
export const TIER_UNLOCK_BOX3_SHARE = 0.8
export const MAX_TABLE_DEFAULT = 12
export const MIN_TABLE = 1

export const TIER_NAMES: Readonly<Record<Tier, string>> = {
  1: 'Anchors',
  2: 'Easy patterns',
  3: 'The 3s and 4s',
  4: 'The 9s',
  5: 'The 6s, 7s, 8s',
  6: 'The 12s',
}

// ─── Cold start ───
/** Families whose facts start `introduced` on a fresh save (the Anchors tier). */
export const COLD_START_FAMILIES: readonly number[] = [1, 2, 10]

// ─── Family (egg) practice ───
/** How many of a family's facts to keep in active rotation, so a round has variety. */
export const EGG_ROTATION = 4

export const ALL_FAMILIES: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

/**
 * Which tier a fact belongs to. The FIRST matching rule wins, evaluated 1 → 6,
 * so the function is total over 1..12 × 1..12.
 */
export function tierOf(a: number, b: number): Tier {
  const has = (n: number): boolean => a === n || b === n
  if (has(1) || has(2) || has(10)) return 1
  if (has(5) || a === b || (has(11) && Math.min(a, b) <= 9)) return 2
  if (has(3) || has(4)) return 3
  if (has(9)) return 4
  if (has(6) || has(7) || has(8)) return 5
  return 6
}

// ─── Hard-core set (over-sampled once introduced) ───
// Canonical listing from the spec; isHardCore matches either operand order.
const HARD_CORE_CANONICAL: ReadonlyArray<readonly [number, number]> = [
  [7, 8],
  [6, 8],
  [7, 6],
  [8, 9],
  [7, 9],
  [6, 7],
  [8, 8],
  [7, 7],
  [12, 7],
  [12, 8],
]
const HARD_CORE_IDS: ReadonlySet<FactId> = new Set(
  HARD_CORE_CANONICAL.flatMap(([a, b]) => [factId(a, b), factId(b, a)]),
)
export function isHardCore(id: FactId): boolean {
  return HARD_CORE_IDS.has(id)
}

// ─── Fact identity ───
export function factId(a: number, b: number): FactId {
  return `${a}x${b}`
}
export function familyOf(a: number, b: number): number {
  return Math.max(a, b)
}
/** `"7x8"` → `"8x7"`. */
export function commuteId(id: FactId): FactId {
  const [a, b] = id.split('x')
  if (a === undefined || b === undefined) throw new Error(`commuteId: malformed fact id "${id}"`)
  return `${b}x${a}`
}
