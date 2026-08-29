// TRACK B owns this file. Wire the real QuizPanel against the stub scheduler here
// (no farm, no barn). Show the reported latency per answer for calibration.
import type { DevRoute } from './_registry'
import { QuizPanel } from '@/quiz/QuizPanel'
import { createScheduler, initialSchedulerState } from '@/engine/scheduler'
import { useMemo, useState } from 'react'

function QuizDevRoute() {
  const [runKey, setRunKey] = useState(0)
  // runKey in deps is deliberate: bump it to hand the panel a fresh scheduler.
  const scheduler = useMemo(() => {
    void runKey
    return createScheduler(initialSchedulerState())
  }, [runKey])
  return (
    <div className="space-y-4">
      <QuizPanel
        key={runKey}
        scheduler={scheduler}
        mode={{ kind: 'count', questions: 5 }}
        context="free"
        onComplete={(log) => {
          console.log('session complete', log)
          setRunKey((k) => k + 1)
        }}
      />
    </div>
  )
}

export default {
  path: '#/dev/quiz',
  label: 'Quiz panel',
  order: 20,
  Component: QuizDevRoute,
} satisfies DevRoute
