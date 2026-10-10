import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { createGame } from './composition/create-game'
import { isAssetCatalogueRoute } from './scene/asset-catalogue-route'
import { LazyAssetCatalogue } from './scene/LazyAssetCatalogue'
import './index.css'

const root = document.getElementById('root')
if (!root) throw new Error('index.html is missing the #root element')

createRoot(root).render(
  <StrictMode>
    {isAssetCatalogueRoute(window.location.search) ? <LazyAssetCatalogue /> : <App game={createGame()} />}
  </StrictMode>,
)
