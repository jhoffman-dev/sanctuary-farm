import { describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { Farmyard } from './Farmyard'
import { createTilemap } from './tilemap'

const flushFrames = () => new Promise((r) => setTimeout(r, 120))

describe('Farmyard — spawn does not trigger a hotspot', () => {
  it('the player start tile IS a hotspot (regression guard for the setup)', () => {
    const map = createTilemap()
    const here = map.hotspots.find(
      (h) => h.tile.x === map.playerStart.x && h.tile.y === map.playerStart.y,
    )
    expect(here?.id).toBe('farmhouse')
  })

  it('does not fire onHotspot for the tile the player spawns on', async () => {
    const onHotspot = vi.fn()
    render(<Farmyard map={createTilemap()} onHotspot={onHotspot} />)
    await flushFrames()
    // Standing on the farmhouse door at spawn must NOT count as walking onto it —
    // otherwise the game bounces straight to the day-summary screen on load.
    expect(onHotspot).not.toHaveBeenCalled()
  })
})
