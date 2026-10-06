#!/usr/bin/env bash
# Deploy supercellstats.com from a clean checkout to the directory Caddy serves.
#
# Safe to re-run. Builds into a scratch directory and swaps it in with a mv, so
# no visitor can ever hit a half-written dist/. Keeps the previous dist for
# rollback (and its assets are copied into the new dist for open tabs) and writes the deployed commit to dist/VERSION.
#
#   ./scripts/deploy.sh              # deploy origin/main
#   ./scripts/deploy.sh <ref>        # deploy a specific branch/tag/sha
#   ./scripts/deploy.sh --rollback   # put the previous dist back
#
# Caddy serves the directory directly, so no reload is needed for a frontend
# change. Nothing here needs root.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="${APP_DIR:-$HOME/apps/supercellstats}"
REF="${1:-origin/main}"

cd "$APP_DIR"

if [[ "$REF" == "--rollback" ]]; then
    if [[ ! -d dist.previous ]]; then
        echo "no dist.previous to roll back to" >&2
        exit 1
    fi
    rm -rf dist.failed
    mv dist dist.failed
    mv dist.previous dist
    echo "rolled back to $(cat dist/VERSION 2>/dev/null || echo 'unknown')"
    exit 0
fi

if [[ -n "$(git status --porcelain)" ]]; then
    echo "working tree at $APP_DIR is dirty — refusing to deploy" >&2
    git status --short >&2
    exit 1
fi

echo "==> fetching"
git fetch --prune origin
git checkout --detach "$REF"
SHA="$(git rev-parse --short HEAD)"
echo "==> deploying $REF ($SHA)"

echo "==> installing"
npm ci

echo "==> building"
rm -rf dist.new
npm run build
mv dist dist.new
echo "$SHA" > dist.new/VERSION

echo "==> swapping in"
rm -rf dist.previous
[[ -d dist ]] && mv dist dist.previous
mv dist.new dist
# Tabs opened before this deploy still lazy-load the old hashed chunks: keep the
# previous build's assets alongside (one generation only, see carry-assets.sh).
if [[ -d dist.previous ]]; then
    "$SCRIPT_DIR/carry-assets.sh" dist.previous dist
fi

echo "==> verifying"
for path in / /game/clash-royale /VERSION; do
    code="$(curl -s -o /dev/null -w '%{http_code}' "https://supercellstats.com${path}")"
    printf '    %-22s %s\n' "$path" "$code"
done
echo "live version: $(curl -s https://supercellstats.com/VERSION || true)"
echo "deployed $SHA — roll back with: $0 --rollback"
