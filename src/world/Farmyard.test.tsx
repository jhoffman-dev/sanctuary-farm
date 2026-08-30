import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MAP_PX_W } from '@/contracts'
import { Farmyard } from './Farmyard'
import { createTilemap, tilemap } from './tilemap'

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

  it('spawns at spawnAt when given, so returning from a screen keeps the keeper there', async () => {
    const onHotspot = vi.fn()
    const barn = tilemap.hotspots.find((h) => h.id === 'barn')!.tile
    render(<Farmyard onHotspot={onHotspot} spawnAt={barn} />)
    await flushFrames()
    // She's standing on the barn tile — treated as already occupied, no re-fire.
    expect(onHotspot).not.toHaveBeenCalled()
  })
})

describe('Farmyard — the whole farm is on screen', () => {
  it('renders every hotspot label so none can hide off the edge', () => {
    render(<Farmyard onHotspot={() => {}} />)
    for (const h of tilemap.hotspots) {
      expect(screen.getByText(h.label)).toBeInTheDocument()
    }
  })

  it('scales the world <svg> to fit its container (never wider than the viewport)', () => {
    const { container } = render(<Farmyard onHotspot={() => {}} />)
    const svg = container.querySelector('svg[aria-hidden="true"]') as SVGSVGElement
    // jsdom reports 0 layout, so fit falls back to natural size; the point is the
    // <svg> carries an explicit, scalable width driven by fit — not a fixed 1200.
    expect(svg.getAttribute('viewBox')).toBe(`0 0 ${MAP_PX_W} 864`)
    expect(svg).toHaveAttribute('width')
  })
})
