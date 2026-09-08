import type { Fact } from '../facts/fact'
import { COMMUTATIVE_PROMOTION, MASTERY_BOX, commuteId } from '../facts/tuning'
import { withStatus } from './cards'
import { clampBox, intervalFor } from './leitner'
import type { SchedulerState } from './types'

/**
 * Bank half a box of credit for a×b's twin b×a; apply it as a real promotion
 * once a whole box is owed. Never demotes, never touches an un-introduced or
 * already-mastered twin. The fractional remainder persists in the state so a
 * reload cannot lose a half-earned promotion.
 */
export function creditTwin(state: SchedulerState, fact: Fact): SchedulerState {
  if (fact.a === fact.b) return state
  const twinId = commuteId(fact.id)
  const twin = state.facts[twinId]
  if (!twin || !twin.introduced || twin.box >= MASTERY_BOX) return state

  const credit = (state.commuteCredit[twinId] ?? 0) + COMMUTATIVE_PROMOTION
  const wholeBoxes = Math.floor(credit)
  const credited = { ...state, commuteCredit: { ...state.commuteCredit, [twinId]: credit - wholeBoxes } }
  if (wholeBoxes === 0) return credited

  const box = clampBox(twin.box + wholeBoxes)
  return withStatus(credited, { ...twin, box, dueAt: state.globalCounter + intervalFor(box) })
}
