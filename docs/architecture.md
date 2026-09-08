# Architecture

Clean Architecture, adapted to a small TS monorepo. The rule that matters:
**dependencies point inward.** Domain knows nothing about React, Three.js,
Firebase, or the DOM.

## Layers

```
┌─────────────────────────────────────────────────────────┐
│ presentation   apps/web  (React + react-three-fiber, UI) │  ← swap-able
│                apps/landing (static site)                │
├─────────────────────────────────────────────────────────┤
│ infrastructure packages/persistence, packages/audio, …   │  ← adapters
│                (Firestore, localStorage, Web Audio)      │
├─────────────────────────────────────────────────────────┤
│ application    packages/application                      │
│                use-cases + ports (interfaces)            │
├─────────────────────────────────────────────────────────┤
│ domain         packages/domain                           │  ← the core
│                curriculum, scheduling/mastery, rules     │     pure, tested
└─────────────────────────────────────────────────────────┘
```

- **domain** — entities and pure rules. The multiplication scheduler (Leitner +
  latency + interleave + tiers), the curriculum model, mastery/progress. No I/O,
  no framework, no `Date.now()` (inject a clock), no `Math.random()` (inject an
  RNG). ~90%+ line coverage, all fast unit tests.
- **application** — use-cases that orchestrate the domain: `StartCareRound`,
  `GradeAnswer`, `BuyFeed`, `HatchEgg`, `AdvanceDay`, `LoadSave`, `SyncSave`.
  Defines **ports**: `SaveStore`, `Clock`, `Rng`, `AudioBus`. (`IdProvider`
  arrives in Phase 4, with save codes — a port with no implementation and no
  consumer is not a port yet.)
  Returns plain data / events. Unit-tested against fake adapters.
- **infrastructure** — implementations of the ports: `LocalSaveStore`,
  `FirestoreSaveStore`, `WebAudioBus`, `SystemClock`. Thin. Integration-tested.
- **presentation** — React components, r3f scene, HUD, screens. Talks to
  `application` only, never to `infrastructure` or `domain` directly. Holds no
  game rules — if a component is deciding what fact comes next, it's wrong.

### The dependency rule, concretely

- `domain` imports: nothing but other `domain`.
- `application` imports: `domain`.
- `infrastructure` imports: `application` (for the port types), `domain`.
- `presentation` imports: `application`. May import `domain` **types** for
  read-models, never `domain` behaviour or `infrastructure`.
- Enforced by **dependency-cruiser** (`.dependency-cruiser.cjs`, run as
  `pnpm boundaries` in the gate and in CI) and by the monorepo package graph.
  The one sanctioned exception: `apps/web/src/composition/` — the composition
  root — may import adapters to wire them into the application.

## Monorepo layout

```
sanctuary-farm/
  packages/
    domain/            @sf/domain
    application/        @sf/application
    persistence/        @sf/persistence   (local now; firestore in Phase 4)
    audio/              @sf/audio
    config/             shared tsconfig presets
  apps/
    web/               the game (Vite + React + r3f)
    landing/           static marketing/status page
  functions/           Firebase Cloud Functions (Phase 4: custom auth, etc.)
  docs/
  .claude/             agents, skills, agent memory
```

Packages are consumed as TypeScript source (`main: ./src/index.ts`) — nothing is
built except `apps/web`. The gate is `pnpm gate` (typecheck · lint · boundaries
· tests with coverage · build) plus `pnpm e2e`.

Package manager: **pnpm** workspaces. Node pinned via `.nvmrc` + `engines`.

## Testing strategy

| Layer | Kind | Bar |
| --- | --- | --- |
| domain | unit, pure | ~90%+ lines; every rule has a test |
| application | unit, fake adapters | every use-case; happy + key edge paths |
| infrastructure | integration | round-trip each adapter; failure modes |
| presentation | component + a few e2e smokes | key flows render; the day-one loop works end-to-end in a headless browser |

- Determinism: domain/application tests inject a seeded RNG and a fixed clock.
- No snapshot tests as a substitute for behaviour tests.
- e2e (Playwright) covers: boot → care a task → goodnight; hatch an egg;
  paddock earns coins; training ring shows a decomposition that adds up.

## Clean Code standards (enforced in review)

- Names say what, not how. No `data`, `info`, `manager`, `helper` as a whole name.
- Functions do one thing; prefer < ~30 lines; > 3 params → pass an object.
- No comments that restate the code; comments explain *why* or a non-obvious
  constraint.
- No dead code, no commented-out code, no `any` without a written reason.
- Errors are handled or propagated deliberately — never swallowed silently.
- One reason to change per module. If a file mixes rules + rendering + I/O, split.
- Public APIs of a package are the only entry point; internals aren't imported
  across package lines.

## What a stack change would touch

If we ever move renderers: `apps/web` and the `infrastructure` adapters it wires.
`domain` and `application` — the hard, valuable part — carry over unchanged (or,
for a non-JS engine, port with the design and tests intact).
