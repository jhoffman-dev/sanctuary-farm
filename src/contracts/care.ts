// Animal-care model. Each hatched animal has four daily needs; tending one is a
// short question round. Feeding also consumes feed (bought in the feed shed).

export type CareTask = 'feed' | 'water' | 'clean' | 'play'

export const CARE_TASKS: readonly CareTask[] = ['feed', 'water', 'clean', 'play']

export const CARE_LABEL: Record<CareTask, string> = {
  feed: 'Feed',
  water: 'Water',
  clean: 'Clean',
  play: 'Play',
}

export const CARE_VERB: Record<CareTask, string> = {
  feed: 'fed',
  water: 'watered',
  clean: 'cleaned',
  play: 'played with',
}

export const CARE_EMOJI: Record<CareTask, string> = {
  feed: '🌾',
  water: '💧',
  clean: '🧹',
  play: '⭐',
}

/** How many questions one care round asks. */
export const CARE_QUESTIONS: Record<CareTask, number> = {
  feed: 5,
  water: 4,
  clean: 4,
  play: 3,
}

/**
 * Per-animal daily care record, keyed by family. `done[task]` is the YYYY-MM-DD
 * that task was last completed (local date), or null. Chores for the day are
 * complete when every animal has every task done today.
 */
export type AnimalCare = {
  family: number
  done: Record<CareTask, string | null>
}

export function emptyAnimalCare(family: number): AnimalCare {
  return { family, done: { feed: null, water: null, clean: null, play: null } }
}
