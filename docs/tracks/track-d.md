# Track D — Creatures, art, and the barn

**Branch:** `track/d-creatures`
**Owns:** `src/creatures/CreatureSVG.tsx`, `src/creatures/definitions.ts`,
`src/creatures/animations.ts`, `src/barn/BarnInterior.tsx`, `src/barn/StallPanel.tsx`,
`src/creatures/*.test.tsx`, `src/barn/*.test.tsx`, `src/dev/routes/creatures.route.tsx`.
**Never touch:** `src/contracts/**`, `src/engine/**`, `src/quiz/**` (embed `QuizPanel` by its
stub, don't modify it), other tracks' directories.
**Depends on:** Phase 0 contracts; embeds Track B's `QuizPanel` stub.

## Art direction

**Soft-vector storybook, not pixel art.** Rounded SVG shapes, flat fills, soft drop shadows,
a warm limited palette. **Spend the effort on motion, not detail** — a blob with big eyes
reads as cute the instant it squashes and bounces.

## Requirements

### `definitions.ts`

Keep `defaultCreatureParams(family)` (deterministic) and `ALL_CREATURE_PARAMS`. Hand-tune
so all 12 families feel distinct and none is ugly — vary `bodyShape`, `palette` (3 warm,
readable colours), `earType`, `eyeStyle`, `pattern`, `tail`. Family 10 is the cold-start
gift creature — make it especially appealing.

### `CreatureSVG.tsx`

`CreatureSVGProps { params, mood, size, className?, title? }`. Pure SVG, square viewBox,
scales to `size`. Renders body/ears/eyes/pattern/tail from `params`. Must look right at
**200 px and at 64 px** with no clipping or overlap.

### `animations.ts` + motion

Five moods, each visually distinct: `idle` (slow breathe), `happy` (hop), `eating` (chew
bob), `puzzled` (head tilt — *not* sad), `sleeping` (slow rise/fall, maybe a "z"). Use
`motion` variants. Keep transitions ≤ ~600 ms except idle/sleeping loops.

### `BarnInterior.tsx`

Side-on view: stalls along both walls, one creature per hatched family, empty stalls visible
as future space. `badges[stallIndex]` → soft indicator above that stall. Tapping a stall
with a creature calls `onSelectStall(stallIndex)`. Empty barn (no creatures) renders
sensibly, not blank.

### `StallPanel.tsx`

The creature at rest, its name, a **rename control** (persisted via the `onRename` callback —
Phase 2 wires persistence; in the dev route just keep local state), and a **feed** button
that mounts `QuizPanel` with `mode={{ kind:'count', questions: CHORE_QUESTIONS_PER_STALL }}`,
`context="stall"`, `familyContext={creature.family}`, `creatureSlot={<CreatureSVG .../>}`,
and wires `onMood` to the creature. On `onComplete`, call `onFed(log)` and return to rest.

**Hold the line (D11):** the stall does **not** filter which facts are asked. No per-stall
fact filtering anywhere.

## Acceptance tests — all must pass

- All 12 creature parameter sets render without overlap/clipping at 200 px and at 64 px
  (assert the SVG bbox / no NaN coords; snapshot is acceptable).
- Every mood produces a distinct set of motion props / DOM state.
- `BarnInterior` with `creatures: []` renders without error and shows empty stalls.
- Rename control updates the displayed name and calls `onRename`.
- `StallPanel` feed flow mounts `QuizPanel` and calls `onFed` with the session log on completion.

## Dev route

`#/dev/creatures`: all 12 creatures in a grid, buttons to trigger each mood (already
stubbed — flesh out). Add a second view or toggle for `BarnInterior` + a `StallPanel` open
against a fake `HatchedCreature` and `createScheduler(initialSchedulerState())`.

## DoD

typecheck / lint / test / build green; dev route shows all creatures + moods + barn; only
Track D files touched; `// STUB` headers gone from all five files.
