# ADR-0005: World layout tooling — a procedural tile world with authored overrides

- **Status:** proposed (James decides)
- **Date:** 2026-09-08; revised 2026-10-08
- **Deciders:** James Hoffman (sole developer, working with AI agents)
- **Ticket:** SF-65 "Spike: world layout tooling decision"; revised for SF-87 (#118)

> **Update 2026-10-11 — ADR-0006 (Godot).** The game moved to Godot 4.7. The
> **Godot editor replaces the in-browser world editor** (`?edit=1`, SF-87) as
> the way James places things by eye; `@sf/world`, `farm.json` and the editor
> stay only as long as `apps/web` does (SF-96). **Whether the procedural tile
> world continues is open — not decided here.** James's 2026-10-08 requirement
> still stands: *"the game needs to be expandable so we need to have a
> procedural process for laying ground and building tiles."* In Godot that can
> be served by a **GridMap** over a **MeshLibrary** built from the Kenney tiles
> (painted in the editor, filled by script), or by a generator script that
> writes nodes or a GridMap from (seed, rules) with James's edits layered on
> top — the same "generate + overrides" idea as below. The choice belongs to
> the scene work (SF-95) and James. The rest of this ADR is kept as decided for
> the r3f client.

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
  pre-pay for a level editor we may never need. *(Superseded 2026-10-08:
  expansion is now a requirement — see the next force.)*
- **James** is a C#/TS developer with Unity side-project experience: comfortable
  in a 3D editor, equally comfortable editing a data file with hot reload.

- **Expansion and visual editing (added 2026-10-08).** James Hoffman: *"the
  game needs to be expandable so we need to have a procedural process for
  laying ground and building tiles. I would like a way to visually adjust
  things myself at times."* Land is going to grow, and James wants to place
  things by eye, not by typing coordinates. On the same day: **Kenney assets
  only** (no Synty), **GLB-native only, no format conversions** (ADR-0003).

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

> **Revised 2026-10-08** after James's requirement above. The first version of
> this ADR (2026-09-08) chose option D on its own: one hand-placed JSON file of
> coordinates. That version cannot grow with the land, so it is superseded.
> The options table below is kept as written, with a note on what changed.

**The farm is a procedural tile world: generated tiles from (world seed,
rules), plus a small authored overrides file on top. James edits it in an
in-browser world editor that saves that overrides file. The world grows by
adding fixed-size chunks.** It is still plain, schema-checked data owned by the
framework-free `@sf/world` package and rendered by `apps/web`. It is not a
Blender scene, not JSX props, and not a hand-placed coordinate list. Blender
stays the tool for **models** only (the gaps in ADR-0003's inventory), never
for **placement**. Every piece is a Kenney GLB, loaded as shipped. There is no
Synty and no format conversion (James, 2026-10-08).

The three parts:

1. **Data = generate(seed, rules) + overrides.** The world is never stored
   tile by tile. `buildTileWorld({ seed, anchors, overrides, rngFor }, chunks)`
   rebuilds it deterministically every time:
   - **Anchors.** The seven hotspots come from `layouts/farm.json` (SF-74),
     snapped to multi-tile footprints with an entrance and an arrival tile.
   - **Rules.** These are pure TypeScript with an injected `Rng`. The
     generator lays a path network joining every arrival (grid routing around
     footprints and water). It fences the paddock and training ring with
     autotiled fences and one gate facing the path. It puts placeholder
     wall, door and roof parts on the barn, shed and farmhouse until those
     structures are sourced. It may add a small pond, and it scatters decor
     by zone with keep-clear space around paths, gates and arrivals.
   - **Overrides.** `layouts/overrides.json` is a small diff with ops
     `set-ground`, `place-structure`, `remove-structure`, `place-decor`,
     `remove-decor` and `move-hotspot`. It is parsed by `parseWorldOverrides`,
     which never throws, the same contract as `parseFarmLayout`. A
     `move-hotspot` applies before generation, so paths re-route to the new
     arrival. Every other edit applies after generation, in file order.
     Because the overrides are an input to the build and not a patch on its
     output, regenerating, or changing the seed, never loses one of James's
     edits.
2. **Editing = the in-browser world editor** (#105, now P1). It is dev-only,
   behind `import()` on a query flag, and seen through the real game camera.
   James can paint ground, place and remove pieces, and drag hotspots. Every
   action becomes an edit in the overrides file, which the editor saves for an
   agent or James to commit. Agents can still edit the same file by hand from
   a ticket. This is option C's GUI, promoted from "timeboxed tweak mode" to
   the main way James adjusts the world, but writing a diff rather than the
   whole world.
3. **Expansion = chunks.** Tiles are 1 unit, because the Kenney kits are
   authored on a 1 × 1 tile and 1 unit = 1 m. Chunks are 16 × 16 tiles,
   addressed by integer chunk coordinates, so the ~30 × 30 farm starts on the
   four chunks round the origin.
   - A chunk is built only from (seed, anchors, overrides, chunk coordinate),
     never from which other chunks exist. Adding land therefore never changes
     land already built.
   - Paths cross chunk edges at connectors chosen from (seed, edge) alone, so
     the chunks on both sides agree and new land meets a path stub that was
     already waiting.

The world package knows **piece kinds, never file paths**:
- ground: `grass`, `dirt`, `path`, `water`;
- autotiled: `fence` and `path`, each with the roles `end`, `straight`,
  `corner`, `tee` and `cross`, plus `fence-gate`;
- building parts: `building-wall`, `building-wall-door`,
  `building-wall-window`, `building-roof`;
- decor: `tree`, `tree-tall`, `bush`, `rock`, `crate`, `barrel`, `hay-bale`,
  `crop`;
- one `hotspot:<id>` per hotspot.

An adapter in `apps/web` maps each `PieceId` to a Kenney GLB from ADR-0003's
inventory. Typed as `Record<PieceId, string>`, a new kind fails the build
until it is mapped.

### Why this and not the others — weighted comparison (2026-09-08)

The table scores the options as they stood on 2026-09-08, for a fixed world of
seven hotspots. **What changed on 2026-10-08:** land expansion moved from
"Phase 6+, maybe" to a requirement, and James asked to adjust the world
visually himself. Under that requirement, D's weakness becomes decisive: by
its own consequences it "may outgrow a hand-edited file". C's GUI stops being
optional. E's tile model turns out to be right for the ground, even though the
Tiled editor is still the wrong tool. The revised decision keeps D's strengths:
plain JSON, a never-throws parser, a gate that tests the rules, and diffs an
agent can make. It shrinks the hand-edited part to a diff, and adopts C's
editor to write it.

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

Option C scored close to D because it *is* D plus a GUI; in 2026-09 the GUI
did not earn its build cost. Under the 2026-10-08 requirement it does. It
also costs less than C as scored, because the editor writes a small diff over
generated tiles. It does not hand-place a whole world.

### The hotspot layout file (SF-74, unchanged in role)

The tile world sits on top of this file: `farm.json` still says where the
seven hotspots are, and the generator reads them as anchors. The sketch below
is the 2026-09 proposal; the shipped schema is in PR #25.

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
dependency rule is enforceable. *(As built: `@sf/world` depends on nothing —
`HotspotId` lives in `@sf/world`, since nothing else defined it — and is in
the same dependency tier as `domain`. `domain` and `application` never import
`@sf/world`.)* The tile world adds `src/tile-*.ts`, the generator, the
overrides parser and `layouts/overrides.json` to the same package.

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
  revisited rather than the editor quietly growing. *(2026-10-08: revisited.
  The editor is now #105, P1, and writes the overrides diff.)*
- **D. Hand-authored JSON + schema + preview.** Chosen on 2026-09-08. Its
  data discipline (plain JSON, never-throws parser, rule tests) carries into
  the revised decision. Its "hand-place every coordinate" model does not
  scale to expansion, so it now covers only the seven hotspot anchors
  (`farm.json`).
- **E. Tiled.** Free, open JSON, agents can edit it, and it was on the original
  ticket. But it models a 2D tile grid; our farm is free-placed 3D with heights,
  Y-rotations and camera anchors that would all live in custom properties, the
  editor shows no 3D preview, and tile-layer CSV arrays diff badly. It would
  add a vocabulary without removing any work. *(2026-10-08: the tile grid
  idea is adopted for the ground, generated rather than painted, and stored as
  overrides rather than full tile arrays. The Tiled editor is still not used:
  it has no 3D preview and no game camera.)*
- **Theatre.js.** Solves camera and animation sequencing, not layout, and has
  had no release since 2024. Not a fit for this decision; possibly for
  cinematics later.
- **Coordinates in `FarmScene.tsx` (status quo).** Fine for one barn; at seven
  hotspots and props it is layout-as-code with no tests and no way for a
  non-coder to move anything.

## Consequences

- **Positive:**
  - The world grows a chunk at a time, and existing land never shifts.
    Tests prove this: adding chunks leaves every existing tile unchanged.
  - James adjusts things by eye in the editor, and his edits survive every
    regeneration and seed change, because they are an input to the build.
  - Each change is a small JSON diff of edits, not thousands of tiles, so it
    reviews well and an agent can still make it from a ticket.
  - Determinism is tested: the same seed and overrides always give the same
    world, and it survives a JSON round trip.
  - The rules are tested on the generated world: every hotspot is reachable
    along paths, each pen has exactly one gate on the path, and no decor sits
    on paths, gates or footprints.
  - `@sf/world` stays framework-free in the domain tier; no file paths leak
    into it.
  - Autotiling gives fences and paths the right Kenney piece and rotation for
    free.
- **Negative / cost:**
  - A generator, an autotiler and an overrides parser are more code than one
    hand-edited file (SF-87 is M-sized), and the generator's look depends on
    tuning rules rather than placing things directly.
  - The editor (#105) is real work: it moves from a 1-day timebox to a P1
    story.
  - A tile grid snaps everything to 1 unit, and quarter-turn rotation is
    all autotiling gives. A free-angle prop needs a non-tile placement later
    (revisit if it comes up).
  - Changing a rule regenerates every untouched tile. That is intended, but a
    change can move a tree James liked unless he pinned it with an override.
  - The placeholder building parts stand in for the barn, shed and farmhouse
    until those are sourced (ADR-0003 gaps).
- **Follow-ups:**
  1. **#118 (SF-87)**: tile world in `@sf/world`. Chunks, seeded generator,
     autotiling, authored overrides and their parser. In review as PR #119,
     stacked on PR #25 (SF-74, the hotspot layout package).
  2. **#104 (SF-75)**: `FarmScene` renders from the world. It renders a
     `TileWorld` instead of hand-placed props, with one `InstancedMesh` per
     piece id, and keeps the camera anchors and triggers from `farm.json`.
     It also adds the Kenney GLB adapter in `apps/web`: a
     `Record<PieceId, string>` onto the ADR-0003 inventory, with GLBs loaded
     as shipped.
  3. **#105 (SF-76)**: in-browser world editor, now P1. It is dev-only and
     lazy-loaded, and lets James paint ground, place and remove pieces and
     drag hotspots. It saves `layouts/overrides.json` and reports a
     `parseWorldOverrides` failure, never writing a file the game cannot load.
  4. Tap-to-move / navmesh derives its walkable area from the tile world:
     path and grass tiles, minus structures and water. Note the dependency
     when that ticket is written.
  5. Optional, only on request: a Blender → overrides import. It is not
     planned, since the editor covers placement.
- **What would make us revisit:**
  - the world needs free placement off the grid at scale;
  - generation becomes too slow to run on load (today it builds four chunks
    in milliseconds, but measure on a low-end phone once the adapter exists);
  - James finds the editor plus overrides loop too slow after a real playtest
    week;
  - a maintained r3f scene editor appears that edits data, not JSX.

## Facts not confirmed online

- The Blender manual page itself returned HTTP 403 to our fetcher; the quoted
  wording comes from a 4.5 manual mirror and matches search-engine excerpts of
  the official page.
- Triplex's monorepo has no root LICENSE; AGPL-3.0 was read from
  `apps/vscode/LICENSE` and the renderer package points at the same file
  convention. Treat "editor is AGPL, free on the marketplace" as the current
  state, not a guarantee.
