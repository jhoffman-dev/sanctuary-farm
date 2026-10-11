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
  parsers check `typeof` first (`FarmProgressCodec._count`).
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
