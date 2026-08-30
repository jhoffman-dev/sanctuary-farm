// TRACK D owns this file. Three views: the 12-creature grid with mood controls,
// the side-on barn, and a single stall panel wired to a real scheduler.
import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import type { CreatureMood, HatchedCreature } from '@/contracts'
import { DEFAULT_CREATURE_NAMES, emptyAnimalCare } from '@/contracts'
import { todayStr } from '@/game/todayStr'
import { CreatureSVG } from '@/creatures/CreatureSVG'
import { ALL_CREATURE_PARAMS, defaultCreatureParams } from '@/creatures/definitions'
import { moodVariants, MOOD_TRANSFORM_ORIGIN } from '@/creatures/animations'
import { BarnInterior } from '@/barn/BarnInterior'
import { StallPanel } from '@/barn/StallPanel'
import { createScheduler, initialSchedulerState } from '@/engine/scheduler'
import type { DevRoute } from './_registry'

const MOODS: CreatureMood[] = ['idle', 'happy', 'eating', 'puzzled', 'sleeping']

function AnimatedCreature({
  family,
  mood,
  size,
  title,
}: {
  family: number
  mood: CreatureMood
  size: number
  title: string
}) {
  const anim = moodVariants[mood]
  return (
    <motion.div
      className="w-fit"
      style={{ transformOrigin: MOOD_TRANSFORM_ORIGIN }}
      animate={anim.animate}
      transition={anim.transition}
    >
      <CreatureSVG params={defaultCreatureParams(family)} mood={mood} size={size} title={title} />
    </motion.div>
  )
}

function Grid() {
  const [mood, setMood] = useState<CreatureMood>('idle')
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {MOODS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMood(m)}
            className={`rounded px-3 py-1 text-sm ${
              m === mood ? 'bg-stone-900 text-white' : 'bg-stone-200'
            }`}
          >
            {m}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Object.keys(ALL_CREATURE_PARAMS).map((k) => {
          const family = Number(k)
          return (
            <div
              key={family}
              className="flex flex-col items-center rounded border border-stone-200 bg-white p-3"
            >
              <AnimatedCreature
                family={family}
                mood={mood}
                size={120}
                title={`${DEFAULT_CREATURE_NAMES[family]} — family ${family}`}
              />
              <p className="mt-1 text-xs font-medium">{DEFAULT_CREATURE_NAMES[family]}</p>
              <p className="text-[11px] opacity-50">family {family}</p>
              <div className="mt-2 flex gap-1">
                {[64, 40].map((s) => (
                  <CreatureSVG
                    key={s}
                    params={defaultCreatureParams(family)}
                    mood={mood}
                    size={s}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function makeCreature(family: number, stallIndex: number): HatchedCreature {
  return {
    family,
    name: DEFAULT_CREATURE_NAMES[family],
    params: defaultCreatureParams(family),
    hatchedAt: Date.now(),
    stallIndex,
  }
}

function BarnView() {
  const scheduler = useMemo(() => createScheduler(initialSchedulerState()), [])
  const creatures = useMemo(
    () => [makeCreature(10, 0), makeCreature(2, 1), makeCreature(5, 4)],
    [],
  )
  const [selected, setSelected] = useState<number | null>(null)
  const [names, setNames] = useState<Record<number, string>>({})
  const [log, setLog] = useState<string>('')

  const current = creatures.find((c) => c.stallIndex === selected) ?? null

  return (
    <div className="space-y-4">
      <BarnInterior
        creatures={creatures.map((c) => ({ ...c, name: names[c.stallIndex] ?? c.name }))}
        badges={{ 0: true, 4: true }}
        onSelectStall={setSelected}
      />
      {current ? (
        <div className="rounded border border-stone-200 bg-white">
          <StallPanel
            key={current.stallIndex}
            creature={{ ...current, name: names[current.stallIndex] ?? current.name }}
            care={emptyAnimalCare(current.family)}
            today={todayStr()}
            feed={20}
            scheduler={scheduler}
            onRename={(name) =>
              setNames((prev) => ({ ...prev, [current.stallIndex]: name }))
            }
            onCareComplete={(task, l) =>
              setLog(`${task} ${current.name}: ${l.entries.length} answers`)
            }
            onClose={() => setSelected(null)}
          />
        </div>
      ) : (
        <p className="text-sm text-stone-500">Tap a stall with a creature to open its panel.</p>
      )}
      {log ? <p className="text-xs text-emerald-700">{log}</p> : null}
    </div>
  )
}

function CreaturesDevRoute() {
  const [view, setView] = useState<'grid' | 'barn'>('grid')
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(['grid', 'barn'] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={`rounded px-3 py-1 text-sm ${
              v === view ? 'bg-emerald-600 text-white' : 'bg-stone-200'
            }`}
          >
            {v === 'grid' ? 'Creature grid' : 'Barn + stall'}
          </button>
        ))}
      </div>
      {view === 'grid' ? <Grid /> : <BarnView />}
    </div>
  )
}

export default {
  path: '#/dev/creatures',
  label: 'Creatures',
  order: 40,
  Component: CreaturesDevRoute,
} satisfies DevRoute
