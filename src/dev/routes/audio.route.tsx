// TRACK E owns this file. One button per SoundName against the real AudioBus.
import type { DevRoute } from './_registry'
import { useMemo, useState } from 'react'
import type { SoundName } from '@/contracts'
import { createAudioBus } from '@/audio/sounds'

const SOUNDS: SoundName[] = [
  'correct',
  'fluent',
  'wrong',
  'hatch',
  'tap',
  'footstep',
  'doorOpen',
  'chew',
]

function AudioDevRoute() {
  const bus = useMemo(() => createAudioBus(), [])
  const [muted, setMuted] = useState(false)

  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-600">
        Click a sound (a user gesture is required before audio can start). <code>fluent</code>{' '}
        should sound clearly richer than <code>correct</code>; <code>wrong</code> is a soft
        low sigh, not a buzzer.
      </p>
      <button
        type="button"
        className="rounded bg-stone-200 px-3 py-1.5 text-sm hover:bg-stone-300"
        onClick={() => {
          const next = !muted
          setMuted(next)
          bus.setMuted(next)
        }}
      >
        {muted ? 'Unmute' : 'Mute'}
      </button>
      <div className="flex flex-wrap gap-2">
        {SOUNDS.map((s) => (
          <button
            key={s}
            type="button"
            className="rounded bg-stone-200 px-3 py-2 text-sm hover:bg-stone-300"
            onClick={() => bus.play(s)}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}

export default {
  path: '#/dev/audio',
  label: 'Audio',
  order: 50,
  Component: AudioDevRoute,
} satisfies DevRoute
