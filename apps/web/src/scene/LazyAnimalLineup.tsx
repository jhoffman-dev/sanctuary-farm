import { Suspense, lazy } from 'react'
import { SceneLoading } from './SceneLoading'

/** Its own chunk, and dev builds only (`main.tsx`), like the asset catalogue. */
const AnimalLineupScene = /* @__PURE__ */ lazy(async () => {
  const scene = await import('./AnimalLineupScene')
  return { default: scene.AnimalLineupScene }
})

export function LazyAnimalLineup() {
  return (
    <Suspense fallback={<SceneLoading />}>
      <AnimalLineupScene />
    </Suspense>
  )
}
