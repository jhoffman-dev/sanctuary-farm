import { Component, type ReactNode } from 'react'
import { shouldReloadAfterChunkError } from './chunk-reload'
import { readReloadAttempts, recordReloadAttempt } from './reload-attempts'

type SceneChunkBoundaryProps = {
  children: ReactNode
  /** Injected so a test can watch the reload; jsdom cannot navigate. */
  reloadPage?: () => void
}

type SceneChunkBoundaryState = { failed: boolean }

function reloadPage() {
  window.location.reload()
}

/**
 * Keeps a missing world chunk from taking the game down with it: one reload to
 * pick up a fresh `index.html` after a deploy, and if that does not help, the
 * farm plays on without scenery. The scenery is decorative (`aria-hidden` on
 * the canvas) — the HUD and the number pad are the game.
 */
export class SceneChunkBoundary extends Component<SceneChunkBoundaryProps, SceneChunkBoundaryState> {
  override state: SceneChunkBoundaryState = { failed: false }

  static getDerivedStateFromError(): SceneChunkBoundaryState {
    return { failed: true }
  }

  override componentDidCatch(error: unknown) {
    const attempts = readReloadAttempts()
    if (shouldReloadAfterChunkError(attempts) && recordReloadAttempt(attempts)) {
      const reload = this.props.reloadPage ?? reloadPage
      reload()
      return
    }
    console.error('The farm world could not load; playing without it', error)
  }

  override render() {
    return this.state.failed ? null : this.props.children
  }
}
