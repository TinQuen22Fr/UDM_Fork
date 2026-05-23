#!/usr/bin/env bash
# UDM Fork — one-shot updater.
#
# Pulls the latest code, refreshes Python + Node dependencies, rebuilds the
# production frontend bundle, and restarts both systemd user services.
#
# Use this every time you 'git pull' new changes from the repo:
#
#   ./scripts/update.sh
#
# This is the only command you need. It is idempotent and safe to re-run.

set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
cd "$ROOT"

C_GREEN=$'\e[32m'; C_YELLOW=$'\e[33m'; C_RED=$'\e[31m'; C_RESET=$'\e[0m'
log()  { echo "${C_GREEN}>>>${C_RESET} $*"; }
warn() { echo "${C_YELLOW}!! ${C_RESET} $*"; }
err()  { echo "${C_RED}xx ${C_RESET} $*" >&2; }

# 1) Pull
if [ -d .git ]; then
    log "git pull"
    git pull --ff-only || warn "git pull skipped or failed (continue)"
else
    warn "Not a git checkout, skipping git pull"
fi

# 2) Refresh backend deps if requirements.txt changed since last venv refresh
if [ -x backend/.venv/bin/python ] && [ -f backend/requirements.txt ]; then
    if [ backend/requirements.txt -nt backend/.venv/bin/python ]; then
        log "backend requirements changed -> reinstalling"
        ./backend/.venv/bin/pip install -r backend/requirements.txt
    else
        log "Backend deps already up to date"
    fi
else
    warn "backend/.venv missing -- run ./scripts/install.sh first"
fi

# 3) Rebuild frontend (the build script auto-runs yarn install if needed)
log "Rebuilding production frontend bundle"
"$HERE/build-frontend.sh"

# 4) Restart services so they pick up the new code + new bundle
if command -v systemctl >/dev/null 2>&1 \
   && systemctl --user list-unit-files 2>/dev/null | grep -q udm-fork-backend.service; then
    log "Restarting systemd user services"
    systemctl --user restart udm-fork-backend.service udm-fork-frontend.service
    sleep 1
    systemctl --user --no-pager --lines=0 status udm-fork-backend.service || true
    echo ""
    systemctl --user --no-pager --lines=0 status udm-fork-frontend.service || true
else
    warn "Services not installed yet; run ./scripts/install-systemd.sh"
fi

echo ""
log "Update complete. Reload the browser (Ctrl+Shift+R) to pick up the new bundle."
