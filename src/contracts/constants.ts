// Single source of truth for every tuning number and shared predicate.
// Owned by Phase 0. Tracks READ from here; they do not add track-specific
// values here (keep those in the track's own module).

// ─── Latency grading (Track A consumes, Track B measures, Track E displays) ───
export const FLUENT_MAX_MS = 3000
export const LABORED_MIN_MS = 8000

// ─── Leitner schedule, counted in questions asked (global counter) ───
export const LEITNER_INTERVALS: Record<1 | 2 | 3 | 4 | 5, number> = {
  1: 3,
  2: 8,
  3: 20,
  4: 60,
  5: 150,
}
export const MASTERY_BOX = 5 as const
/** A fact is mastered at box 5 with its last 3 latencies all < FLUENT_MAX_MS. */
export const MASTERY_RECENT_FLUENT_COUNT = 3
export const MAX_RECENT_LATENCIES = 5

// ─── Commutativity ───
/** Correct answer on a×b promotes b×a by this fraction of a box; never demotes. */
export const COMMUTATIVE_PROMOTION = 0.5

// ─── Interleaving ───
export const INTERLEAVE_MAX_CONSECUTIVE = 2

// ─── Selection weighting (Scheduler.next, step 2) ───
export const DUE_WEIGHTING_THRESHOLD = 6 // weight only when > this many are due
export const MIN_DUE_BEFORE_INTRODUCE = 2
export const WEIGHT_OVERDUE_MULTIPLIER = 2
export const WEIGHT_HARD_CORE_BONUS = 3
export const WEIGHT_LOW_BOX_BONUS = 2
export const WEIGHT_LOW_BOX_MAX = 2 // "box <= 2"

// ─── Introduction tiers ───
export const TIER_UNLOCK_BOX3_SHARE = 0.8 // 80% of current tier at box 3+
export const MAX_TABLE_DEFAULT = 12
export const MIN_TABLE = 1

export type TierId = 1 | 2 | 3 | 4 | 5 | 6
export const TIER_NAMES: Record<TierId, string> = {
  1: 'Anchors',
  2: 'Easy patterns',
  3: 'The 3s and 4s',
  4: 'The 9s',
  5: 'The 6s, 7s, 8s',
  6: 'The 12s',
}

/**
 * Which tier a fact belongs to. Precedence: the FIRST rule that matches wins,
 * evaluated 1 → 6. Total function over 1..12 × 1..12.
 */
export function tierOf(a: number, b: number): TierId {
  const has = (n: number) => a === n || b === n
  if (has(1) || has(2) || has(10)) return 1
  if (has(5) || a === b || ((has(11)) && Math.min(a, b) <= 9)) return 2
  if (has(3) || has(4)) return 3
  if (has(9)) return 4
  if (has(6) || has(7) || has(8)) return 5
  return 6 // has(11) with big partner, or has(12)
}

// ─── Hard-core set (over-sampled once introduced) ───
// Canonical listing from the spec; isHardCore matches either operand order.
const HARD_CORE_CANONICAL: ReadonlyArray<[number, number]> = [
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
export const HARD_CORE_IDS: ReadonlySet<string> = new Set(
  HARD_CORE_CANONICAL.flatMap(([a, b]) => [`${a}x${b}`, `${b}x${a}`]),
)
export function isHardCore(factId: string): boolean {
  return HARD_CORE_IDS.has(factId)
}

// ─── Fact identity ───
export function factId(a: number, b: number): string {
  return `${a}x${b}`
}
export function familyOf(a: number, b: number): number {
  return Math.max(a, b)
}
export function commuteId(id: string): string {
  const [a, b] = id.split('x')
  return `${b}x${a}`
}

export const ALL_FAMILIES: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

// ─── World / farmyard (Track C) ───
export const GRID_W = 25
export const GRID_H = 18
export const TILE_PX = 48
export const MAP_PX_W = GRID_W * TILE_PX // 1200
export const MAP_PX_H = GRID_H * TILE_PX // 864
export const WALK_SPEED_TPS = 4 // tiles per second
export const CAMERA_DEADZONE = 1 / 3

// ─── Sessions ───
export const CHORE_QUESTIONS_PER_STALL = 5
export const FREE_SESSION_QUESTIONS = 5
export const EGG_PRACTICE_QUESTIONS = 5
export const PADDOCK_DURATION_MS = 60_000

// ─── Economy (coins come ONLY from graded answers; feed is bought with coins) ───
export const COINS_PER_CORRECT = 1
/** Total coins for a fast answer (not added on top of COINS_PER_CORRECT). */
export const COINS_PER_FLUENT = 2
/** Feed granted on a fresh save so day one can begin. */
export const STARTING_FEED = 12
/** Feed shed: this many feed units for this many coins (fixed price). */
export const FEED_BUNDLE_UNITS = 10
export const FEED_BUNDLE_PRICE = 6
/** Feed consumed by one feeding. Watering / cleaning / play cost no feed. */
export const FEED_PER_FEEDING = 3

// ─── Persistence (Track E) ───
export const SAVE_KEY = 'sanctuary-farm/save'
export const SCHEMA_VERSION = 2 as const

// ─── Cold start (Phase 2) ───
/** Families whose facts start `introduced` on a fresh save (the Anchors tier). */
export const COLD_START_FAMILIES: readonly number[] = [1, 2, 10]
/** Creature already living in the barn on day one — a gift, no egg ceremony. */
export const COLD_START_CREATURE_FAMILY = 10

// ─── Egg visual states, keyed off familyProgress() (Track D / Phase 2) ───
export const EGG_GLOW_AT = 0.34
export const EGG_CRACK_AT = 0.67
export const EGG_HATCH_AT = 1.0

// ─── Default creature names (player can rename; Track D / Phase 2) ───
export const DEFAULT_CREATURE_NAMES: Record<number, string> = {
  1: 'Pip',
  2: 'Dobble',
  3: 'Trefoil',
  4: 'Quill',
  5: 'Cinq',
  6: 'Hexley',
  7: 'Sept',
  8: 'Otto',
  9: 'Nova',
  10: 'Tenner',
  11: 'Elvin',
  12: 'Dozen',
}
