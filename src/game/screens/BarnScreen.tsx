import { BarnInterior } from '@/barn/BarnInterior'
import { CARE_EMOJI } from '@/contracts'
import { useGame } from '../gameState'

export function BarnScreen() {
  const { creatures, choreFamilies, tasksRemaining, totalStalls, allChoresDone, go, back } =
    useGame()

  const badges: Record<number, boolean> = {}
  for (const c of creatures) badges[c.stallIndex] = choreFamilies.includes(c.family)

  return (
    <div className="min-h-dvh">
      <header className="flex items-center gap-3 p-3">
        <button type="button" onClick={back} className="rounded bg-white/80 px-3 py-1 text-sm shadow">
          ← Farmyard
        </button>
        <h1 className="font-semibold">The barn</h1>
      </header>

      <BarnInterior
        creatures={creatures}
        totalStalls={totalStalls}
        badges={badges}
        onSelectStall={(stallIndex) => go('stall', { stallIndex })}
      />

      <div className="space-y-1 p-4 text-center text-sm text-stone-600">
        {allChoresDone ? (
          <p>Everyone is cared for. Tap a stall any time to practise.</p>
        ) : (
          creatures
            .filter((c) => tasksRemaining(c.family).length > 0)
            .map((c) => (
              <p key={c.family}>
                <b>{c.name}</b> needs:{' '}
                {tasksRemaining(c.family).map((t) => CARE_EMOJI[t]).join(' ')}
              </p>
            ))
        )}
      </div>
    </div>
  )
}
