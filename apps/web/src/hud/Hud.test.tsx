import type { FarmSummary } from '@sf/application'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Hud } from './Hud'

function renderHud(summary: Partial<FarmSummary> = {}) {
  const onToggleMute = vi.fn()
  render(
    <Hud
      summary={{ coins: 0, feed: 3, muted: false, families: [], ...summary }}
      onToggleMute={onToggleMute}
    />,
  )
  return { onToggleMute, user: userEvent.setup() }
}

describe('Hud', () => {
  it('shows the coins and feed the summary reports', () => {
    renderHud({ coins: 14, feed: 6 })
    expect(screen.getByTestId('coins')).toHaveTextContent('14')
    expect(screen.getByTestId('feed')).toHaveTextContent('6')
  })

  it('labels the sound control by what pressing it will do', () => {
    renderHud({ muted: false })
    const mute = screen.getByTestId('mute')
    expect(mute).toHaveAccessibleName('Sound on. Turn sound off')
    expect(mute).toHaveAttribute('aria-pressed', 'false')
  })

  it('reads as pressed and offers to turn the sound back on when muted', () => {
    renderHud({ muted: true })
    const mute = screen.getByTestId('mute')
    expect(mute).toHaveAccessibleName('Sound off. Turn sound on')
    expect(mute).toHaveAttribute('aria-pressed', 'true')
  })

  it('asks its owner to toggle the sound, deciding nothing itself', async () => {
    const { onToggleMute, user } = renderHud({ muted: false })

    await user.click(screen.getByTestId('mute'))

    expect(onToggleMute).toHaveBeenCalledTimes(1)
    // Still showing "sound on": the HUD renders the summary it was given.
    expect(screen.getByTestId('mute')).toHaveAttribute('aria-pressed', 'false')
  })

  it('is reachable and operable from the keyboard alone', async () => {
    const { onToggleMute, user } = renderHud()

    await user.tab()
    expect(screen.getByTestId('mute')).toHaveFocus()
    await user.keyboard('{Enter}')

    expect(onToggleMute).toHaveBeenCalledTimes(1)
  })
})
