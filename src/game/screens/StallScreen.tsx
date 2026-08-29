import { StallPanel } from '@/barn/StallPanel'
import { useGame } from '../gameState'

export function StallScreen({ stallIndex }: { stallIndex: number }) {
  const { creatures, scheduler, renameCreature, completeSession, onGraded, back } = useGame()
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
      <header className="p-3">
        <button type="button" onClick={back} className="rounded bg-white/80 px-3 py-1 text-sm shadow">
          ← Barn
        </button>
      </header>
      <StallPanel
        key={creature.family}
        creature={creature}
        scheduler={scheduler}
        onRename={(name) => renameCreature(creature.family, name)}
        onFed={(log) => completeSession(log)}
        onClose={back}
        onQuestionGraded={onGraded}
      />
    </div>
  )
}
