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
| `pnpm godot:export:web` | web build into `game/build/web/` (needs the 4.7.2 export templates) |
| `pnpm godot:e2e:web` | Playwright plays one question against that build |
| `pnpm godot:gate` | all four, in order |

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
- No procedural audio on the web: sounds must be sample files (ADR-0006).
- Window 1280 × 800, stretch `canvas_items` / `expand`, so the UI scales to
  phones and wide screens.

## What is placeholder

Everything in `scenes/` is deliberately plain — SF-95 (#143) is the real farm.
The rules are not: `domain/` and `app/` are the TypeScript rules, ported with
their tests (SF-94, #142). The placeholder farm has a walkable navmesh, the
keeper and one hotspot, the paddock: tap the dirt patch, she walks there, and
the pad opens on a question. When a round ends the pad closes; tap the paddock
again to play another.

## Dropping the keeper into your scene

The keeper is a ready-made component (SF-98): `scenes/keeper/keeper.tscn`. She
walks on a navmesh you bake, follows taps/clicks and WASD/arrow keys, blends
idle ↔ walk by her own speed, turns to face where she goes, and turns a
three-quarter view to the camera when she gets there. A `HotspotArea` marks a
place she can stop at; stopping inside one is what opens its activity.

Checklist for a new farm scene:

1. **Root script.** Keep `scenes/farm/farm.gd` on the scene's root node, with
   the `%NumberPad` and `%Hud` UI from the placeholder. It plugs the game in.
2. **Ground collision.** Whatever she walks on needs a collider
   (`StaticBody3D` + `CollisionShape3D`) on physics layer 1 — taps are cast
   onto it. (Change `TapToWalk → Ground Layers` if you use another layer.)
3. **Bake the navmesh.** Add a `NavigationRegion3D`, put the ground (and the
   fences, barn and other things she must walk round) under it, give it a new
   `NavigationMesh` with *Parsed Geometry Type* = Static Colliders,
   *Agent Radius* 0.5, *Agent Height* 1.75, then **Bake NavigationMesh** in the
   toolbar. Re-bake after moving anything under it.
4. **Drop in the keeper.** Instance `scenes/keeper/keeper.tscn` (drag it into
   the scene), name it `Keeper` and tick **Access as Unique Name**. Turn her to
   face where she should start.
5. **Place the hotspots.** For each place, add an `Area3D`, attach
   `scenes/hotspot/hotspot_area.gd`, set **Hotspot Id** (`paddock`, `barn`,
   `feed-shed`, `nest`, `training-ring`, `petting-zoo`, `farmhouse`), and give
   it a `CollisionShape3D` with a **BoxShape3D** sized over the ground there.
   Only the box's width and depth matter. Today only `paddock` opens
   something; the others answer "coming soon".
6. **Set the camera.** One `Camera3D` marked **Current**. Keys walk relative
   to it, and she turns to face it when she arrives.

What you can tune on the `Keeper` in the inspector:

| Property | Default | What |
| --- | --- | --- |
| Walk Speed | 3.75 m/s | Art-direction §2: the 30 m farm crossed in 8 s |
| Turn Rate | 10 rad/s | Turning toward where she walks |
| Facing Turn Rate | 4 rad/s | The unhurried look round to the camera on arrival |
| Arrival Radius | 0.25 m | How close to the tapped point counts as there |
| Face Camera On Arrival | on | Off: she keeps facing the way she walked |
| Reduced Motion | Follow Page | Follow Page uses the browser setting; Always / Never override it. Reduced motion = no walk bob (rest pose), instant turns |
| Model Scene | Kenney `character-female-a` | Any model with an `AnimationPlayer` holding the two clips below |
| Model Scale | 2.06 | Kenney's Mini Characters are ~0.78 m; she should be 1.6 m |
| Idle Clip / Walk Clip | `idle` / `walk` | Clip names in the model's AnimationPlayer |
| Crossfade Seconds | 0.25 | How long idle ↔ walk takes to blend |

On her children: `TapToWalk → Reach Tolerance` (0.75 m — how far off the
walkable ground a tap may land and still count), `TapCue → Fade Seconds` and
`Ring Color` (the soft ring shown where she cannot go — no sound, never red),
and `NavigationAgent3D → Path Height Offset` (0.3 m — a baked navmesh floats
above the ground; if you change the navmesh's *Cell Height*, set this to the
new gap so her feet stay on the ground).

## Calling the game from a scene

- **Refusals are values, not crashes.** GDScript has no exceptions, so every call
  that can refuse returns a `Result`: check `ok`, then read `value` (or show
  nothing and read `error`). A refused call changed nothing.
- **Saving calls are coroutines** — `load_farm`, `answer`, `end_round`,
  `buy`, `buy_feed`, `set_muted`, `when_saved`, `HotspotArrivals.arrive_at`. Always
  `await` them. They run one at a time, and the farm only moves once the save
  has landed.
- **An arrival only counts while she is still there.** Call
  `HotspotArrivals.keeper_moved()` whenever the keeper sets off (the farm root
  does, from the keeper's `set_off` signal). An arrival still waiting for a save
  then comes back `MOVED_ON` and opens nothing.
- **Sounds are data.** `AnswerFeedback.sounds` names what to play (`fluent`,
  `correct`, `wrong`, `hatch`); the scene plays its sample files for them.

