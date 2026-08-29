import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { NumberPad } from './NumberPad'

function Harness({
  onConfirm = () => {},
  disabled = false,
  maxLength,
}: {
  onConfirm?: () => void
  disabled?: boolean
  maxLength?: number
}) {
  const [value, setValue] = useState('')
  return (
    <>
      <output data-testid="v">{value}</output>
      <NumberPad
        value={value}
        onChange={setValue}
        onConfirm={onConfirm}
        disabled={disabled}
        maxLength={maxLength}
      />
    </>
  )
}

describe('NumberPad', () => {
  it('appends digits and backspaces by pointer', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: '7' }))
    await user.click(screen.getByRole('button', { name: '8' }))
    expect(screen.getByTestId('v')).toHaveTextContent('78')
    await user.click(screen.getByRole('button', { name: 'Backspace' }))
    expect(screen.getByTestId('v')).toHaveTextContent('7')
  })

  it('accepts the physical keyboard as a parallel path', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<Harness onConfirm={onConfirm} />)
    await user.keyboard('42')
    expect(screen.getByTestId('v')).toHaveTextContent('42')
    await user.keyboard('{Backspace}')
    expect(screen.getByTestId('v')).toHaveTextContent('4')
    await user.keyboard('{Enter}')
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('honours the default maxLength of 3', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.keyboard('12345')
    expect(screen.getByTestId('v')).toHaveTextContent('123')
  })

  it('honours an explicit maxLength', async () => {
    const user = userEvent.setup()
    render(<Harness maxLength={2} />)
    await user.keyboard('999')
    expect(screen.getByTestId('v')).toHaveTextContent('99')
  })

  it('ignores input when disabled', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<Harness disabled onConfirm={onConfirm} />)
    await user.keyboard('5')
    await user.keyboard('{Enter}')
    expect(screen.getByTestId('v')).toHaveTextContent('')
    expect(onConfirm).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: '5' })).toBeDisabled()
  })

  it('never renders a multiple-choice option (number pad only)', () => {
    render(<Harness />)
    const labels = screen.getAllByRole('button').map((b) => b.textContent?.trim())
    // 0-9 plus backspace + confirm glyphs only — no answer choices.
    expect(labels.filter((l) => l && /^\d+$/.test(l)).sort()).toEqual(
      ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].sort(),
    )
  })
})
