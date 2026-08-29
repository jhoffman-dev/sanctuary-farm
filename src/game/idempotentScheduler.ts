// Track A's `Scheduler.next()` mutates state (it records the served family for
// interleaving and may introduce a fact). React renders it more than once —
// StrictMode double-invokes state initialisers, effects re-run — so a bare
// `next()` in a component would advance the schedule twice.
//
// This wrapper makes `next()` idempotent between grades: it serves the same fact
// until `grade()` is called, then serves a fresh one on the next `next()`.
import type { Fact, GradeResult, Scheduler } from '@/contracts'

export function idempotentScheduler(base: Scheduler): Scheduler {
  let pending: Fact | null = null

  return {
    next(): Fact {
      if (pending === null) pending = base.next()
      return pending
    },
    grade(factId: string, given: number, latencyMs: number): GradeResult {
      const result = base.grade(factId, given, latencyMs)
      pending = null
      return result
    },
    familyProgress: (family: number) => base.familyProgress(family),
    isMastered: (family: number) => base.isMastered(family),
    snapshot: () => base.snapshot(),
  }
}
