// TRACK E owns this file. One button per SoundName against the real AudioBus.
import type { DevRoute } from './_registry'
import { useMemo } from 'react'
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
  return (
    <div className="flex flex-wrap gap-2">
      {SOUNDS.map((s) => (
        <button key={s} type="button" className="rounded bg-stone-200 px-3 py-2" onClick={() => bus.play(s)}>
          {s}
        </button>
      ))}
    </div>
  )
}

export default {
  path: '#/dev/audio',
  label: 'Audio',
  order: 50,
  Component: AudioDevRoute,
} satisfies DevRoute
