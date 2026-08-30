// A creature's care panel: the animal, its name, four daily needs, and a round
// of questions to tend each. Feeding also spends feed (bought in the feed shed).
//
// D11 held — the stall does NOT filter which facts are asked. `familyContext` is
// informational; the scheduler serves whatever is due across every family.
import { useState } from 'react'
import { motion } from 'motion/react'
import {
  CARE_EMOJI,
  CARE_LABEL,
  CARE_QUESTIONS,
  CARE_TASKS,
  CARE_VERB,
  FEED_PER_FEEDING,
  type AnimalCare,
  type CareTask,
  type CreatureMood,
  type GradeResult,
  type HatchedCreature,
  type Scheduler,
  type SessionLog,
} from '@/contracts'
import { CreatureSVG } from '@/creatures/CreatureSVG'
import { moodVariants, MOOD_TRANSFORM_ORIGIN } from '@/creatures/animations'
import { QuizPanel } from '@/quiz/QuizPanel'

export type StallPanelProps = {
  creature: HatchedCreature
  care: AnimalCare
  /** today's local date (YYYY-MM-DD) — a task is "done" when done[task] === this */
  today: string
  feed: number
  scheduler: Scheduler
  onRename: (name: string) => void
  onCareComplete: (task: CareTask, log: SessionLog) => void
  onClose: () => void
  onQuestionGraded?: (result: GradeResult) => void
}

export function StallPanel({
  creature,
  care,
  today,
  feed,
  scheduler,
  onRename,
  onCareComplete,
  onClose,
  onQuestionGraded,
}: StallPanelProps) {
  const [name, setName] = useState(creature.name)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(creature.name)
  const [task, setTask] = useState<CareTask | null>(null)
  const [mood, setMood] = useState<CreatureMood>('idle')

  const isDone = (t: CareTask) => care.done[t] === today
  const canFeed = feed >= FEED_PER_FEEDING

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

  const anim = moodVariants[mood]

  if (task) {
    return (
      <div className="mx-auto max-w-sm space-y-3 p-4 text-center">
        <p className="text-sm font-semibold text-stone-500">
          {CARE_EMOJI[task]} {CARE_LABEL[task]} {name}
        </p>
        <QuizPanel
          scheduler={scheduler}
          mode={{ kind: 'count', questions: CARE_QUESTIONS[task] }}
          context="stall"
          familyContext={creature.family}
          creatureSlot={<CreatureSVG params={creature.params} mood={mood} size={96} title={name} />}
          onMood={setMood}
          onQuestionGraded={onQuestionGraded}
          onComplete={(log) => {
            setTask(null)
            setMood('idle')
            onCareComplete(task, log)
          }}
        />
      </div>
    )
  }

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

      <div className="grid grid-cols-2 gap-3">
        {CARE_TASKS.map((t) => {
          const done = isDone(t)
          const disabled = done || (t === 'feed' && !canFeed)
          return (
            <button
              key={t}
              type="button"
              aria-label={CARE_LABEL[t]}
              disabled={disabled}
              onClick={() => setTask(t)}
              className={`rounded-xl border p-3 text-sm font-semibold transition ${
                done
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                  : disabled
                    ? 'border-stone-200 bg-stone-100 text-stone-400'
                    : 'border-amber-300 bg-amber-100 text-amber-900 hover:bg-amber-200'
              }`}
            >
              <span className="text-xl">{CARE_EMOJI[t]}</span>
              <br />
              {done ? `${CARE_VERB[t]} ✓` : CARE_LABEL[t]}
              {t === 'feed' && !done ? (
                <span className="block text-[11px] font-normal">
                  {canFeed ? `costs ${FEED_PER_FEEDING} feed` : 'need feed →'}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      <button type="button" className="text-sm text-stone-500" onClick={onClose}>
        Back to the barn
      </button>
    </div>
  )
}
