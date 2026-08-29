import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { HatchedCreature } from '@/contracts'
import { defaultCreatureParams } from '@/creatures/definitions'
import { BarnInterior } from './BarnInterior'

function creature(family: number, stallIndex: number, name = `c${family}`): HatchedCreature {
  return { family, name, params: defaultCreatureParams(family), hatchedAt: 0, stallIndex }
}

describe('BarnInterior', () => {
  it('renders every stall as visible future space when the barn is empty', () => {
    render(<BarnInterior creatures={[]} onSelectStall={() => {}} />)
    const stalls = screen.getAllByTestId('stall')
    expect(stalls).toHaveLength(12)
    expect(stalls.every((s) => s.getAttribute('data-occupied') === 'false')).toBe(true)
    expect(screen.getByText(/empty stalls/i)).toBeInTheDocument()
  })

  it('honours a custom stall count', () => {
    render(<BarnInterior creatures={[]} totalStalls={6} onSelectStall={() => {}} />)
    expect(screen.getAllByTestId('stall')).toHaveLength(6)
  })

  it('places one creature per hatched family and marks its stall occupied', () => {
    render(
      <BarnInterior
        creatures={[creature(10, 0, 'Tenner'), creature(3, 5)]}
        onSelectStall={() => {}}
      />,
    )
    expect(screen.getAllByText('Tenner').length).toBeGreaterThan(0)
    const occupied = screen
      .getAllByTestId('stall')
      .filter((s) => s.getAttribute('data-occupied') === 'true')
    expect(occupied).toHaveLength(2)
  })

  it('calls onSelectStall with the stall index when an occupied stall is tapped', async () => {
    const onSelectStall = vi.fn()
    render(
      <BarnInterior creatures={[creature(7, 4)]} onSelectStall={onSelectStall} />,
    )
    const stall = screen.getAllByTestId('stall').find((s) => s.dataset.stall === '4')!
    await userEvent.click(stall)
    expect(onSelectStall).toHaveBeenCalledWith(4)
  })

  it('shows a soft indicator above a badged stall', () => {
    render(
      <BarnInterior
        creatures={[creature(2, 1)]}
        badges={{ 1: true }}
        onSelectStall={() => {}}
      />,
    )
    expect(screen.getByLabelText('needs feeding')).toBeInTheDocument()
  })
})
