# Contracts appendix

The authoritative source is `src/contracts/*.ts` (frozen). This is the readable tour.
Import everything from `@/contracts`.

## `constants.ts` — all tuning numbers + shared predicates

Latency: `FLUENT_MAX_MS = 3000`, `LABORED_MIN_MS = 8000`.
Leitner (`LEITNER_INTERVALS`, in questions asked): 1→3, 2→8, 3→20, 4→60, 5→150.
Mastery: box 5 with the last `MASTERY_RECENT_FLUENT_COUNT` (3) latencies < `FLUENT_MAX_MS`.
`COMMUTATIVE_PROMOTION = 0.5`. `MAX_RECENT_LATENCIES = 5`. `INTERLEAVE_MAX_CONSECUTIVE = 2`.
Selection weights: `WEIGHT_OVERDUE_MULTIPLIER = 2`, `WEIGHT_HARD_CORE_BONUS = 3`,
`WEIGHT_LOW_BOX_BONUS = 2` (for box ≤ 2), applied only when `> DUE_WEIGHTING_THRESHOLD` (6)
are due. Introduce a new fact when `< MIN_DUE_BEFORE_INTRODUCE` (2) are due.
Tier unlock at `TIER_UNLOCK_BOX3_SHARE` (0.8).
Helpers: `factId(a,b)`, `familyOf(a,b)`, `commuteId(id)`, `tierOf(a,b)`, `isHardCore(id)`,
`TIER_NAMES`, `ALL_FAMILIES`.
World: `GRID_W=25`, `GRID_H=18`, `TILE_PX=48`, `MAP_PX_W/H`, `WALK_SPEED_TPS=4`, `CAMERA_DEADZONE=1/3`.
Sessions: `CHORE_QUESTIONS_PER_STALL=5`, `FREE_SESSION_QUESTIONS=5`, `PADDOCK_DURATION_MS=60000`.
Persistence: `SAVE_KEY`, `SCHEMA_VERSION=1`.
Cold start: `COLD_START_FAMILIES=[1,2,10]`, `COLD_START_CREATURE_FAMILY=10`.
Eggs: `EGG_GLOW_AT=0.34`, `EGG_CRACK_AT=0.67`, `EGG_HATCH_AT=1.0`.
`DEFAULT_CREATURE_NAMES` — family → name.

## `rng.ts` — determinism for tests

`createRng(seed): Rng` (mulberry32), `systemRng`, `weightedPick(items, weights, rng)`,
`shuffle(arr, rng)`. Track A injects a seeded `Rng` in tests.

## `facts.ts`

`Fact { id, a, b, answer, family, tier, hardCore }`. `Box = 0..5` (0 = not introduced).
`FactState { id, box, dueAt, lastLatencyMs, recentLatencies[≤5], correctStreak,
totalAttempts, totalCorrect, introduced }`. `Outcome = 'FLUENT'|'SLOW'|'LABORED'|'WRONG'`.

## `scheduler.ts` — Track A implements `src/engine/scheduler.ts`

```ts
initialSchedulerState(maxTable = 12): SchedulerState   // fresh: Anchors tier introduced
createScheduler(state, { rng? }): Scheduler

interface Scheduler {
  next(): Fact
  grade(factId, given, latencyMs): GradeResult   // advances globalCounter by 1
  familyProgress(family): number                  // 0..1, exactly 1 only when isMastered
  isMastered(family): boolean
  snapshot(): SchedulerState                       // deep copy, safe to persist
}

SchedulerState { facts, globalCounter, unlockedTiers, recentFamilies, maxTable }
GradeResult { outcome, correct, fact, correctAnswer, previousBox, newBox,
              factMastered, familyJustMastered }
```

Grading table: FLUENT (correct <3s) → +1 box; SLOW (correct 3–8s) → same box, requeue sooner;
LABORED (correct >8s) → −1 box (floor 1); WRONG → box 1. Commutative twin: correct answer
promotes the twin by half a box, never demotes. See `docs/tracks/track-a.md` for the full
`next()` algorithm and interleaving.

## `creature.ts` — Track D implements `src/creatures/*`, `src/barn/*`

`CreatureParams { bodyShape, palette:[3], earType, eyeStyle, pattern, tail }`.
`CreatureMood = 'idle'|'happy'|'eating'|'puzzled'|'sleeping'`.
`HatchedCreature { family, name, params, hatchedAt, stallIndex }`.
`CreatureSVGProps { params, mood, size, className?, title? }`.
`defaultCreatureParams(family): CreatureParams` — deterministic per family.

## `world.ts` — Track C implements `src/world/*`

`TileType = 'grass'|'path'|'fence'|'water'|'building'`. `Vec2`.
`HotspotId = 'barn'|'paddock'|'nest'|'feedshed'|'farmhouse'`.
`Tilemap { width, height, tiles[], hotspots[], playerStart, at(x,y), isWalkable(x,y) }`.
`findPath(map, from, to): Vec2[] | null` — A*, diagonals only when both orthogonals walkable.
`FarmyardProps { map?, onHotspot(id), badges? }`.

## `quiz.ts` — Track B implements `src/quiz/*`

```ts
QuizPanelProps {
  scheduler, mode, context, familyContext?, creatureSlot?,
  onMood?(mood), onQuestionGraded?(GradeResult), onComplete(SessionLog)
}
QuizMode = { kind:'count'; questions } | { kind:'timed'; durationMs }
SessionLog { startedAt, endedAt, context:'stall'|'paddock'|'free', familyContext, entries[] }
SessionEntry { factId, given, correct, latencyMs, outcome, askedAt }
NumberPadProps { value, onChange, onConfirm, disabled?, maxLength? }
```

## `save.ts` — Track E implements `src/save/store.ts`

`SaveData { schemaVersion:1, facts, scheduler, globalCounter, creatures[], currency,
sessions[], settings{muted,maxTable}, lastChoresDate }`.
`SaveStore { load, save, migrate, exportJSON, importJSON, reset }`. `emptySave()`.

## `audio.ts` — Track E implements `src/audio/sounds.ts`

`SoundName = 'correct'|'fluent'|'wrong'|'hatch'|'tap'|'footstep'|'doorOpen'|'chew'`.
`AudioBus { play(name), setMuted(m), isMuted() }`. `createAudioBus({ muted? })` — lazy
AudioContext on first play.

## `navigation.ts` — Phase 2 wires

`Screen`, `ScreenParams`, `Navigation { current, go(screen, params?), back() }`,
`HotspotHandler`. Tracks never navigate.
