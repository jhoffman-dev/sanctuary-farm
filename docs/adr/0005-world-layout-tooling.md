# ADR-0005: World layout tooling — a hand-authored, schema-checked layout file

- **Status:** proposed (James decides)
- **Date:** 2026-09-08
- **Deciders:** James (sole developer, working with AI agents)
- **Ticket:** SF-65 "Spike: world layout tooling decision"

## Context

Phase 2 builds the 3D farm: ground, paths, the seven hotspots (barn, feed shed,
nest hollow, paddock, training ring, pond + petting zoo, farmhouse), props,
the trigger volumes that tell the game the keeper has arrived somewhere, and
the camera anchor each hotspot re-frames to. Something has to hold all of those
positions, and something has to let us change them. ADR-0001 deferred that
choice ("Blender or a small custom in-app editor — ticket"); this is the ticket.

Forces:

- **Agents do the work.** Almost every layout change will start as a Notion
  ticket ("move the nest closer to the barn", "add three hay bales by the
  paddock fence") picked up by an AI agent with no GUI. A tool the agent cannot
  drive from text is a tool James has to sit in front of.
- **Clean Architecture** (`architecture.md`): the layout is content, not
  behaviour. It should be data that an adapter loads, not coordinates baked into
  presentation components — and `packages/domain` / `packages/application` must
  never grow a Three.js dependency to read a position.
- **Tests read it.** `art-direction.md` §2 already states rules a test can
  check: one contiguous ~30 × 30 m farm, crossing ≤ 8 s, camera elevation
  20–35°, FOV 30–40°, 1 unit = 1 m, models origin at the base facing −Z. A layout
  that is plain data lets the gate enforce those instead of a reviewer eyeballing
  screenshots.
- **The asset pipeline is glTF** (`art-direction.md` §8): one pack, GLBs under
  `apps/web/public/models/<category>/<name>.glb`, compressed with
  `gltf-transform`. Layout tooling must place those files, not replace them.
- **Performance budget** (`performance-budget.md`): the world loads per hotspot,
  repeated props are instanced, and dev-only weight (gizmos, editors) stays
  behind `import()` on a query flag. A layout format that forces one monolithic
  scene file, or an editor that ships in the bundle, breaks a rule we already
  have.
- **Small world.** Seven hotspots, a few dozen props, one farm. Land expansion
  and a second map are Phase 6+. Tooling should fit today's size and not
  pre-pay for a level editor we may never need.
- **James** is a C#/TS developer with Unity side-project experience: comfortable
  in a 3D editor, equally comfortable editing a data file with hot reload.

### What was checked online (2026-09-08)

- **Triplex** — "the open source visual workspace for React / Three Fiber",
  delivered as a **free** VS Code extension (marketplace: "Free", v0.72.5,
  ~2.5 k installs). It edits the props of r3f components visually and saves
  "straight back to code" — the layout lives in `.tsx`. React 19 / Three Fiber 9
  support landed in v0.70.8 (2025-02-10), so it works with our `@react-three/fiber@9`
  + React 19.2. Licence: the repo root has no LICENSE file and GitHub shows none;
  the VS Code extension and renderer packages say `SEE LICENSE IN LICENSE`, and
  `apps/vscode/LICENSE` is **AGPL-3.0** — that binds the editor, not code
  authored with it. Latest release 2026-01-25; last push 2026-06-11; 1.3 k stars,
  effectively one maintainer.
  Sources: <https://github.com/pmndrs/triplex>,
  <https://github.com/pmndrs/triplex/blob/main/apps/vscode/LICENSE>,
  <https://github.com/pmndrs/triplex/releases>,
  <https://marketplace.visualstudio.com/items?itemName=trytriplex.triplex-vsce>,
  <https://triplex.dev/docs/get-started>,
  <https://triplex.dev/docs/building-your-scene/scene> ("components are rendered
  by themselves … if your components rely on global state or context there may
  be some work involved").
- **Blender glTF exporter** — the 4.x manual: "Custom properties are always
  imported, and will be exported from most objects if the Include ‣ Custom
  Properties option is selected before export", stored as glTF `extras`; also
  exports cameras and `KHR_lights_punctual` lights. Empties export as plain
  nodes (their Blender type is lost — glTF-Blender-IO issue #1259). The exporter
  is actively maintained (last push 2026-09-08, Apache-2.0). three.js's
  `GLTFLoader` copies `extras` into `Object3D.userData`
  (`assignExtrasToUserData`) and supports `KHR_draco_mesh_compression`,
  `EXT_meshopt_compression`, `KHR_texture_basisu`, `KHR_lights_punctual`.
  Sources: <https://docs.blender.org/manual/en/latest/addons/import_export/scene_gltf2.html>,
  <https://github.com/KhronosGroup/glTF-Blender-IO>,
  <https://github.com/KhronosGroup/glTF-Blender-IO/issues/1259>,
  <https://threejs.org/docs/pages/GLTFLoader.html>,
  <https://github.com/mrdoob/three.js/blob/dev/examples/jsm/loaders/GLTFLoader.js>.
- **Theatre.js** — Apache-2.0, 12.6 k stars, but dormant: `@theatre/core` 0.7.2
  was last published 2024-05-19, the last commit to the repo is 2024-08-14, the
  releases page still lists v0.7.0 (Aug 2023), 141 open issues. It is an
  animation/sequencing tool with an r3f extension, not a layout tool.
  Sources: <https://github.com/theatre-js/theatre>,
  <https://www.npmjs.com/package/@theatre/core>,
  <https://www.theatrejs.com/docs/latest/releases>.
- **Tiled** (named in the original backlog text) — a 2D tile-map editor whose
  `.tmj` JSON format has object layers (points, polygons) with custom
  properties. Source: <https://doc.mapeditor.org/en/stable/reference/json-map-format/>.
- Current versions: `@react-three/fiber` 9.7.0 (what `apps/web` pins),
  `@react-three/drei` 10.7.8, `@gltf-transform/cli` 4.5.0.

## Decision

**The farm layout is a hand-authored, schema-checked JSON file, owned by a
small framework-free package and rendered by `apps/web` — not a Blender scene,
not JSX props, not a bespoke editor.** GUI tooling is additive and optional:
a dev-only in-browser tweak mode that emits the same JSON (Phase 2, timeboxed),
and — only if James asks for it — a one-way Blender → JSON import script.
Blender stays what `art-direction.md` already makes it: the tool for **models**
(face kit, missing props), never the source of truth for **placement**.

### Why this and not the others — weighted comparison

Weights (1–5) say how much a criterion matters here; cells score 1–5.

| Criterion (weight) | Why it weighs that | A. Blender glTF (empties + extras) | B. Triplex (JSX) | C. In-app editor → JSON | D. **Hand-authored JSON + preview** | E. Tiled `.tmj` |
| --- | --- | --- | --- | --- | --- | --- |
| Agent-editability (5) | Nearly every change is an agent working from a ticket, no GUI | 2 — binary `.blend`; an agent can only script `bpy` | 4 — it is `.tsx`; agents edit the props Triplex would | 5 | **5** | 4 — JSON, but tile arrays are awkward to reason about |
| Separation of layout data from rendering code (4) | Clean Architecture; layout is content an adapter loads | 4 | 1 — positions are props inside presentation components | 5 | **5** | 5 |
| Testability as plain data (4) | Gate enforces art-direction rules; no Three.js in tests | 3 — needs a glTF parse in Node (`@gltf-transform/core`) | 1 — only readable by rendering | 5 | **5** | 4 |
| Diffability in git (3) | Review by humans and agents; blame per placement | 1 — binary | 4 | 4 — editors reorder keys / emit float noise unless canonicalised | **5** | 3 — CSV tile arrays diff as one long line |
| Iteration speed for James (3) | He is the one who will say "a bit to the left" | 4 — he knows 3D editors; export step each time | 4 — drag in VS Code, instant | 4 — drag in the real camera | **3** — edit numbers, Vite hot-reloads; the tweak mode (below) lifts this to 4 | 3 — 2D top-down of a 3D world; heights and camera anchors become custom properties |
| Fit with the glTF asset pipeline (3) | GLBs from the pack, `gltf-transform`, per-hotspot loading | 5 — same format; but tempts one monolithic scene GLB, against per-hotspot loading | 3 — loads GLBs via drei; fine | 4 | **4** — references models by id, per-hotspot chunks fall out naturally | 2 — no 3D preview; a second vocabulary |
| Cost / licence (2) | Solo, free, ad-free product | 5 — free, GPL tool, open format | 5 — free extension, AGPL editor, our code unaffected | 2 — weeks of agent time to build and then maintain | **5** — ~zero | 5 — free/GPL editor, open format |
| Risk of lock-in (2) | Small maintainer base is a real risk on the web | 4 — glTF is open; Blender is forever | 3 — output is plain r3f, but ~1 maintainer and the *workflow* is the product | 5 | **5** | 4 |
| **Weighted total (max 130)** | | **86** | **77** | **115** | **121** | **98** |

Theatre.js is not in the table: it sequences animation and camera moves over
time; it does not place a barn. It is also dormant (above). If we ever want
authored cinematics (hatch ceremony camera), revisit it then — separately.

Option C scores close to D because it *is* D plus a GUI. The difference is the
build cost and the temptation to make the editor a project. So the decision is
D now, with C's cheapest 20 % (a dev-only tweak mode) as a timeboxed Phase 2
ticket, and the rest of C never unless the tweak mode proves insufficient.

### The layout file

**Location.** A new infrastructure-tier package `packages/world` (`@sf/world`):

```
packages/world/
  layouts/farm.json            the layout (the only hand-edited file)
  src/world-layout.ts          the WorldLayout types — plain data, no Three.js
  src/parse-world-layout.ts    JSON → WorldLayout; throws WorldLayoutError with a path
  src/hotspot-containing.ts    pure query: which trigger volume contains (x, z)?
  src/farm-layout.ts           loadFarmLayout(): parses layouts/farm.json once
  src/index.ts                 public entry
  src/*.test.ts                schema tests + the art-direction rule tests
```

Why a package and not `apps/web/public/`: package tests (and later e2e helpers)
import it as data through the public entry; Vite bundles the JSON into the
world chunk (a few KB — no extra request, validated at build); and the
dependency rule is enforceable. `@sf/world` depends on `@sf/application` for the
**type** `HotspotId` only — the application owns *which* hotspots exist (that is
game vocabulary), the layout owns *where* they are. `domain` and `application`
never import `@sf/world`.

**Who loads it.** The composition root, `apps/web/src/composition/`, calls
`loadFarmLayout()` and passes the `WorldLayout` into the scene as a prop /
context — the same sanctioned exception `architecture.md` already grants for
adapters. Scene components render what the layout says and hold no coordinates
of their own; the hard-coded `Barn` in `FarmScene.tsx` goes. `.dependency-cruiser.cjs`
gains `world` in `adapters-not-each-other-nor-apps` and `presentation-not-adapters`.

**Schema sketch** (v1; the real coordinates are the Phase 2 ticket's job).
Ground is flat, so triggers, paths and arrival points are 2D `[x, z]`; placed
things are 3D `[x, y, z]` with rotation about Y only — matching the §8 asset
rules (origin at the base, facing −Z). Models are referenced by the id that
maps to `apps/web/public/models/<id>.glb`.

```json
{
  "version": 1,
  "ground": { "size": [30, 30], "material": "grass" },
  "camera": { "fov": 35, "offset": [9, 7, 12], "lookAtHeight": 0.6 },
  "paths": [
    { "id": "barn-to-feed-shed", "width": 1.2, "points": [[0, 2.5], [4, 6], [8, 7]] }
  ],
  "hotspots": [
    {
      "id": "barn",
      "model": "buildings/barn",
      "position": [0, 0, 0],
      "rotationY": 0,
      "arrival": [0, 2.5],
      "trigger": { "shape": "circle", "centre": [0, 2.5], "radius": 2 },
      "cameraAnchor": { "position": [6, 5, 9], "lookAt": [0, 0.6, 0.5] }
    }
  ],
  "props": [
    {
      "model": "props/fence",
      "instances": [
        { "position": [10, 0, 4], "rotationY": 0 },
        { "position": [12, 0, 4], "rotationY": 0 }
      ]
    }
  ]
}
```

- `hotspots[].id` is a `HotspotId`; the parser requires **each of the seven
  exactly once**.
- `trigger` is `circle` or `box` (`centre`, `size`, `rotationY`); triggers may
  not overlap, and every `arrival` point lies inside its own trigger.
- `props[].instances` is the instancing unit: one entry → one `InstancedMesh`
  (`performance-budget.md` rule 3).
- `cameraAnchor` must satisfy `art-direction.md` §2: elevation 20–35°, no
  cut — the scene eases to it.
- Everything else (`fov`, `material`, model ids) is a closed set the parser
  checks; unknown keys are an error, so a typo cannot ship silently.

**Tests that come with the file** (`packages/world`, in the gate): parse
round-trip and every failure mode (missing hotspot, duplicate id, unknown
model, overlapping triggers, arrival outside trigger, anchor elevation out of
range); the farm bounds rule (every placement inside `ground.size`); the
crossing rule (farthest hotspot pair ÷ keeper walk speed ≤ 8 s); and
`hotspotContaining` at boundaries. Presentation adds one component test that
renders `FarmScene` from a two-hotspot fixture layout, and the existing e2e
smoke keeps proving the world mounts.

### Format choice: JSON, not a `.ts` module

A `.ts` layout would type-check in the editor, but JSON is what every other
tool can read and write — the tweak mode, a Blender import script, Playwright,
a future level tool — without a TypeScript compiler in the loop, and the parser
gives us stricter checks than the type system (ranges, overlap, closed sets).
The parser is hand-written in the idiom of `packages/persistence/src/parse-farm-save.ts`
rather than a schema library, so `@sf/world` stays dependency-free.

## Alternatives considered

- **A. Blender scene export to glTF, named empties as hotspots.** Fits the asset
  pipeline perfectly and James would enjoy it, but the source of truth becomes
  a binary `.blend` no agent can diff or edit from a ticket, tests need a glTF
  parser to learn where the nest is, and a single scene GLB pulls against
  per-hotspot loading. Kept as an *input path*: if James prefers to block the
  farm out in Blender, a one-way `scripts/layout-from-glb.ts` (using
  `@gltf-transform/core`) turns named empties + `extras` into the JSON, which
  stays canonical.
- **B. Triplex.** A good tool, free, and up to date with r3f 9 / React 19 — but
  its whole model is "the scene is JSX": positions become props inside
  presentation components, which is exactly the layout-in-rendering-code
  coupling the architecture forbids, and nothing outside React can read them.
  Its docs also want components self-contained (no context) to render in the
  editor, which fights our composition-root wiring. It also would not edit a
  JSON layout at all. Small maintainer base. Anyone is free to install it for
  poking at a *component* (a prop's look), just not for the world layout.
- **C. A bespoke in-app editor writing JSON.** Same data model as the decision,
  so it is not really an alternative — it is a cost question. A full editor
  (selection, gizmos, undo, save-to-repo) is weeks of agent time plus upkeep
  for a world of seven hotspots. Reduced to its cheapest useful slice as a
  follow-up: a dev-only `?layout=edit` mode behind `import()` with drei
  `TransformControls` on hotspots/props that copies the resulting JSON to the
  clipboard for an agent to commit. If that slice is not enough, this ADR is
  revisited rather than the editor quietly growing.
- **D. Hand-authored JSON + schema + preview** — chosen.
- **E. Tiled.** Free, open JSON, agents can edit it, and it was on the original
  ticket. But it models a 2D tile grid; our farm is free-placed 3D with heights,
  Y-rotations and camera anchors that would all live in custom properties, the
  editor shows no 3D preview, and tile-layer CSV arrays diff badly. It would
  add a vocabulary without removing any work.
- **Theatre.js.** Solves camera and animation sequencing, not layout, and has
  had no release since 2024. Not a fit for this decision; possibly for
  cinematics later.
- **Coordinates in `FarmScene.tsx` (status quo).** Fine for one barn; at seven
  hotspots and props it is layout-as-code with no tests and no way for a
  non-coder to move anything.

## Consequences

- **Positive:** every layout change is a reviewable JSON diff an agent can make
  from a ticket; art-direction rules become failing tests instead of review
  comments; `domain`/`application` stay Three.js-free; per-hotspot loading and
  instancing fall out of the data shape; zero licence cost and no dependency on
  a one-maintainer tool; Blender is not excluded, just not the source of truth.
- **Negative / cost:** James's "a bit to the left" loop is numbers-and-reload
  until the tweak mode lands; hand-placing a few dozen props by coordinate is
  tedious (mitigated: agents do the first pass, tweak mode adjusts); the parser
  and its tests are ~a day of agent work that a GUI tool would have given us
  for free; a second farm or land expansion (Phase 6+) may outgrow a
  hand-edited file.
- **Follow-ups (Phase 2 tickets, in order):**
  1. `@sf/world` package: types, parser, `hotspotContaining`, `farm.json` v1
     with the seven hotspots placed per `art-direction.md` §2, full test set
     listed above; dependency-cruiser rules updated. (S)
  2. `FarmScene` renders from the layout: ground, paths, hotspot models,
     instanced props, trigger volumes, camera anchors; composition root loads
     it; hard-coded `Barn` removed; component test on a fixture layout. Depends
     on the asset-pack ADR for real GLBs (placeholders until then). (M)
  3. Dev-only layout tweak mode (`?layout=edit`, lazy-loaded, excluded from
     the production `size-limit` chunks): drag hotspots/props, copy JSON.
     Timebox 1 day; if it needs more, stop and note why here. (S)
  4. Optional, only on request: `scripts/layout-from-glb.ts` — Blender empties
     + extras → `farm.json`. (S)
  5. Tap-to-move / navmesh (already a Phase 2 bullet) derives its walkable
     area from `ground` minus hotspot footprints in this file — note the
     dependency when that ticket is written.
- **What would make us revisit:** more than one farm or a land expansion that
  needs hundreds of placements (then Blender-authored, script-imported layouts
  become worth their cost); James finds the JSON + tweak-mode loop too slow
  after a real playtest week; Triplex or a successor gains a data-driven /
  headless mode that edits JSON rather than JSX; a maintained r3f scene-graph
  editor with a stable file format appears.

## Facts not confirmed online

- The Blender manual page itself returned HTTP 403 to our fetcher; the quoted
  wording comes from a 4.5 manual mirror and matches search-engine excerpts of
  the official page.
- Triplex's monorepo has no root LICENSE; AGPL-3.0 was read from
  `apps/vscode/LICENSE` and the renderer package points at the same file
  convention. Treat "editor is AGPL, free on the marketplace" as the current
  state, not a guarantee.
