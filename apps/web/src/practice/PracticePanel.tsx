import { PADDOCK_ROUND, type AnswerFeedback, type FarmGame, type Question, type RoundProgress } from '@sf/application'
import { useCallback, useRef, useState } from 'react'
import { NumberPad } from './NumberPad'

type PracticePanelProps = {
  game: FarmGame
  /** Fired whenever the farm may have changed, so the owner can re-read `game.summary()`. */
  onFarmChanged: () => void
}

type RoundTally = { coinsEarned: number; correct: number; answered: number }

type Phase =
  | { kind: 'idle' }
  | { kind: 'playing'; question: Question; progress: RoundProgress; feedback: AnswerFeedback | null }
  | { kind: 'finished'; tally: RoundTally }

const EMPTY_TALLY: RoundTally = { coinsEarned: 0, correct: 0, answered: 0 }

function addToTally(tally: RoundTally, feedback: AnswerFeedback): RoundTally {
  return {
    coinsEarned: tally.coinsEarned + feedback.coinsEarned,
    correct: tally.correct + (feedback.correct ? 1 : 0),
    answered: tally.answered + 1,
  }
}

type Answered = { phase: Phase; tally: RoundTally }

/** Hands the answer to the game and reports what the panel should show next. */
async function gradeAndAdvance({
  game,
  given,
  tally,
}: {
  game: FarmGame
  given: number
  tally: RoundTally
}): Promise<Answered> {
  const feedback = await game.answer(given)
  const nextTally = addToTally(tally, feedback)
  const progress = game.roundProgress()
  if (progress.complete || feedback.next === null) {
    await game.endRound()
    return { phase: { kind: 'finished', tally: nextTally }, tally: nextTally }
  }
  return { phase: { kind: 'playing', question: feedback.next, progress, feedback }, tally: nextTally }
}

const panelClass = 'pointer-events-auto rounded-3xl bg-white/90 p-4 text-stone-800 shadow-lg backdrop-blur'
const primaryButton =
  'min-h-14 cursor-pointer rounded-2xl bg-amber-400 px-6 text-xl font-bold text-stone-900 shadow ' +
  'hover:bg-amber-300 focus-visible:outline-4 focus-visible:outline-amber-600'

/** Drives one practice round. Every rule (which fact, how many coins) comes from `game`. */
export function PracticePanel({ game, onFarmChanged }: PracticePanelProps) {
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const [busy, setBusy] = useState(false)
  // Guards re-entry in the gap between a submit and the re-render that
  // disables the pad; the ref is current synchronously, the state is not.
  const inFlight = useRef(false)
  const tally = useRef<RoundTally>(EMPTY_TALLY)

  const start = useCallback(() => {
    const question = game.startRound(PADDOCK_ROUND)
    tally.current = EMPTY_TALLY
    setPhase({ kind: 'playing', question, progress: game.roundProgress(), feedback: null })
  }, [game])

  const submit = useCallback(
    (given: number) => {
      if (inFlight.current) return
      inFlight.current = true
      setBusy(true)
      // No catch on purpose: with the re-entry guard above, `answer` rejects
      // only on a programming error (nothing in flight, or the question it was
      // given has already been graded), which should surface loudly.
      gradeAndAdvance({ game, given, tally: tally.current })
        .then((next) => {
          tally.current = next.tally
          setPhase(next.phase)
          onFarmChanged()
        })
        .finally(() => {
          inFlight.current = false
          setBusy(false)
        })
    },
    [game, onFarmChanged],
  )

  if (phase.kind === 'idle') {
    return (
      <section className={panelClass} aria-label="Practice">
        <button type="button" className={primaryButton} data-testid="start-paddock" onClick={start}>
          Practise in the paddock
        </button>
      </section>
    )
  }

  if (phase.kind === 'finished') {
    return (
      <section className={panelClass} aria-label="Round summary">
        <p data-testid="round-summary" className="text-xl font-bold">
          Round done! {phase.tally.correct} of {phase.tally.answered} right — you earned{' '}
          <span aria-hidden>🪙</span> {phase.tally.coinsEarned} coins.
        </p>
        <button type="button" className={`${primaryButton} mt-4`} data-testid="start-paddock" onClick={start}>
          Play again
        </button>
      </section>
    )
  }

  const { question, progress, feedback } = phase
  return (
    <section className={`${panelClass} flex flex-col items-center gap-3`} aria-label="Practice">
      <p className="text-sm font-semibold text-stone-600" data-testid="progress">
        Question {progress.asked} of {progress.total}
      </p>
      <p className="text-4xl font-bold" data-testid="question" aria-live="polite">
        {question.a} × {question.b} = ?
      </p>
      <Feedback feedback={feedback} />
      <NumberPad onSubmit={submit} disabled={busy} />
    </section>
  )
}

const feedbackClass: Record<AnswerFeedback['outcome'], string> = {
  FLUENT: 'bg-amber-200 text-amber-950 shadow-[0_0_24px_6px_rgba(251,191,36,0.6)]',
  SLOW: 'bg-emerald-100 text-emerald-950',
  LABORED: 'bg-emerald-100 text-emerald-950',
  WRONG: 'bg-stone-200 text-stone-900',
}

function feedbackText(feedback: AnswerFeedback): string {
  switch (feedback.outcome) {
    case 'FLUENT':
      return '⚡ Fluent!'
    case 'SLOW':
    case 'LABORED':
      return '✓ Correct'
    case 'WRONG':
      return `✗ Not quite — it's ${feedback.correctAnswer}`
  }
}

function Feedback({ feedback }: { feedback: AnswerFeedback | null }) {
  if (!feedback) return <p className="min-h-10" aria-hidden />
  return (
    <p
      data-testid="feedback"
      data-outcome={feedback.outcome}
      role="status"
      className={`min-h-10 rounded-xl px-4 py-2 text-lg font-bold ${feedbackClass[feedback.outcome]}`}
    >
      {feedbackText(feedback)}
      {feedback.coinsEarned > 0 && (
        <span className="ml-2 font-semibold" data-testid="coins-earned">
          +{feedback.coinsEarned} <span aria-hidden>🪙</span>
        </span>
      )}
    </p>
  )
}
