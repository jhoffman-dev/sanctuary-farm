// Animal-care model. Each hatched animal has four daily needs; tending one is a
// short question round. Feeding also consumes feed (bought in the feed shed).
// Each animal also has a health bar that care raises and neglect slowly lowers.

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

// ─── Health ───
export const HEALTH_MAX = 100
export const HEALTH_START = 70
/** Health floor — a neglected animal gets glum but never starves or leaves. */
export const HEALTH_FLOOR = 15
/** Lost per day the animal wasn't tended at all (capped, see game state). */
export const HEALTH_DECAY_PER_DAY = 14
/** Gained by completing each care task. */
export const CARE_HEALTH_BONUS: Record<CareTask, number> = {
  feed: 16,
  water: 12,
  clean: 12,
  play: 12,
}
/** At or above → the animal rests with a smile; below HEALTH_SAD_AT → a sad face. */
export const HEALTH_HAPPY_AT = 66
export const HEALTH_SAD_AT = 34

/**
 * Per-animal daily care record, keyed by family. `done[task]` is the YYYY-MM-DD
 * that task was last completed (local date), or null. Chores for the day are
 * complete when every animal has every task done today.
 */
export type AnimalCare = {
  family: number
  done: Record<CareTask, string | null>
  health: number
}

export function emptyAnimalCare(family: number): AnimalCare {
  return {
    family,
    done: { feed: null, water: null, clean: null, play: null },
    health: HEALTH_START,
  }
}
