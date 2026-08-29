import { test, expect, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import route from '@/dev/routes/quiz.route'
import { ENTRANCE_MS, CHEW_MS } from './QuizPanel'

test('quiz dev route runs a full session and shows per-answer latency', async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  const user = userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) })
  const Comp = route.Component
  render(<Comp />)

  for (let i = 0; i < 5; i++) {
    await act(async () => { await vi.advanceTimersByTimeAsync(ENTRANCE_MS + 20) })
    const text = screen.getByTestId('prompt').textContent ?? ''
    const [a, b] = text.split('×').map((s) => Number(s.trim()))
    await user.keyboard(String(a * b))
    await user.keyboard('{Enter}')
    await act(async () => { await vi.advanceTimersByTimeAsync(CHEW_MS + 20) })
  }

  expect(screen.getByText('Session complete.')).toBeInTheDocument()
  expect(screen.getByRole('table')).toBeInTheDocument()
  expect(screen.getAllByRole('row').length).toBeGreaterThanOrEqual(6) // header + 5
  expect(errSpy).not.toHaveBeenCalled()
  errSpy.mockRestore()
  vi.useRealTimers()
})
