import { Suspense, lazy } from 'react'
import { SceneChunkBoundary } from './SceneChunkBoundary'
import { SceneLoading } from './SceneLoading'
import { clearReloadAttempts } from './reload-attempts'

/**
 * Three.js and react-three-fiber are ~230 kB gz and none of it is needed to
 * answer a question, so the world is its own chunk: practice first
 * (docs/performance-budget.md, rule 1). Nothing outside `scene/` may import
 * three or r3f, or they land back in the shell and the child waits for the
 * scenery before the first fact.
 */
const FarmScene = lazy(async () => {
  const scene = await import('./FarmScene')
  // The chunk arrived, so a later deploy gets its own recovery reload.
  clearReloadAttempts()
  return { default: scene.FarmScene }
})

/** The 3D world, fetched in the background while the game is already playable. */
export function LazyFarmScene() {
  return (
    <SceneChunkBoundary>
      <Suspense fallback={<SceneLoading />}>
        <FarmScene />
      </Suspense>
    </SceneChunkBoundary>
  )
}
