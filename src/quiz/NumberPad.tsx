// Track B — large-button number pad with a parallel physical-keyboard path.
// Number pad ONLY. Never multiple choice. No auto-submit: the confirm key
// is the only thing that submits, and the panel decides what to do with it.
import { useEffect } from 'react'
import type { NumberPadProps } from '@/contracts'

const DIGIT_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const

const digitButton =
  'rounded-2xl bg-amber-100 py-5 text-3xl font-bold text-stone-800 ' +
  'transition active:scale-95 hover:bg-amber-200 disabled:opacity-40 disabled:active:scale-100'

export function NumberPad({
  value,
  onChange,
  onConfirm,
  disabled = false,
  maxLength = 3,
}: NumberPadProps) {
  useEffect(() => {
    if (disabled) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault()
        if (value.length < maxLength) onChange(value + e.key)
      } else if (e.key === 'Backspace') {
        e.preventDefault()
        onChange(value.slice(0, -1))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        onConfirm()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [value, onChange, onConfirm, disabled, maxLength])

  const press = (d: string) => {
    if (disabled || value.length >= maxLength) return
    onChange(value + d)
  }
  const backspace = () => {
    if (disabled) return
    onChange(value.slice(0, -1))
  }

  return (
    <div className="grid grid-cols-3 gap-2" data-testid="number-pad">
      {DIGIT_KEYS.map((d) => (
        <button
          key={d}
          type="button"
          disabled={disabled}
          onClick={() => press(d)}
          className={digitButton}
        >
          {d}
        </button>
      ))}
      <button
        type="button"
        aria-label="Backspace"
        disabled={disabled}
        onClick={backspace}
        className="rounded-2xl bg-stone-200 py-5 text-2xl text-stone-700 transition active:scale-95 hover:bg-stone-300 disabled:opacity-40"
      >
        ⌫
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => press('0')}
        className={digitButton}
      >
        0
      </button>
      <button
        type="button"
        aria-label="Confirm answer"
        disabled={disabled}
        onClick={onConfirm}
        className="rounded-2xl bg-emerald-400 py-5 text-2xl font-bold text-white transition active:scale-95 hover:bg-emerald-500 disabled:opacity-40"
      >
        ✓
      </button>
    </div>
  )
}
