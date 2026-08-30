import { useState } from 'react'
import { ALL_FAMILIES, COLD_START_CREATURE_FAMILY, EGG_PRACTICE_QUESTIONS } from '@/contracts'
import { QuizPanel } from '@/quiz/QuizPanel'
import { useGame } from '../gameState'
import { Egg } from '../Egg'
import { HatchCeremony } from '../HatchCeremony'
import { makeCreature } from '../creatureFor'

function familyOfId(id: string): number {
  const [a, b] = id.split('x').map(Number)
  return Math.max(a, b)
}

export function NestScreen() {
  const { save, scheduler, creatures, pendingHatch, claimHatch, completePractice, onGraded, back } =
    useGame()
  const [practising, setPractising] = useState<number | null>(null)

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
          setPractising(null)
          back()
        }}
      />
    )
  }

  if (practising != null) {
    return (
      <div className="mx-auto max-w-sm space-y-3 p-4 text-center">
        <p className="text-sm font-semibold text-stone-500">Helping the {practising}s egg hatch</p>
        <QuizPanel
          key={practising}
          scheduler={scheduler}
          mode={{ kind: 'count', questions: EGG_PRACTICE_QUESTIONS }}
          context="egg"
          familyContext={practising}
          practiceFamily={practising}
          creatureSlot={
            <Egg family={practising} progress={scheduler.familyProgress(practising)} size={90} />
          }
          onQuestionGraded={onGraded}
          onComplete={(log) => {
            completePractice(log)
            setPractising(null)
          }}
        />
      </div>
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
        <>
          <p className="px-6 text-center text-sm text-stone-500">
            Tap an egg to practise those facts and help it hatch faster.
          </p>
          <div className="grid grid-cols-2 gap-6 p-6 sm:grid-cols-3">
            {eggFamilies.map((fam) => {
              const progress = scheduler.familyProgress(fam)
              return (
                <button
                  key={fam}
                  type="button"
                  onClick={() => setPractising(fam)}
                  className="flex flex-col items-center gap-1 rounded-xl p-2 transition hover:bg-amber-50"
                >
                  <Egg family={fam} progress={progress} size={110} />
                  <p className="text-sm font-medium">The {fam}s</p>
                  <p className="text-xs text-stone-500">{Math.round(progress * 100)}% ready</p>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
