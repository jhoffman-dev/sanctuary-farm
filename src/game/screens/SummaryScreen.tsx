import { useMemo } from 'react'
import { todayStr } from '../todayStr'
import { useGame } from '../gameState'

export function SummaryScreen() {
  const { save, choreStalls, go } = useGame()
  const choresDone = save.lastChoresDate === todayStr() && choreStalls.length === 0

  const today = useMemo(() => {
    const t = todayStr()
    const entries = save.sessions
      .filter((s) => todayStr(new Date(s.startedAt)) === t)
      .flatMap((s) => s.entries)
    const correct = entries.filter((e) => e.correct).length
    const fluent = entries.filter((e) => e.outcome === 'FLUENT').length
    return { answered: entries.length, correct, fluent }
  }, [save.sessions])

  return (
    <div className="grid min-h-dvh place-items-center p-6 text-center">
      <div className="max-w-sm space-y-4">
        <p className="text-3xl">{choresDone ? '🌙' : '🏡'}</p>
        <h1 className="text-xl font-semibold">
          {choresDone ? 'All the animals are fed. Goodnight!' : "Today so far"}
        </h1>
        <div className="rounded-xl bg-white p-4 text-left text-sm shadow">
          <p>Questions answered today: <b>{today.answered}</b></p>
          <p>Correct: <b>{today.correct}</b></p>
          <p>Answered in under 3 seconds: <b>{today.fluent}</b></p>
          <p className="mt-2 text-stone-500">🌾 {save.currency.pellets} pellets · 🪙 {save.currency.coins} coins</p>
        </div>
        {choresDone ? (
          <p className="text-sm text-stone-500">
            Come back tomorrow. You can still visit the farm now if you like.
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => go('farmyard')}
          className="rounded-lg bg-stone-900 px-6 py-2 text-white"
        >
          Back to the farm
        </button>
      </div>
    </div>
  )
}
