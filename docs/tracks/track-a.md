# Track A — Learning engine

**Branch:** `track/a-engine`
**Owns:** `src/engine/scheduler.ts`, `src/engine/scheduler.test.ts`, `src/engine/facts.test.ts`,
`src/dev/routes/scheduler.route.tsx`. May refine `src/engine/facts.ts` (keep `buildFacts` /
`ALL_FACTS` stable).
**Never touch:** `src/contracts/**`, any other `src/` directory, other `*.route.tsx` files.
**Depends on:** Phase 0 only. **Zero React imports in the engine** (the dev route may use React).

This is the only part of the project that actually teaches her anything. If evenings get
eaten, this is the one that must not be compromised.

## What to build

Replace the STUB in `src/engine/scheduler.ts`. Keep the exported signatures:
`initialSchedulerState(maxTable?)`, `createScheduler(state, { rng? })`, and the `Scheduler`
interface from `@/contracts`.

### Leitner, counted in questions asked

`dueAt` is a value of the monotonic `globalCounter`. On a graded answer, set
`dueAt = globalCounter + LEITNER_INTERVALS[newBox]` (SLOW re-queues sooner — use the
*previous* box's interval, or `box 1`'s interval, whichever is smaller). `grade()` advances
`globalCounter` by exactly 1.

### Grading (latency is primary)

| Outcome | Condition | Box effect |
| --- | --- | --- |
| `FLUENT` | correct, `< FLUENT_MAX_MS` | promote one (cap 5) |
| `SLOW` | correct, `FLUENT_MAX_MS`–`LABORED_MIN_MS` | unchanged, re-queue sooner |
| `LABORED` | correct, `> LABORED_MIN_MS` | demote one (floor 1) |
| `WRONG` | incorrect | reset to box 1 |

Update `recentLatencies` (max `MAX_RECENT_LATENCIES`), `lastLatencyMs`, `correctStreak`,
`totalAttempts`, `totalCorrect`.

### Commutativity

Correct answer on `a×b` promotes `b×a` (via `commuteId`) by `COMMUTATIVE_PROMOTION` (half a
box). Track fractional progress internally (e.g. a `halfBox` accumulator or a `box + 0.5`
intermediate that rounds down for scheduling). Never demote the twin. Squares (`a===b`) have
no distinct twin — skip.

### Mastery

- **Fact:** `box === MASTERY_BOX` and the last `MASTERY_RECENT_FLUENT_COUNT` latencies all
  `< FLUENT_MAX_MS`.
- **Family:** every in-range fact in the family is mastered → `isMastered(family)` true.
- `familyProgress(family)`: fraction of the family's facts at `box >= 3`, `Math.min(x, 0.98)`
  until mastered, then exactly `1.0`.

### Introduction tiers

Six tiers (`tierOf` in `constants.ts`). Track `unlockedTiers` in state (always contains 1).
Unlock tier N+1 when `>= TIER_UNLOCK_BOX3_SHARE` of tier N's in-range facts are at
`box >= 3`. When introducing a new fact, pick the lowest-`id` un-introduced fact in the
lowest unlocked tier that still has un-introduced facts (deterministic). The 9s tier: no
special behaviour in the engine — the digit-sum hint is Track B/D presentation.

### Selection — each `next()` call

1. `due = introduced facts where dueAt <= globalCounter`.
2. If `due.length > DUE_WEIGHTING_THRESHOLD`: weight each by
   `overdueAmount * WEIGHT_OVERDUE_MULTIPLIER + (hardCore ? WEIGHT_HARD_CORE_BONUS : 0) +
   (box <= WEIGHT_LOW_BOX_MAX ? WEIGHT_LOW_BOX_BONUS : 0)`, then `weightedPick`.
   Otherwise pick the most overdue.
3. Interleave filter: exclude any fact whose family equals the family of the last
   `INTERLEAVE_MAX_CONSECUTIVE` served (from `recentFamilies`) when that would be a 3rd in a
   row. If the filter eliminates every candidate, relax it (serve anyway).
4. If `due.length < MIN_DUE_BEFORE_INTRODUCE` and a tier has un-introduced facts, introduce
   one instead (mark `introduced`, `box = 1`, `dueAt = globalCounter`).
5. If nothing is due and nothing to introduce, serve the introduced fact with the worst
   rolling-mean latency.

Push the served fact's family onto `recentFamilies` (keep last 4). Use the injected `rng`
for every random choice.

## Acceptance tests (`src/engine/scheduler.test.ts`) — all must pass

- A correct-but-slow answer (5000 ms) does not advance a fact to box 5.
- A `LABORED` answer demotes; a fact at box 1 stays at box 1.
- A `WRONG` answer resets to box 1 regardless of prior box.
- Across 200 generated `next()`/`grade()` cycles (seeded rng), no family appears 3× consecutively.
- Answering `7×8` correctly raises `8×7`'s effective progress and never lowers it.
- Tier 3 does not unlock while tier 2 is below 80% at box 3+.
- `familyProgress` returns exactly `1.0` only when every fact in the family is mastered
  (and `< 1.0`, capped at 0.98, otherwise).
- A seeded run is reproducible: same seed → identical `next()` sequence.

## Dev route

`#/dev/scheduler`: form for target accuracy (%) and a latency distribution (e.g. mean/stddev
or fast/slow split); button runs 500 synthetic answers through a fresh scheduler; render the
resulting box histogram (0–5) and each family's `familyProgress`. No styling budget — a
table is fine.

## DoD

`npm run typecheck && npm run lint && npm test && npm run build` all green; dev route works;
only Track A files touched; `// STUB` header gone from `scheduler.ts`.
