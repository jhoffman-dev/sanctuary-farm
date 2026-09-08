import { useCallback, useEffect, useState } from 'react'

export const MAX_DIGITS = 3

type NumberPadProps = {
  onSubmit: (value: number) => void
  /** While disabled the pad ignores taps and keys and shows as inactive. */
  disabled?: boolean
}

const DIGITS = ['7', '8', '9', '4', '5', '6', '1', '2', '3'] as const

const keyClass =
  'min-h-14 min-w-14 cursor-pointer rounded-2xl bg-white text-2xl font-bold text-stone-800 shadow ' +
  'active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40 ' +
  'focus-visible:outline-4 focus-visible:outline-amber-500'

/**
 * A typed-answer pad. Never multiple choice: the player composes the number
 * digit by digit, on screen or on a physical keyboard.
 */
export function NumberPad({ onSubmit, disabled = false }: NumberPadProps) {
  const [entry, setEntry] = useState('')

  const appendDigit = useCallback((digit: string) => {
    setEntry((current) => (current.length >= MAX_DIGITS ? current : current + digit))
  }, [])
  const backspace = useCallback(() => setEntry((current) => current.slice(0, -1)), [])
  const submit = useCallback(() => {
    if (entry === '') return
    setEntry('')
    onSubmit(Number(entry))
  }, [entry, onSubmit])

  useEffect(() => {
    if (disabled) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return
      if (/^[0-9]$/.test(event.key)) appendDigit(event.key)
      else if (event.key === 'Backspace') backspace()
      else if (event.key === 'Enter') {
        // Stop a focused button from also firing its click on the same keystroke.
        event.preventDefault()
        submit()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [disabled, appendDigit, backspace, submit])

  const digitButton = (digit: string) => (
    <button
      key={digit}
      type="button"
      className={keyClass}
      disabled={disabled}
      aria-label={`Digit ${digit}`}
      data-testid={`numberpad-${digit}`}
      onClick={() => appendDigit(digit)}
    >
      {digit}
    </button>
  )

  return (
    <div className="flex flex-col items-center gap-3" role="group" aria-label="Number pad">
      <output
        data-testid="entry"
        aria-label="Your answer"
        className="min-h-14 w-full rounded-2xl bg-stone-900/80 px-4 text-center text-4xl leading-14 font-bold tracking-widest text-white"
      >
        {entry === '' ? ' ' : entry}
      </output>
      <div className="grid grid-cols-3 gap-2">
        {DIGITS.map(digitButton)}
        <button
          type="button"
          className={keyClass}
          disabled={disabled}
          aria-label="Backspace"
          data-testid="backspace"
          onClick={backspace}
        >
          ⌫
        </button>
        {digitButton('0')}
        <button
          type="button"
          className={`${keyClass} bg-amber-400`}
          disabled={disabled || entry === ''}
          aria-label="Submit answer"
          data-testid="submit"
          onClick={submit}
        >
          ↵
        </button>
      </div>
    </div>
  )
}
