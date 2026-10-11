#!/usr/bin/env bash
# Prints the id of the web export template the current build inputs make:
# the Godot version and a hash of the build profile and the build script.
# The template workflow publishes under this id; fetch_web_template.sh
# refuses a lock file whose id no longer matches, so a profile change
# cannot ship with a stale engine (SF-100).
set -euo pipefail
tools="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if command -v sha256sum >/dev/null; then hasher=(sha256sum); else hasher=(shasum -a 256); fi
inputs_hash="$(cat "$tools/web_template.gdbuild" "$tools/build_web_template.sh" | "${hasher[@]}" | cut -c1-12)"
echo "godot-web-template-4.7.2-$inputs_hash"
