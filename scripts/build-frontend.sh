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

echo ">>> Building production bundle..."
yarn build
echo ">>> Build complete: $ROOT/frontend/build"
