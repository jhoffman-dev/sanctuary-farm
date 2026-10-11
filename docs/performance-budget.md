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

### Load — Godot client (`game/`, ADR-0006), cold cache, throttled network

Re-baselined 2026-10-11 (SF-100). A Godot game cannot meet the r3f lines
below: the engine alone is megabytes of WebAssembly, and at 10 Mbps every
megabyte is 0.8 s. So the Godot lines budget three things separately — the
engine download (fixed cost, shrunk by building our own engine), the game pack
(grows with content), and the times a child actually waits. The 3.5 s / 6 s
first-question line of the r3f shell is not reachable on 10 Mbps by any engine
build (4.6 MB brotli is 3.7 s of transfer before the wasm even compiles); the
lines below replace it for the Godot client.

| Budget | Target | Ceiling | Measured (2026-10-11) | How measured |
| --- | --- | --- | --- | --- |
| Engine download — wasm + loader, brotli | 4.0 MB | **5.0 MB** (fails CI) | **4.58 MB** (stock template: 6.96 MB) | `pnpm godot:size` in the CI `godot` job; ceilings in `game/tools/web_export/budget.ts` |
| Game pack (`.pck`: scenes, models, audio), brotli | 1.5 MB | **2.5 MB** (fails CI) | **0.52 MB** (0.62 MB raw — mostly already-compressed imports) | `pnpm godot:size` |
| Total transfer to first question (page, engine, pack, splash) | 5.5 MB | 7.5 MB | **5.12 MB** brotli / 7.35 MB gzip (stock: 7.51 / 10.7 MB) | Resource Timing `transferSize`, `pnpm godot:load:web` |
| First question, cold cache (10 Mbps, 150 ms, 4× CPU) | 8 s | 12 s | **7.85 s** brotli / 9.62 s gzip (stock: 10.08 s brotli) — laptop/headless | `pnpm godot:load:web` (median of 3), monthly device run |
| First question, warm cache (engine and pack cached) | 2 s | 4 s | **2.97 s** (stock 2.74 s; 600 B on the wire — `index.html` revalidated, the rest from cache) — laptop/headless at 4× CPU: all of it is wasm compile + start-up | same |
| Frame rate, placeholder farm (5 s of `requestAnimationFrame` after the first question) | 60 | 30 | 16–19 fps — software GL (SwiftShader) at 4× CPU, **not comparable to a device**; stock and ours are within run-to-run noise | same; the device run decides |

"Laptop/headless" means an M4 MacBook Air running headless Chromium
with Chrome DevTools throttling: 10 Mbps down, 150 ms latency, CPU slowed 4×.
Nothing here ran on the reference Chromebook or iPad (SF-34 still has no
device); the first device run recalibrates every number. The server in the
timer (`game/tests/web/serve.mjs --encoding br|gzip`) compresses like a CDN at
its best (brotli 11 / gzip 9) and caches like `firebase.json`.

**How the engine got smaller** — our own export template
(`game/tools/build_web_template.sh`, Godot 4.7.2 + Emscripten 4.0.20,
published by `.github/workflows/godot-template.yml`, fetched by checksum):
wasm 39.5 → 27.2 MB raw, 10.05 → 6.70 MB gzip, 6.90 → 4.52 MB brotli. It
keeps 3D, the Compatibility renderer, 3D physics (GodotPhysics3D) and 3D
navigation — the keeper (SF-97, #146) will walk with `NavigationRegion3D` /
`NavigationAgent3D` and pick the ground with a ray — and audio (Ogg Vorbis,
MP3, WAV, interactive music), WebP/PNG/SVG images and GridMap. The profile
(`game/tools/web_template.gdbuild`) turns off, each because nothing in
`game/` uses it at runtime: the advanced text server (complex scripts and BiDi;
the fallback server renders Latin text and digits), 2D physics and 2D
navigation, Jolt (the project runs GodotPhysics3D), XR, GLTF/FBX loading at
runtime (models are imported to Godot scenes in the editor), CSG, Basis
Universal/KTX/DDS/BMP/TGA/HDR/JPG loaders, Theora video, camera, RegEx,
visual shaders, networking (ENet, multiplayer, WebRTC, WebSocket, UPnP,
JSON-RPC, mbedTLS — `JavaScriptBridge` and `HTTPRequest` use the browser's own
stack), and editor-only helpers (lightmapper, xatlas, V-HACD, meshoptimizer,
raycast, ObjectDB profiler). Plus `deprecated=no`, full LTO (the official
templates use thin), `optimize=size`, single-threaded, release only — no
debugger in the shipped engine.

Measured and **not** taken, with the reason (each a one-line profile change):

| Lever | Saves (brotli) | Why not now |
| --- | --- | --- |
| `disable_advanced_gui` | 0.33 MB | Removes `RichTextLabel`, `OptionButton`, `PopupMenu`, `AcceptDialog`, `SpinBox`, `SubViewportContainer` — the obvious picks for the SF-95 HUD/pad rebuild in the editor |
| `optimize=size_extra` | 0.16 MB (and 5.9 MB raw) | Turns off forced inlining in the engine core; costs CPU per frame on the N4000, which no measurement here can see |
| `disabled_classes` for 2D nodes, TileMap, soft/vehicle bodies, GI | 0.21 MB | A class list breaks a scene the moment it uses one; "Detect from Project" is editor-only |

**Caching.** `pnpm godot:export:web` renames the engine and pack after their
content (`engine-<hash>.wasm/.js/.audio*.worklet.js`, `game-<hash>.pck`,
`game/tools/web_export/run_fingerprint.ts`), and `firebase.json`'s game
target serves those `public, max-age=31536000, immutable`; `index.html` stays
`no-cache`. A second visit fetches only the page (a 304), so the warm line is
wasm compile time, not network. Godot's PWA option stays off: its service
worker lists the export's files by their original names, so it would need the
same rewrite, and an offline mode is its own backlog item.

**Hosting compression** (checked against the Hosting emulator, firebase-tools
15.28.2, 2026-10-11; not yet against production — no deploy in SF-100):
`.wasm` and `.js` come back `Content-Encoding: br`; `.pck` is not compressed
and was served as `Content-Type: false` until `firebase.json` set
`application/octet-stream`. The pack barely compresses (0.62 → 0.52 MB), so
precompressing it would save ~0.1 s; not done. Production Hosting compresses
with brotli or gzip by `Accept-Encoding` (Firebase blog, 2020-08,
"request logging, Brotli compression, and internationalization"); its
compression level is not documented — at a low brotli level (5) the engine
is 8.3 MB instead of 6.9 MB for the stock build, so **the first preview
deploy of the Godot client must check** `curl -sI -H 'Accept-Encoding: br'
https://<site>/engine-<hash>.wasm` for `content-encoding: br` and compare
`content-length` with the brotli column of `pnpm godot:size`. When the game
target switches to `game/build/web` (SF-96), its CSP also needs
`'wasm-unsafe-eval'` in `script-src`, or the engine cannot compile.

### Load — r3f client (`apps/web`, retiring with SF-96), cold cache, throttled network, reference device

Measured 2026-10-08 (SF-80). Build-time sizes are exact; the Lighthouse
numbers are **a laptop running headless Chrome** with simulated throttling
(below), median of three runs — a regression guard, not the reference device.

| Budget | Target | Ceiling | Measured (2026-10-08) | How measured |
| --- | --- | --- | --- | --- |
| Shell JS transfer (practice-first: React, `@sf/*`, HUD, number pad) | 70 kB gz | 100 kB gz | **69.5 kB gz** | `size-limit`, `pnpm size` in `pnpm gate` |
| World JS chunk (three, r3f, drei subset) | 250 kB gz | 350 kB gz | **262.5 kB gz** — over target since SF-75/77, under ceiling | `size-limit` |
| CSS transfer | 15 kB gz | 30 kB gz | 5.0 kB gz | `size-limit` |
| 3D assets for the first hotspot (ground, keeper, barn exteriors) | 1.5 MB | 2.5 MB | 2.24 MB raw for the whole SF-82 catalogue (every piece, six animals, four keepers), more than one hotspot needs | `size-limit` on `public/models/**/*.{glb,png}`, uncompressed, at the ceiling |
| Audio (synth only today) | 0 | see below | 0 | — |
| Total transfer to first playable question | 100 kB | 150 kB | **74.9 kB gz** (shell JS + CSS + `index.html`) | `size-limit` "first playable question" — Lighthouse can't isolate it, the world loads straight after the shell |
| Total transfer incl. first hotspot world | 2.5 MB | 4 MB | **1.51 MB** (laptop/headless) | Lighthouse `total-byte-weight`, `pnpm lhci` |
| Largest Contentful Paint | 2.5 s | 4 s | **1.82 s** (laptop/headless, simulated) | Lighthouse, `pnpm lhci` |
| Time to Interactive (shell) | 3 s | 5 s | — (Lighthouse 10+ dropped TTI) | Playwright timer below covers it |
| Time to first playable question (pad accepts a key, fact shown) | 3.5 s | 6 s | — | Playwright timer, monthly device run |
| Total Blocking Time | 300 ms | 600 ms | **211 ms** median (runs: 2,973 / 211 / 183 ms) (laptop/headless, simulated) | Lighthouse, `pnpm lhci` |
| Cumulative Layout Shift | 0.05 | 0.1 | **0** (laptop/headless) | Lighthouse, `pnpm lhci` |
| World visible after first tap (cold / warm) | 6 s / 2 s | 10 s / 3 s | — | Playwright timer, monthly device run |

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
| Draw calls | 100 | 150 | `renderer.info.render.calls`; instancing for repeated props. Measured 2026-10-08 at 1280×800: **high 91, low 48** (`e2e/quality-tiers.spec.ts`; draw calls don't depend on the device) |
| Unique materials | 12 | 20 | one asset pack, one atlas per category |
| Lights | 1 directional + 1 hemisphere | 2 | no point/spot lights on low tier |
| Shadow maps | 1 × 1024² (low) / 1 × 2048² (high) | 1 map | casters: keeper + animals only; ground receives |
| Texture format | Kenney's own 512² PNG atlas per kit, loaded once and shared (ADR-0003 addendum: GLB-native, no conversion, so no KTX2) | — | `e2e/kenney-assets.dev.spec.ts` (dev server): one fetch and one 512² GPU upload per kit |
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
4. **Quality tier switch** (SF-80, `scene/quality-tier.ts`). On a first
   visit the probe reads the device, then times ~1 s of frames on the high
   tier once the world is drawn. `low` if any of: a software renderer
   (SwiftShader, llvmpipe), an entry-level GPU (Intel HD/UHD 400–605, old
   Mali/Adreno, PowerVR), ≤ 2 logical cores (ignored for Safari's masked
   "Apple GPU" — WebKit reports 2 cores on every iOS device), ≤ 2 GB
   `deviceMemory`, or a median frame over 22.2 ms (under 45 fps) across 60
   frames after a 10-frame warm-up. Else `high`. Under reduced motion there
   are no frames to time, so only the device signals count. `high` is the
   full look at a DPR capped at 1.5; `low` is DPR 1, no sun shadow (about
   half the draw calls), no camera sway and no idle clips. The verdict is
   remembered in `localStorage`; `?quality=low|high` forces a tier for that
   load without being remembered.
5. **`frameloop="demand"` when idle** (`scene/frameloop.ts`). The loop runs
   every frame only while something moves — the keeper walking, the camera
   easing, and 0.5 s after (the walk → idle crossfade) — or while the tier
   probe is timing frames. Idle clips and camera sway count as movement, so
   **only the low tier ever rests**: its idle loops are paused (animals and
   the resting keeper hold a pose), and a still farm draws nothing. The high
   tier keeps its breathing animals and sway, so it renders continuously —
   a device that passed the probe can afford it, and a still farm with
   frozen animals reads as broken. Each frame's delta is capped at 0.1 s
   (`SteadyClock`), so the first frame after a long rest does not carry the
   whole rest.
6. **Reduced motion saves work too.** The reduced-motion path (already used for
   camera sway) also skips particle ceremonies and idle animations, so it is
   both an accessibility path and a floor for the slowest device.
7. **No dev-only weight in production.** `<Perf>`, `leva`, gizmos and helpers
   live behind `import()` on a query flag.

## Measurement and enforcement

| Where | What | Fails on |
| --- | --- | --- |
| `pnpm size` — in `pnpm gate` right after `pnpm build` (gate + CI) | `size-limit` with `@size-limit/file` | any chunk over its ceiling |
| `pnpm lhci` — local today; a CI job once the workflow (PR #123, SF-39) lands | Lighthouse CI (`@lhci/cli`) on `vite preview` of the production build | ceilings in the load table |
| Any URL | `?perf=1` mounts `r3f-perf` `<Perf>` (lazy-loaded) | manual reading |
| `pnpm godot:size` — CI `godot` job, after the export | Godot export sizes (raw / gzip 9 / brotli 11) against `game/tools/web_export/budget.ts` | engine or pack over its brotli ceiling |
| `pnpm godot:load:web` — CI `godot` job, reported in the summary, not enforced | Throttled Playwright timer: cold and warm first question, frame rate | nothing (shared runner + software GL); the device run is the gate |
| Monthly | Hand run on the reference device, row appended below | any ceiling |

`size-limit` config lives in `apps/web/package.json` and is run by the root
`pnpm size`. The chunk names come from the `React.lazy` file name — the world
chunk is `FarmScene-*.js` because `scene/LazyFarmScene.tsx` imports
`./FarmScene`. The `?assets=1` catalogue (SF-82) also lazy-loads three, but it
exists in dev builds only (SF-75), so in production three + r3f stay inside
`FarmScene-*.js`. Since SF-75 the world line also sums the tile world it draws:
`@sf/world` in `tile-world-*.js` (named in `vite.config.ts`) and the composition
root's `build-farm-world-*.js`, both fetched with the scenery, never with the
shell. If a name ever changes, `size-limit` fails on the
unmatched path rather than silently measuring less. The limits are this doc's **ceilings**, not its targets, so the
gate fails on a regression and a merge is still the place to argue about a
number between target and ceiling:

```json
"size-limit": [
  { "name": "shell (everything the first question needs)", "path": "dist/assets/index-*.js", "limit": "100 kB", "gzip": true },
  { "name": "first playable question (shell JS + CSS + HTML)", "path": ["dist/index.html", "dist/assets/index-*.js", "dist/assets/*.css"], "limit": "150 kB", "gzip": true },
  { "name": "world (three, r3f, the farm scene, the tile-world generator)", "path": ["dist/assets/FarmScene-*.js", "dist/assets/tile-world-*.js", "dist/assets/build-farm-world-*.js"], "limit": "350 kB", "gzip": true },
  { "name": "models (every Kenney piece in the catalogue, uncompressed)", "path": "public/models/**/*.{glb,png}", "limit": "2.5 MB", "brotli": false },
  { "name": "css", "path": "dist/assets/*.css", "limit": "30 kB", "gzip": true }
]
```

The models line measures raw bytes (`"brotli": false`): GLB is binary and
Firebase Hosting's compression of `model/gltf-binary` is not verified, so the
honest number is the uncompressed one. It covers the whole catalogue, not one
hotspot, so it sits at the hotspot ceiling until per-hotspot loading splits it.

`size-limit`'s gzip numbers are a little under Vite's build report (68.71 kB vs
69.64 kB for the shell) — different compression levels over the same bytes. The
table above quotes `size-limit`, because that is what fails the gate.

`rollup-plugin-visualizer` stays a diagnostic (`pnpm --filter @sf/web build
--mode analyze`), not a gate — it explains a failure, it doesn't detect one.

Lighthouse CI (`lighthouserc.cjs`, run by `pnpm lhci`, which builds first):
`throttlingMethod: 'simulate'`, `rttMs: 150`, `throughputKbps: 10240`,
`cpuSlowdownMultiplier: 4` (CI runners are far faster than an N4000), desktop
form factor at 1366×768, DPR 1. Assertions, all `error`, on the median run of
three: `largest-contentful-paint ≤ 4000`, `total-blocking-time ≤ 600`,
`cumulative-layout-shift ≤ 0.1`, `total-byte-weight ≤ 4 MB`. The game fetches
the world straight after the shell, so Lighthouse's byte weight is the "incl.
first hotspot world" line; the 150 kB shell line is `size-limit`'s "first
playable question" entry. Lighthouse 10+ has no `interactive` audit. TBT is
the noisy one: one run in three measured 2.97 s on a laptop, so the median is
what is asserted. To add to CI when PR #123 lands, a job after `pnpm install`:
`pnpm lhci` (Chrome is preinstalled on `ubuntu-latest`).

### Monthly device runs

| Date | Build | Device | Transfer | TTI | First question | FPS avg / 1 % low | Heap | Tris | Draw calls | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-09 | shell (Phase 1) | none yet — SF-34 | 302 kB gz | — | — | — | — | — | — | throttled desktop only |
| 2026-09 | world split out (Phase 2) | none yet — SF-34 | 69 kB gz shell + 234 kB gz world | — | — | — | — | — | — | build output only, not a device run |
| 2026-10-08 | SF-80 tiers | none yet — SF-34; laptop, headless Chromium (SwiftShader) | 1.51 MB (LH) | — | — | high 7.5 at rest / low 25.7 walking (software GL, not comparable to a device) | — | — | high 91 / low 48 | laptop/headless only; draw calls are the device-independent number |
| 2026-10-11 | SF-100 Godot, own template | none yet — SF-34; M4 laptop, headless Chromium (SwiftShader), 10 Mbps / 150 ms / 4× CPU | 5.12 MB br | — | 7.85 s cold / 2.97 s warm | 16–19 (software GL) | — | — | — | stock template on the same harness: 7.51 MB, 10.08 s / 2.74 s |

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
| Frameloop / DPR | low tier: demand when still, always while moving; high tier: always; reduced motion: demand. DPR capped at 1.5 (1 on low) | demand when idle; cap 1.5 | met (SF-80) |
| Quality tiers | probe on first visit, remembered; `?quality=` overrides; high 91 / low 48 draw calls at 1280×800 | tier switch | met (SF-80) |
| Reduced motion | camera sway off; the loading ring does not spin | also skips ceremonies | partial |
| Scene | 3 meshes, 2 lights, 1 shadow map | scene table | trivially ok |
| Gate | `pnpm gate` (typecheck · lint · boundaries · tests · build · **size**) + `pnpm e2e` + `pnpm lhci` | + size-limit + LHCI | met locally; LHCI joins CI with PR #123 |

### Next two actions for Phase 2

1. ~~**Split the world out**~~ — done: `scene/LazyFarmScene.tsx`, with
   `size-limit` in `pnpm gate`.
2. ~~**Tier switch + demand frameloop + `?perf=1`**~~ — done (SF-80); the
   `<Perf>` overlay is still not built: `?perf=1` publishes numbers to the DOM.
3. **Lighthouse in CI + first device run** — `pnpm lhci` exists (SF-80); add
   it as a CI job when PR #123 lands, then run the monthly table once on the
   SF-34 device and recalibrate every target and tier threshold this doc guessed.

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
