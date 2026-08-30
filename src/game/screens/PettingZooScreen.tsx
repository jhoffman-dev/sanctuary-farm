import { HEALTH_HAPPY_AT, HEALTH_MAX, HEALTH_SAD_AT } from '@/contracts'
import { CreatureSVG } from '@/creatures/CreatureSVG'
import { useGame } from '../gameState'

function bar(h: number) {
  const c = h < HEALTH_SAD_AT ? '#ef5350' : h < HEALTH_HAPPY_AT ? '#ffb74d' : '#66bb6a'
  return (
    <div className="mx-auto h-1.5 w-16 overflow-hidden rounded-full bg-black/15">
      <div className="h-full rounded-full" style={{ width: `${(h / HEALTH_MAX) * 100}%`, background: c }} />
    </div>
  )
}

export function PettingZooScreen() {
  const { creatures, care, choreFamilies, moveAnimal, go, back } = useGame()
  const zoo = creatures.filter((c) => c.home === 'zoo')
  const barn = creatures.filter((c) => c.home !== 'zoo')

  return (
    <div className="min-h-dvh">
      <header className="flex items-center gap-3 p-3">
        <button type="button" onClick={back} className="rounded bg-white/80 px-3 py-1 text-sm shadow">
          ← Farmyard
        </button>
        <h1 className="font-semibold">The petting zoo</h1>
      </header>

      {/* pond scene */}
      <div className="mx-3 overflow-hidden rounded-2xl border-4 border-amber-800/40 bg-gradient-to-b from-lime-200 to-lime-300">
        <svg viewBox="0 0 320 120" className="w-full">
          {/* back fence */}
          <line x1={16} y1={34} x2={304} y2={34} stroke="#c9a06a" strokeWidth={5} strokeLinecap="round" />
          <line x1={16} y1={44} x2={304} y2={44} stroke="#b1855c" strokeWidth={5} strokeLinecap="round" />
          {[24, 96, 168, 240, 300].map((x) => (
            <rect key={x} x={x - 3} y={24} width={6} height={30} rx={2} fill="#7d5c3f" />
          ))}
          {/* grass + pond */}
          <ellipse cx={200} cy={98} rx={96} ry={12} fill="#00000010" />
          <ellipse cx={90} cy={80} rx={58} ry={28} fill="#7cb342" opacity={0.5} />
          <ellipse cx={90} cy={80} rx={48} ry={22} fill="#4fc3f7" />
          <ellipse cx={78} cy={74} rx={16} ry={6} fill="#fff" opacity={0.4} />
          <circle cx={200} cy={90} r={12} fill="#66bb6a" />
          <circle cx={230} cy={94} r={9} fill="#81c784" />
        </svg>
      </div>

      {zoo.length === 0 ? (
        <p className="p-6 text-center text-sm text-stone-600">
          No animals here yet. Bring one over from the barn so visitors can meet it.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3">
          {zoo.map((c) => (
            <div key={c.family} className="rounded-xl border border-amber-200 bg-white/70 p-2 text-center">
              <button type="button" onClick={() => go('stall', { stallIndex: c.stallIndex })} className="w-full">
                <CreatureSVG
                  params={c.params}
                  mood={choreFamilies.includes(c.family) ? 'sad' : 'content'}
                  size={72}
                  title={c.name}
                />
                <p className="truncate text-sm font-semibold">{c.name}</p>
              </button>
              {bar(care[c.family]?.health ?? 100)}
              {choreFamilies.includes(c.family) ? (
                <p className="mt-0.5 text-[11px] text-amber-700">needs care →</p>
              ) : null}
              <button
                type="button"
                onClick={() => moveAnimal(c.family, 'barn')}
                className="mt-1 text-[11px] text-stone-500 underline"
              >
                send to the barn
              </button>
            </div>
          ))}
        </div>
      )}

      {barn.length > 0 ? (
        <div className="p-4">
          <p className="mb-2 text-sm font-semibold text-stone-600">Bring an animal from the barn</p>
          <div className="flex flex-wrap gap-2">
            {barn.map((c) => (
              <button
                key={c.family}
                type="button"
                onClick={() => moveAnimal(c.family, 'zoo')}
                className="flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-sm"
              >
                <CreatureSVG params={c.params} mood="idle" size={24} title={c.name} />
                {c.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
