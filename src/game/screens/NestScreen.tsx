import { ALL_FAMILIES, COLD_START_CREATURE_FAMILY } from '@/contracts'
import { useGame } from '../gameState'
import { Egg } from '../Egg'
import { HatchCeremony } from '../HatchCeremony'
import { makeCreature } from '../creatureFor'

function familyOfId(id: string): number {
  const [a, b] = id.split('x').map(Number)
  return Math.max(a, b)
}

export function NestScreen() {
  const { save, scheduler, creatures, pendingHatch, claimHatch, back } = useGame()

  const hatched = new Set(creatures.map((c) => c.family))
  const introducedFamilies = new Set(
    Object.values(save.facts).filter((f) => f.introduced).map((f) => familyOfId(f.id)),
  )
  const eggFamilies = ALL_FAMILIES.filter(
    (fam) => fam !== COLD_START_CREATURE_FAMILY && !hatched.has(fam) && introducedFamilies.has(fam),
  )
  const firstEver = creatures.every((c) => c.family === COLD_START_CREATURE_FAMILY)

  if (pendingHatch != null) {
    const creature =
      creatures.find((c) => c.family === pendingHatch) ?? makeCreature(pendingHatch, 0)
    return (
      <HatchCeremony
        creature={creature}
        first={firstEver}
        onName={(name) => {
          claimHatch(name)
          back()
        }}
      />
    )
  }

  return (
    <div className="min-h-dvh">
      <header className="flex items-center gap-3 p-3">
        <button type="button" onClick={back} className="rounded bg-white/80 px-3 py-1 text-sm shadow">
          ← Farmyard
        </button>
        <h1 className="font-semibold">The nest hollow</h1>
      </header>

      {eggFamilies.length === 0 ? (
        <p className="p-6 text-center text-stone-600">
          No eggs yet. Keep practising in the barn and new ones will appear.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-6 p-6 sm:grid-cols-3">
          {eggFamilies.map((fam) => {
            const progress = scheduler.familyProgress(fam)
            return (
              <div key={fam} className="flex flex-col items-center gap-1">
                <Egg family={fam} progress={progress} size={110} />
                <p className="text-sm font-medium">The {fam}s</p>
                <p className="text-xs text-stone-500">{Math.round(progress * 100)}% ready</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
