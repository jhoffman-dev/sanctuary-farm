#!/usr/bin/env bash
# GDScript has no line-coverage tool, so this is the floor instead: every public
# function in domain/ and app/ must be called by name from at least one test.
# A static function counts when a test calls `ClassName.function(`; an instance
# method when a test calls `.function(` on anything. Names starting with `_`
# (private, and `_init`) are skipped. Comments are stripped before matching.
#
# Usage: game/tools/check_test_calls.sh [game-dir]   (exit 1 when one is never called)
set -euo pipefail

GAME_DIR="${1:-$(cd "$(dirname "$0")/.." && pwd)}"
tests="$(mktemp)"
trap 'rm -f "$tests"' EXIT

# Every test and test helper, comments removed (the fakes only implement ports).
find "$GAME_DIR/tests/unit" "$GAME_DIR/tests/integration" "$GAME_DIR/tests/support" -name '*.gd' -type f -print0 |
  xargs -0 sed -E 's/#.*$//' > "$tests"

missing=0
checked=0
while IFS= read -r file; do
  class="$(grep -oE '^class_name +[A-Za-z_][A-Za-z0-9_]*' "$file" | awk '{print $2}' || true)"
  [ -n "$class" ] || continue
  # Top-level functions only (no leading tab): "static func name(" or "func name(".
  while IFS= read -r line; do
    name="$(sed -E 's/^(static +)?func +([A-Za-z_][A-Za-z0-9_]*).*/\2/' <<< "$line")"
    case "$name" in _*) continue ;; esac
    checked=$((checked + 1))
    if [[ "$line" == static* ]]; then
      pattern="\\b${class}\\.${name}\\("
    else
      pattern="\\.${name}\\("
    fi
    if ! grep -qE "$pattern" "$tests"; then
      echo "${file#"$GAME_DIR"/}: ${class}.${name} is never called by a test"
      missing=$((missing + 1))
    fi
  done < <(grep -E '^(static +)?func ' "$file")
done < <(find "$GAME_DIR/domain" "$GAME_DIR/app" -name '*.gd' -type f | sort)

if [ "$missing" -gt 0 ]; then
  echo "check_test_calls: $missing of $checked public functions in domain/ and app/ are never called by a test." >&2
  exit 1
fi
echo "check_test_calls: all $checked public functions in domain/ and app/ are called by a test."
