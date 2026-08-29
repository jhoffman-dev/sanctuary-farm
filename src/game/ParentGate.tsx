// Gate in front of the parent dashboard: a multiplication she can't reliably do
// yet (per spec). Adults pass; the kid mostly can't — which is the point.
import { useMemo, useState } from 'react'
import type { SaveData } from '@/contracts'
import { HARD_CORE_IDS } from '@/contracts'

export type ParentGateProps = {
  save: SaveData
  onPass: () => void
  onCancel: () => void
}

function pickChallenge(save: SaveData): { a: number; b: number } {
  // Prefer a hard-core fact that is not yet mastered.
  const unmastered = [...HARD_CORE_IDS].find((id) => {
    const fs = save.facts[id]
    return !fs || fs.box < 5
  })
  if (unmastered) {
    const [a, b] = unmastered.split('x').map(Number)
    return { a, b }
  }
  return { a: 12, b: 12 }
}

export function ParentGate({ save, onPass, onCancel }: ParentGateProps) {
  const challenge = useMemo(() => pickChallenge(save), [save])
  const [value, setValue] = useState('')
  const [wrong, setWrong] = useState(false)

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-stone-900/40 p-6">
      <form
        className="w-full max-w-xs space-y-4 rounded-xl bg-white p-6 text-center shadow-xl"
        onSubmit={(e) => {
          e.preventDefault()
          if (Number(value) === challenge.a * challenge.b) onPass()
          else {
            setWrong(true)
            setValue('')
          }
        }}
      >
        <p className="text-sm text-stone-500">Grown-ups only</p>
        <p className="text-2xl font-bold">
          {challenge.a} × {challenge.b} = ?
        </p>
        <input
          aria-label="answer"
          inputMode="numeric"
          autoFocus
          value={value}
          onChange={(e) => {
            setValue(e.target.value.replace(/\D/g, '').slice(0, 3))
            setWrong(false)
          }}
          className="w-24 rounded-lg border border-stone-300 px-3 py-2 text-center text-xl"
        />
        {wrong ? <p className="text-sm text-rose-600">Not quite.</p> : null}
        <div className="flex justify-center gap-2">
          <button type="submit" className="rounded-lg bg-stone-900 px-4 py-2 text-white">
            Enter
          </button>
          <button type="button" onClick={onCancel} className="px-4 py-2 text-stone-500">
            Back
          </button>
        </div>
      </form>
    </div>
  )
}
