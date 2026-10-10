import type { FarmGame, FarmSummary } from '@sf/application'
import { useCallback, useEffect, useState } from 'react'
import { Hud } from './hud/Hud'
import { PracticePanel } from './practice/PracticePanel'
import { LazyFarmScene } from './scene/LazyFarmScene'

type AppProps = {
  game: FarmGame
}

export function App({ game }: AppProps) {
  const [summary, setSummary] = useState<FarmSummary | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const refreshSummary = useCallback(() => setSummary(game.summary()), [game])

  useEffect(() => {
    let mounted = true
    game
      .load()
      .then((loaded) => {
        if (mounted) setSummary(loaded)
      })
      .catch((error: unknown) => {
        // The save store is specified never to throw, so this is a programming
        // error worth surfacing rather than a state to recover from.
        console.error('Farm failed to load', error)
        if (mounted) setLoadFailed(true)
      })
    return () => {
      mounted = false
    }
  }, [game])

  const toggleMute = useCallback(() => {
    if (!summary) return
    game.setMuted(!summary.muted).then(refreshSummary, (error: unknown) => {
      // The setting is stored with the farm, so a rejected save means the sound
      // did not actually change. Leave the control showing what is still true
      // rather than lying about it, and surface the failure.
      console.error('Could not change the sound setting', error)
    })
  }, [game, summary, refreshSummary])

  return (
    <main className="relative h-full w-full">
      <LazyFarmScene />
      <div className="pointer-events-none absolute inset-0 flex flex-col">
        {summary ? (
          <>
            <Hud summary={summary} onToggleMute={toggleMute} />
            <div className="mt-auto flex justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <PracticePanel game={game} onFarmChanged={refreshSummary} />
            </div>
          </>
        ) : (
          <p className="m-auto rounded-full bg-white/90 px-6 py-3 text-lg font-bold text-stone-700" role="status">
            {loadFailed ? 'The farm could not wake up. Please reload the page.' : 'Waking up the farm…'}
          </p>
        )}
      </div>
    </main>
  )
}
