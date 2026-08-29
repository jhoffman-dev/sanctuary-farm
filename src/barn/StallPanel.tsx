// A creature's care panel. Shows the creature at rest, its name and a rename
// control, and a Feed button that mounts the quiz right here in the stall.
//
// D11 — the stall does NOT filter which facts are asked. `familyContext` is
// passed to the session log for information only; the scheduler serves whatever
// is due across every family.
import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import type { HatchedCreature, Scheduler, SessionLog, CreatureMood } from '@/contracts'
import { CHORE_QUESTIONS_PER_STALL } from '@/contracts'
import { CreatureSVG } from '@/creatures/CreatureSVG'
import { moodVariants, MOOD_TRANSFORM_ORIGIN } from '@/creatures/animations'
import { QuizPanel } from '@/quiz/QuizPanel'

export type StallPanelProps = {
  creature: HatchedCreature
  scheduler: Scheduler
  onRename: (name: string) => void
  onFed: (log: SessionLog) => void
  onClose: () => void
}

export function StallPanel({ creature, scheduler, onRename, onFed, onClose }: StallPanelProps) {
  const [name, setName] = useState(creature.name)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(creature.name)
  const [feeding, setFeeding] = useState(false)
  const [mood, setMood] = useState<CreatureMood>('idle')
  const restTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => {
    if (restTimer.current) clearTimeout(restTimer.current)
  }, [])

  function commitName() {
    const next = draft.trim()
    if (next && next !== name) {
      setName(next)
      onRename(next)
    } else {
      setDraft(name)
    }
    setEditing(false)
  }

  function startFeeding() {
    if (restTimer.current) clearTimeout(restTimer.current)
    setMood('idle')
    setFeeding(true)
  }

  function finishFeeding(log: SessionLog) {
    setFeeding(false)
    setMood('happy')
    restTimer.current = setTimeout(() => setMood('idle'), 1600)
    onFed(log)
  }

  const anim = moodVariants[mood]

  return (
    <div data-stall-panel="" className="mx-auto max-w-sm space-y-4 p-4 text-center">
      <motion.div
        className="mx-auto w-fit"
        style={{ transformOrigin: MOOD_TRANSFORM_ORIGIN }}
        animate={anim.animate}
        transition={anim.transition}
      >
        <CreatureSVG params={creature.params} mood={mood} size={160} title={name} />
      </motion.div>

      {editing ? (
        <form
          className="flex items-center justify-center gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            commitName()
          }}
        >
          <input
            aria-label="creature name"
            className="w-40 rounded border border-stone-300 px-2 py-1 text-center text-lg"
            value={draft}
            autoFocus
            maxLength={20}
            onChange={(e) => setDraft(e.target.value)}
          />
          <button type="submit" className="rounded bg-emerald-300 px-3 py-1 text-sm">
            Save
          </button>
        </form>
      ) : (
        <div className="flex items-center justify-center gap-2">
          <p data-testid="creature-name" className="text-lg font-semibold">
            {name}
          </p>
          <button
            type="button"
            className="rounded bg-stone-200 px-2 py-1 text-xs"
            onClick={() => {
              setDraft(name)
              setEditing(true)
            }}
          >
            Rename
          </button>
        </div>
      )}

      {feeding ? (
        <QuizPanel
          scheduler={scheduler}
          mode={{ kind: 'count', questions: CHORE_QUESTIONS_PER_STALL }}
          context="stall"
          familyContext={creature.family}
          creatureSlot={<CreatureSVG params={creature.params} mood={mood} size={96} title={name} />}
          onMood={setMood}
          onComplete={finishFeeding}
        />
      ) : (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            className="rounded bg-emerald-400 px-5 py-2 font-semibold text-emerald-950"
            onClick={startFeeding}
          >
            Feed
          </button>
          <button type="button" className="px-3 py-2 text-sm opacity-60" onClick={onClose}>
            Back
          </button>
        </div>
      )}
    </div>
  )
}
