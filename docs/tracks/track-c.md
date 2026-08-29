# Track C — Farmyard world

**Branch:** `track/c-world`
**Owns:** `src/world/Farmyard.tsx`, `src/world/tilemap.ts`, `src/world/pathfind.ts`,
`src/world/Character.tsx`, `src/world/camera.ts`, `src/world/*.test.ts`,
`src/dev/routes/farm.route.tsx`.
**Never touch:** `src/contracts/**`, any other track's directory.
**Depends on:** Phase 0 only.

## Requirements

### Map — `tilemap.ts`

25×18 tiles @ `TILE_PX` (1200×864). Keep `createTilemap()` / `tilemap` exports and the
`Tilemap` shape from `@/contracts`. Hand-lay a real layout: grass, `path` network connecting
all five hotspots, `fence` border + paddock fencing, a `water` trough or pond, `building`
footprints for barn / feed shed / farmhouse. `playerStart` = the farmhouse door tile.
`isWalkable` = `grass | path` (not fence/water/building). Every hotspot tile must be
walkable and path-reachable from `playerStart`. Crossing the map corner-to-corner must be
≤ ~8 seconds at `WALK_SPEED_TPS`.

### Pathfinding — `pathfind.ts`

Real A* over the walkability grid. `findPath(map, from, to): Vec2[] | null`. Diagonal steps
allowed **only when both shared orthogonal neighbours are walkable** (no fence-corner
clipping). Return tile-centre waypoints; `null` when `to` is unwalkable or unreachable.
~60 lines, no library.

### Character — `Character.tsx`

Round-headed figure, four facing variants (`CharacterFacing`), bob-and-squash while
translating. Inline SVG. Facing derived from current movement vector.

### Movement (in `Farmyard.tsx`)

Tap/click a tile → path there and walk along waypoints via a `requestAnimationFrame` loop
at ~`WALK_SPEED_TPS`. Tapping mid-walk re-paths **immediately** (no queueing, no stutter).
Arrow keys + WASD as a secondary continuous input. **No d-pad, no virtual thumbstick.**
Tapping an unreachable tile does nothing (no throw). Walking fully onto a hotspot tile fires
`onHotspot(id)` once (debounce re-entry until she leaves and returns).

### Camera — `camera.ts`

Dead-zone follow (middle third, `CAMERA_DEADZONE`), clamped to map bounds. If the viewport
is wider/taller than the map, centre that axis and don't scroll. Pure function(s) —
`cameraOffset(targetPx, viewport)` is a reasonable shape; keep it testable.

`badges` prop floats a soft indicator over a hotspot (e.g. chores pending on the barn).

## Acceptance tests (`src/world/*.test.ts`) — all must pass

- `findPath` never returns a path crossing a `fence`, `water`, or `building` tile.
- `findPath` to an unreachable/unwalkable tile returns `null` and does not throw.
- Diagonal move is rejected when either orthogonal neighbour is blocked.
- Every hotspot in the real map is reachable from `playerStart`.
- `cameraOffset` never lets the view show outside `[0, MAP_PX_W-vw] × [0, MAP_PX_H-vh]`;
  centres when viewport ≥ map on an axis.
- Re-pathing mid-route (call path with a new target) yields a valid path from the current
  position.

## Dev route

`#/dev/farm`: the walkable `Farmyard` at real size (scrollable/zoom-to-fit container).
Hotspots `console.log` their id instead of navigating. Show current tile + FPS if cheap.

## DoD

typecheck / lint / test / build green; dev route walks and paths correctly; only Track C
files touched; `// STUB` headers gone.
