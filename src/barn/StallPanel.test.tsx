import type { ComponentProps } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { HatchedCreature, SessionLog } from '@/contracts'
import { CARE_QUESTIONS, emptyAnimalCare } from '@/contracts'
import { createScheduler, initialSchedulerState } from '@/engine/scheduler'
import { defaultCreatureParams } from '@/creatures/definitions'
import { ENTRANCE_MS, CHEW_MS } from '@/quiz/QuizPanel'
import { StallPanel } from './StallPanel'

const TODAY = '2026-08-29'

function gift(): HatchedCreature {
  return {
    family: 10,
    name: 'Tenner',
    params: defaultCreatureParams(10),
    hatchedAt: 0,
    stallIndex: 0,
  }
}

function renderPanel(over: Partial<ComponentProps<typeof StallPanel>> = {}) {
  const props = {
    creature: gift(),
    care: emptyAnimalCare(10),
    today: TODAY,
    feed: 20,
    scheduler: createScheduler(initialSchedulerState()),
    onRename: vi.fn(),
    onCareComplete: vi.fn(),
    onClose: vi.fn(),
    ...over,
  }
  render(<StallPanel {...props} />)
  return props
}

afterEach(() => {
  vi.useRealTimers()
})

describe('StallPanel', () => {
  it('shows the creature name and all four care buttons', () => {
    renderPanel()
    expect(screen.getByTestId('creature-name')).toHaveTextContent('Tenner')
    for (const label of ['Feed', 'Water', 'Clean', 'Play']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
    }
  })

  it('renames the creature through onRename', async () => {
    const onRename = vi.fn()
    renderPanel({ onRename })
    await userEvent.click(screen.getByRole('button', { name: 'Rename' }))
    const input = screen.getByLabelText('creature name')
    await userEvent.clear(input)
    await userEvent.type(input, 'Buttercup')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onRename).toHaveBeenCalledWith('Buttercup')
    expect(screen.getByTestId('creature-name')).toHaveTextContent('Buttercup')
  })

  it('a task already done today is disabled', () => {
    const care = emptyAnimalCare(10)
    care.done.water = TODAY
    renderPanel({ care })
    expect(screen.getByRole('button', { name: 'Water' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Feed' })).toBeEnabled()
  })

  it('the Feed button is disabled when there is not enough feed', () => {
    renderPanel({ feed: 0 })
    expect(screen.getByRole('button', { name: 'Feed' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Water' })).toBeEnabled()
  })

  it('runs a care round through QuizPanel and reports the task + log', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) })
    const tick = (ms: number) => act(async () => void (await vi.advanceTimersByTimeAsync(ms)))

    const onCareComplete = vi.fn()
    renderPanel({ onCareComplete })

    await user.click(screen.getByRole('button', { name: /Water/i }))
    expect(screen.getByTestId('number-pad')).toBeInTheDocument()

    for (let i = 0; i < CARE_QUESTIONS.water; i++) {
      await tick(ENTRANCE_MS + 20)
      const factId = screen.getByTestId('prompt').getAttribute('data-fact') ?? ''
      const [a, b] = factId.split('x').map(Number)
      for (const d of String(a * b)) await user.click(screen.getByRole('button', { name: d }))
      await user.click(screen.getByRole('button', { name: 'Confirm answer' }))
      await tick(CHEW_MS + 20)
    }

    expect(onCareComplete).toHaveBeenCalledTimes(1)
    const [task, log] = onCareComplete.mock.calls[0] as ['feed' | 'water', SessionLog]
    expect(task).toBe('water')
    expect(log.context).toBe('stall')
    expect(log.familyContext).toBe(10)
    expect(log.entries).toHaveLength(CARE_QUESTIONS.water)
  })

  it('does not filter the scheduler by family (D11)', async () => {
    const scheduler = createScheduler(initialSchedulerState())
    const nextSpy = vi.spyOn(scheduler, 'next')
    renderPanel({ scheduler })
    await userEvent.click(screen.getByRole('button', { name: /Clean/i }))
    expect(nextSpy).toHaveBeenCalled()
  })
})
