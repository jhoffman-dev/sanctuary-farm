import { useState } from 'react'
import { PADDOCK_DURATION_MS } from '@/contracts'
import type { SessionLog } from '@/contracts'
import { QuizPanel } from '@/quiz/QuizPanel'
import { useGame } from '../gameState'

export function PaddockScreen() {
  const { scheduler, completeSession, onGraded, back, save } = useGame()
  const [running, setRunning] = useState(false)
  const [last, setLast] = useState<{ correct: number; total: number } | null>(null)

  const best = bestPaddock(save.sessions)

  function done(log: SessionLog) {
    setRunning(false)
    const correct = log.entries.filter((e) => e.correct).length
    setLast({ correct, total: log.entries.length })
    completeSession(log)
  }

  return (
    <div className="min-h-dvh">
      <header className="p-3">
        <button type="button" onClick={back} className="rounded bg-white/80 px-3 py-1 text-sm shadow">
          ← Farmyard
        </button>
      </header>

      {running ? (
        <QuizPanel
          scheduler={scheduler}
          mode={{ kind: 'timed', durationMs: PADDOCK_DURATION_MS }}
          context="paddock"
          onQuestionGraded={onGraded}
          onComplete={done}
        />
      ) : (
        <div className="mx-auto max-w-sm space-y-4 p-6 text-center">
          <h1 className="text-xl font-semibold">Feeding Frenzy</h1>
          <p className="text-sm text-stone-600">
            Sixty seconds. Answer as many as you can — beat your own best.
          </p>
          {best != null ? <p className="text-sm">Your best: <b>{best}</b> correct</p> : null}
          {last ? (
            <p className="text-lg">
              You got <b>{last.correct}</b> of {last.total}
              {best != null && last.correct >= best ? ' — new best! 🎉' : ''}
            </p>
          ) : null}
          <button
            type="button"
            className="rounded-lg bg-emerald-400 px-6 py-2 font-semibold text-emerald-950"
            onClick={() => {
              setLast(null)
              setRunning(true)
            }}
          >
            {last ? 'Go again' : 'Start'}
          </button>
        </div>
      )}
    </div>
  )
}

function bestPaddock(sessions: SessionLog[]): number | null {
  const scores = sessions
    .filter((s) => s.context === 'paddock')
    .map((s) => s.entries.filter((e) => e.correct).length)
  return scores.length ? Math.max(...scores) : null
}
