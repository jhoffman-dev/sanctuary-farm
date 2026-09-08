import type { FarmSave, SchedulerState } from '@sf/domain'
import { ALL_FAMILIES, familyProgress, isFamilyMastered } from '@sf/domain'
import type { FamilySummary, FarmSummary } from './read-models'

function familySummaries(scheduler: SchedulerState): FamilySummary[] {
  return ALL_FAMILIES.filter((family) => family <= scheduler.maxTable).map((family) => ({
    family,
    progress: familyProgress(scheduler, family),
    mastered: isFamilyMastered(scheduler, family),
  }))
}

/** The farm as the UI renders it: plain numbers, no scheduler internals. */
export function summarizeFarm(farm: FarmSave): FarmSummary {
  return {
    coins: farm.coins,
    feed: farm.feed,
    muted: farm.settings.muted,
    families: familySummaries(farm.scheduler),
  }
}
