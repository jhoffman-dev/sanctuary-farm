# Resolved decisions

Ambiguities in the original spec (`docs/original-spec.md`), resolved so agents don't
each guess differently. If you disagree with one, raise it before building — don't
silently diverge.

## D1 — `grade()` returns a result object, not a bare `Outcome`

The original `Scheduler.grade(): Outcome` is too thin: Track B needs the correct answer
and correctness to render feedback, and Phase 2 needs to know when a family was just
completed. The contract is now:

```ts
grade(factId, given, latencyMs): GradeResult
// { outcome, correct, fact, correctAnswer, previousBox, newBox,
//   factMastered, familyJustMastered }
```

`grade()` also advances the global question counter by exactly 1.

## D2 — `familyProgress()` vs `isMastered()`

The spec says `familyProgress` is "share of family at box 3+" **and** "returns exactly 1.0
only when every fact is mastered" — contradictory. Resolution:

- `familyProgress(f)` = fraction of the family's facts at box ≥ 3, **clamped to a maximum
  of 0.98** until `isMastered(f)` is true.
- When `isMastered(f)` (every fact in the family mastered), `familyProgress(f)` returns
  exactly `1.0`.
- Egg visual thresholds (`constants.ts`): `< 0.34` dull, `< 0.67` glowing, `< 1.0`
  cracked, `=== 1.0` hatching.

## D3 — Fact families and counts

- `family = max(a, b)`. `id = "${a}x${b}"`. Both `7×8` and `8×7` exist (144 facts for a
  12×12 table).
- Family sizes are uneven: family 1 = `{1×1}` (1 fact), family 12 = 23 facts. That's fine.

## D4 — Tier membership is a total function with precedence

`tierOf(a, b)` in `constants.ts`. Rules evaluated 1→6, first match wins:

1. Anchors — has 1, 2, or 10
2. Easy patterns — has 5, OR a square (a === b), OR has 11 with the other operand ≤ 9
3. The 3s and 4s — has 3 or 4
4. The 9s — has 9
5. The 6s, 7s, 8s — has 6, 7, or 8
6. The 12s — everything else (has 12, or 11×{10..12})

Tier *unlock* (Track A) is separate: unlock tier N+1 when ≥ 80% of tier N's introduced-able
facts are at box ≥ 3.

## D5 — Hard-core set matches either operand order

Canonical list from the spec (`7×8, 6×8, 7×6, 8×9, 7×9, 6×7, 8×8, 7×7, 12×7, 12×8`).
`isHardCore(id)` returns true for both `"7x8"` and `"8x7"`.

## D6 — Cold start (Phase 2)

- On a fresh save, every fact in families **1, 2, 10** starts `introduced` (the Anchors
  tier is fully unlocked and introduced).
- The barn opens with **one** creature: **family 10** (`COLD_START_CREATURE_FAMILY`). It is
  a gift — placed at `stallIndex 0`, `hatchedAt` = now, no egg and no hatch ceremony.
- Families 1 and 2 get normal eggs in the nest hollow from the start.
- "The anchor family" in the original prose = shorthand for this trio.

## D7 — Latency measurement (Track B), exact rule

- **Start** the timer when the question's entrance animation `onAnimationComplete` fires
  (not on mount).
- **Stop** on the **first digit** entered when the answer is a single digit (answer ≤ 9),
  and on **confirm** when the answer has ≥ 2 digits.
- Track B decides single vs multi-digit from the *correct* answer's digit count.

## D8 — `SaveData` shape

Extended from the spec so the dashboard can read without constructing a Scheduler:

- `scheduler: SchedulerState` is authoritative.
- `facts: Record<string, FactState>` is a denormalised mirror; Phase 2 keeps it in sync on
  every graded answer.
- Added `settings.maxTable` (default 12), `SaveStore.importJSON`, `SaveStore.reset`.
- `SAVE_KEY = "sanctuary-farm/save"`, `schemaVersion: 1`.

## D9 — Dev-route registration

No shared registry file. Each track adds `src/dev/routes/<name>.route.tsx` with
`export default { path, label, order, Component } satisfies DevRoute`. A glob in
`_registry.ts` collects them. Track E owns two route files (`audio`, `dashboard`).

## D10 — Navigation

Tracks never navigate. Track C's `Farmyard` takes `onHotspot: (id) => void`. Phase 2 owns
`src/App.tsx`, the `Navigation` object, and the hotspot→screen mapping.

## D11 — Stall does not filter facts

Held from the spec: the scheduler serves whatever is due across all families; the creature
just presents it. Do not build per-stall fact filtering. `familyContext` on a session log
is informational only.

## D12 — Character position is not persisted

Reset to `tilemap.playerStart` (the farmhouse door) on every load.

## D13 — Numbers live in `constants.ts`

Leitner intervals, latency thresholds, weights, grid size, tile size, walk speed, durations,
default creature names, egg thresholds — all there. Do not hardcode them in track code.
