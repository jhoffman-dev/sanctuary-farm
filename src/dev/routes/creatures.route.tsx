// TRACK D owns this file. Grid of all 12 creatures with buttons to trigger each mood.
import type { DevRoute } from './_registry'
import { useState } from 'react'
import type { CreatureMood } from '@/contracts'
import { CreatureSVG } from '@/creatures/CreatureSVG'
import { ALL_CREATURE_PARAMS } from '@/creatures/definitions'

const MOODS: CreatureMood[] = ['idle', 'happy', 'eating', 'puzzled', 'sleeping']

function CreaturesDevRoute() {
  const [mood, setMood] = useState<CreatureMood>('idle')
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {MOODS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMood(m)}
            className={`rounded px-3 py-1 text-sm ${m === mood ? 'bg-stone-900 text-white' : 'bg-stone-200'}`}
          >
            {m}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-4">
        {Object.entries(ALL_CREATURE_PARAMS).map(([family, params]) => (
          <div key={family} className="rounded border p-2 text-center">
            <CreatureSVG params={params} mood={mood} size={120} title={`family ${family}`} />
            <p className="text-xs opacity-60">family {family}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default {
  path: '#/dev/creatures',
  label: 'Creatures',
  order: 40,
  Component: CreaturesDevRoute,
} satisfies DevRoute
