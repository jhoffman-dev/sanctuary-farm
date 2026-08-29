// Core fact + fact-state types. Owned by Phase 0.

export type Fact = {
  id: string // "7x8"
  a: number // 1..12
  b: number // 1..12
  answer: number
  family: number // larger operand — determines which egg
  tier: 1 | 2 | 3 | 4 | 5 | 6
  hardCore: boolean
}

export type Box = 0 | 1 | 2 | 3 | 4 | 5

export type FactState = {
  id: string
  box: Box
  dueAt: number // global question counter, not wall clock
  lastLatencyMs: number | null
  recentLatencies: number[] // rolling, max MAX_RECENT_LATENCIES
  correctStreak: number
  totalAttempts: number
  totalCorrect: number
  introduced: boolean
}

export type Outcome = 'FLUENT' | 'SLOW' | 'LABORED' | 'WRONG'
