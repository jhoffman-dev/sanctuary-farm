import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { HatchedCreature, SessionLog } from '@/contracts'
import { CHORE_QUESTIONS_PER_STALL } from '@/contracts'
import { createScheduler, initialSchedulerState } from '@/engine/scheduler'
import { defaultCreatureParams } from '@/creatures/definitions'
import { StallPanel } from './StallPanel'

function gift(): HatchedCreature {
  return {
    family: 10,
    name: 'Tenner',
    params: defaultCreatureParams(10),
    hatchedAt: 0,
    stallIndex: 0,
  }
}

describe('StallPanel', () => {
  it('shows the creature name at rest', () => {
    render(
      <StallPanel
        creature={gift()}
        scheduler={createScheduler(initialSchedulerState())}
        onRename={() => {}}
        onFed={() => {}}
        onClose={() => {}}
      />,
    )
    expect(screen.getByTestId('creature-name')).toHaveTextContent('Tenner')
  })

  it('renames the creature and reports it through onRename', async () => {
    const onRename = vi.fn()
    render(
      <StallPanel
        creature={gift()}
        scheduler={createScheduler(initialSchedulerState())}
        onRename={onRename}
        onFed={() => {}}
        onClose={() => {}}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Rename' }))
    const input = screen.getByLabelText('creature name')
    await userEvent.clear(input)
    await userEvent.type(input, 'Buttercup')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(onRename).toHaveBeenCalledWith('Buttercup')
    expect(screen.getByTestId('creature-name')).toHaveTextContent('Buttercup')
  })

  it('feeds the creature through QuizPanel and returns the session log', async () => {
    const onFed = vi.fn()
    const scheduler = createScheduler(initialSchedulerState())
    render(
      <StallPanel
        creature={gift()}
        scheduler={scheduler}
        onRename={() => {}}
        onFed={onFed}
        onClose={() => {}}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Feed' }))
    expect(document.querySelector('[data-stub="QuizPanel"]')).toBeInTheDocument()

    for (let i = 0; i < CHORE_QUESTIONS_PER_STALL; i++) {
      await userEvent.click(screen.getByRole('button', { name: '1' }))
      await userEvent.click(screen.getByRole('button', { name: 'Enter' }))
    }

    expect(onFed).toHaveBeenCalledTimes(1)
    const log = onFed.mock.calls[0][0] as SessionLog
    expect(log.context).toBe('stall')
    expect(log.familyContext).toBe(10)
    expect(log.entries).toHaveLength(CHORE_QUESTIONS_PER_STALL)

    // quiz unmounts, creature back at rest
    expect(document.querySelector('[data-stub="QuizPanel"]')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Feed' })).toBeInTheDocument()
  })

  it('does not gate the quiz on the stall family (D11 — no per-stall fact filter)', async () => {
    // The scheduler is constructed independently; StallPanel must not wrap or
    // filter it. We assert the panel forwards the exact scheduler instance by
    // spying on next().
    const scheduler = createScheduler(initialSchedulerState())
    const nextSpy = vi.spyOn(scheduler, 'next')
    render(
      <StallPanel
        creature={gift()}
        scheduler={scheduler}
        onRename={() => {}}
        onFed={() => {}}
        onClose={() => {}}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Feed' }))
    expect(nextSpy).toHaveBeenCalled()
  })
})
