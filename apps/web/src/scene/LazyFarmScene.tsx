import type { HotspotId, TileWorld } from '@sf/world'
import { Suspense, use } from 'react'
import { SceneChunkBoundary } from './SceneChunkBoundary'
import { SceneLoading } from './SceneLoading'
import { clearReloadAttempts } from './reload-attempts'

/** Builds (or fetches) the world to draw. The composition root supplies it. */
export type WorldLoader = () => Promise<TileWorld>

type LoadedScene = { readonly scene: typeof import('./FarmScene'); readonly world: TileWorld }

/**
 * Three.js and react-three-fiber are ~230 kB gz and none of it is needed to
 * answer a question, so the world is its own chunk: practice first
 * (docs/performance-budget.md, rule 1). Nothing outside `scene/` may import
 * three or r3f, or they land back in the shell and the child waits for the
 * scenery before the first fact. The world's tiles are built alongside it.
 *
 * One promise per loader, kept for the page's life: `use` needs the same
 * promise on every render, and the composition root's loader is a
 * module-level function, so the world is fetched and built exactly once.
 */
const loading = new WeakMap<WorldLoader, Promise<LoadedScene>>()

function loadScene(loadWorld: WorldLoader): Promise<LoadedScene> {
  const cached = loading.get(loadWorld)
  if (cached) return cached
  const started = Promise.all([import('./FarmScene'), loadWorld()]).then(([scene, world]) => {
    // The chunk arrived, so a later deploy gets its own recovery reload.
    clearReloadAttempts()
    return { scene, world }
  })
  loading.set(loadWorld, started)
  return started
}

type LazyFarmSceneProps = {
  loadWorld: WorldLoader
  /** The keeper has stopped on a hotspot's doorstep. */
  onArrive?: (hotspot: HotspotId) => void
}

function WorldScene({ loadWorld, onArrive }: LazyFarmSceneProps) {
  const { scene, world } = use(loadScene(loadWorld))
  return <scene.FarmScene world={world} {...(onArrive ? { onArrive } : {})} />
}

/** The 3D world, fetched and built in the background while the game is already playable. */
export function LazyFarmScene({ loadWorld, onArrive }: LazyFarmSceneProps) {
  return (
    <SceneChunkBoundary>
      <Suspense fallback={<SceneLoading />}>
        <WorldScene loadWorld={loadWorld} {...(onArrive ? { onArrive } : {})} />
      </Suspense>
    </SceneChunkBoundary>
  )
}
