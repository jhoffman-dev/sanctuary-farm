# `@sf/world` tile world (SF-87, issue #118, ADR-0005)

- **World = generate(seed, anchors) + overrides.** `buildTileWorld(spec, chunks)`
  is pure; `spec.rngFor` is an injected `RngFactory` (the composition root
  passes `@sf/domain`'s `createRng` — `@sf/world` may not import domain, so
  tests use `seededRngFactory` from `test-fixtures.ts`). Never store generated
  tiles; store the seed, the chunk list and `layouts/overrides.json`.
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
