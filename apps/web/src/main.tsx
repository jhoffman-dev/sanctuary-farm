import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { createGame } from './composition/create-game'
import './index.css'
import { LazySpikePage } from './spike/LazySpikePage'

const root = document.getElementById('root')
if (!root) throw new Error('index.html is missing the #root element')

const spikeRequested = new URLSearchParams(window.location.search).get('spike') === '3d'

createRoot(root).render(
  <StrictMode>
    {spikeRequested ? (
      <Suspense fallback={null}>
        <LazySpikePage />
      </Suspense>
    ) : (
      <App game={createGame()} />
    )}
  </StrictMode>,
)
