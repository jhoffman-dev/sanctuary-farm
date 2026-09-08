import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useReducedMotion } from './use-reduced-motion'
import { useSceneFrameloop } from './use-scene-frameloop'

type ChangeListener = () => void

type FakeMediaQuery = {
  queries: string[]
  listenerCount(): number
  change(matches: boolean): void
}

/** Installs a matchMedia whose result the test drives, and reports what was asked. */
function stubMatchMedia(matches: boolean): FakeMediaQuery {
  const listeners = new Set<ChangeListener>()
  const queries: string[] = []
  const media = {
    matches,
    addEventListener: (_event: string, listener: ChangeListener) => {
      listeners.add(listener)
    },
    removeEventListener: (_event: string, listener: ChangeListener) => {
      listeners.delete(listener)
    },
  }
  vi.stubGlobal('matchMedia', (query: string) => {
    queries.push(query)
    return media
  })
  return {
    queries,
    listenerCount: () => listeners.size,
    change: (next) => {
      media.matches = next
      act(() => {
        for (const listener of [...listeners]) listener()
      })
    },
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useReducedMotion', () => {
  it('asks for the prefers-reduced-motion media query', () => {
    const media = stubMatchMedia(false)
    renderHook(() => useReducedMotion())
    expect(media.queries[0]).toBe('(prefers-reduced-motion: reduce)')
  })

  it('is false when the player has expressed no preference', () => {
    stubMatchMedia(false)
    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(false)
  })

  it('is true from the first render when the preference is already set', () => {
    stubMatchMedia(true)
    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(true)
  })

  it('follows the preference changing while the game is open', () => {
    const media = stubMatchMedia(false)
    const { result } = renderHook(() => useReducedMotion())

    media.change(true)
    expect(result.current).toBe(true)

    media.change(false)
    expect(result.current).toBe(false)
  })

  it('stops listening when the component goes away', () => {
    const media = stubMatchMedia(false)
    const { unmount } = renderHook(() => useReducedMotion())
    expect(media.listenerCount()).toBe(1)

    unmount()

    expect(media.listenerCount()).toBe(0)
  })

  it('reports no preference where matchMedia does not exist, rather than throwing', () => {
    vi.stubGlobal('matchMedia', undefined)
    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(false)
  })
})

describe('useSceneFrameloop', () => {
  it("runs the loop always when motion is welcome", () => {
    stubMatchMedia(false)
    const { result } = renderHook(() => useSceneFrameloop())
    expect(result.current).toBe('always')
  })

  it('drops to on-demand — a still frame — when motion is reduced', () => {
    stubMatchMedia(true)
    const { result } = renderHook(() => useSceneFrameloop())
    expect(result.current).toBe('demand')
  })

  it('switches to on-demand the moment the preference changes', () => {
    const media = stubMatchMedia(false)
    const { result } = renderHook(() => useSceneFrameloop())

    media.change(true)

    expect(result.current).toBe('demand')
  })
})
