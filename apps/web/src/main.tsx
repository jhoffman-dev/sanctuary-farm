import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { createGame } from './composition/create-game'
import { loadFarmWorld } from './composition/load-farm-world'
import { loadWorldEditorSession } from './composition/load-world-editor-session'
import { isWorldEditorRoute } from './editor/editor-route'
import { LazyWorldEditor } from './editor/LazyWorldEditor'
import { isAnimalLineupRoute } from './scene/animal-lineup-route'
import { isAssetCatalogueRoute } from './scene/asset-catalogue-route'
import { LazyAnimalLineup } from './scene/LazyAnimalLineup'
import { LazyAssetCatalogue } from './scene/LazyAssetCatalogue'
import './index.css'

const root = document.getElementById('root')
if (!root) throw new Error('index.html is missing the #root element')

// `import.meta.env.DEV` is a build-time `false` in production, so the
// catalogue viewer, the animal lineup, the world editor and their chunks are dropped from the
// child's build entirely.
const showAssetCatalogue = import.meta.env.DEV && isAssetCatalogueRoute(window.location.search)
const showWorldEditor = import.meta.env.DEV && isWorldEditorRoute(window.location.search)
const showAnimalLineup = import.meta.env.DEV && isAnimalLineupRoute(window.location.search)

function page() {
  if (showWorldEditor) return <LazyWorldEditor loadSession={loadWorldEditorSession} />
  if (showAssetCatalogue) return <LazyAssetCatalogue />
  if (showAnimalLineup) return <LazyAnimalLineup />
  return <App game={createGame()} loadWorld={loadFarmWorld} />
}

createRoot(root).render(<StrictMode>{page()}</StrictMode>)
