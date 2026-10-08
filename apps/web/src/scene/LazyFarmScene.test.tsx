import type { TileWorld } from '@sf/world'
import { act, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LazyFarmScene } from './LazyFarmScene'

// Stands in for the real chunk: jsdom has no WebGL context, and what matters
// here is the order — status first, world second — and which world arrives.
vi.mock('./FarmScene', () => ({
  FarmScene: ({ world }: { world: TileWorld }) => <div data-testid="scene" data-seed={world.seed} />,
}))

const FIXTURE_WORLD: TileWorld = { seed: 42, hotspots: [], chunks: [] }

describe('LazyFarmScene', () => {
  it('says the farm is being built until the world arrives, then draws the world it was given', async () => {
    let deliver: (world: TileWorld) => void = () => {}
    const loadWorld = vi.fn(() => new Promise<TileWorld>((resolve) => (deliver = resolve)))
    // `use` suspends inside act, so the render has to be awaited for React to wire up the retry.
    await act(async () => {
      render(<LazyFarmScene loadWorld={loadWorld} />)
    })

    expect(screen.getByTestId('scene-loading')).toBeInTheDocument()
    expect(screen.queryByTestId('scene')).not.toBeInTheDocument()

    await act(async () => deliver(FIXTURE_WORLD))

    expect(await screen.findByTestId('scene')).toHaveAttribute('data-seed', '42')
    expect(screen.queryByTestId('scene-loading')).not.toBeInTheDocument()
    expect(loadWorld).toHaveBeenCalledTimes(1)
  })
})
