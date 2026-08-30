// Quiz loop contract. Implementation owned by Track B (src/quiz/*).
// Phase 0 ships STUBs for QuizPanel, NumberPad, FeedbackOverlay.

import type { ReactNode } from 'react'
import type { Outcome } from './facts'
import type { Scheduler, GradeResult } from './scheduler'
import type { CreatureMood } from './creature'

export type SessionEntry = {
  factId: string
  given: number
  correct: boolean
  latencyMs: number
  outcome: Outcome
  askedAt: number // globalCounter value when asked
}

export type SessionContext = 'stall' | 'paddock' | 'free' | 'egg'

export type SessionLog = {
  startedAt: number // epoch ms
  endedAt: number // epoch ms
  context: SessionContext
  /** The stall's creature family, when context === 'stall'. Informational only —
   *  the scheduler is NOT filtered by it (design decision, held). */
  familyContext: number | null
  entries: SessionEntry[]
}

export type QuizMode =
  | { kind: 'count'; questions: number }
  | { kind: 'timed'; durationMs: number }

export type QuizPanelProps = {
  scheduler: Scheduler
  mode: QuizMode
  context: SessionContext
  familyContext?: number | null
  /** When set, questions are drawn from this family only (scheduler.nextInFamily),
   *  for "tap an egg to practise these" in the nest hollow. */
  practiceFamily?: number | null
  /** Slot for the creature art (a <CreatureSVG>). The panel positions it. */
  creatureSlot?: ReactNode
  /** The panel calls this to drive the creature's reaction. */
  onMood?: (mood: CreatureMood) => void
  /** Fires once per graded answer, after the scheduler has been updated. */
  onQuestionGraded?: (result: GradeResult) => void
  /** Fires once when the run finishes (count reached or timer elapsed). */
  onComplete: (log: SessionLog) => void
}

export type NumberPadProps = {
  value: string
  onChange: (next: string) => void
  onConfirm: () => void
  disabled?: boolean
  /** Max digits accepted (answers are at most 3 digits: 12×12 = 144). */
  maxLength?: number
}
