import type { RoundPlan } from './read-models'

/** How long a paddock round is, is a game rule — the shell imports it rather than choosing its own. */
export const PADDOCK_ROUND: RoundPlan = { context: 'paddock', questions: 5 }
