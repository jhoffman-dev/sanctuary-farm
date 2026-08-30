// Side-on view of the barn: two facing rows of stalls with an aisle between
// them. One creature per hatched family; empty stalls stay visible as future
// space. Each occupied stall shows a health bar so it's clear at a glance which
// animal needs attention. `badges[stallIndex]` raises a "needs care" indicator.
import { HEALTH_HAPPY_AT, HEALTH_MAX, HEALTH_SAD_AT, type HatchedCreature } from '@/contracts'
import { CreatureSVG } from '@/creatures/CreatureSVG'

export type BarnInteriorProps = {
  creatures: HatchedCreature[]
  totalStalls?: number
  badges?: Record<number, boolean> // stallIndex -> chores outstanding
  /** stallIndex -> 0..100 health, shown as a bar on the stall front */
  health?: Record<number, number>
  onSelectStall: (stallIndex: number) => void
}

function StallHealthBar({ h }: { h: number | undefined }) {
  if (h == null) return null
  const pct = Math.max(0, Math.min(100, (h / HEALTH_MAX) * 100))
  const c = h < HEALTH_SAD_AT ? '#ef5350' : h < HEALTH_HAPPY_AT ? '#ffb74d' : '#66bb6a'
  return (
    <div className="mt-1 w-full px-1" aria-label={`health ${Math.round(h)} of ${HEALTH_MAX}`}>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/15">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: c }} />
      </div>
    </div>
  )
}

function Stall({
  index,
  creature,
  badge,
  health,
  onSelect,
}: {
  index: number
  creature: HatchedCreature | undefined
  badge: boolean
  health: number | undefined
  onSelect: (i: number) => void
}) {
  const common =
    'relative flex h-36 w-full flex-col items-center justify-end rounded-b-md border-x-4 border-b-4 border-amber-900/50 bg-gradient-to-b px-1 pb-1.5'

  return (
    <div className="relative flex flex-col items-center">
      {badge ? (
        <span
          data-part="badge"
          aria-label="needs care"
          className="absolute -top-3 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-amber-300 text-amber-900 shadow ring-2 ring-amber-100"
        >
          ●
        </span>
      ) : null}
      {creature ? (
        <button
          type="button"
          data-testid="stall"
          data-stall={index}
          data-occupied="true"
          onClick={() => onSelect(index)}
          className={`${common} cursor-pointer from-amber-50 to-amber-200 hover:to-amber-300`}
        >
          <CreatureSVG params={creature.params} mood="idle" size={68} title={creature.name} />
          <span className="max-w-full truncate text-[11px] font-semibold text-amber-950">
            {creature.name}
          </span>
          <StallHealthBar h={health} />
        </button>
      ) : (
        <div
          data-testid="stall"
          data-stall={index}
          data-occupied="false"
          className={`${common} from-amber-50 to-amber-100/70`}
        >
          <div className="mb-2 h-4 w-11 rounded-md bg-yellow-400/70 shadow-inner" aria-hidden />
          <span className="text-[10px] uppercase tracking-wide text-amber-700/60">open stall</span>
        </div>
      )}
    </div>
  )
}

export function BarnInterior({
  creatures,
  totalStalls = 12,
  onSelectStall,
  badges = {},
  health = {},
}: BarnInteriorProps) {
  const byStall = new Map(creatures.map((c) => [c.stallIndex, c]))
  const perWall = Math.ceil(totalStalls / 2)
  const backWall = Array.from({ length: perWall }, (_, i) => i)
  const frontWall = Array.from({ length: totalStalls - perWall }, (_, i) => perWall + i)

  const renderRow = (indices: number[]) => (
    <div
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${Math.max(indices.length, 1)}, minmax(0, 1fr))` }}
    >
      {indices.map((i) => (
        <Stall
          key={i}
          index={i}
          creature={byStall.get(i)}
          badge={!!badges[i]}
          health={health[i]}
          onSelect={onSelectStall}
        />
      ))}
    </div>
  )

  return (
    <div
      data-barn=""
      className="overflow-hidden rounded-lg border-4 border-amber-950/60 bg-amber-800/10"
    >
      <div className="bg-amber-950/70 px-3 py-1 text-center text-xs font-semibold text-amber-50">
        The Barn
      </div>
      <div className="space-y-1 bg-gradient-to-b from-amber-100/40 to-amber-200/30 p-3">
        {renderRow(backWall)}
        <div className="my-2 h-6 rounded bg-amber-900/20" aria-hidden />
        {renderRow(frontWall)}
        {creatures.length === 0 ? (
          <p className="pt-2 text-center text-xs text-stone-500">
            Empty stalls, warm and ready. Hatch an egg and its creature moves in here.
          </p>
        ) : null}
      </div>
    </div>
  )
}
