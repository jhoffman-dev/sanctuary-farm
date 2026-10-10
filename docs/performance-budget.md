# Performance budget

PRD principle 3: reachable by any kid on any device via a link. This doc turns
that into numbers we can measure and fail a build on. It feeds Phase 2 (3D
foundation) and is checked against the reference device monthly. Ticket SF-50.

## Reference device and network

| | Reference (Chromebook) | Fallback (iPad) |
| --- | --- | --- |
| Hardware | 2019 Celeron N4000, 4 GB RAM, Intel UHD 600 | 2018 iPad 6th gen, A10, 2 GB RAM |
| Browser | Chrome (current stable), 1366×768, DPR 1 | Safari, 2048×1536, DPR 2 (we cap to 1.5) |
| GPU API | WebGL 2 | WebGL 2 (iPadOS 15+) |
| Why | Cheapest school Chromebook still in circulation | Oldest iPad still on a supported iPadOS |

A budget line is met only if it is met on **both**. James still has to name and
provide the actual device (SF-34); until then the numbers below are proposals
measured on throttled desktop Chrome, and the first device run will recalibrate.

**Network assumption:** school Wi-Fi — 10 Mbps down, 150 ms RTT, cold cache.
That is what Lighthouse is throttled to (below). Home Wi-Fi is not the case we
design for.

## Budgets

Target is what we build to; ceiling fails the gate or blocks a merge.

### Load (cold cache, throttled network, reference device)

| Budget | Target | Ceiling | Measured (2026-09-08) | How measured |
| --- | --- | --- | --- | --- |
| Shell JS transfer (practice-first: React, `@sf/*`, HUD, number pad) | 70 kB gz | 100 kB gz | **68.7 kB gz** (was 303.2 kB) | `size-limit`, `pnpm size` in `pnpm gate` |
| World JS chunk (three, r3f, drei subset) | 250 kB gz | 350 kB gz | **230.8 kB gz** (was: none, it was in the shell) | `size-limit` |
| CSS transfer | 15 kB gz | 30 kB gz | 3.8 kB gz | `size-limit` |
| 3D assets for the first hotspot (ground, keeper, barn exteriors) | 1.5 MB | 2.5 MB | — (no models ship yet) | `size-limit` on `public/models/**`, once there are models |
| Audio (synth only today) | 0 | see below | 0 | — |
| Total transfer to first playable question | 100 kB | 150 kB | — | Lighthouse `total-byte-weight` on the shell |
| Total transfer incl. first hotspot world | 2.5 MB | 4 MB | Lighthouse, world loaded |
| Largest Contentful Paint | 2.5 s | 4 s | Lighthouse |
| Time to Interactive (shell) | 3 s | 5 s | Lighthouse |
| Time to first playable question (pad accepts a key, fact shown) | 3.5 s | 6 s | Playwright timer, monthly device run |
| Total Blocking Time | 300 ms | 600 ms | Lighthouse |
| Cumulative Layout Shift | 0.05 | 0.1 | Lighthouse |
| World visible after first tap (cold / warm) | 6 s / 2 s | 10 s / 3 s | Playwright timer, monthly device run |

### Runtime (reference device, low tier, 60 s walk incl. one hatch ceremony)

| Budget | Target | Ceiling | How measured |
| --- | --- | --- | --- |
| Sustained FPS | 60 | floor 30; 1 % low ≥ 24 | `?perf=1` overlay, monthly device run |
| FPS during hatch ceremony | 60 | no frame below 24 | same, ceremony recorded separately |
| Main-thread frame time | ≤ 12 ms | 30 ms | Chrome DevTools Performance, p95 |
| JS per frame (all `useFrame` + React) | ≤ 4 ms | 8 ms | same; no React commit inside `useFrame` |
| JS heap | ≤ 150 MB | 250 MB | DevTools Memory / `performance.memory` |
| GPU texture memory | ≤ 96 MB | 128 MB | `?perf=1` overlay (`renderer.info.memory`) |
| Whole tab (Chrome task manager) | ≤ 300 MB | 400 MB | monthly device run |

### Scene (what is on screen at once, low tier)

| Budget | Target | Ceiling | Notes |
| --- | --- | --- | --- |
| Triangles on screen | 150 k | 250 k | keeper ≤ 8 k, animal ≤ 3 k, prop ≤ 1.5 k |
| Draw calls | 100 | 150 | `renderer.info.render.calls`; instancing for repeated props |
| Unique materials | 12 | 20 | one asset pack, one atlas per category |
| Lights | 1 directional + 1 hemisphere | 2 | no point/spot lights on low tier |
| Shadow maps | 1 × 1024² (low) / 1 × 2048² (high) | 1 map | casters: keeper + animals only; ground receives |
| Texture format | KTX2/Basis (UASTC atlas, ETC1S props), power-of-two, mipmapped | — | `gltf-transform` in the asset pipeline; PNG/JPG only for UI |
| Texture size | ≤ 1024² props · ≤ 2048² ground atlas | as target | count ≤ 24 textures resident |
| Skinned meshes on screen | 6 | 8 | ≤ 64 bones per rig |
| Animation clips | ≤ 12 per character, ≤ 2 MB total clip data | — | quantised via `gltf-transform` |
| Geometry compression | meshopt (or Draco) on every `.glb` | — | decoder lives in the world chunk |
| Post-processing | none on low tier | — | high tier may add SMAA/bloom later |
| Audio, if samples ever replace synth | ≤ 1 MB transfer, ≤ 20 MB decoded, ≤ 2 MB per clip | as target | decode lazily per hotspot |

## Rules that keep us inside

1. **Practice first.** The number pad must be usable before the world chunk
   arrives: `React.lazy` the r3f scene, render the practice panel immediately,
   never `await` three.js for a graded answer.
2. **Load the world per hotspot.** Ground + keeper + the barn exterior on first
   tap; nest, paddock, training, zoo assets fetched when the keeper walks there.
3. **One asset pack, instanced.** Repeated props (fences, feed bags, hay) are
   `InstancedMesh`; every model shares the pack's atlases.
4. **Quality tier switch.** A 2 s FPS probe after the world mounts picks
   `low` (< 45 fps) or `high`; `devicePixelRatio` is capped at 1.5 on both;
   `low` disables shadows above 1024², post-processing and camera sway.
   The tier is remembered in `localStorage` and overridable with `?tier=`.
5. **`frameloop="demand"` when idle.** The scene only renders on input,
   animation or a scheduled invalidate; a farm with nobody moving costs 0 ms.
6. **Reduced motion saves work too.** The reduced-motion path (already used for
   camera sway) also skips particle ceremonies and idle animations, so it is
   both an accessibility path and a floor for the slowest device.
7. **No dev-only weight in production.** `<Perf>`, `leva`, gizmos and helpers
   live behind `import()` on a query flag.

## Measurement and enforcement

| Where | What | Fails on |
| --- | --- | --- |
| `pnpm size` — in `pnpm gate` right after `pnpm build` (gate + CI) | `size-limit` with `@size-limit/file` | any chunk over its ceiling |
| CI, after build | Lighthouse CI (`@lhci/cli`) on the built shell | ceilings in the load table |
| Any URL | `?perf=1` mounts `r3f-perf` `<Perf>` (lazy-loaded) | manual reading |
| Monthly | Hand run on the reference device, row appended below | any ceiling |

`size-limit` config lives in `apps/web/package.json` and is run by the root
`pnpm size`. The chunk names come from the `React.lazy` file name — the world
chunk is `FarmScene-*.js` because `scene/LazyFarmScene.tsx` imports
`./FarmScene`. The limits are this doc's **ceilings**, not its targets, so the
gate fails on a regression and a merge is still the place to argue about a
number between target and ceiling:

```json
"size-limit": [
  { "name": "shell (everything the first question needs)", "path": "dist/assets/index-*.js", "limit": "100 kB", "gzip": true },
  { "name": "world (three, r3f, the farm scene)", "path": "dist/assets/FarmScene-*.js", "limit": "350 kB", "gzip": true },
  { "name": "css", "path": "dist/assets/*.css", "limit": "30 kB", "gzip": true }
]
```

The `public/models/**` line from the original plan is **not** wired yet: there
are no models in the repo, and `size-limit` errors on a path that matches
nothing. It goes in with the first `.glb`.

`size-limit`'s gzip numbers are a little under Vite's build report (68.71 kB vs
69.64 kB for the shell) — different compression levels over the same bytes. The
table above quotes `size-limit`, because that is what fails the gate.

`rollup-plugin-visualizer` stays a diagnostic (`pnpm --filter @sf/web build
--mode analyze`), not a gate — it explains a failure, it doesn't detect one.

Lighthouse CI (`lighthouserc.cjs`): `throttlingMethod: 'simulate'`, `rttMs: 150`,
`throughputKbps: 10240`, `cpuSlowdownMultiplier: 4` (CI runners are far faster
than an N4000). Assertions, all `error`: `largest-contentful-paint ≤ 4000`,
`interactive ≤ 5000`, `total-blocking-time ≤ 600`, `cumulative-layout-shift ≤ 0.1`,
`total-byte-weight ≤ 153600` on the shell URL. Three runs, median.

### Monthly device runs

| Date | Build | Device | Transfer | TTI | First question | FPS avg / 1 % low | Heap | Tris | Draw calls | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-09 | shell (Phase 1) | none yet — SF-34 | 302 kB gz | — | — | — | — | — | — | throttled desktop only |
| 2026-09 | world split out (Phase 2) | none yet — SF-34 | 69 kB gz shell + 234 kB gz world | — | — | — | — | — | — | build output only, not a device run |

## Current state vs budget (Phase 2, world code-split)

Measured on the production build (`pnpm build`, Vite 8 / rolldown), one commit
apart on `perf/code-split-three`:

| | Before (one chunk) | After (split) |
| --- | --- | --- |
| Initial JS — everything the first question needs | `index-*.js` 1,097.63 kB raw / **303.17 kB gz** | `index-*.js` 217.82 kB raw / **69.64 kB gz** (`size-limit`: 68.71 kB) |
| World JS — three, r3f, `FarmScene` | in the chunk above | `FarmScene-*.js` 882.07 kB raw / **234.35 kB gz** (`size-limit`: 230.76 kB) |
| CSS | 13.91 kB / 3.58 kB gz | 14.95 kB / 3.80 kB gz (the loading pill's classes) |
| Vite chunk-size warning | on every build | gone |

The initial chunk shrank **77 %**, from 3× the shell ceiling to under the 70 kB
*target*. Nothing was deleted: the same bytes now arrive after the child can
already answer.

| Line | Now | Budget | Status |
| --- | --- | --- | --- |
| JS | shell 68.7 kB gz + lazy world 230.8 kB gz | shell 100 kB gz, world 350 kB gz | **met**, both under target |
| CSS | 14.95 kB raw / 3.8 kB gz | 30 kB gz | ok |
| Code-splitting | `React.lazy` + Suspense; HUD and pad render and grade answers before the world lands (e2e holds the chunk on the wire to prove it) | practice first | met |
| Stale chunk after a deploy | one reload, counted in `sessionStorage`; then the farm plays on without scenery | no white screen | met |
| Frameloop / DPR | always unless reduced motion (then demand); no DPR cap | demand when idle; cap 1.5 | not met |
| Reduced motion | camera sway off; the loading ring does not spin | also skips ceremonies | partial |
| Scene | 3 meshes, 2 lights, 1 shadow map | scene table | trivially ok |
| Gate | `pnpm gate` (typecheck · lint · boundaries · tests · build · **size**) + `pnpm e2e` | + size-limit + LHCI | size-limit met; LHCI outstanding |

### Next two actions for Phase 2

1. ~~**Split the world out**~~ — done: `scene/LazyFarmScene.tsx`, with
   `size-limit` in `pnpm gate`.
2. **Tier switch + demand frameloop + `?perf=1`** — the 2 s probe, DPR cap 1.5,
   `frameloop="demand"` with invalidate on input/animation, lazy `<Perf>`.
3. **Lighthouse CI in the gate + first device run** — LHCI with the assertions
   above; run the monthly table once on the SF-34 device and recalibrate every
   target this doc guessed.

## Open questions for James

- Which physical device is the reference (SF-34)? Is a 2 GB iPad 6 really our
  floor, or is an iPad 7/8 (3 GB) a fairer "old iPad"? Safari's memory limit on
  2 GB is the single biggest constraint in this doc.
- Is 30 fps sustained on the low tier acceptable for the alpha, with 60 only on
  the high tier?
- Is 10 Mbps / 150 ms the right network story, or should we also budget for a
  library PC on a wired connection with an older Chrome?
- The PWA / offline-shell backlog item changes "cold load" — once it lands, do
  we keep cold-cache numbers as the gate, or measure warm as the common case?
- Will we ever ship sampled audio (voice, music), or is synth-only a decision?
