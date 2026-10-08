import { createHotspotArrivals, type FarmGame, type FarmSummary } from '@sf/application'
import type { HotspotId } from '@sf/world'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Hud } from './hud/Hud'
import { PracticePanel } from './practice/PracticePanel'
import { LazyFarmScene, type WorldLoader } from './scene/LazyFarmScene'

type AppProps = {
  game: FarmGame
  /** Builds the tile world the scene draws; fetched after the number pad is up. */
  loadWorld: WorldLoader
}

/** Long enough to read aloud slowly; the note then gets out of the way. */
const COMING_SOON_MS = 4000

const PLACE_NAMES: Record<HotspotId, string> = {
  barn: 'barn',
  'feed-shed': 'feed shed',
  nest: 'nest',
  paddock: 'paddock',
  'training-ring': 'training ring',
  'petting-zoo': 'petting zoo',
  farmhouse: 'farmhouse',
}

export function App({ game, loadWorld }: AppProps) {
  const [summary, setSummary] = useState<FarmSummary | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const refreshSummary = useCallback(() => setSummary(game.summary()), [game])
  const arrivals = useMemo(() => createHotspotArrivals(game), [game])
  const [roundsOpened, setRoundsOpened] = useState(0)
  const [comingSoon, setComingSoon] = useState<HotspotId | null>(null)

  const onArrive = useCallback(
    (hotspot: HotspotId) => {
      // Before the farm has loaded there is no round to start; the keeper just stands there.
      if (!summary) return
      try {
        const outcome = arrivals.arriveAt(hotspot)
        setComingSoon(outcome.kind === 'coming-soon' ? hotspot : null)
        if (outcome.kind === 'practice' && outcome.started) setRoundsOpened((count) => count + 1)
      } catch (error: unknown) {
        // The game refuses a round while a save is still landing. Nothing is
        // lost — the start button still works — so say so and carry on.
        console.error('Could not open the paddock round on arrival', error)
      }
    },
    [arrivals, summary],
  )

  useEffect(() => {
    if (!comingSoon) return
    const hide = window.setTimeout(() => setComingSoon(null), COMING_SOON_MS)
    return () => window.clearTimeout(hide)
  }, [comingSoon])

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
      <LazyFarmScene loadWorld={loadWorld} onArrive={onArrive} />
      <div className="pointer-events-none absolute inset-0 flex flex-col">
        {summary ? (
          <>
            <Hud summary={summary} onToggleMute={toggleMute} />
            {comingSoon && (
              <p
                className="mx-auto mt-3 rounded-full bg-white/90 px-5 py-2 text-lg font-bold text-stone-700 shadow"
                role="status"
                data-testid="coming-soon"
              >
                The {PLACE_NAMES[comingSoon]} is coming soon!
              </p>
            )}
            <div className="mt-auto flex justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <PracticePanel
                // A new key per round the keeper opened: the panel starts afresh on that round.
                key={roundsOpened}
                game={game}
                onFarmChanged={refreshSummary}
                openOnRoundInFlight={roundsOpened > 0}
              />
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
