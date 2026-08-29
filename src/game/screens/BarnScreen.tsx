import { BarnInterior } from '@/barn/BarnInterior'
import { useGame } from '../gameState'

export function BarnScreen() {
  const { creatures, choreStalls, totalStalls, go, back } = useGame()
  const badges: Record<number, boolean> = {}
  for (const c of creatures) badges[c.stallIndex] = choreStalls.includes(c.stallIndex)

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
      {choreStalls.length > 0 ? (
        <p className="p-4 text-center text-sm text-stone-600">
          {choreStalls.length} {choreStalls.length === 1 ? 'creature is' : 'creatures are'} still hungry.
        </p>
      ) : (
        <p className="p-4 text-center text-sm text-stone-600">Everyone is fed. Tap a stall any time to practise.</p>
      )}
    </div>
  )
}
