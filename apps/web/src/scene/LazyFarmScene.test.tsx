import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LazyFarmScene } from './LazyFarmScene'

// Stands in for the real chunk: jsdom has no WebGL context, and what matters
// here is the order — status first, world second.
vi.mock('./FarmScene', () => ({ FarmScene: () => <div data-testid="scene" /> }))

describe('LazyFarmScene', () => {
  it('says the farm is being built until the world chunk arrives, then shows it', async () => {
    render(<LazyFarmScene />)

    expect(screen.getByTestId('scene-loading')).toBeInTheDocument()
    expect(screen.queryByTestId('scene')).not.toBeInTheDocument()

    expect(await screen.findByTestId('scene')).toBeInTheDocument()
    expect(screen.queryByTestId('scene-loading')).not.toBeInTheDocument()
  })
})
