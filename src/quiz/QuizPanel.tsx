// STUB — Track B replaces with the real self-contained quiz loop.
// Contract: takes a Scheduler + mode, runs questions, calls onComplete(SessionLog).
// Knows nothing about the world or the barn.
import { useState } from 'react'
import type { QuizPanelProps, SessionEntry, SessionLog } from '@/contracts'
import { NumberPad } from './NumberPad'

export function QuizPanel({
  scheduler,
  mode,
  context,
  familyContext = null,
  creatureSlot,
  onQuestionGraded,
  onComplete,
}: QuizPanelProps) {
  const target = mode.kind === 'count' ? mode.questions : 5
  const [fact, setFact] = useState(() => scheduler.next())
  const [value, setValue] = useState('')
  const [entries, setEntries] = useState<SessionEntry[]>([])
  const startedAt = useState(() => Date.now())[0]

  function confirm() {
    if (value === '') return
    const given = Number(value)
    const result = scheduler.grade(fact.id, given, 1500)
    onQuestionGraded?.(result)
    const entry: SessionEntry = {
      factId: fact.id,
      given,
      correct: result.correct,
      latencyMs: 1500,
      outcome: result.outcome,
      askedAt: scheduler.snapshot().globalCounter,
    }
    const nextEntries = [...entries, entry]
    setEntries(nextEntries)
    setValue('')
    if (nextEntries.length >= target) {
      const log: SessionLog = {
        startedAt,
        endedAt: Date.now(),
        context,
        familyContext,
        entries: nextEntries,
      }
      onComplete(log)
    } else {
      setFact(scheduler.next())
    }
  }

  return (
    <div data-stub="QuizPanel" className="mx-auto max-w-sm space-y-4 p-4 text-center">
      {creatureSlot}
      <p className="text-3xl font-bold">
        {fact.a} × {fact.b}
      </p>
      <p className="min-h-8 text-2xl">{value || ' '}</p>
      <NumberPad value={value} onChange={setValue} onConfirm={confirm} />
      <p className="text-xs opacity-50">
        {entries.length}/{target}
      </p>
    </div>
  )
}
