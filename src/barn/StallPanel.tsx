// STUB — Track D replaces with the real stall care panel (rename + feed → QuizPanel).
import type { HatchedCreature, SessionLog } from '@/contracts'
import type { Scheduler } from '@/contracts'
import { CreatureSVG } from '@/creatures/CreatureSVG'
import { QuizPanel } from '@/quiz/QuizPanel'
import { CHORE_QUESTIONS_PER_STALL } from '@/contracts'
import { useState } from 'react'

export type StallPanelProps = {
  creature: HatchedCreature
  scheduler: Scheduler
  onRename: (name: string) => void
  onFed: (log: SessionLog) => void
  onClose: () => void
}

export function StallPanel({ creature, scheduler, onFed, onClose }: StallPanelProps) {
  const [feeding, setFeeding] = useState(false)
  return (
    <div data-stub="StallPanel" className="space-y-3 p-4 text-center">
      <CreatureSVG params={creature.params} mood="idle" size={140} />
      <p className="text-lg font-semibold">{creature.name}</p>
      {feeding ? (
        <QuizPanel
          scheduler={scheduler}
          mode={{ kind: 'count', questions: CHORE_QUESTIONS_PER_STALL }}
          context="stall"
          familyContext={creature.family}
          onComplete={(log) => {
            setFeeding(false)
            onFed(log)
          }}
        />
      ) : (
        <>
          <button type="button" className="rounded bg-emerald-300 px-4 py-2" onClick={() => setFeeding(true)}>
            Feed
          </button>
          <button type="button" className="ml-2 opacity-60" onClick={onClose}>
            back
          </button>
        </>
      )}
    </div>
  )
}
