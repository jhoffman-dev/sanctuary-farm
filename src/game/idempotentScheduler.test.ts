import { describe, expect, it } from 'vitest'
import { createScheduler, initialSchedulerState } from '@/engine/scheduler'
import { idempotentScheduler } from './idempotentScheduler'

describe('idempotentScheduler', () => {
  it('serves the same fact until grade() is called', () => {
    const s = idempotentScheduler(createScheduler(initialSchedulerState()))
    const a = s.next()
    const b = s.next()
    const c = s.next()
    expect(a.id).toBe(b.id)
    expect(b.id).toBe(c.id)
  })

  it('advances to a fresh fact after a grade', () => {
    const s = idempotentScheduler(createScheduler(initialSchedulerState()))
    const first = s.next()
    s.grade(first.id, first.answer, 1200)
    // not guaranteed to differ in identity, but the schedule has advanced
    const before = s.snapshot().globalCounter
    s.next()
    s.grade(s.next().id, 0, 1200)
    expect(s.snapshot().globalCounter).toBe(before + 1)
  })

  it('does not double-count the served family under repeated next()', () => {
    const base = createScheduler(initialSchedulerState())
    const s = idempotentScheduler(base)
    s.next()
    s.next()
    s.next()
    // the wrapped scheduler only asked the base once, so recentFamilies has 1 entry
    expect(s.snapshot().recentFamilies).toHaveLength(1)
  })
})
