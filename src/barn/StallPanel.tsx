// A creature's care panel: the animal, its health, four daily needs, and a round
// of questions to tend each. During a round a little scene reacts to every
// correct answer (trough fills, broom sweeps, the animal dances).
//
// D11 held — the stall does NOT filter which facts are asked.
import { useState } from 'react'
import { motion } from 'motion/react'
import {
  CARE_EMOJI,
  CARE_LABEL,
  CARE_QUESTIONS,
  CARE_TASKS,
  CARE_VERB,
  FEED_PER_FEEDING,
  HEALTH_HAPPY_AT,
  HEALTH_MAX,
  HEALTH_SAD_AT,
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
import { CareScene } from './CareScene'

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

function restingMood(health: number): CreatureMood {
  if (health < HEALTH_SAD_AT) return 'sad'
  if (health >= HEALTH_HAPPY_AT) return 'content'
  return 'idle'
}

function HealthBar({ health }: { health: number }) {
  const pct = Math.max(0, Math.min(100, (health / HEALTH_MAX) * 100))
  const colour = health < HEALTH_SAD_AT ? '#ef5350' : health < HEALTH_HAPPY_AT ? '#ffb74d' : '#66bb6a'
  return (
    <div className="mx-auto w-56" aria-label={`health ${Math.round(health)} of ${HEALTH_MAX}`}>
      <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-stone-500">
        <span>❤️ Health</span>
        <span>{Math.round(health)}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-stone-200">
        <motion.div
          className="h-full rounded-full"
          style={{ background: colour }}
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 160, damping: 20 }}
        />
      </div>
    </div>
  )
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
  const [correct, setCorrect] = useState(0)

  const isDone = (t: CareTask) => care.done[t] === today
  const canFeed = feed >= FEED_PER_FEEDING
  const rest = restingMood(care.health)

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

  function startTask(t: CareTask) {
    setCorrect(0)
    setMood('idle')
    setTask(t)
  }

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
          creatureSlot={
            <CareScene
              task={task}
              creature={creature}
              name={name}
              done={correct}
              total={CARE_QUESTIONS[task]}
            />
          }
          onMood={setMood}
          onQuestionGraded={(r) => {
            if (r.correct) setCorrect((c) => c + 1)
            onQuestionGraded?.(r)
          }}
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
        animate={moodVariants[mood === 'idle' ? rest : mood].animate}
        transition={moodVariants[mood === 'idle' ? rest : mood].transition}
      >
        <CreatureSVG params={creature.params} mood={mood === 'idle' ? rest : mood} size={160} title={name} />
      </motion.div>

      <HealthBar health={care.health} />

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
              onClick={() => startTask(t)}
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
