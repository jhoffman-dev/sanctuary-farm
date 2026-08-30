import { StallPanel } from '@/barn/StallPanel'
import { emptyAnimalCare } from '@/contracts'
import { useGame } from '../gameState'
import { todayStr } from '../todayStr'

export function StallScreen({ stallIndex }: { stallIndex: number }) {
  const { creatures, care, save, scheduler, renameCreature, completeCare, onGraded, back, go } =
    useGame()
  const creature = creatures.find((c) => c.stallIndex === stallIndex)

  if (!creature) {
    return (
      <div className="min-h-dvh p-6 text-center">
        <p>This stall is empty.</p>
        <button type="button" onClick={back} className="mt-3 rounded bg-stone-200 px-4 py-2">
          Back to the barn
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-dvh">
      <header className="flex items-center justify-between p-3">
        <button type="button" onClick={back} className="rounded bg-white/80 px-3 py-1 text-sm shadow">
          ← Barn
        </button>
        <button
          type="button"
          onClick={() => go('feedshed')}
          className="rounded bg-white/80 px-3 py-1 text-sm shadow"
        >
          🌾 {save.feed} feed · 🪙 {save.coins}
        </button>
      </header>
      <StallPanel
        key={creature.family}
        creature={creature}
        care={care[creature.family] ?? emptyAnimalCare(creature.family)}
        today={todayStr()}
        feed={save.feed}
        scheduler={scheduler}
        onRename={(name) => renameCreature(creature.family, name)}
        onCareComplete={(task, log) => completeCare(creature.family, task, log)}
        onClose={back}
        onQuestionGraded={onGraded}
      />
    </div>
  )
}
