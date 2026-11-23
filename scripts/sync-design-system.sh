#!/usr/bin/env bash
# Refreshes public/ds with a stripped public copy of the shared design system (rod brand only, self-hosted fonts).
# One command per bump:
#   DS_SRC=<the design system's git URL> scripts/sync-design-system.sh 0.39.0
# installs that tag outside this repo (the package is private and never named here) and copies the one-brand build.
# public/ds/VERSION is the stamp; the build refuses a copy whose VERSION differs from DS_VERSION in src/lib/ds-version.mjs (this script sets both).
# Or, with a copy script you already have: DS_COPY=<path to ds-copy.mjs> scripts/sync-design-system.sh
set -euo pipefail
cd "$(dirname "$0")/.."
want="${1:-}"
if [ -z "${DS_COPY:-}" ]; then
  : "${want:?give the version to install, e.g. 0.39.0}"
  : "${DS_SRC:?set DS_SRC to the git URL of the design system, kept outside this repo}"
  cache="$HOME/.cache/ds"
  rm -rf "$cache"/node_modules/@*/design-system   # npm keeps an old git install otherwise
  npm install --silent --no-save --no-audit --no-fund --prefix "$cache" "$DS_SRC#v$want" >/dev/null
  DS_COPY="$(ls -d "$cache"/node_modules/@*/*/scripts/ds-copy.mjs | head -1)"
fi
node "$DS_COPY" --public --brand rod --fonts public/ds brands/rod/design-system.css i18n.js check-i18n.mjs brands/rod/prose.global.js
got="$(cat public/ds/VERSION)"
if [ -n "$want" ] && [ "$got" != "$want" ]; then echo "sync-design-system: copied $got, wanted $want" >&2; exit 1; fi
sed -i "s/^export const DS_VERSION = .*/export const DS_VERSION = \"$got\";/" src/lib/ds-version.mjs
echo "public/ds is design system $got (rod brand). Commit public/ds and src/lib/ds-version.mjs."
