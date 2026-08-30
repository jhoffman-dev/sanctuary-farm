// Track A's `Scheduler.next()` / `nextInFamily()` mutate state (they record the
// served family for interleaving). React renders more than once — StrictMode
// double-invokes state initialisers, effects re-run — so a bare call in a
// component would advance the schedule twice.
//
// This wrapper makes the "get a question" calls idempotent between grades: they
// serve the same fact until `grade()` is called, then a fresh one afterwards.
import type { Fact, GradeResult, Scheduler } from '@/contracts'

export function idempotentScheduler(base: Scheduler): Scheduler {
  let pending: Fact | null = null
  let pendingKey: string | null = null

  const cached = (key: string, produce: () => Fact): Fact => {
    if (pending !== null && pendingKey === key) return pending
    pending = produce()
    pendingKey = key
    return pending
  }

  return {
    next: () => cached('*', () => base.next()),
    nextInFamily: (family: number) => cached(`f${family}`, () => base.nextInFamily(family)),
    grade(factId: string, given: number, latencyMs: number): GradeResult {
      const result = base.grade(factId, given, latencyMs)
      pending = null
      pendingKey = null
      return result
    },
    familyProgress: (family: number) => base.familyProgress(family),
    isMastered: (family: number) => base.isMastered(family),
    snapshot: () => base.snapshot(),
  }
}
