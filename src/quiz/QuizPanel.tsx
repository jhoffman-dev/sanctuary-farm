// Track B — the self-contained quiz loop.
//
// Takes a Scheduler + a QuizMode, runs the questions, and calls
// onComplete(SessionLog). It knows nothing about the world or the barn; the
// stall screen and the paddock both embed it.
//
// Latency (resolved decision D7):
//   - the timer STARTS on the question entrance animation's onAnimationComplete
//     (not on mount). A setTimeout of the same duration backstops environments
//     where the animation lifecycle never fires (jsdom); whichever lands first
//     wins, guarded so it only begins once per question.
//   - it STOPS on the first digit when the correct answer is a single digit
//     (answer <= 9), and on confirm when the correct answer has >= 2 digits.
//   - grading always happens on confirm. There is no auto-submit.
import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import type { AudioBus, Fact, GradeResult, QuizPanelProps, SessionEntry, SessionLog } from '@/contracts'
import { createAudioBus } from '@/audio/sounds'
import { NumberPad } from './NumberPad'
import { FeedbackOverlay } from './FeedbackOverlay'

/** Entrance-animation duration, ms. Presentational — not a shared tuning number. */
export const ENTRANCE_MS = 260
/** How long the creature chews a correct answer before the next question, ms. */
export const CHEW_MS = 900

type Phase = 'entering' | 'answering' | 'chewing' | 'reteach'

const MAX_ANSWER_DIGITS = 3 // 12 x 12 = 144

export function QuizPanel({
  scheduler,
  mode,
  context,
  familyContext = null,
  practiceFamily = null,
  creatureSlot,
  onMood,
  onQuestionGraded,
  onComplete,
}: QuizPanelProps) {
  const [audio] = useState<AudioBus>(() => createAudioBus())
  const [sessionStartedAt] = useState(() => Date.now())
  const doneRef = useRef(false)

  const pickFact = useCallback(
    () => (practiceFamily != null ? scheduler.nextInFamily(practiceFamily) : scheduler.next()),
    [scheduler, practiceFamily],
  )

  const [qIndex, setQIndex] = useState(0)
  const [fact, setFact] = useState<Fact>(pickFact)
  const [value, setValue] = useState('')
  const [phase, setPhase] = useState<Phase>('entering')
  const [entries, setEntries] = useState<SessionEntry[]>([])
  const [lastResult, setLastResult] = useState<GradeResult | null>(null)

  // Per-question latency bookkeeping.
  const timerStartedForRef = useRef(-1)
  const startPerfRef = useRef<number | null>(null)
  const latencyRef = useRef<number | null>(null)
  const askedAtRef = useRef(0)

  const finish = useCallback(
    (finalEntries: SessionEntry[]) => {
      if (doneRef.current) return
      doneRef.current = true
      onMood?.('idle')
      const log: SessionLog = {
        startedAt: sessionStartedAt,
        endedAt: Date.now(),
        context,
        familyContext,
        entries: finalEntries,
      }
      onComplete(log)
    },
    [context, familyContext, onComplete, onMood, sessionStartedAt],
  )

  const advance = useCallback(
    (currentEntries: SessionEntry[]) => {
      if (doneRef.current) return
      const overCount = mode.kind === 'count' && currentEntries.length >= mode.questions
      const overTime =
        mode.kind === 'timed' && Date.now() - sessionStartedAt >= mode.durationMs
      if (overCount || overTime) {
        finish(currentEntries)
        return
      }
      setLastResult(null)
      setValue('')
      setPhase('entering')
      setFact(pickFact())
      setQIndex((i) => i + 1)
    },
    [finish, mode, pickFact, sessionStartedAt],
  )

  const beginTimer = useCallback(() => {
    if (timerStartedForRef.current === qIndex) return
    timerStartedForRef.current = qIndex
    startPerfRef.current = performance.now()
    latencyRef.current = null
    askedAtRef.current = scheduler.snapshot().globalCounter
    onMood?.('idle')
    setPhase((p) => (p === 'entering' ? 'answering' : p))
  }, [qIndex, scheduler, onMood])

  // Backstop for the entrance animation's onAnimationComplete (see file header).
  useEffect(() => {
    if (phase !== 'entering') return
    const t = window.setTimeout(beginTimer, ENTRANCE_MS + 16)
    return () => window.clearTimeout(t)
  }, [phase, beginTimer])

  const stopTimer = useCallback(() => {
    if (latencyRef.current !== null) return
    const start = startPerfRef.current ?? performance.now()
    latencyRef.current = Math.max(0, Math.round(performance.now() - start))
  }, [])

  // Chew a correct answer for one beat, then move on.
  useEffect(() => {
    if (phase !== 'chewing') return
    const t = window.setTimeout(() => {
      onMood?.('idle')
      advance(entries)
    }, CHEW_MS)
    return () => window.clearTimeout(t)
  }, [phase, advance, entries, onMood])

  const handleChange = useCallback(
    (next: string) => {
      if (phase !== 'answering') return
      audio.play('tap')
      const wasEmpty = value.length === 0
      setValue(next)
      // D7: single-digit correct answer — stop the timer on the first digit.
      if (wasEmpty && next.length > 0 && String(fact.answer).length === 1) {
        stopTimer()
      }
    },
    [phase, value, fact, audio, stopTimer],
  )

  const handleConfirm = useCallback(() => {
    if (phase !== 'answering') return
    if (value === '') return // confirm on an empty field does nothing
    audio.play('tap')
    stopTimer() // multi-digit path; no-op if already stopped
    const given = Number(value)
    const latencyMs = latencyRef.current ?? 0
    const result = scheduler.grade(fact.id, given, latencyMs)
    const entry: SessionEntry = {
      factId: fact.id,
      given,
      correct: result.correct,
      latencyMs,
      outcome: result.outcome,
      askedAt: askedAtRef.current,
    }
    const nextEntries = [...entries, entry]
    setEntries(nextEntries)
    onQuestionGraded?.(result)

    if (result.correct) {
      audio.play(result.outcome === 'FLUENT' ? 'fluent' : 'correct')
      audio.play('chew')
      onMood?.(result.outcome === 'FLUENT' ? 'happy' : 'eating')
      setPhase('chewing')
    } else {
      audio.play('wrong')
      onMood?.('puzzled')
      setLastResult(result)
      setValue('')
      setPhase('reteach')
    }
  }, [phase, value, fact, entries, scheduler, audio, stopTimer, onQuestionGraded, onMood])

  const resolveReteach = useCallback(() => {
    onMood?.('idle')
    advance(entries)
  }, [advance, entries, onMood])

  const target = mode.kind === 'count' ? mode.questions : null

  return (
    <div className="mx-auto max-w-sm space-y-5 p-4 text-center">
      <div className="min-h-24">{creatureSlot}</div>

      {phase === 'reteach' && lastResult ? (
        <FeedbackOverlay result={lastResult} onDismiss={resolveReteach} />
      ) : (
        <>
          <motion.p
            key={qIndex}
            data-testid="prompt"
            data-fact={fact.id}
            className="text-5xl font-bold text-stone-800"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: ENTRANCE_MS / 1000 }}
            onAnimationComplete={beginTimer}
          >
            {fact.a} × {fact.b}
          </motion.p>

          <p
            className="min-h-11 text-4xl font-bold tracking-widest text-stone-800"
            aria-live="polite"
            data-testid="entry"
          >
            {value || ' '}
          </p>

          <NumberPad
            value={value}
            onChange={handleChange}
            onConfirm={handleConfirm}
            disabled={phase !== 'answering'}
            maxLength={MAX_ANSWER_DIGITS}
          />
        </>
      )}

      <p className="text-xs text-stone-400" data-testid="progress">
        {entries.length}
        {target === null ? '' : `/${target}`}
      </p>
    </div>
  )
}
