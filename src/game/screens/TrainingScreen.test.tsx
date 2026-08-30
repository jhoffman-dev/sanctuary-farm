import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GameProvider } from '../gameState'
import { TrainingScreen } from './TrainingScreen'

const renderIt = () =>
  render(
    <GameProvider>
      <TrainingScreen />
    </GameProvider>,
  )

describe('TrainingScreen', () => {
  it('shows a fact, its product, and a decomposition that adds up', () => {
    renderIt()
    expect(screen.getByText('7 × 8 = 56')).toBeInTheDocument()
    // the array-model strategy's steps
    expect(screen.getByText('7 × 5 = 35')).toBeInTheDocument()
    expect(screen.getByText('7 × 3 = 21')).toBeInTheDocument()
    expect(screen.getByText('35 + 21 = 56')).toBeInTheDocument()
  })

  it('cycles through more strategies and picks a different fact', async () => {
    renderIt()
    await userEvent.click(screen.getByRole('button', { name: /another way/i }))
    // the ×10 anchor for 7×8
    expect(screen.getByText('7 × 10 = 70')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '6 × 8' }))
    expect(screen.getByText('6 × 8 = 48')).toBeInTheDocument()
  })
})
