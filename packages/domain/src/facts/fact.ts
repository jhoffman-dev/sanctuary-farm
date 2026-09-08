/** `"7x8"` — a and b are ordered; 7×8 and 8×7 are distinct facts. */
export type FactId = string

/** Introduction tiers, in the order kids meet them (1 = Anchors … 6 = The 12s). */
export type Tier = 1 | 2 | 3 | 4 | 5 | 6

export type Fact = {
  id: FactId
  a: number
  b: number
  answer: number
  /** The larger operand. Determines which egg / animal the fact belongs to. */
  family: number
  tier: Tier
  /** One of the ten facts kids most often stall on (7×8, 6×8, …). Over-sampled once introduced. */
  hardCore: boolean
}

/** Leitner box. 0 = not yet introduced; 5 = the mastery box. */
export type Box = 0 | 1 | 2 | 3 | 4 | 5

export type FactState = {
  id: FactId
  box: Box
  /** Global question counter at which this fact is next due. Not wall-clock. */
  dueAt: number
  lastLatencyMs: number | null
  /** Rolling, newest last, at most MAX_RECENT_LATENCIES long. */
  recentLatencies: number[]
  correctStreak: number
  totalAttempts: number
  totalCorrect: number
  introduced: boolean
}

/** How an answer was graded. Latency decides between the three correct outcomes. */
export type Outcome = 'FLUENT' | 'SLOW' | 'LABORED' | 'WRONG'
