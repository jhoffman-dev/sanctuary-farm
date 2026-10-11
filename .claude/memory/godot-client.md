# Godot client (`game/`) — gotchas from SF-93

- **Fresh clone: import before testing.** GUT and the scenes rely on global
  `class_name`s, which exist only after `pnpm godot:import` has built
  `game/.godot/`. Without it GUT prints "Some GUT class_names have not been
  imported", runs **nothing and exits 0**. `game/tools/run_tests.sh` (what
  `pnpm godot:test` calls) therefore also requires GUT's "All tests passed"
  line; never call `gut_cmdln.gd` directly in CI.
- **`GODOT_BIN`** overrides the Godot path in every `godot:*` script (default
  `/Applications/Godot.app/Contents/MacOS/Godot`). CI sets it to the Linux build.
- **Web export templates** live in
  `~/Library/Application Support/Godot/export_templates/4.7.2.stable/` (macOS) or
  `~/.local/share/godot/export_templates/4.7.2.stable/` (Linux). Only the
  `web_nothreads_*` zips are needed; the full `.tpz` is 1.3 GB — verify it
  against the release's `SHA512-SUMS.txt`.
- **`check_layers.sh` reads class names too.** GDScript classes are global, so
  `domain/` naming `UserFileSaveStore` is caught even without a path. It strips
  `#` comments but not strings: an error message in `app/` that names an
  adapter class fails the check (reword the message).
- **GDScript has no exceptions.** The TS domain throws on caller bugs; the
  port returns an empty/null value and documents it (`FactTable.build` of a bad
  size is `[]`). Comparing a String to an int with `==` is a runtime error, so
  parsers check `typeof` first (`FarmSaveCodec._count`).
- **`SeededRng` is bit-identical to `@sf/domain`'s mulberry32.** Compare draws
  as `int(draw * 2^32)`, not as long float literals — GDScript and JS round some
  17-digit literals differently.
- **Kenney GLBs face +Z in Godot.** Do not copy the r3f catalogue's
  `quarterTurns: 2`; the skeleton turns characters ~35° toward the §2 camera.
  The Mini Characters' idle holds the arms 30–45° below a T-pose, so they read
  as "out" from the game camera — not a bug (same finding as the r3f client).
- **Kenney clips import without a loop flag.** `scenes/farm/farm.gd` sets
  `idle` to `LOOP_LINEAR` at runtime rather than editing `.import` files.
- **Colormaps are pinned lossless** (`detect_3d/compress_to=0` in each
  `colormap.png.import`), otherwise the editor flips them to VRAM compression
  the first time it sees them in 3D and rewrites the `.import` files.
- **The canvas has no DOM text.** `adapters/web_page.gd` mirrors the question and
  coins onto `<body data-sf-question / data-sf-coins>` for the Playwright smoke
  (`game/tests/web/`). Keep those keys if the pad or HUD is rebuilt.
- **`user://` in tests** is the real per-user folder of the "Sanctuary Farm"
  project; integration tests use their own file name and delete it.

## Rules port (SF-94)

- **Refusals are `Result`s** (`domain/result.gd`): everywhere the TypeScript
  rules throw, the port returns `Result.failure(reason)`. `push_error` fails a
  GUT test by default (`failure_error_types`), so it is reserved for real
  bugs (writing to an immutable `Fact`), and tests expect it with
  `assert_push_error`.
- **State is plain-data Dictionaries**, as in TypeScript. `Dictionary ==` is
  deep, but `1 != 1.0` inside one and a float key never finds an int key — JSON
  hands every number back as a float, so `FarmSaveCodec` restores ints and
  `FactTuning.whole_number` normalises families/sizes from outside.
- **Typed loops over mixed numbers** (`for ms: float in [900, 900]`) are a
  runtime risk; the rules iterate untyped and convert with `float()`.
- **GDScript `sort_custom` is not stable.** TypeScript's `toSorted(...)[0]` is
  ported as a linear "first best" scan (`Selection.neediest`), which picks the
  same element.
- **FarmGame's saving calls are coroutines.** A coroutine called as a statement
  runs to its first `await` — that is how tests make a second tap while a held
  save (`InMemorySaveStore.hold_writes`) is pending. Using its return value
  without `await` is a parse error.
- **Equivalence oracles:** `pnpm exec vitest run --config
  game/tools/oracles/vitest.config.ts` rewrites
  `game/tests/oracles/typescript_oracles.json`; rerun it whenever the
  TypeScript rules change, or the GDScript equivalence tests go red.

## Audio (SF-97)

- **Sounds are rendered, not synthesised.** `node game/tools/render_sounds.mjs`
  runs the real `packages/audio` recipes in headless Chromium
  (`OfflineAudioContext`) and encodes with `oggenc` (`brew install
  vorbis-tools`; Homebrew's ffmpeg has no libvorbis). `--serial` is fixed so
  reruns are byte-identical. Rerun it whenever `recipes.ts` changes.
- **`GodotAudioBus` preloads every OGG** (const `STREAMS`) so an export filter
  that keeps only referenced resources still ships them. Adding a sound means a
  `Sounds` constant, a `SOUNDS` row in the render script, and a `STREAMS` entry;
  `test_godot_audio_bus.gd` fails until all three agree.
- **Playwright's runner makes every page user-activated** (and `page.evaluate`
  is a user gesture), so headless Chromium never shows the autoplay block in a
  spec. `game/tests/web/audio-unlock.spec.ts` re-imposes the policy with an
  init script and reads AudioContext states from the console, not `evaluate`.
  Godot resumes its context itself on the first pointer/key event.
- **A clicked HUD button eats Enter** (ui_accept) and the pad would stop
  submitting, so `Hud` releases focus after a pointer press; Tab still reaches it.
