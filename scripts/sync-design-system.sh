#!/usr/bin/env bash
# Refreshes ds/ with a stripped public copy of the shared design system (rod brand only).
set -euo pipefail
cd "$(dirname "$0")/.."
: "${DS_COPY:?set DS_COPY to the design system copy script (installed outside this repo)}"
node "$DS_COPY" --public --brand rod ds brands/rod/design-system.css i18n.js check-i18n.mjs
