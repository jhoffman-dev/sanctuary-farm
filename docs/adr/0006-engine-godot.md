# ADR-0006: Engine — Godot 4.7 (GDScript), in `game/` of this repository

- **Status:** accepted — supersedes ADR-0001's engine choice
- **Date:** 2026-10-11
- **Deciders:** James Hoffman
- **Tickets:** SF-92 epic (#140); this ADR and the skeleton are SF-93 (#141);
  rules port SF-94 (#142); the real farm scene SF-95 (#143); retiring `apps/web`
  SF-96 (#144)

## Context

ADR-0001 (2026-08-31) chose TypeScript + React + react-three-fiber over Unity
and Godot, mainly for distribution (a link that opens anywhere) and for the
tightest agent loop. It named the cost: three.js gives a runtime, not an
editor — *"no built-in visual scene editor"*. Phase 2 paid that cost in full.
Every change to how the world looks went through a description to an agent, a
screenshot, and another description; ADR-0005's in-browser editor (SF-87) was
built to shorten that loop and did not shorten it enough.

James, 2026-10-11:

> "Your UI is so far off base. Describing to you how to fix everything will
> probably take me longer than fixing it myself in a proper 3d engine."

James is a career C# developer with Unity experience. He wants to build the
scenes, layout, look and feel himself, in an editor; agents keep the rules,
saves, tests, CI and plumbing. Distribution — a free link that opens on a
school Chromebook and an old iPad — is still the top value (PRD, ADR-0001).

### Facts that decide it (assessment of 2026-10-08, re-checked against the 4.7 docs)

- **Godot 4 cannot export C# to the web.** The 4.7 docs: *"Projects written in
  C# using Godot 4 currently cannot be exported to the web."* A web game in
  Godot 4 is therefore **GDScript**.
- **The web export renders with the Compatibility renderer only** (WebGL 2).
  Forward+ and Mobile are not available in the browser. The project uses
  Compatibility everywhere, so the editor shows what the browser gets.
- **Single-threaded web export** (`variant/thread_support=false`, the default
  since 4.3) runs on iOS / macOS Safari and needs **no COOP/COEP
  (cross-origin isolation) headers** — so Firebase Hosting serves it as plain
  static files. The threaded build needs those headers and is not used.
- **No procedural audio on the web export**: `AudioStreamGenerator` is not
  available there. Our sounds today are synth recipes (`@sf/audio`,
  `recipes.ts`, docs/sound-design.md §2); in Godot they must be **pre-rendered
  to samples** (short `.ogg`/`.wav`), which sound-design.md's "samples earn
  their place" rule then has to cover for feedback sounds as well.
- **The engine is a multi-megabyte download.** The r3f shell budget was 100 kB
  gz to the first question (performance-budget.md). Measured for this
  skeleton's 4.7.2 web export (stock release template, no custom build):

  | File | Raw | gzip -9 | brotli -q 11 |
  | --- | --- | --- | --- |
  | `index.wasm` (the engine) | 39.51 MB | 10.05 MB | 6.90 MB |
  | `index.pck` (scenes, scripts, all 34 Kenney GLBs + 6 atlases) | 0.59 MB | 0.53 MB | 0.49 MB |
  | `index.js` (loader) | 0.28 MB | 0.07 MB | 0.06 MB |
  | **Total to first question** (incl. `index.html`) | **40.39 MB** | **10.66 MB** | **7.46 MB** |

  Measured by `game/tools/export_size.mjs` (Node zlib, brotli window 24 to
  match the CLI), which the CI `godot` job runs on every PR.

  At the budget's 10 Mbps school Wi-Fi that is ~6–9 s of transfer before the
  engine starts, against a 3.5 s / 6 s first-question budget. **The load lines
  of performance-budget.md must be re-baselined for Godot** (below); they cannot
  be met by the stock template.

## Decision

1. **The game moves to Godot 4.7, written in GDScript**, in a new **`game/`**
   folder of this repository. Godot 4.7.2 stable is pinned (local, CI and the
   export templates). Web is still the primary target.
2. **Web export settings:** Compatibility renderer (also for mobile),
   single-threaded, VRAM texture compression for desktop **and** mobile
   (`import_etc2_astc=true`, both export flags on) so any compressed texture
   ships in a form both a Chromebook and an iPad can use. Kenney's six 512²
   palette atlases are the exception, pinned to lossless import: they are tiny,
   and block compression would shift the colours art-direction §3 measures.
   Window 1280 × 800, stretch `canvas_items` / `expand`.
3. **Clean Architecture carries over as folders** (docs/architecture.md, "Godot
   client"): `domain/` (plain `RefCounted` classes, no nodes, no engine I/O, no
   `Time`, no `randi` — a `Clock` and an `Rng` are injected), `app/` (use-cases +
   ports), `adapters/` (thin Godot implementations), `scenes/` (presentation,
   zero rules). **`game/tools/check_layers.sh` plays dependency-cruiser's role**:
   CI fails if a file in `domain/` or `app/` names `Node`, `get_tree`, `Engine`,
   `OS`, `Time`, `randi`/`randf`, `RandomNumberGenerator`, `ResourceLoader`,
   `FileAccess`/`DirAccess`, `JavaScriptBridge` or `Input`, loads a path from an
   outer layer, or names an outer layer's `class_name` (GDScript class names are
   global, so a path check alone would miss them). Proven on 2026-10-11 by a
   deliberate violation in each layer (exit 1, six findings), then removed.
4. **Tests: GUT 9.7.1**, vendored in `game/addons/gut/` (MIT; version, commit
   and archive hash in `game/assets/LICENSES.md`), tests in `game/tests/`, run
   headless through `game/tools/run_tests.sh` (`godot --headless -s
   addons/gut/gut_cmdln.gd`, failing unless GUT reports a full pass — see
   below). The web build has a Playwright smoke (`game/tests/web/`) that
   loads the export, answers one question and checks the coin count rises.
5. **Division of labour.** James builds scenes, layout, look and feel in the
   Godot editor. Agents own `domain/`, `app/`, `adapters/`, tests, CI and
   tooling, and only touch `scenes/` for wiring (signals, node lookups) — never
   for layout or style.

### Why GUT over gdUnit4

Both are maintained and both run headless. GUT won on the things CI needs:

- **A release made for 4.7.** GUT 9.7.0/9.7.1 are the "compatibility changes for
  Godot 4.7" releases (4.7 tightened return-type checks; GUT changed its doubles
  for it). Pinning 9.7.1 pins a version tested against our engine.
- **Pure GDScript, one entry point.** `-s addons/gut/gut_cmdln.gd` with a
  `.gutconfig.json`; nothing to build, no .NET, exit code 1 when a test fails.
  One trap, found 2026-10-11: on a project that has never been imported GUT
  reports missing class names, runs **no** tests and exits 0, so
  `run_tests.sh` also requires its "All tests passed" line (proven both ways).
- **Smaller surface.** We need asserts, signal watching, scene instancing and
  fakes we write ourselves; GUT's doubles are a bonus, not a dependency.

gdUnit4 (6.2.2) has a richer assertion and mocking API and C# support we cannot
use on the web. Its command-line runner treats headless mode as unsupported by
default (it must be overridden with a flag), which is the wrong default for a CI
gate. It was not trialled here; if GUT ever blocks us, it is the fallback.

### Coverage

**Neither GUT nor gdUnit4 measures GDScript line coverage**, and the engine
exposes no line-hit hook. Until a tool exists, the bars are held this way:

- **Domain + app (the high-impact slice, 90 % bar):** every public function and
  every rule has a named test — checked in review against the test list (the
  SF-94 port carries the TypeScript tests across one for one, which is itself
  the coverage evidence: `@sf/domain` is at ≥ 90 % today).
- **Repo-wide 70 %:** the TypeScript packages keep their enforced
  `vitest --coverage` until SF-96 retires them. For `game/`, SF-94 should
  evaluate a GDScript coverage add-on or a "every public `func` is called from a
  test" check in CI; neither is assumed here.

## Alternatives considered

- **Stay on react-three-fiber.** Keeps a 100 kB shell, the agent loop and every
  existing test. Rejected: the problem is not the runtime but the authoring
  loop, and James's time is the scarcest resource on the project. ADR-0005's
  in-browser editor was the attempt to fix authoring inside r3f; it did not get
  close enough to an engine editor to change his mind.
- **Godot 4.7 (chosen).** A real scene editor, open source (fits the free
  ethos), a few-MB web export that runs without special headers, text scene
  files agents can read and diff. Costs: GDScript instead of C#; the download;
  Compatibility renderer only; no procedural audio on web; a smaller ecosystem
  and less agent training data than Unity (ADR-0001's objection, which still
  holds but is outweighed by James doing the editor work himself).
- **Unity 6.** James knows it best and its editor is the most capable. Rejected
  on distribution, as in ADR-0001: Unity's web build is a heavier download than
  Godot's, its mobile-web support is officially limited, and its scene/prefab
  YAML is harder for agents to review than Godot's `.tscn`. C# would be a
  benefit here — the one place Unity beats Godot for this team.

## Consequences

**Carries over unchanged:** the landing page (`apps/landing`), Firebase (hosting
site `sanctuary-farm`, functions codebase, named Firestore DB, the shared
`student-games-be188` rules in docs/deploy.md), every doc and ADR, CI, the board,
and the Kenney GLBs (copied unmodified into `game/assets/kenney/`).

**Ported, with their tests (SF-94, #142):** the learning rules in
`packages/domain` and the use-cases in `packages/application` — scheduler
(Leitner + latency + interleave + tiers), curriculum, economy, save model,
`createFarmGame`. `SeededRng` already matches the TypeScript mulberry32 bit for
bit, so seeded tests can be carried across with their expected values.

**Retired once Godot reaches parity (SF-96, #144):** `apps/web` and the
TypeScript packages only it uses (`@sf/domain`, `@sf/application`,
`@sf/persistence`, `@sf/audio`, `@sf/world`), with their gate steps
(`size-limit`, Lighthouse, dependency-cruiser). Until then both clients build
in CI and `pnpm gate` stays green for the web app.

**Positive:**

- James edits the farm directly. Agents stop describing pixels.
- Rules stay out of scenes by folder and by a CI check, so a scene can be
  rebuilt without touching the maths.
- One repo: docs, tickets, Firebase and CI stay where they are.

**Negative / cost:**

- **Load time.** ~7.5 MB brotli / 10.7 MB gzip before the first question,
  against a 100 kB shell. Re-baseline (follow-up below) and try a size-optimised
  custom web template (Godot's "optimizing a build for size": disable unused
  modules, `optimize=size`) — not measured here.
- **GDScript, not C#.** James's main language is unavailable for web builds.
  Static typing in GDScript closes part of the gap.
- **Audio** must become sample files; the synth recipes are re-rendered, not
  ported.
- **Accessibility.** The canvas owns all text; there is no DOM for screen
  readers or for Playwright. The skeleton mirrors the question and coins onto
  `<body data-*>` for the smoke test only. accessibility.md §3's "everything the
  child must read lives in the 2D DOM overlay" needs a Godot answer (AccessKit /
  a DOM mirror) — open.
- **No line coverage** for GDScript (above).
- **Two clients** until SF-96: twice the CI time and the risk of rules drifting.
  The port should be quick and `apps/web` should not gain features meanwhile.

**Follow-ups:**

- **Re-baseline performance-budget.md's load lines for Godot.** Measure: (1) the
  CI `godot` job's size report (wasm + pck, gzip and brotli) on every PR; (2) a
  Playwright timer from navigation to `data-sf-question` (first playable
  question) under the budget's throttling (10 Mbps, 150 ms RTT, 4× CPU); (3) the
  monthly device run on the reference Chromebook and iPad (SF-34). Set the new
  targets from those, and confirm Firebase Hosting serves the `.wasm` compressed
  (not verified yet).
- ADR-0005's world tooling: the Godot editor replaces the in-browser editor;
  whether the procedural tile world continues is open (ADR-0005 update).
- A custom size-optimised web export template, measured against the stock one.
- A Godot accessibility plan for the pad and HUD (screen reader, focus).
- Make the CI `godot` job a required check once James judges it stable.
