// Track B — the wrong-answer teach-back. No shame: the creature is puzzled,
// not sad, and nothing is lost. The fact is shown plainly with a dot-array,
// and she re-enters the correct answer once to continue. This path CANNOT be
// tapped through — confirm only advances when it equals the correct answer.
import { useState } from 'react'
import type { ReactNode } from 'react'
import type { GradeResult } from '@/contracts'
import { NumberPad } from './NumberPad'

export type FeedbackOverlayProps = {
  result: GradeResult
  /** Called only once the correct answer has been re-entered and confirmed. */
  onDismiss: () => void
}

function DotArray({ rows, cols }: { rows: number; cols: number }) {
  const gap = 14
  const pad = 8
  const w = pad * 2 + (cols - 1) * gap
  const h = pad * 2 + (rows - 1) * gap
  const dots: ReactNode[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      dots.push(
        <circle key={`${r}-${c}`} cx={pad + c * gap} cy={pad + r * gap} r={4} fill="currentColor" />,
      )
    }
  }
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label={`${rows} rows of ${cols} — that's ${rows * cols}`}
      className="mx-auto max-h-40 w-auto text-amber-500"
    >
      {dots}
    </svg>
  )
}

export function FeedbackOverlay({ result, onDismiss }: FeedbackOverlayProps) {
  const answer = result.correctAnswer
  const [value, setValue] = useState('')

  function confirm() {
    if (value === '') return
    if (Number(value) === answer) {
      onDismiss()
    } else {
      setValue('')
    }
  }

  return (
    <div
      data-testid="feedback-overlay"
      role="group"
      aria-label="Let's look at this one together"
      className="space-y-4 rounded-3xl bg-white/95 p-5 text-center shadow-lg"
    >
      <p data-testid="feedback-fact" data-answer={answer} className="text-3xl font-bold text-stone-800">
        {result.fact.a} × {result.fact.b} = {answer}
      </p>
      <DotArray rows={result.fact.a} cols={result.fact.b} />
      <p className="text-sm text-stone-500">Type it in to keep going.</p>
      <p className="min-h-9 text-3xl font-bold tracking-widest text-stone-800" aria-live="polite">
        {value || ' '}
      </p>
      <NumberPad
        value={value}
        onChange={setValue}
        onConfirm={confirm}
        maxLength={String(answer).length}
      />
    </div>
  )
}
