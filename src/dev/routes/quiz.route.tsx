// TRACK B owns this file. The real QuizPanel against the stub scheduler —
// no farm, no barn. Shows the reported latency per answer so the entrance /
// stop-timer behaviour can be eyeballed for calibration.
import { useMemo, useState } from 'react'
import type { DevRoute } from './_registry'
import { QuizPanel } from '@/quiz/QuizPanel'
import { createScheduler, initialSchedulerState } from '@/engine/scheduler'
import type { CreatureMood, Scheduler } from '@/contracts'

type Row = {
  fact: string
  given: number
  latencyMs: number
  outcome: string
  correct: boolean
}

function QuizDevRoute() {
  const [runKey, setRunKey] = useState(0)
  const [rows, setRows] = useState<Row[]>([])
  const [mood, setMood] = useState<CreatureMood>('idle')
  const [done, setDone] = useState(false)

  // runKey in deps is deliberate: bump it to hand the panel a fresh scheduler.
  const scheduler = useMemo<Scheduler>(() => {
    void runKey
    const base = createScheduler(initialSchedulerState())
    return {
      next: () => base.next(),
      nextInFamily: (f) => base.nextInFamily(f),
      grade: (id, given, latencyMs) => {
        const result = base.grade(id, given, latencyMs)
        setRows((rs) => [
          ...rs,
          {
            fact: `${result.fact.a} × ${result.fact.b}`,
            given,
            latencyMs,
            outcome: result.outcome,
            correct: result.correct,
          },
        ])
        return result
      },
      familyProgress: (f) => base.familyProgress(f),
      isMastered: (f) => base.isMastered(f),
      snapshot: () => base.snapshot(),
    }
  }, [runKey])

  function restart() {
    setRows([])
    setDone(false)
    setMood('idle')
    setRunKey((k) => k + 1)
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-stone-200 bg-white p-2">
        <p className="mb-2 text-center text-xs text-stone-400">
          creature mood: <span className="font-mono">{mood}</span>
        </p>
        <QuizPanel
          key={runKey}
          scheduler={scheduler}
          mode={{ kind: 'count', questions: 5 }}
          context="free"
          onMood={setMood}
          onComplete={(log) => {
            // eslint-disable-next-line no-console
            console.log('session complete', log)
            setDone(true)
          }}
        />
        {done ? (
          <div className="p-4 text-center">
            <p className="mb-3 text-lg font-semibold text-stone-700">Session complete.</p>
            <button
              type="button"
              onClick={restart}
              className="rounded-xl bg-stone-900 px-5 py-2 text-white"
            >
              Run again
            </button>
          </div>
        ) : null}
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-stone-600">Reported latency per answer</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-stone-400">No answers yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-stone-400">
                <th className="py-1">#</th>
                <th>Fact</th>
                <th>Given</th>
                <th className="text-right">Latency (ms)</th>
                <th className="text-right">Outcome</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-stone-100">
                  <td className="py-1">{i + 1}</td>
                  <td>{r.fact}</td>
                  <td className={r.correct ? 'text-emerald-600' : 'text-amber-600'}>{r.given}</td>
                  <td className="text-right">{r.latencyMs}</td>
                  <td className="text-right">{r.outcome}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default {
  path: '#/dev/quiz',
  label: 'Quiz panel',
  order: 20,
  Component: QuizDevRoute,
} satisfies DevRoute
