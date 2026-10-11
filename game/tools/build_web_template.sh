#!/usr/bin/env bash
# Builds Sanctuary Farm's size-optimised Godot web export template (SF-100):
# the 4.7.2 engine without the modules the game does not use
# (game/tools/web_template.gdbuild), full LTO, -Os, single-threaded, release
# only (no debugger). Output: web_nothreads_release.zip + its .sha256.
#
# Usage: bash game/tools/build_web_template.sh [out-dir]   (default game/build/templates)
# Env:   WEB_TEMPLATE_WORK_DIR — where the Godot source, emsdk and SCons live
#        (default ~/.cache/sanctuary-farm/web-template; ~2 GB, reused between runs).
#
# Everything that decides the output is pinned here, so a rebuild is the same
# engine: Godot's release commit, the Emscripten the official 4.7 web
# templates are built with, and SCons.
set -euo pipefail

GODOT_TAG=4.7.2-stable
GODOT_COMMIT=ed1daf0bf001b61586d9930840f2f1394092c079
# The official 4.7 release containers build web templates with Emscripten
# 4.0.20 (godotengine/build-containers, branch 4.7, Dockerfile.web).
EMSCRIPTEN_VERSION=4.0.20
SCONS_VERSION=4.9.1

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
profile="$repo_root/game/tools/web_template.gdbuild"
out_dir="$(mkdir -p "${1:-$repo_root/game/build/templates}" && cd "${1:-$repo_root/game/build/templates}" && pwd)"
work_dir="${WEB_TEMPLATE_WORK_DIR:-$HOME/.cache/sanctuary-farm/web-template}"
mkdir -p "$work_dir"

sha256() {
  if command -v sha256sum >/dev/null; then sha256sum "$1" | cut -d' ' -f1; else shasum -a 256 "$1" | cut -d' ' -f1; fi
}

fetch_pinned_checkout() { # <url> <tag> <dir> [expected-commit]
  local url="$1" tag="$2" dir="$3" expected="${4:-}"
  if [ ! -d "$dir/.git" ]; then
    git clone --quiet --depth 1 --branch "$tag" "$url" "$dir"
  fi
  if [ -n "$expected" ] && [ "$(git -C "$dir" rev-parse HEAD)" != "$expected" ]; then
    echo "error: $dir is not at $expected" >&2
    exit 1
  fi
}

fetch_pinned_checkout https://github.com/godotengine/godot.git "$GODOT_TAG" "$work_dir/godot" "$GODOT_COMMIT"
fetch_pinned_checkout https://github.com/emscripten-core/emsdk.git "$EMSCRIPTEN_VERSION" "$work_dir/emsdk"

"$work_dir/emsdk/emsdk" install "$EMSCRIPTEN_VERSION"
"$work_dir/emsdk/emsdk" activate "$EMSCRIPTEN_VERSION" >/dev/null
# shellcheck disable=SC1091 # emsdk writes this file at activate time
EMSDK_QUIET=1 source "$work_dir/emsdk/emsdk_env.sh"

if [ ! -x "$work_dir/venv/bin/scons" ]; then
  python3 -m venv "$work_dir/venv"
  "$work_dir/venv/bin/pip" install --quiet "scons==$SCONS_VERSION"
fi

cores="$(getconf _NPROCESSORS_ONLN)"
# production=yes is what the official templates use (static C++, no debug
# symbols); lto=full beats its thin default by a few hundred kB. deprecated=no
# is a command-line option because SCons reads it before the build profile.
(
  cd "$work_dir/godot"
  "$work_dir/venv/bin/scons" -j"$cores" platform=web target=template_release \
    threads=no production=yes optimize=size lto=full debug_symbols=no \
    deprecated=no build_profile="$profile" progress=no
)

built="$work_dir/godot/bin/godot.web.template_release.wasm32.nothreads.zip"
cp "$built" "$out_dir/web_nothreads_release.zip"
echo "$(sha256 "$out_dir/web_nothreads_release.zip")  web_nothreads_release.zip" > "$out_dir/web_nothreads_release.zip.sha256"
cat "$out_dir/web_nothreads_release.zip.sha256"
