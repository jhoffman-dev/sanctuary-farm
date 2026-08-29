# Orchestration guide

## File ownership — the one table that prevents collisions

| Track | Owns (writes) | Dev route file | Depends on |
| --- | --- | --- | --- |
| **Phase 0** | `src/contracts/**`, scaffold config, `src/dev/DevRoutes.tsx`, `src/dev/routes/_registry.ts`, `_placeholder.tsx`, `CLAUDE.md`, `src/engine/facts.ts` (shared infra) | — | — |
| **A — Engine** | `src/engine/scheduler.ts`, `src/engine/*.test.ts`, may refine `src/engine/facts.ts` | `src/dev/routes/scheduler.route.tsx` | Phase 0 only |
| **B — Quiz** | `src/quiz/QuizPanel.tsx`, `src/quiz/NumberPad.tsx`, `src/quiz/FeedbackOverlay.tsx`, `src/quiz/*.test.tsx` | `src/dev/routes/quiz.route.tsx` | Phase 0 stubs of `Scheduler`, `CreatureSVG`, `AudioBus` |
| **C — World** | `src/world/Farmyard.tsx`, `src/world/tilemap.ts`, `src/world/pathfind.ts`, `src/world/Character.tsx`, `src/world/camera.ts`, `src/world/*.test.ts` | `src/dev/routes/farm.route.tsx` | Phase 0 only |
| **D — Creatures** | `src/creatures/CreatureSVG.tsx`, `src/creatures/definitions.ts`, `src/creatures/animations.ts`, `src/barn/BarnInterior.tsx`, `src/barn/StallPanel.tsx`, `src/creatures/*.test.tsx`, `src/barn/*.test.tsx` | `src/dev/routes/creatures.route.tsx` | Phase 0 contracts; embeds Track B's `QuizPanel` by its stub |
| **E — Infra** | `src/save/store.ts`, `src/audio/sounds.ts`, `src/parent/Dashboard.tsx`, matching `*.test.ts(x)` | `src/dev/routes/audio.route.tsx`, `src/dev/routes/dashboard.route.tsx` | Phase 0 only |
| **Phase 2** | `src/App.tsx`, `src/main.tsx`, new `src/game/**`, integration glue | — | A–E merged |

**Rule:** touch only your own files + your one/two dev-route files. Everything else is
read-only. `src/contracts/**` is frozen — flag problems, don't patch.

## Per-track workflow (git)

Each track runs on its own branch off `main` (the Phase 0 commit):

```
git switch -c track/a-engine
# ... build, commit as you go ...
npm run typecheck && npm run lint && npm test && npm run build   # all green
git switch main && git merge --no-ff track/a-engine
```

Because ownership is disjoint, the five branches merge into `main` with no conflicts
except each adding its own `*.route.tsx` file (no overlap) and Track A optionally editing
`facts.ts`. Merge order doesn't matter.

## Definition of done — every track

- [ ] All of the track's acceptance tests (in `docs/tracks/track-*.md`) pass as real Vitest tests.
- [ ] `npm run typecheck` clean.
- [ ] `npm run lint` clean.
- [ ] `npm run build` succeeds.
- [ ] The track's dev route renders and demonstrates the feature with no console errors.
- [ ] No files outside the ownership table were modified.
- [ ] Every stub the track owned now has its `// STUB` header removed and is a real impl.

## Definition of done — Phase 0 (met)

Every dev route loads and renders a placeholder without errors; `dev`, `test`,
`typecheck`, `lint`, `build` all work.

## Suggested order

Phase 0 → (A, B, C, D, E in parallel) → Phase 2 → Phase 3.

**Protect Track A.** The farm is the fun part and will eat every hour while the scheduler
sits half-tuned. The scheduler is the only component that teaches her anything. Do not let
Phase 2 start until Track A's tests are green.

## Spawning subagents (orchestrator notes)

Give each subagent: this file, `docs/SPEC.md`, `docs/CONTRACTS.md`, `docs/resolved-decisions.md`,
and its `docs/tracks/track-<x>.md`. Tell it its branch name and the DoD gate. It must not
touch `src/contracts/**` or another track's directory.
