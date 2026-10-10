# `@sf/world` — the farm layout (SF-74, ADR-0005)

- **The layout is data, not code.** `packages/world/layouts/farm.json` is the
  only hand-edited file; `packages/world/src` holds the types, the parser and
  the rules. No Three.js, no React, no DOM — the renderer reads a `WorldLayout`,
  it does not own coordinates. `apps/web`'s composition root calls
  `loadFarmLayout()` and passes the layout in (SF-75's job).
- **Dependency tier: like `domain`.** `.dependency-cruiser.cjs` rule
  `world-depends-on-nothing` forbids `packages/world/src` importing anything
  outside `packages/world/`. `application` and the adapters may not import it
  either; `apps/web` may. `HotspotId` therefore lives here, not in
  `@sf/application` as ADR-0005 sketched — nothing else defines it yet.
- **`parseFarmLayout` never throws.** It returns `{ ok: true, layout }` or
  `{ ok: false, reason }` where the reason names the path
  (`hotspots[0].trigger.radius: …`). Internally it throws a private
  `LayoutProblem` and catches it at the entry point; any other error is a bug
  and is rethrown.
- **The art-direction rules run inside the parser** (`layout-rules.ts`): ground
  ≤ 30 × 30, camera elevation 20–35°, FOV 30–40°, no two triggers overlapping,
  footprints and arrivals on the ground, farthest hotspot pair ≤ 8 s.
  `KEEPER_SPEED` is 3.75 units/s — art-direction §2 states no speed, only "~30
  units across, crossing ≤ 8 s", so the two together *are* the speed. The
  movement ticket must honour that constant or the crossing rule means nothing.
- **Rotations are degrees in `[0, 360)`**, not radians: the file is hand- and
  agent-edited, and the renderer converts. Areas are `circle` or axis-aligned
  `box`; there is no rotated trigger volume in v1.
- **`structuredClone` needs `src/structured-clone.d.ts`.** The base tsconfig
  loads no DOM and no Node types, so the global has to be declared where it is
  used. Don't "fix" it by switching the package to `tsconfig.dom.json`.
