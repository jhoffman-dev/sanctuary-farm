import { render, screen, waitFor } from '@testing-library/react'
import { Suspense, lazy } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SceneChunkBoundary } from './SceneChunkBoundary'

// A deploy replaces the hashed chunk names; Hosting answers the old URL with
// index.html, and this is the error the browser raises for it.
const staleChunk = () =>
  new TypeError('Failed to fetch dynamically imported module: /assets/FarmScene-B4mBlIc9.js')

const StaleWorld = lazy(() => Promise.reject(staleChunk()))
const World = lazy(() => Promise.resolve({ default: () => <div data-testid="world" /> }))

/** The scene as the app mounts it, with the page reload observable. */
function renderScene(scene: React.ReactNode, reloadPage: () => void) {
  return render(
    <>
      <SceneChunkBoundary reloadPage={reloadPage}>
        <Suspense fallback={<p>Building the farm…</p>}>{scene}</Suspense>
      </SceneChunkBoundary>
      <button type="button">Digit 7</button>
    </>,
  )
}

beforeEach(() => {
  window.sessionStorage.clear()
  // React prints every boundary-caught error; the assertions below cover it.
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('SceneChunkBoundary', () => {
  it('shows the world when its chunk loads', async () => {
    renderScene(<World />, vi.fn())

    expect(await screen.findByTestId('world')).toBeInTheDocument()
  })

  it('reloads the page once when the chunk is gone, to pick up the new index.html', async () => {
    const reloadPage = vi.fn()

    renderScene(<StaleWorld />, reloadPage)

    await waitFor(() => expect(reloadPage).toHaveBeenCalledTimes(1))
    expect(window.sessionStorage.getItem('sanctuary-farm/scene-chunk-reloads')).toBe('1')
  })

  it('gives up after that one reload and lets the game play on without scenery', async () => {
    const reloadPage = vi.fn()
    window.sessionStorage.setItem('sanctuary-farm/scene-chunk-reloads', '1')

    renderScene(<StaleWorld />, reloadPage)

    await waitFor(() =>
      expect(console.error).toHaveBeenCalledWith(
        'The farm world could not load; playing without it',
        expect.any(TypeError),
      ),
    )
    expect(reloadPage).not.toHaveBeenCalled()
    expect(screen.queryByText('Building the farm…')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Digit 7' })).toBeInTheDocument()
  })

  it('does not reload when the attempt cannot be counted, because an uncounted reload would loop', async () => {
    const reloadPage = vi.fn()
    vi.stubGlobal('sessionStorage', {
      getItem: () => null,
      setItem: () => {
        throw new DOMException('quota exceeded', 'QuotaExceededError')
      },
      removeItem: () => undefined,
    })

    renderScene(<StaleWorld />, reloadPage)

    await waitFor(() =>
      expect(console.error).toHaveBeenCalledWith(
        'The farm world could not load; playing without it',
        expect.any(TypeError),
      ),
    )
    expect(reloadPage).not.toHaveBeenCalled()
  })
})
