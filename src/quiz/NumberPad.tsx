// STUB — Track B replaces with the real large-button pad + keyboard input.
import type { NumberPadProps } from '@/contracts'

export function NumberPad({ value, onChange, onConfirm, disabled }: NumberPadProps) {
  return (
    <div data-stub="NumberPad" className="grid grid-cols-3 gap-2">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((d) => (
        <button
          key={d}
          type="button"
          disabled={disabled}
          onClick={() => onChange(value + d)}
          className="rounded bg-amber-100 p-4 text-xl"
        >
          {d}
        </button>
      ))}
      <button type="button" onClick={() => onChange(value.slice(0, -1))}>
        ⌫
      </button>
      <button type="button" onClick={onConfirm} className="col-span-3 rounded bg-emerald-300 p-4">
        Enter
      </button>
    </div>
  )
}
