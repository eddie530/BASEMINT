#!/usr/bin/env bash
set -euo pipefail
# Build committed source only. Never start a server, deploy, or run database tests.
root="$(git rev-parse --show-toplevel)"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
git -C "$root" archive HEAD | tar -x -C "$work"
cd "$work"
find . -type f \( -name '.env' -o -name '.env.*' -o -name '.dev.vars' -o -name '.npmrc' \) -delete
mkdir -p "$work/.isolated-home"
# No inherited cloud credentials, production URLs, or package tokens.
clean() { env -i PATH="$PATH" HOME="$work/.isolated-home" CI=true "$@"; }
clean bun install --frozen-lockfile --ignore-scripts
clean bun x --no-install vitest run --config vitest.independent.config.ts
clean bun x --no-install vite build --config vite.independent.config.ts
echo "Build-only check complete; no deployment or runtime started."
