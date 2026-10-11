# Sanctuary Farm — the Godot client

The game, in Godot 4.7 (ADR-0006). This folder is a normal Godot project.

## Open it in the editor

1. Install **Godot 4.7.2** — the standard build, **not** the .NET/C# one. The
   game is GDScript because Godot cannot export C# to the web.
2. Godot → **Import** → pick `game/project.godot` → **Import & Edit**.
3. The first open imports every model (a minute). The main scene is
   `scenes/farm/farm.tscn`; press **F5** to play it.

Command line, from the repo root (the scripts find Godot at
`/Applications/Godot.app/Contents/MacOS/Godot`; set `GODOT_BIN` to use another):

| Command | What |
| --- | --- |
| `pnpm godot:import` | import assets headless (needed once after a fresh clone, before tests) |
| `pnpm godot:test` | the layer check, then every GUT test, headless |
| `pnpm godot:export:web` | web build into `game/build/web/` with our own size-optimised engine (below); needs `gh` logged in the first time |
| `pnpm godot:size` | the export's raw / gzip / brotli sizes; fails over the ceilings in `docs/performance-budget.md` |
| `pnpm godot:e2e:web` | Playwright plays one question against that build |
| `pnpm godot:load:web` | times the first question on throttled school Wi-Fi (10 Mbps, 150 ms, 4× CPU), cold and warm |
| `pnpm godot:gate` | import, tests, export, size, smoke, in order |

Tests also run inside the editor: the **GUT** panel at the bottom (enabled as a
plugin) → Run All.

## Where things go

The one rule: **game rules never live in a scene.** A scene decides how things
look and feel; what happens next is decided in plain scripts that know nothing
about nodes. That keeps the rules testable without running the game, and it
means you can rebuild every scene without breaking the maths.

| Folder | What lives here | May use |
| --- | --- | --- |
| `domain/` | The rules — `packages/domain` ported case for case: facts and tiers, the scheduler (Leitner boxes, latency, interleave, egg rotation), mastery, coins, the save shape. Plain classes (`RefCounted`) and plain-data dictionaries, no nodes, no files, no clock, no randomness — those are handed in. | nothing else in the game |
| `app/` | Use-cases that run the rules (`FarmGame`, `HotspotArrivals`) and the **ports** they need (`SaveStore`, `Clock`; the `Rng` type lives in `domain/`). Returns plain read-models (`Question`, `AnswerFeedback`, `FarmSummary`, …). | `domain/` |
| `adapters/` | The real implementations of the ports: the save file in `user://`, the system clock, engine randomness, the browser page. Thin — they translate, they do not decide. | `app/`, `domain/` |
| `scenes/` | **Yours.** Scenes and their small scripts: the farm, the pad, the HUD. They show what `app/` returns and pass taps and keys back. `scenes/farm/farm.gd` is also where adapters are plugged into the use-case. | `app/` (and `domain/` types) |
| `assets/kenney/` | Kenney models, unmodified; licences in `assets/LICENSES.md`. | — |
| `tests/` | GUT tests (`unit/`, `integration/`), fakes for the ports, and the Playwright web smoke (`web/`). | everything |
| `tools/` | `check_layers.sh` — fails CI if `domain/` or `app/` reach for the engine or an outer layer. `check_test_calls.sh` — fails CI if a public function in `domain/` or `app/` is never called by a test (GDScript has no coverage tool). `oracles/` — prints what the TypeScript rules do on fixed seeds, for the equivalence tests. | — |

What this means in practice when you build a scene:

- **Move, restyle, replace anything** in `scenes/` — the farm layout, the pad's
  look, the HUD, the camera, lights. Keep node names that a script looks up
  (`%NumberPad`, `%Hud`, `%QuestionLabel`, …) or update the script with them.
- If a scene script starts deciding *what* happens (which fact, how many coins,
  whether an answer counts), that is a rule — ask for it to be added to
  `domain/` or `app/` and call it from the scene instead.
- New models: drop them under `assets/` with their licence; commit the
  `.import` file Godot writes next to each one. Never commit `.godot/` or
  `build/` (both are git-ignored).

## Web settings that matter

- Renderer: **Compatibility** (WebGL 2) everywhere — the only one the web export
  supports. What you see in the editor is what the browser gets.
- Web export is **single-threaded** (`variant/thread_support=false`): it runs on
  iPad/macOS Safari and on Firebase Hosting without special headers.
- **The engine is our own build** (SF-100): Godot 4.7.2 compiled without the
  parts the game does not use, listed in `tools/web_template.gdbuild`, which
  cuts the download by about a third. `pnpm godot:export:web` fetches it from a
  GitHub release (`tools/web_template.lock`) and checks its checksum. If a
  scene needs something the profile turned off — **2D physics or navigation,
  Jolt physics, CSG, regular expressions, visual shaders, GLTF loading at
  runtime, JPG/TGA/BMP/HDR images, networking, complex-script text (Arabic,
  Hindi, ...)** — the web build fails or shows nothing while the editor works
  fine. Remove that line from the profile and push: the "Godot web template"
  workflow builds a new engine and prints the two lines to put in the lock.
  To try a change locally first: `bash game/tools/build_web_template.sh`
  (~5 min on an M-series Mac after the first ~2 GB download), then
  `SF_WEB_TEMPLATE=local pnpm godot:export:web`.
- The export's engine and pack get content-hashed names (`engine-<hash>.wasm`,
  `game-<hash>.pck`) so Hosting can cache them for a year; only `index.html`
  is re-checked on every visit.
- No procedural audio on the web: sounds must be sample files (ADR-0006).
- Window 1280 × 800, stretch `canvas_items` / `expand`, so the UI scales to
  phones and wide screens.

## What is placeholder

Everything in `scenes/` is deliberately plain — SF-95 (#143) is the real farm.
The rules are not: `domain/` and `app/` are the TypeScript rules, ported with
their tests (SF-94, #142). Until a keeper walks, `scenes/farm/farm.gd` "arrives"
at the paddock on load and again after each round.

## Calling the game from a scene

- **Refusals are values, not crashes.** GDScript has no exceptions, so every call
  that can refuse returns a `Result`: check `ok`, then read `value` (or show
  nothing and read `error`). A refused call changed nothing.
- **Saving calls are coroutines** — `load_farm`, `answer`, `end_round`,
  `buy_feed`, `set_muted`, `when_saved`, `HotspotArrivals.arrive_at`. Always
  `await` them. They run one at a time, and the farm only moves once the save
  has landed.
- **Sounds are data.** `AnswerFeedback.sounds` names what to play (`fluent`,
  `correct`, `wrong`, `hatch`); the scene plays its sample files for them.

