#!/usr/bin/env bash
set -euo pipefail
# Build committed source only. Never start the production application, deploy, or run database tests.
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
# Start only the synthetic loopback server, never the application runtime.
password="$(node -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("hex"))')"
env -i PATH="$PATH" HOME="$work/.isolated-home" CI=true RESIDENT_PREVIEW_PASSWORD="$password" bun preview/isolated-server.ts > "$work/preview.log" 2>&1 &
pid=$!
trap 'kill "$pid" 2>/dev/null || true; rm -rf "$work"' EXIT
for i in {1..20}; do
  if curl --noproxy '*' -u "preview:$password" -fs http://127.0.0.1:4179/ >/dev/null; then break; fi
  sleep 1
done
clean env RESIDENT_PREVIEW_PASSWORD="$password" bun preview/smoke.ts
kill "$pid"
wait "$pid" || true
env -i PATH="$PATH" HOME="$work/.isolated-home" CI=true RESIDENT_PREVIEW_PASSWORD="$password" bun preview/isolated-server.ts > "$work/preview.log" 2>&1 &
pid=$!
for i in {1..20}; do
  if curl --noproxy '*' -u "preview:$password" -fs http://127.0.0.1:4179/ | grep -q "Simulated order recorded"; then break; fi
  sleep 1
done
curl --noproxy '*' -u "preview:$password" -fs http://127.0.0.1:4179/ | grep -q "Simulated order recorded"
# Install browser tooling outside the app dependency graph.
mkdir "$work/browser-tools"
clean npm install --prefix "$work/browser-tools" --ignore-scripts --no-audit --no-fund playwright@1.56.1
# System dependencies are installed only on the disposable GitHub runner.
if [[ "${RESIDENT_CI_INSTALL_BROWSER_DEPS:-}" == "1" ]]; then
  clean node "$work/browser-tools/node_modules/playwright/cli.js" install-deps chromium webkit
fi
clean node "$work/browser-tools/node_modules/playwright/cli.js" install chromium webkit
clean env NODE_PATH="$work/browser-tools/node_modules" RESIDENT_PREVIEW_PASSWORD="$password" node preview/browser.cjs
echo "Independent build and synthetic loopback/browser checks complete; no deployment."
