import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SceneLoading } from './SceneLoading'

function stubReducedMotion(reduced: boolean) {
  vi.stubGlobal('matchMedia', () => ({
    matches: reduced,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }))
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('SceneLoading', () => {
  it('announces that the farm is on its way, in words a screen reader will read', () => {
    stubReducedMotion(false)

    render(<SceneLoading />)

    expect(screen.getByRole('status')).toHaveTextContent('Building the farm')
  })

  it('spins its ring while the chunk is in flight', () => {
    stubReducedMotion(false)

    render(<SceneLoading />)

    expect(screen.getByTestId('scene-loading-ring')).toHaveClass('animate-spin')
  })

  it('holds the ring still for a player who asked for reduced motion', () => {
    stubReducedMotion(true)

    render(<SceneLoading />)

    expect(screen.getByTestId('scene-loading-ring')).not.toHaveClass('animate-spin')
    expect(screen.getByRole('status')).toHaveTextContent('Building the farm')
  })
})
