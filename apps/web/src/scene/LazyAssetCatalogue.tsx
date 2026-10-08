import { Suspense, lazy } from 'react'
import { SceneLoading } from './SceneLoading'

/** Its own chunk, like the farm: the catalogue's code is never fetched unless `?assets=1` asks for it. */
const AssetCatalogueScene = lazy(async () => {
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
