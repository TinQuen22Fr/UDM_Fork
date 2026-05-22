#!/usr/bin/env bash
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
cd "$ROOT/backend"

VENV_PY="$ROOT/backend/.venv/bin/python"
if [ ! -x "$VENV_PY" ]; then
    echo "Virtualenv not found at $VENV_PY"
    echo "Run ./scripts/install.sh first."
    exit 1
fi

# Use the venv's python to run uvicorn (avoids any "activate" weirdness)
exec "$VENV_PY" -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload "$@"
