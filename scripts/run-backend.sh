#!/usr/bin/env bash
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
cd "$ROOT/backend"
if [ -d ".venv" ]; then
    source .venv/bin/activate
fi
exec uvicorn server:app --host 0.0.0.0 --port 8001 --reload "$@"
