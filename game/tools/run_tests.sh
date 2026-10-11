#!/usr/bin/env bash
# Runs every GUT test headless and fails unless GUT reports a full pass.
# GUT's exit code alone is not trusted: before the project's first import it
# prints "Some GUT class_names have not been imported", runs nothing, and still
# exits 0 — a green run with no tests in it. Nor does a full pass prove every
# test ran: a test script that fails to parse is skipped with a warning, and
# its tests simply go missing from the count.
#
# Usage: game/tools/run_tests.sh    (GODOT_BIN overrides the Godot binary)
set -uo pipefail

GODOT="${GODOT_BIN:-/Applications/Godot.app/Contents/MacOS/Godot}"
GAME_DIR="$(cd "$(dirname "$0")/.." && pwd)"
log="$(mktemp)"
trap 'rm -f "$log"' EXIT

"$GODOT" --headless --path "$GAME_DIR" -s addons/gut/gut_cmdln.gd 2>&1 | tee "$log"
status=${PIPESTATUS[0]}

if [ "$status" -ne 0 ]; then
  echo "run_tests: GUT exited with $status." >&2
  exit "$status"
fi
if ! grep -q -- '---- All tests passed! ----' "$log"; then
  echo "run_tests: GUT did not report a full pass — has the project been imported? (pnpm godot:import)" >&2
  exit 1
fi
if grep -qE 'SCRIPT ERROR: Parse Error|Ignoring script .* does not extend GutTest' "$log"; then
  echo "run_tests: a test script did not parse, so its tests never ran (see the SCRIPT ERROR above)." >&2
  exit 1
fi
