#!/usr/bin/env bash
# Build a production bundle of the React frontend into frontend/build/.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
cd "$ROOT/frontend"

if ! command -v yarn >/dev/null 2>&1; then
    echo "yarn not found. Run ./scripts/install.sh first." >&2
    exit 1
fi

# Ensure REACT_APP_BACKEND_URL points to the local backend by default
if [ ! -f .env ] && [ -f .env.example ]; then
    cp .env.example .env
fi

# Make sure node_modules is in sync with package.json (auto-install missing deps
# after a git pull that bumped package.json — e.g. html-to-image, jspdf, ...).
NEED_INSTALL=0
if [ ! -d node_modules ]; then
    NEED_INSTALL=1
elif [ package.json -nt node_modules ] || [ yarn.lock -nt node_modules ]; then
    NEED_INSTALL=1
fi
if [ "$NEED_INSTALL" = "1" ]; then
    echo ">>> Installing/refreshing frontend dependencies (yarn install)..."
    yarn install --frozen-lockfile || yarn install
fi

echo ">>> Building production bundle..."
yarn build
echo ">>> Build complete: $ROOT/frontend/build"
