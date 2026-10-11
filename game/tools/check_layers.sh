#!/usr/bin/env bash
# The dependency rule for the Godot client — what dependency-cruiser does for
# the TypeScript packages (ADR-0006). Dependencies point inward:
#   domain/  -> nothing (no engine, no I/O, no clock, no randomness)
#   app/     -> domain/ only
# GDScript's `class_name` makes every class global, so an import graph is not
# enough: the check also forbids naming an outer layer's classes.
#
# Usage: game/tools/check_layers.sh [game-dir]   (exit 1 on any violation)
set -euo pipefail

GAME_DIR="${1:-$(cd "$(dirname "$0")/.." && pwd)}"

# Engine singletons and calls that mean scene-tree access, I/O, a clock or
# randomness. Matched as whole words, outside comments.
ENGINE_WORDS='Node|Node2D|Node3D|get_tree|Engine|OS|Time|randi|randf|randi_range|randf_range|randomize|RandomNumberGenerator|ResourceLoader|FileAccess|DirAccess|JavaScriptBridge|Input'

violations=0

# Global class names declared under the given folders, as a grep alternation.
class_names_in() {
  local names=""
  local folder
  for folder in "$@"; do
    [ -d "$GAME_DIR/$folder" ] || continue
    names="$names $(grep -rhoE '^class_name +[A-Za-z_][A-Za-z0-9_]*' "$GAME_DIR/$folder" --include='*.gd' | awk '{print $2}' | tr '\n' ' ')"
  done
  echo $names | tr ' ' '|'
}

# report <layer> <description> <grep -E pattern> [-w]
report() {
  local layer="$1" what="$2" pattern="$3" word_flag="${4:-}"
  [ -n "$pattern" ] || return 0
  local file hits
  while IFS= read -r file; do
    # Strip comments so a doc line may say "no Node access".
    hits="$(sed -E 's/#.*$//' "$file" | grep -nE $word_flag "$pattern" || true)"
    if [ -n "$hits" ]; then
      while IFS= read -r hit; do
        echo "${file#"$GAME_DIR"/}:${hit%%:*}: $layer/ must not use $what: ${hit#*:}"
      done <<< "$hits"
      violations=$((violations + 1))
    fi
  done < <(find "$GAME_DIR/$layer" -name '*.gd' -type f | sort)
}

report domain "the engine, I/O, a clock or randomness" "$ENGINE_WORDS" -w
report domain "files outside domain/" 'res://(app|adapters|scenes)/'
report domain "classes from app/, adapters/ or scenes/" "$(class_names_in app adapters scenes)" -w

report app "the engine, I/O, a clock or randomness" "$ENGINE_WORDS" -w
report app "files from adapters/ or scenes/" 'res://(adapters|scenes)/'
report app "classes from adapters/ or scenes/" "$(class_names_in adapters scenes)" -w

if [ "$violations" -gt 0 ]; then
  echo "check_layers: $violations dependency-rule break(s) (docs/adr/0006-engine-godot.md)." >&2
  exit 1
fi
echo "check_layers: domain/ and app/ are clean."
