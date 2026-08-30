// Track A — the Leitner + latency-driven learning engine.
//
// Zero React. Every tuning number comes from '@/contracts'. Every random choice
// goes through the injected `rng`. State (SchedulerState) is fully serialisable
// and round-trips through SaveData; `snapshot()` returns a deep copy.

import {
  COLD_START_FAMILIES,
  COMMUTATIVE_PROMOTION,
  DUE_WEIGHTING_THRESHOLD,
  FLUENT_MAX_MS,
  LABORED_MIN_MS,
  LEITNER_INTERVALS,
  MASTERY_BOX,
  MASTERY_RECENT_FLUENT_COUNT,
  MAX_RECENT_LATENCIES,
  MAX_TABLE_DEFAULT,
  MIN_DUE_BEFORE_INTRODUCE,
  INTERLEAVE_MAX_CONSECUTIVE,
  TIER_UNLOCK_BOX3_SHARE,
  WEIGHT_HARD_CORE_BONUS,
  WEIGHT_LOW_BOX_BONUS,
  WEIGHT_LOW_BOX_MAX,
  WEIGHT_OVERDUE_MULTIPLIER,
  commuteId,
  weightedPick,
  systemRng,
} from '@/contracts'
import type {
  Box,
  Fact,
  FactState,
  GradeResult,
  Outcome,
  Scheduler,
  SchedulerDeps,
  SchedulerState,
} from '@/contracts'
import { ALL_FACTS, buildFacts, getFact } from './facts'

const RECENT_FAMILIES_KEEP = 4

type LeitnerBox = 1 | 2 | 3 | 4 | 5

function freshFactState(id: string, introduced: boolean): FactState {
  return {
    id,
    box: introduced ? 1 : 0,
    dueAt: 0,
    lastLatencyMs: null,
    recentLatencies: [],
    correctStreak: 0,
    totalAttempts: 0,
    totalCorrect: 0,
    introduced,
  }
}

/**
 * Fresh state: every in-range fact created, only the Anchors tier unlocked, and
 * the cold-start families (1, 2, 10) already introduced at box 1 and due now.
 */
export function initialSchedulerState(maxTable: number = MAX_TABLE_DEFAULT): SchedulerState {
  const facts: Record<string, FactState> = {}
  for (const f of buildFacts(maxTable)) {
    facts[f.id] = freshFactState(f.id, COLD_START_FAMILIES.includes(f.family))
  }
  return {
    facts,
    globalCounter: 0,
    unlockedTiers: [1],
    recentFamilies: [],
    maxTable,
  }
}

function intervalFor(box: LeitnerBox): number {
  return LEITNER_INTERVALS[box]
}

function classify(correct: boolean, latencyMs: number): Outcome {
  if (!correct) return 'WRONG'
  if (latencyMs < FLUENT_MAX_MS) return 'FLUENT'
  if (latencyMs <= LABORED_MIN_MS) return 'SLOW'
  return 'LABORED'
}

function rollingMean(latencies: number[]): number {
  if (latencies.length === 0) return Number.POSITIVE_INFINITY
  return latencies.reduce((a, b) => a + b, 0) / latencies.length
}

export function createScheduler(
  state: SchedulerState,
  deps?: Partial<SchedulerDeps>,
): Scheduler {
  const rng = deps?.rng ?? systemRng

  // Fractional (half-box) commutative credit for the twin fact. Kept in the
  // closure because FactState has no field for it; a full box is applied to the
  // twin's real `box` as soon as the credit reaches 1. Not persisted (see notes).
  const commuteCredit = new Map<string, number>()

  let lastServed: Fact = ALL_FACTS[0]

  const inRange = (f: Fact) => f.a <= state.maxTable && f.b <= state.maxTable
  const st = (id: string): FactState | undefined => state.facts[id]

  const inRangeFacts = (): Fact[] => ALL_FACTS.filter(inRange)
  const introducedFacts = (): Fact[] =>
    inRangeFacts().filter((f) => st(f.id)?.introduced)

  function tierBox3Share(tier: number): number {
    const facts = ALL_FACTS.filter((f) => f.tier === tier && inRange(f))
    if (facts.length === 0) return 0
    const atBox3 = facts.filter((f) => (st(f.id)?.box ?? 0) >= 3).length
    return atBox3 / facts.length
  }

  function refreshUnlockedTiers(): void {
    let changed = true
    while (changed) {
      changed = false
      const highest = Math.max(...state.unlockedTiers)
      if (highest < 6 && tierBox3Share(highest) >= TIER_UNLOCK_BOX3_SHARE) {
        state.unlockedTiers.push(highest + 1)
        changed = true
      }
    }
  }

  /** The family that would make a 3rd-in-a-row, or null if none is blocked. */
  function blockedFamily(): number | null {
    const rf = state.recentFamilies
    const k = INTERLEAVE_MAX_CONSECUTIVE
    if (rf.length < k) return null
    const lastK = rf.slice(-k)
    return lastK.every((fam) => fam === lastK[0]) ? lastK[0] : null
  }

  /** Drop candidates that would be a 3rd consecutive of the same family. If that
   *  eliminates everything, relax and return the input unchanged. */
  function interleaveFilter(cands: Fact[]): Fact[] {
    const blocked = blockedFamily()
    if (blocked == null) return cands
    const kept = cands.filter((f) => f.family !== blocked)
    return kept.length > 0 ? kept : cands
  }

  function lowestTierWithUnintroduced(): number | null {
    const tiers = [...state.unlockedTiers].sort((a, b) => a - b)
    for (const t of tiers) {
      if (ALL_FACTS.some((f) => f.tier === t && inRange(f) && !st(f.id)?.introduced)) {
        return t
      }
    }
    return null
  }

  /** Lowest un-introduced fact in the lowest unlocked tier that still has one,
   *  nudged by the interleave filter when the tier offers a choice. */
  function pickIntroduction(): Fact | null {
    const tier = lowestTierWithUnintroduced()
    if (tier == null) return null
    const cands = ALL_FACTS.filter(
      (f) => f.tier === tier && inRange(f) && !st(f.id)?.introduced,
    )
    const filtered = interleaveFilter(cands)
    return (filtered.length > 0 ? filtered : cands)[0]
  }

  function doIntroduce(fact: Fact): void {
    const fs = state.facts[fact.id]
    fs.introduced = true
    fs.box = 1
    fs.dueAt = state.globalCounter
  }

  function mostOverdue(cands: Fact[]): Fact {
    let best = cands[0]
    let bestGap = state.globalCounter - state.facts[best.id].dueAt
    for (let i = 1; i < cands.length; i++) {
      const gap = state.globalCounter - state.facts[cands[i].id].dueAt
      if (gap > bestGap) {
        best = cands[i]
        bestGap = gap
      }
    }
    return best
  }

  function weightOf(fact: Fact): number {
    const fs = state.facts[fact.id]
    const overdue = Math.max(0, state.globalCounter - fs.dueAt)
    return (
      overdue * WEIGHT_OVERDUE_MULTIPLIER +
      (fact.hardCore ? WEIGHT_HARD_CORE_BONUS : 0) +
      (fs.box <= WEIGHT_LOW_BOX_MAX ? WEIGHT_LOW_BOX_BONUS : 0)
    )
  }

  function serve(fact: Fact): Fact {
    state.recentFamilies = [...state.recentFamilies, fact.family].slice(
      -RECENT_FAMILIES_KEEP,
    )
    lastServed = fact
    return fact
  }

  function isFactMastered(fs: FactState | undefined): boolean {
    if (!fs || fs.box !== MASTERY_BOX) return false
    const recent = fs.recentLatencies.slice(-MASTERY_RECENT_FLUENT_COUNT)
    return (
      recent.length >= MASTERY_RECENT_FLUENT_COUNT &&
      recent.every((ms) => ms < FLUENT_MAX_MS)
    )
  }

  function familyInRangeFacts(family: number): Fact[] {
    return ALL_FACTS.filter((f) => f.family === family && inRange(f))
  }

  function isMastered(family: number): boolean {
    const facts = familyInRangeFacts(family)
    if (facts.length === 0) return false
    return facts.every((f) => isFactMastered(st(f.id)))
  }

  function familyProgress(family: number): number {
    const facts = familyInRangeFacts(family)
    if (facts.length === 0) return 0
    if (isMastered(family)) return 1
    const atBox3 = facts.filter((f) => (st(f.id)?.box ?? 0) >= 3).length
    return Math.min(atBox3 / facts.length, 0.98)
  }

  /** Apply half-a-box of commutative credit to `a×b`'s twin. Never demotes. */
  function creditTwin(fact: Fact): void {
    if (fact.a === fact.b) return
    const twinId = commuteId(fact.id)
    const twin = st(twinId)
    if (!twin || !twin.introduced) return
    if (twin.box >= MASTERY_BOX) return
    const credit = (commuteCredit.get(twinId) ?? 0) + COMMUTATIVE_PROMOTION
    if (credit >= 1) {
      twin.box = Math.min(MASTERY_BOX, twin.box + Math.floor(credit)) as Box
      twin.dueAt = state.globalCounter + intervalFor(twin.box as LeitnerBox)
      commuteCredit.set(twinId, credit - Math.floor(credit))
    } else {
      commuteCredit.set(twinId, credit)
    }
  }

  function grade(id: string, given: number, latencyMs: number): GradeResult {
    const fact = getFact(id) ?? lastServed
    const fs = state.facts[fact.id]
    const correct = given === fact.answer
    const outcome = classify(correct, latencyMs)

    const previousBox = fs.box
    let newBox: number = previousBox
    if (outcome === 'FLUENT') newBox = Math.min(MASTERY_BOX, previousBox + 1)
    else if (outcome === 'LABORED') newBox = Math.max(1, previousBox - 1)
    else if (outcome === 'WRONG') newBox = 1

    const wasFactMastered = isFactMastered(fs)
    const family = fact.family
    const wasFamilyMastered = isMastered(family)

    fs.box = newBox as Box
    fs.lastLatencyMs = latencyMs
    fs.recentLatencies = [...fs.recentLatencies, latencyMs].slice(-MAX_RECENT_LATENCIES)
    fs.correctStreak = correct ? fs.correctStreak + 1 : 0
    fs.totalAttempts += 1
    if (correct) fs.totalCorrect += 1

    state.globalCounter += 1

    // Leitner re-queue. SLOW keeps its box but comes back sooner: the smaller of
    // the previous box's interval and box 1's interval.
    let interval: number
    if (outcome === 'SLOW') {
      interval = Math.min(
        intervalFor(Math.max(1, previousBox) as LeitnerBox),
        intervalFor(1),
      )
    } else {
      interval = intervalFor(newBox as LeitnerBox)
    }
    fs.dueAt = state.globalCounter + interval

    if (correct) creditTwin(fact)

    refreshUnlockedTiers()

    const factMastered = !wasFactMastered && isFactMastered(fs)
    const familyJustMastered =
      !wasFamilyMastered && isMastered(family) ? family : null

    return {
      outcome,
      correct,
      fact,
      correctAnswer: fact.answer,
      previousBox,
      newBox,
      factMastered,
      familyJustMastered,
    }
  }

  function worstRollingMean(cands: Fact[]): Fact {
    let worst = cands[0]
    let worstMean = rollingMean(state.facts[worst.id]?.recentLatencies ?? [])
    for (const f of cands) {
      const mean = rollingMean(state.facts[f.id]?.recentLatencies ?? [])
      if (mean > worstMean) {
        worst = f
        worstMean = mean
      }
    }
    return worst
  }

  function next(): Fact {
    refreshUnlockedTiers()
    const gc = state.globalCounter
    const introduced = introducedFacts()
    const due = introduced.filter((f) => state.facts[f.id].dueAt <= gc)
    const blocked = blockedFamily()

    // Step 4: too few due and a tier still has un-introduced facts → introduce one.
    if (due.length < MIN_DUE_BEFORE_INTRODUCE) {
      const toIntroduce = pickIntroduction()
      if (toIntroduce) {
        doIntroduce(toIntroduce)
        return serve(toIntroduce)
      }
    }

    // Step 5: nothing due, nothing to introduce → the worst rolling-mean latency.
    if (due.length === 0) {
      const pool = introduced.length > 0 ? introduced : [ALL_FACTS[0]]
      const unblocked = pool.filter((f) => f.family !== blocked)
      return serve(worstRollingMean(unblocked.length > 0 ? unblocked : pool))
    }

    // Step 3: never a 3rd consecutive of the same family. Rather than "serve
    // anyway" (which would break the non-negotiable interleave rule), when every
    // due fact is the blocked family we introduce a fresh fact or pull the
    // soonest-due fact from another family forward. Only a single-family board
    // truly forces a repeat.
    let pool = blocked == null ? due : due.filter((f) => f.family !== blocked)
    if (pool.length === 0) {
      const toIntroduce = pickIntroduction()
      if (toIntroduce && toIntroduce.family !== blocked) {
        doIntroduce(toIntroduce)
        return serve(toIntroduce)
      }
      const elsewhere = introduced
        .filter((f) => f.family !== blocked)
        .sort((a, b) => state.facts[a.id].dueAt - state.facts[b.id].dueAt)
      if (elsewhere.length > 0) return serve(elsewhere[0])
      pool = due
    }

    // Step 2: weight only when comfortably many are due; otherwise most overdue.
    if (due.length > DUE_WEIGHTING_THRESHOLD) {
      return serve(weightedPick(pool, pool.map(weightOf), rng))
    }
    return serve(mostOverdue(pool))
  }

  function nextInFamily(family: number): Fact {
    const pool = ALL_FACTS.filter(
      (f) => f.family === family && inRange(f) && state.facts[f.id]?.introduced,
    )
    if (pool.length === 0) return next()
    const gc = state.globalCounter
    // lowest box first, then most overdue, then worst rolling latency
    const pick = [...pool].sort((a, b) => {
      const fa = state.facts[a.id]
      const fb = state.facts[b.id]
      if (fa.box !== fb.box) return fa.box - fb.box
      const da = gc - fa.dueAt
      const db = gc - fb.dueAt
      if (da !== db) return db - da
      return (
        rollingMean(fb.recentLatencies ?? []) - rollingMean(fa.recentLatencies ?? [])
      )
    })[0]
    return serve(pick)
  }

  return {
    next,
    nextInFamily,
    grade,
    familyProgress,
    isMastered,
    snapshot(): SchedulerState {
      return structuredClone(state)
    },
  }
}
