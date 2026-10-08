# `@sf/world` tile world (SF-87, issue #118, ADR-0005)

- **World = generate(seed, anchors) + overrides.** `buildTileWorld(spec, chunks)`
  is pure; `spec.rngFor` is an injected `RngFactory`. apps/web may import
  only domain *types*, so its composition root passes its own mulberry32
  (`composition/seeded-rng.ts`, tested draw-for-draw against `@sf/domain`'s
  `createRng`); `@sf/world` tests use `seededRngFactory` from `test-fixtures.ts`. Never store generated
  tiles; store `layouts/world.json` (seed + chunk list, `parseWorldSettings`)
  and `layouts/overrides.json`.
- **Grid:** `TILE_SIZE` 1 unit (Kenney kits are 1 × 1), `CHUNK_SIZE` 16. North
  is −Z; rotations are `QuarterTurns` clockwise from above.
- **Chunks never depend on which chunks exist.** A chunk's neighbours are
  generated virtually for keep-clear zones and autotile masks, which is why
  `addChunk` can't change existing tiles. Don't make generation read the
  world's chunk list. Every chunk edge has one path connector picked from
  (seed, edge) only, so both sides agree.
- **`move-hotspot` edits apply before generation** (paths re-route to the
  new arrival); every other edit applies after, in file order.
- **Fences join only their own `enclosure`**, so pens built side by side
  stay two pens.
- **No file paths in `@sf/world`.** The `apps/web` adapter maps `PieceId`
  (`'fence:corner'`, `'hotspot:barn'`, …) to Kenney GLBs; type that map as
  `Record<PieceId, string>` so a new kind fails the build until mapped.
- **Rendering (SF-75, `apps/web/src/scene/`).** The world is built once, in
  the lazy `build-farm-world` chunk, and handed to `FarmScene`. Ground is one
  vertex-coloured mesh per chunk (`ground-surface.ts`) — paths and water are
  colours/heights in it, never Kenney models (patches leave gaps, road tiles
  seam). Structures and decor are one `InstancedMesh` per `PieceId` for the
  *whole world*, not per chunk: draw calls are the budget line we hit first.
  Hotspot markers are drawn only on `open` footprints; fenced/building ones
  are marked by their gate/door. `?perf=1` publishes draw calls, FPS and
  hotspot screen positions as `data-*` on `[data-testid=perf-probe]`;
  `?view=overview|paddock-corner` cameras exist in dev builds only.
- **World editor (SF-76, `?edit=1`, dev only).** Rules live in `@sf/world`
  (`world-editing.ts`: `applyEdit(spec, edit)` keeps the file minimal — it
  replaces same-layer edits on the tile and drops an edit that leaves the
  tile as generated; `eraseAt`, `hotspotMoveProblem`, `neighbouringChunks`;
  `edit-history.ts`; `world-draft.ts`). `apps/web/src/editor/` only maps
  input to reducer actions. Saving goes through a dev-server plugin
  (`apps/web/src/dev-server/`) that writes both layout files in the
  canonical text from `serialize-world.ts`; a gate test fails if either
  file is not in that shape. The plugin loads `@sf/world` through
  `server.ssrLoadModule`, because Vite's config loader cannot resolve the
  workspace package's extensionless TypeScript imports. The editor e2e
  writes the real files and restores them, so it runs in its own Playwright
  project after the other dev specs.
