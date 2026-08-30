import { BarnInterior } from '@/barn/BarnInterior'
import { CARE_EMOJI } from '@/contracts'
import { useGame } from '../gameState'

export function BarnScreen() {
  const { creatures, care, choreFamilies, tasksRemaining, totalStalls, allChoresDone, go, back } =
    useGame()

  const barnCreatures = creatures.filter((c) => c.home !== 'zoo')
  const badges: Record<number, boolean> = {}
  const health: Record<number, number> = {}
  for (const c of barnCreatures) {
    badges[c.stallIndex] = choreFamilies.includes(c.family)
    health[c.stallIndex] = care[c.family]?.health ?? 100
  }

  return (
    <div className="min-h-dvh">
      <header className="flex items-center gap-3 p-3">
        <button type="button" onClick={back} className="rounded bg-white/80 px-3 py-1 text-sm shadow">
          ← Farmyard
        </button>
        <h1 className="font-semibold">The barn</h1>
      </header>

      <BarnInterior
        creatures={barnCreatures}
        totalStalls={totalStalls}
        badges={badges}
        health={health}
        onSelectStall={(stallIndex) => go('stall', { stallIndex })}
      />

      <div className="space-y-1 p-4 text-center text-sm text-stone-600">
        {allChoresDone ? (
          <p>Everyone is cared for. Tap a stall any time to practise.</p>
        ) : (
          barnCreatures
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
