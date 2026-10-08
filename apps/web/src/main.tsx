import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { createGame } from './composition/create-game'
import { isAssetCatalogueRoute } from './scene/asset-catalogue-route'
import { LazyAssetCatalogue } from './scene/LazyAssetCatalogue'
import './index.css'

const root = document.getElementById('root')
if (!root) throw new Error('index.html is missing the #root element')

// `import.meta.env.DEV` is a build-time `false` in production, so the
// catalogue viewer and its chunk are dropped from the child's build entirely.
const showAssetCatalogue = import.meta.env.DEV && isAssetCatalogueRoute(window.location.search)

createRoot(root).render(
  <StrictMode>{showAssetCatalogue ? <LazyAssetCatalogue /> : <App game={createGame()} />}</StrictMode>,
)
