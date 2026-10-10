import { Suspense, lazy } from 'react'
import { SceneLoading } from './SceneLoading'

/**
 * Its own chunk, and dev builds only (`main.tsx`). Marked pure so a production
 * build, which never renders the viewer, drops the chunk from the child's game.
 */
const AssetCatalogueScene = /* @__PURE__ */ lazy(async () => {
  const scene = await import('./AssetCatalogueScene')
  return { default: scene.AssetCatalogueScene }
})

export function LazyAssetCatalogue() {
  return (
    <Suspense fallback={<SceneLoading />}>
      <AssetCatalogueScene />
    </Suspense>
  )
}
