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

  describe('with keyboard focus on a button', () => {
    it('lets Enter activate a focused button outside the pad instead of submitting', async () => {
      const { onMute, onSubmit, user } = renderPadBesideMuteButton()
      await user.keyboard('4')
      screen.getByRole('button', { name: 'Mute' }).focus()

      await user.keyboard('{Enter}')
      expect(onMute).toHaveBeenCalledTimes(1)
      expect(onSubmit).not.toHaveBeenCalled()
      expect(entry()).toHaveTextContent(/^4$/)
    })

    it('appends the digit when Enter activates a focused digit key, without submitting', async () => {
      const { onSubmit, user } = renderPad()
      await user.keyboard('4')
      screen.getByTestId('numberpad-5').focus()

      await user.keyboard('{Enter}')
      expect(entry()).toHaveTextContent(/^45$/)
      expect(onSubmit).not.toHaveBeenCalled()
    })

    it('still takes typed digits and Backspace while a pad key has focus', async () => {
      const { onSubmit, user } = renderPad()
      await user.click(screen.getByTestId('numberpad-5'))
      await user.keyboard('67{Backspace}')
      expect(entry()).toHaveTextContent(/^56$/)

      await user.click(screen.getByTestId('submit'))
      expect(onSubmit).toHaveBeenCalledWith(56)
    })
  })
})

/** The pad next to an unrelated control, as it sits beside the HUD's mute button. */
function renderPadBesideMuteButton() {
  const onMute = vi.fn()
  const onSubmit = vi.fn()
  render(
    <>
      <button type="button" onClick={onMute}>
        Mute
      </button>
      <NumberPad onSubmit={onSubmit} />
    </>,
  )
  return { onMute, onSubmit, user: userEvent.setup() }
}
