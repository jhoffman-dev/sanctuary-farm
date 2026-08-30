import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { App } from './App'

beforeEach(() => {
  try {
    localStorage.clear()
  } catch {
    /* memory fallback */
  }
})
afterEach(() => {
  try {
    localStorage.clear()
  } catch {
    /* noop */
  }
})

const settle = () => new Promise((r) => setTimeout(r, 150))

describe('App', () => {
  it('boots to the farmyard with the day-one hunger hint and currency readout', () => {
    render(<App />)
    // farmyard is the opening screen
    expect(screen.getByText(/walk to the barn/i)).toBeInTheDocument()
    // coins start at zero and are visible in the HUD
    expect(screen.getByText(/🪙 0/)).toBeInTheDocument()
    // the farmhouse long-press target for the parent dashboard
    expect(screen.getByRole('button', { name: /farmhouse sign/i })).toBeInTheDocument()
  })

  it('stays on the farmyard after the world loop starts (does not auto-jump to the summary)', async () => {
    render(<App />)
    await settle()
    expect(screen.getByText(/walk to the barn/i)).toBeInTheDocument()
    expect(screen.queryByText(/back to the farm/i)).not.toBeInTheDocument()
  })
})
