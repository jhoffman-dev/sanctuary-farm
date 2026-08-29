import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { DevRoutes } from './dev/DevRoutes'
import { App } from './App'

// During track development this renders the dev-route index.
// Phase 2 flips DEV_MODE off (or removes this branch) to boot the real game.
const DEV_MODE = new URLSearchParams(location.search).get('app') !== '1'

createRoot(document.getElementById('root')!).render(
  <StrictMode>{DEV_MODE ? <DevRoutes /> : <App />}</StrictMode>,
)
