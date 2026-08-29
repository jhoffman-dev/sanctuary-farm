// STUB — Track B replaces with the real correct/fluent/wrong feedback visuals
// (including the dot-array / skip-count teach-back on a wrong answer).
import type { GradeResult } from '@/contracts'

export type FeedbackOverlayProps = {
  result: GradeResult
  onDismiss: () => void
}

export function FeedbackOverlay({ result, onDismiss }: FeedbackOverlayProps) {
  return (
    <div data-stub="FeedbackOverlay" className="rounded bg-white/90 p-4 text-center">
      <p>
        {result.fact.a} × {result.fact.b} = {result.correctAnswer}
      </p>
      <p className="text-sm opacity-60">{result.outcome}</p>
      <button type="button" onClick={onDismiss}>
        continue
      </button>
    </div>
  )
}
