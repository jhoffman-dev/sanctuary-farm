// STUB — Track D replaces with the real side-on barn with stalls on both walls.
import type { HatchedCreature } from '@/contracts'
import { CreatureSVG } from '@/creatures/CreatureSVG'

export type BarnInteriorProps = {
  creatures: HatchedCreature[]
  totalStalls?: number
  badges?: Record<number, boolean> // stallIndex -> chores outstanding
  onSelectStall: (stallIndex: number) => void
}

export function BarnInterior({ creatures, totalStalls = 12, onSelectStall, badges = {} }: BarnInteriorProps) {
  const byStall = new Map(creatures.map((c) => [c.stallIndex, c]))
  return (
    <div data-stub="BarnInterior" className="grid grid-cols-4 gap-3 p-4">
      {Array.from({ length: totalStalls }, (_, i) => {
        const c = byStall.get(i)
        return (
          <button
            key={i}
            type="button"
            onClick={() => c && onSelectStall(i)}
            className="rounded border border-amber-800/30 p-2"
          >
            {c ? <CreatureSVG params={c.params} mood="idle" size={64} /> : <span className="opacity-30">empty</span>}
            {badges[i] ? <span aria-label="hungry"> ●</span> : null}
          </button>
        )
      })}
    </div>
  )
}
