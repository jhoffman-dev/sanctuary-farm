import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './App'

// The game boots by default. Track dev routes stay reachable in development
// only, at ?dev=1 (they exercise components in isolation).
async function boot() {
  const devRequested = import.meta.env.DEV && new URLSearchParams(location.search).get('dev') === '1'
  const root = createRoot(document.getElementById('root')!)
  if (devRequested) {
    const { DevRoutes } = await import('./dev/DevRoutes')
    root.render(
      <StrictMode>
        <DevRoutes />
      </StrictMode>,
    )
  } else {
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  }
}

void boot()
