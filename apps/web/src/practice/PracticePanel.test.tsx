import { PADDOCK_ROUND } from '@sf/application'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { createFakeFarmGame, type FakeFarmGameOptions } from '../test/fake-farm-game'
import { PracticePanel } from './PracticePanel'

const THREE_QUESTIONS: FakeFarmGameOptions = {
  questions: [
    [7, 8],
    [6, 4],
    [9, 3],
  ],
  answers: [
    { outcome: 'FLUENT', coinsEarned: 2 },
    { outcome: 'WRONG', coinsEarned: 0 },
    { outcome: 'SLOW', coinsEarned: 1 },
  ],
}

function renderPanel(options: FakeFarmGameOptions = THREE_QUESTIONS) {
  const game = createFakeFarmGame(options)
  const onFarmChanged = vi.fn()
  render(<PracticePanel game={game} onFarmChanged={onFarmChanged} />)
  return { game, onFarmChanged, user: userEvent.setup() }
}

async function answerWith(user: ReturnType<typeof userEvent.setup>, value: string) {
  await user.keyboard(value)
  await user.keyboard('{Enter}')
}

describe('PracticePanel', () => {
  it("starts the application's paddock round and shows the first question", async () => {
    const { game, user } = renderPanel()
    expect(screen.queryByTestId('question')).not.toBeInTheDocument()

    await user.click(screen.getByTestId('start-paddock'))

    expect(game.calls.startRound).toEqual([PADDOCK_ROUND])
    expect(screen.getByTestId('question')).toHaveTextContent('7 × 8 = ?')
    expect(screen.getByTestId('progress')).toHaveTextContent(`Question 1 of ${PADDOCK_ROUND.questions}`)
  })

  it('sends the typed answer to the game and shows fluent feedback with the next question', async () => {
    const { game, onFarmChanged, user } = renderPanel({ ...THREE_QUESTIONS })
    await user.click(screen.getByTestId('start-paddock'))
    await answerWith(user, '56')

    expect(game.calls.answer).toEqual([56])
    expect(await screen.findByTestId('feedback')).toHaveTextContent('Fluent')
    expect(screen.getByTestId('feedback')).toHaveAttribute('data-outcome', 'FLUENT')
    expect(screen.getByTestId('coins-earned')).toHaveTextContent('+2')
    expect(screen.getByTestId('question')).toHaveTextContent('6 × 4 = ?')
    expect(screen.getByTestId('progress')).toHaveTextContent('Question 2 of 5')
    expect(onFarmChanged).toHaveBeenCalled()
  })

  it('tells the player the right answer after a wrong one, in words not just colour', async () => {
    const { user } = renderPanel()
    await user.click(screen.getByTestId('start-paddock'))
    await answerWith(user, '56')
    await answerWith(user, '25')

    const feedback = await screen.findByTestId('feedback')
    expect(feedback).toHaveTextContent("Not quite — it's 24")
    expect(feedback).toHaveAttribute('data-outcome', 'WRONG')
    expect(screen.queryByTestId('coins-earned')).not.toBeInTheDocument()
  })

  it('ends the round when the game reports it complete and summarises the coins earned', async () => {
    const { game, user } = renderPanel({
      ...THREE_QUESTIONS,
      questions: [...THREE_QUESTIONS.questions, [5, 5], [2, 9]],
      answers: [...THREE_QUESTIONS.answers, { outcome: 'LABORED', coinsEarned: 1 }, { outcome: 'FLUENT', coinsEarned: 2 }],
    })
    await user.click(screen.getByTestId('start-paddock'))
    for (const value of ['56', '25', '27', '25', '18']) await answerWith(user, value)

    const summary = await screen.findByTestId('round-summary')
    expect(summary).toHaveTextContent('4 of 5 right')
    expect(summary).toHaveTextContent('6 coins')
    expect(game.calls.endRound).toBe(1)
    expect(screen.queryByTestId('question')).not.toBeInTheDocument()
  })

  it('ends the round when the game has no next question, and offers a new round from the summary', async () => {
    const { game, user } = renderPanel({
      questions: [[3, 3]],
      answers: [{ outcome: 'SLOW', coinsEarned: 1 }],
    })
    await user.click(screen.getByTestId('start-paddock'))
    await answerWith(user, '9')
    await screen.findByTestId('round-summary')

    await user.click(screen.getByTestId('start-paddock'))
    expect(game.calls.startRound).toHaveLength(2)
    expect(screen.getByTestId('question')).toHaveTextContent('3 × 3 = ?')
  })

  it('shows a round the game started elsewhere — the keeper reaching the paddock — exactly as the button would', async () => {
    const game = createFakeFarmGame(THREE_QUESTIONS)
    game.startRound(PADDOCK_ROUND)

    render(<PracticePanel game={game} onFarmChanged={vi.fn()} openOnRoundInFlight />)

    expect(screen.getByTestId('question')).toHaveTextContent('7 × 8 = ?')
    expect(screen.getByTestId('progress')).toHaveTextContent('Question 1 of 5')
    expect(game.calls.startRound).toHaveLength(1)
  })

  it('opens idle when asked to show the round in flight but the game has none', () => {
    const game = createFakeFarmGame(THREE_QUESTIONS)
    render(<PracticePanel game={game} onFarmChanged={vi.fn()} openOnRoundInFlight />)

    expect(screen.getByTestId('start-paddock')).toBeInTheDocument()
  })
})
