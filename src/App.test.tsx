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

describe('App', () => {
  it('boots to the farmyard with the day-one hunger hint and currency readout', () => {
    render(<App />)
    // farmyard is the opening screen
    expect(screen.getByText(/walk to the barn/i)).toBeInTheDocument()
    // currency starts at zero and is visible
    expect(screen.getByText(/🌾 0 · 🪙 0/)).toBeInTheDocument()
    // the farmhouse long-press target for the parent dashboard
    expect(screen.getByRole('button', { name: /farmhouse sign/i })).toBeInTheDocument()
  })
})
