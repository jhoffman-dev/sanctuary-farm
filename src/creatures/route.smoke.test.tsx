import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import route from '@/dev/routes/creatures.route'

describe('creatures dev route', () => {
  it('renders the grid and the barn view without console errors', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    const Component = route.Component
    render(<Component />)

    // grid view: all 12 families labelled
    for (let f = 1; f <= 12; f++) {
      expect(screen.getAllByText(`family ${f}`).length).toBeGreaterThan(0)
    }

    await userEvent.click(screen.getByRole('button', { name: 'Barn + stall' }))
    expect(screen.getByText('The Barn')).toBeInTheDocument()

    // open the gift creature's stall
    const stall = screen.getAllByTestId('stall').find((s) => s.dataset.stall === '0')!
    await userEvent.click(stall)
    expect(screen.getByRole('button', { name: 'Feed' })).toBeInTheDocument()

    expect(err).not.toHaveBeenCalled()
    err.mockRestore()
  })
})
