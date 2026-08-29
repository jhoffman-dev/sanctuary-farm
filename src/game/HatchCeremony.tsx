// Full-screen hatch sequence. Unskippable the first time (first === true);
// afterwards a Skip appears. Ends by letting her name the new creature.
import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { DEFAULT_CREATURE_NAMES, TIER_NAMES, tierOf } from '@/contracts'
import type { HatchedCreature } from '@/contracts'
import { CreatureSVG } from '@/creatures/CreatureSVG'

export type HatchCeremonyProps = {
  creature: HatchedCreature
  first: boolean
  onName: (name: string) => void
}

export function HatchCeremony({ creature, first, onName }: HatchCeremonyProps) {
  const [phase, setPhase] = useState<'shake' | 'reveal' | 'name'>('shake')
  const [draft, setDraft] = useState(DEFAULT_CREATURE_NAMES[creature.family] ?? creature.name)
  const familyLabel = TIER_NAMES[tierOf(creature.family, creature.family)]

  useEffect(() => {
    if (phase !== 'shake') return
    const t = setTimeout(() => setPhase('reveal'), 2200)
    return () => clearTimeout(t)
  }, [phase])

  useEffect(() => {
    if (phase !== 'reveal') return
    const t = setTimeout(() => setPhase('name'), 1600)
    return () => clearTimeout(t)
  }, [phase])

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-amber-50/95 p-6 text-center">
      <div className="space-y-6">
        <p className="text-sm font-semibold uppercase tracking-widest text-amber-700">
          The {familyLabel} egg is hatching
        </p>

        {phase === 'shake' ? (
          <motion.div
            animate={{ rotate: [0, -6, 6, -4, 4, 0] }}
            transition={{ duration: 0.6, repeat: Infinity }}
            className="text-7xl"
          >
            🥚
          </motion.div>
        ) : (
          <motion.div initial={{ scale: 0.2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <CreatureSVG params={creature.params} mood="happy" size={220} />
          </motion.div>
        )}

        {phase === 'name' ? (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              onName(draft.trim() || creature.name)
            }}
          >
            <label className="block text-stone-600">What will you call them?</label>
            <input
              aria-label="new creature name"
              autoFocus
              maxLength={20}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="w-52 rounded-lg border border-stone-300 px-3 py-2 text-center text-lg"
            />
            <div>
              <button type="submit" className="rounded-lg bg-emerald-400 px-6 py-2 font-semibold text-emerald-950">
                Welcome them home
              </button>
            </div>
          </form>
        ) : !first ? (
          <button type="button" onClick={() => setPhase('name')} className="text-sm text-stone-500 underline">
            Skip
          </button>
        ) : null}
      </div>
    </div>
  )
}
