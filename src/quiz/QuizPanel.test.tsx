import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FLUENT_MAX_MS, LABORED_MIN_MS } from '@/contracts'
import type {
  CreatureMood,
  Fact,
  GradeResult,
  Outcome,
  Scheduler,
  SchedulerState,
  SessionLog,
} from '@/contracts'
import { QuizPanel, ENTRANCE_MS, CHEW_MS } from './QuizPanel'

// ─── Test-only Scheduler double ──────────────────────────────────────────────
// Implements the Scheduler INTERFACE for deterministic control. It is NOT the
// learning engine (Track A owns that) — no Leitner logic lives here.
type ScriptFact = { id: string; a: number; b: number; answer: number; family: number }

function toFact(s: ScriptFact): Fact {
  return { id: s.id, a: s.a, b: s.b, answer: s.answer, family: s.family, tier: 1, hardCore: false }
}

function makeTestScheduler(script: ScriptFact[]) {
  let cursor = 0
  let counter = 0
  const grades: Array<{ id: string; given: number; latencyMs: number }> = []

  const scheduler: Scheduler = {
    next() {
      const s = script[Math.min(cursor, script.length - 1)]
      cursor += 1
      return toFact(s)
    },
    grade(id, given, latencyMs) {
      grades.push({ id, given, latencyMs })
      counter += 1
      const s = script.find((f) => f.id === id) ?? script[0]
      const correct = given === s.answer
      let outcome: Outcome
      if (!correct) outcome = 'WRONG'
      else if (latencyMs < FLUENT_MAX_MS) outcome = 'FLUENT'
      else if (latencyMs <= LABORED_MIN_MS) outcome = 'SLOW'
      else outcome = 'LABORED'
      const result: GradeResult = {
        outcome,
        correct,
        fact: toFact(s),
        correctAnswer: s.answer,
        previousBox: 1,
        newBox: correct ? 2 : 1,
        factMastered: false,
        familyJustMastered: null,
      }
      return result
    },
    familyProgress: () => 0,
    isMastered: () => false,
    snapshot: (): SchedulerState => ({
      facts: {},
      globalCounter: counter,
      unlockedTiers: [1],
      recentFamilies: [],
      maxTable: 12,
    }),
  }

  return { scheduler, grades }
}

const SCRIPT: ScriptFact[] = [
  { id: '2x3', a: 2, b: 3, answer: 6, family: 3 },
  { id: '3x4', a: 3, b: 4, answer: 12, family: 4 },
  { id: '2x2', a: 2, b: 2, answer: 4, family: 2 },
  { id: '10x5', a: 10, b: 5, answer: 50, family: 10 },
  { id: '3x3', a: 3, b: 3, answer: 9, family: 3 },
]

// ─── Timing helpers (fake timers) ────────────────────────────────────────────
async function tick(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

/** Advance past the entrance backstop so the question becomes answerable. */
async function bootQuestion() {
  await tick(ENTRANCE_MS + 20)
}

/** Chew a correct answer and land on the next question / completion. */
async function chew() {
  await tick(CHEW_MS + 20)
}

function currentAnswer(): number {
  const id = screen.getByTestId('prompt').getAttribute('data-fact') ?? ''
  const found = SCRIPT.find((s) => s.id === id)
  if (!found) throw new Error(`unknown fact ${id}`)
  return found.answer
}

// user-event needs the fake clock to keep moving so its internal awaits resolve;
// the explicit advanceTimersByTime* calls still jump it where latency matters.
beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
})
afterEach(() => {
  vi.useRealTimers()
})

function setupUser() {
  return userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) })
}

describe('QuizPanel', () => {
  it('runs a full count session with the physical keyboard only', async () => {
    const user = setupUser()
    const { scheduler, grades } = makeTestScheduler(SCRIPT)
    const onComplete = vi.fn<(log: SessionLog) => void>()

    render(
      <QuizPanel
        scheduler={scheduler}
        mode={{ kind: 'count', questions: 5 }}
        context="free"
        onComplete={onComplete}
      />,
    )

    for (let q = 0; q < 5; q++) {
      await bootQuestion()
      await user.keyboard(String(currentAnswer()))
      await user.keyboard('{Enter}')
      await chew()
    }

    expect(grades).toHaveLength(5)
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('runs a full count session with pointer / touch only', async () => {
    const user = setupUser()
    const { scheduler, grades } = makeTestScheduler(SCRIPT)
    const onComplete = vi.fn()
    render(
      <QuizPanel
        scheduler={scheduler}
        mode={{ kind: 'count', questions: 5 }}
        context="free"
        onComplete={onComplete}
      />,
    )

    for (let q = 0; q < 5; q++) {
      await bootQuestion()
      for (const digit of String(currentAnswer())) {
        await user.click(screen.getByRole('button', { name: digit }))
      }
      await user.click(screen.getByRole('button', { name: 'Confirm answer' }))
      await chew()
    }

    expect(grades).toHaveLength(5)
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('backspace edits the entry', async () => {
    const user = setupUser()
    const { scheduler } = makeTestScheduler([SCRIPT[3]]) // 10x5 = 50 (multi-digit)
    render(
      <QuizPanel
        scheduler={scheduler}
        mode={{ kind: 'count', questions: 1 }}
        context="free"
        onComplete={vi.fn()}
      />,
    )
    await bootQuestion()

    await user.click(screen.getByRole('button', { name: '1' }))
    await user.click(screen.getByRole('button', { name: '2' }))
    await user.click(screen.getByRole('button', { name: '3' }))
    expect(screen.getByTestId('entry')).toHaveTextContent('123')

    await user.click(screen.getByRole('button', { name: 'Backspace' }))
    expect(screen.getByTestId('entry')).toHaveTextContent('12')
  })

  it('does nothing when confirm is pressed on an empty field', async () => {
    const user = setupUser()
    const { scheduler, grades } = makeTestScheduler([SCRIPT[3]])
    const onComplete = vi.fn()
    render(
      <QuizPanel
        scheduler={scheduler}
        mode={{ kind: 'count', questions: 1 }}
        context="free"
        onComplete={onComplete}
      />,
    )
    await bootQuestion()

    await user.click(screen.getByRole('button', { name: 'Confirm answer' }))
    await user.keyboard('{Enter}')
    await tick(1000)

    expect(grades).toHaveLength(0)
    expect(onComplete).not.toHaveBeenCalled()
    expect(screen.getByTestId('prompt')).toBeInTheDocument()
  })

  it('reports latency for a ~2000 ms multi-digit answer within tolerance', async () => {
    const user = setupUser()
    const { scheduler, grades } = makeTestScheduler([SCRIPT[3]]) // answer 50
    render(
      <QuizPanel
        scheduler={scheduler}
        mode={{ kind: 'count', questions: 1 }}
        context="free"
        onComplete={vi.fn()}
      />,
    )
    await bootQuestion()
    await tick(2000)
    await user.keyboard('50')
    await user.keyboard('{Enter}')

    expect(grades).toHaveLength(1)
    expect(Math.abs(grades[0].latencyMs - 2000)).toBeLessThanOrEqual(150)
  })

  it('stops the timer on the first digit for a single-digit answer', async () => {
    const user = setupUser()
    const { scheduler, grades } = makeTestScheduler([SCRIPT[0]]) // 2x3 = 6
    render(
      <QuizPanel
        scheduler={scheduler}
        mode={{ kind: 'count', questions: 1 }}
        context="free"
        onComplete={vi.fn()}
      />,
    )
    await bootQuestion()
    await tick(1200)
    await user.keyboard('6') // timer should stop here
    await tick(5000) // dawdling before confirm must not count
    await user.keyboard('{Enter}')

    expect(grades).toHaveLength(1)
    expect(Math.abs(grades[0].latencyMs - 1200)).toBeLessThanOrEqual(150)
  })

  it('stops the timer on confirm for a multi-digit answer', async () => {
    const user = setupUser()
    const { scheduler, grades } = makeTestScheduler([SCRIPT[1]]) // 3x4 = 12
    render(
      <QuizPanel
        scheduler={scheduler}
        mode={{ kind: 'count', questions: 1 }}
        context="free"
        onComplete={vi.fn()}
      />,
    )
    await bootQuestion()
    await tick(800)
    await user.keyboard('1')
    await tick(800)
    await user.keyboard('2')
    await tick(800)
    await user.keyboard('{Enter}') // stops here → ~2400 ms

    expect(grades).toHaveLength(1)
    expect(Math.abs(grades[0].latencyMs - 2400)).toBeLessThanOrEqual(150)
  })

  it('will not leave the wrong-answer teach-back until the correct answer is entered', async () => {
    const user = setupUser()
    const { scheduler, grades } = makeTestScheduler([SCRIPT[1]]) // 3x4 = 12
    const onComplete = vi.fn()
    render(
      <QuizPanel
        scheduler={scheduler}
        mode={{ kind: 'count', questions: 1 }}
        context="free"
        onComplete={onComplete}
      />,
    )
    await bootQuestion()
    await user.keyboard('99')
    await user.keyboard('{Enter}')

    // Teach-back is up.
    expect(screen.getByTestId('feedback-overlay')).toBeInTheDocument()
    expect(screen.getByTestId('feedback-fact')).toHaveTextContent('3 × 4 = 12')

    // Cannot tap through: empty confirm, then a wrong answer.
    await user.click(screen.getByRole('button', { name: 'Confirm answer' }))
    await user.keyboard('7')
    await user.keyboard('{Enter}')
    await tick(500)
    expect(screen.getByTestId('feedback-overlay')).toBeInTheDocument()
    expect(onComplete).not.toHaveBeenCalled()

    // Correct answer dismisses it and finishes the (single-question) run.
    await user.keyboard('12')
    await user.keyboard('{Enter}')
    await chew()

    expect(onComplete).toHaveBeenCalledTimes(1)
    // The engine (not Track B) re-queues the missed fact; only one grade here.
    expect(grades).toHaveLength(1)
    expect(grades[0]).toMatchObject({ id: '3x4', given: 99 })
  })

  it('calls onComplete exactly once with a well-formed SessionLog', async () => {
    const user = setupUser()
    const { scheduler } = makeTestScheduler(SCRIPT)
    const onComplete = vi.fn<(log: SessionLog) => void>()
    const before = Date.now()

    render(
      <QuizPanel
        scheduler={scheduler}
        mode={{ kind: 'count', questions: 3 }}
        context="stall"
        familyContext={7}
        onComplete={onComplete}
      />,
    )

    for (let q = 0; q < 3; q++) {
      await bootQuestion()
      await user.keyboard(String(currentAnswer()))
      await user.keyboard('{Enter}')
      await chew()
    }

    expect(onComplete).toHaveBeenCalledTimes(1)
    const log = onComplete.mock.calls[0][0]
    expect(log.context).toBe('stall')
    expect(log.familyContext).toBe(7)
    expect(log.entries).toHaveLength(3)
    expect(log.startedAt).toBeGreaterThanOrEqual(before)
    expect(log.endedAt).toBeGreaterThanOrEqual(log.startedAt)
    for (const entry of log.entries) {
      expect(entry).toEqual(
        expect.objectContaining({
          factId: expect.any(String),
          given: expect.any(Number),
          correct: expect.any(Boolean),
          latencyMs: expect.any(Number),
          outcome: expect.any(String),
          askedAt: expect.any(Number),
        }),
      )
    }
  })

  it('drives the creature mood: idle → eating/happy on correct, puzzled on wrong', async () => {
    const user = setupUser()
    const { scheduler } = makeTestScheduler([SCRIPT[1]]) // 3x4 = 12
    const moods: CreatureMood[] = []
    render(
      <QuizPanel
        scheduler={scheduler}
        mode={{ kind: 'count', questions: 1 }}
        context="free"
        onMood={(m) => moods.push(m)}
        onComplete={vi.fn()}
      />,
    )
    await bootQuestion()
    await user.keyboard('99')
    await user.keyboard('{Enter}')
    expect(moods).toContain('puzzled')

    await user.keyboard('12')
    await user.keyboard('{Enter}')
    await chew()
    expect(moods).toContain('idle')
  })

  it('ends a timed session once its duration elapses', async () => {
    const user = setupUser()
    const { scheduler, grades } = makeTestScheduler(SCRIPT)
    const onComplete = vi.fn()
    render(
      <QuizPanel
        scheduler={scheduler}
        mode={{ kind: 'timed', durationMs: 5000 }}
        context="paddock"
        onComplete={onComplete}
      />,
    )

    // First answer, well inside the window.
    await bootQuestion()
    await user.keyboard(String(currentAnswer()))
    await user.keyboard('{Enter}')
    await chew()
    expect(onComplete).not.toHaveBeenCalled()

    // Burn past the deadline, answer once more → session should wrap up.
    await tick(6000)
    await bootQuestion()
    await user.keyboard(String(currentAnswer()))
    await user.keyboard('{Enter}')
    await chew()

    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(grades.length).toBeGreaterThanOrEqual(2)
  })
})
