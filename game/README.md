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
| `domain/` | The rules: facts, grading, coins, progress. Plain classes (`RefCounted`), no nodes, no files, no clock, no randomness — those are handed in. | nothing else in the game |
| `app/` | Use-cases that run the rules (`PracticeSession`) and the **ports** they need (`SaveStore`, `Clock`; the `Rng` type lives in `domain/`). Returns plain read-models (`QuestionView`, `AnswerResult`). | `domain/` |
| `adapters/` | The real implementations of the ports: the save file in `user://`, the system clock, engine randomness, the browser page. Thin — they translate, they do not decide. | `app/`, `domain/` |
| `scenes/` | **Yours.** Scenes and their small scripts: the farm, the pad, the HUD. They show what `app/` returns and pass taps and keys back. `scenes/farm/farm.gd` is also where adapters are plugged into the use-case. | `app/` (and `domain/` types) |
| `assets/kenney/` | Kenney models, unmodified; licences in `assets/LICENSES.md`. | — |
| `tests/` | GUT tests (`unit/`, `integration/`), fakes for the ports, and the Playwright web smoke (`web/`). | everything |
| `tools/` | `check_layers.sh` — fails CI if `domain/` or `app/` reach for the engine or an outer layer. | — |

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
The "next question" rule in `domain/question_picker.gd` is a stand-in (uniform,
never the same fact twice); SF-94 (#142) ports the full scheduler (Leitner
boxes, latency, interleave, tiers) and its tests from `packages/domain`.
