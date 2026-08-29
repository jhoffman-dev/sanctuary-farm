// TRACK A owns this file. Replace the body with the 500-answer simulation harness
// (configurable accuracy + latency profiles → box distribution + family progress).
import type { DevRoute } from './_registry'
import { DevPlaceholder } from './_placeholder'

function SchedulerDevRoute() {
  return (
    <DevPlaceholder
      track="Track A — Scheduler"
      note="Build the simulation harness here: 500 synthetic answers, configurable profiles, print box distribution + familyProgress."
    />
  )
}

export default {
  path: '#/dev/scheduler',
  label: 'Scheduler sim',
  order: 10,
  Component: SchedulerDevRoute,
} satisfies DevRoute
