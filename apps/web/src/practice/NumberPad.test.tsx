import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { NumberPad } from './NumberPad'

function renderPad(props: { disabled?: boolean } = {}) {
  const onSubmit = vi.fn()
  render(<NumberPad onSubmit={onSubmit} {...props} />)
  return { onSubmit, user: userEvent.setup() }
}

const entry = () => screen.getByTestId('entry')

describe('NumberPad', () => {
  it('composes a number from tapped digits and submits it', async () => {
    const { onSubmit, user } = renderPad()
    await user.click(screen.getByTestId('numberpad-5'))
    await user.click(screen.getByTestId('numberpad-6'))
    expect(entry()).toHaveTextContent('56')

    await user.click(screen.getByTestId('submit'))
    expect(onSubmit).toHaveBeenCalledWith(56)
    expect(entry()).not.toHaveTextContent(/\d/)
  })

  it('accepts digits, Backspace and Enter from the keyboard', async () => {
    const { onSubmit, user } = renderPad()
    await user.keyboard('4')
    await user.keyboard('2')
    await user.keyboard('9')
    await user.keyboard('{Backspace}')
    expect(entry()).toHaveTextContent('42')

    await user.keyboard('{Enter}')
    expect(onSubmit).toHaveBeenCalledWith(42)
  })

  it('removes the last digit with the backspace button', async () => {
    const { user } = renderPad()
    await user.click(screen.getByTestId('numberpad-1'))
    await user.click(screen.getByTestId('numberpad-2'))
    await user.click(screen.getByTestId('backspace'))
    expect(entry()).toHaveTextContent(/^1$/)
  })

  it('stops at three digits', async () => {
    const { onSubmit, user } = renderPad()
    await user.keyboard('1234')
    expect(entry()).toHaveTextContent(/^123$/)

    await user.keyboard('{Enter}')
    expect(onSubmit).toHaveBeenCalledWith(123)
  })

  it('does not submit an empty entry', async () => {
    const { onSubmit, user } = renderPad()
    expect(screen.getByTestId('submit')).toBeDisabled()
    await user.keyboard('{Enter}')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('ignores taps and keys while disabled', async () => {
    const { onSubmit, user } = renderPad({ disabled: true })
    expect(screen.getByTestId('numberpad-7')).toBeDisabled()
    await user.click(screen.getByTestId('numberpad-7'))
    await user.keyboard('7{Enter}')
    expect(entry()).not.toHaveTextContent(/\d/)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('offers exactly the ten digits, no answer choices', () => {
    renderPad()
    const digitButtons = screen.getAllByRole('button', { name: /^Digit \d$/ })
    expect(digitButtons).toHaveLength(10)
  })
})
