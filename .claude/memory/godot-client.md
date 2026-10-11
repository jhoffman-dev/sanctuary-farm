# Godot client (`game/`) — gotchas from SF-93

- **Fresh clone: import before testing.** GUT and the scenes rely on global
  `class_name`s, which exist only after `pnpm godot:import` has built
  `game/.godot/`. Without it GUT prints "Some GUT class_names have not been
  imported", runs **nothing and exits 0**. `game/tools/run_tests.sh` (what
  `pnpm godot:test` calls) therefore also requires GUT's "All tests passed"
  line; never call `gut_cmdln.gd` directly in CI.
- **`GODOT_BIN`** overrides the Godot path in every `godot:*` script (default
  `/Applications/Godot.app/Contents/MacOS/Godot`). CI sets it to the Linux build.
- **The web export uses our own template since SF-100**, not the stock one:
  `export_presets.cfg` points `custom_template/release` at
  `res://build/templates/web_nothreads_release.zip`, which
  `pnpm godot:template` (called by `godot:export:web`) downloads from the
  GitHub release named in `game/tools/web_template.lock` and checks by SHA-256.
  The lock's tag must equal `bash game/tools/web_template_id.sh` (a hash of
  `web_template.gdbuild` + `build_web_template.sh`), so editing either without
  publishing a new template fails the export on purpose. The
  `godot-template.yml` workflow builds and publishes on a push that changes
  them; copy the lock lines from its summary.
- **Build-profile gotchas (SF-100).** `deprecated` must be a SCons argument:
  SConstruct reads it *before* it applies `build_profile`, so in the profile it
  is silently ignored; `module_*_enabled` and `disable_*` work in the profile.
  The editor's "Detect from Project" is GUI-only (no CLI), and `disabled_classes`
  would break a scene the moment James uses a class it removed, so the profile
  turns off modules and build options only. Emscripten is pinned to 4.0.20, the
  version godotengine/build-containers' 4.7 `Dockerfile.web` builds the
  official templates with (Godot's own CI uses 4.0.11).
- **Export file names are content-hashed** (`game/tools/web_export/run_fingerprint.ts`):
  `engine-<hash>.{wasm,js,audio.worklet.js,audio.position.worklet.js}` and
  `game-<hash>.pck`; the page's `GODOT_CONFIG` gets `executable` + `mainPack`.
  Godot's loader derives the wasm and worklet URLs from `executable`
  (`platform/web/js/engine/config.js` `locateFile`), so they must share one stem.
- The Hosting emulator serves `.pck` with `Content-Type: false` unless
  firebase.json sets it; it brotli-compresses `.wasm`/`.js` but not `.pck`.
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
