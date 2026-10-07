import { useCallback, useState } from 'react'
import { SilhouettePage } from './SilhouettePage'
import { Spike3dScene } from './Spike3dScene'
import { CASTS, spikeRouteFrom, type PackName } from './spike-cast'
import { SpikeSession } from './spike-session'

/**
 * The throwaway `?spike=3d` page for SF-63. It is not part of the game: no
 * `@sf/application`, no game rules, no route in the shipped shell beyond the
 * query flag that lazy-loads it.
 */
export function SpikePage() {
  const [route] = useState(() => spikeRouteFrom(window.location.search))
  if (route.view === 'silhouette') return <SilhouettePage subject={route.model} yaw={route.yaw} />
  return <SpikeScenePage pack={route.pack} />
}

function SpikeScenePage({ pack }: { pack: PackName }) {
  const [session] = useState(() => new SpikeSession())
  const resetStats = useCallback(() => session.resetStats(), [session])
  const attachReadout = useCallback((node: HTMLDivElement | null) => session.attachReadout(node), [session])

  return (
    <main className="relative h-full w-full">
      <Spike3dScene session={session} cast={CASTS[pack]} />
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3 text-xs">
        <p className="self-start rounded-lg bg-white/85 px-3 py-2 font-medium text-stone-700">
          SF-63 spike ({pack}) — tap the grass to walk, or use WASD / arrow keys.
        </p>
        <div className="flex items-end justify-between gap-2">
          <div
            ref={attachReadout}
            data-testid="spike-readout"
            className="rounded-lg bg-white/85 px-3 py-2 font-mono text-stone-700"
          >
            measuring…
          </div>
          <button
            type="button"
            onClick={resetStats}
            data-testid="spike-reset-stats"
            className="pointer-events-auto rounded-lg bg-white/85 px-3 py-2 font-medium text-stone-700"
          >
            Reset stats
          </button>
        </div>
      </div>
    </main>
  )
}
