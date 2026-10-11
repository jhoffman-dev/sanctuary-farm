#!/usr/bin/env bash
# Puts the size-optimised web export template (SF-100) where
# export_presets.cfg expects it: game/build/templates/web_nothreads_release.zip.
# Downloads the GitHub release asset named in web_template.lock with `gh`
# and checks its SHA-256. Skips the download when the file is already there
# and matches.
#
# SF_WEB_TEMPLATE=local keeps whatever zip is already there (one you built with
# build_web_template.sh) and checks nothing — for trying a profile change
# before CI has published it.
set -euo pipefail
tools="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
dest_dir="$tools/../build/templates"
dest="$dest_dir/web_nothreads_release.zip"
repo="${GITHUB_REPOSITORY:-jhoffman-dev/sanctuary-farm}"

if [ "${SF_WEB_TEMPLATE:-}" = "local" ]; then
  test -f "$dest" || { echo "error: SF_WEB_TEMPLATE=local but $dest does not exist" >&2; exit 1; }
  echo "using the local template at $dest (unverified)"
  exit 0
fi

# shellcheck disable=SC1091 # the lock is two variable assignments
source "$tools/web_template.lock"
expected_id="$(bash "$tools/web_template_id.sh")"
if [ "$WEB_TEMPLATE_TAG" != "$expected_id" ]; then
  echo "error: web_template.lock names $WEB_TEMPLATE_TAG, but the build profile and script make $expected_id." >&2
  echo "Run the 'Godot web template' workflow on this branch and copy the lock lines from its summary." >&2
  exit 1
fi

sha256() {
  if command -v sha256sum >/dev/null; then sha256sum "$1" | cut -d' ' -f1; else shasum -a 256 "$1" | cut -d' ' -f1; fi
}

if [ -f "$dest" ] && [ "$(sha256 "$dest")" = "$WEB_TEMPLATE_SHA256" ]; then
  exit 0
fi

mkdir -p "$dest_dir"
download="$(mktemp -d)"
trap 'rm -rf "$download"' EXIT
gh release download "$WEB_TEMPLATE_TAG" --repo "$repo" --pattern web_nothreads_release.zip --dir "$download"
actual="$(sha256 "$download/web_nothreads_release.zip")"
if [ "$actual" != "$WEB_TEMPLATE_SHA256" ]; then
  echo "error: $WEB_TEMPLATE_TAG's template has SHA-256 $actual, the lock expects $WEB_TEMPLATE_SHA256" >&2
  exit 1
fi
mv "$download/web_nothreads_release.zip" "$dest"
echo "fetched $WEB_TEMPLATE_TAG ($actual)"
