#!/usr/bin/env bash
# Install UDM Fork as two user-level systemd services so they:
#  - start automatically on login
#  - keep running in the background
#  - can be managed without sudo (systemctl --user ...)
#  - optionally keep running even when logged out (via 'loginctl enable-linger')
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
cd "$ROOT"

C_GREEN=$'\e[32m'; C_YELLOW=$'\e[33m'; C_RED=$'\e[31m'; C_RESET=$'\e[0m'
log()  { echo "${C_GREEN}>>>${C_RESET} $*"; }
warn() { echo "${C_YELLOW}!! ${C_RESET} $*"; }
err()  { echo "${C_RED}xx ${C_RESET} $*" >&2; }

log "Installing UDM Fork user systemd services"
log "Root: $ROOT"

# --- prerequisites ---
if [ ! -x "$ROOT/backend/.venv/bin/python" ]; then
    err "backend/.venv is missing. Run ./scripts/install.sh first."
    exit 1
fi

if ! command -v systemctl >/dev/null 2>&1; then
    err "systemctl not found. systemd is required."
    exit 1
fi

# --- build production frontend ---
if [ ! -d "$ROOT/frontend/build" ] || [ "${REBUILD:-0}" = "1" ]; then
    log "Building production frontend bundle (this may take 1-2 minutes)..."
    "$ROOT/scripts/build-frontend.sh"
else
    log "Production frontend bundle already exists ($ROOT/frontend/build). Set REBUILD=1 to force."
fi

# --- generate service unit files ---
UNIT_DIR="$HOME/.config/systemd/user"
mkdir -p "$UNIT_DIR"

for name in udm-fork-backend udm-fork-frontend; do
    src="$HERE/systemd/${name}.service.in"
    dst="$UNIT_DIR/${name}.service"
    sed "s|__ROOT__|$ROOT|g" "$src" > "$dst"
    log "Wrote $dst"
done

# --- reload + enable + start ---
systemctl --user daemon-reload
systemctl --user enable udm-fork-backend.service udm-fork-frontend.service

# Always restart so that a fresh `git pull` is picked up by both services.
# Without this, `enable --now` is a no-op when units are already running,
# which leaves them executing the previous backend code (causing 404
# "Not found" errors on newly added endpoints).
log "Restarting services to pick up latest code..."
systemctl --user restart udm-fork-backend.service udm-fork-frontend.service

sleep 2
echo ""
systemctl --user --no-pager --lines=0 status udm-fork-backend.service || true
echo ""
systemctl --user --no-pager --lines=0 status udm-fork-frontend.service || true

echo ""
log "Services installed and started."
echo ""
echo "  Backend:   http://localhost:8001/api/"
echo "  Frontend:  http://localhost:3000"
echo ""
echo "Useful commands (no sudo needed):"
echo "  systemctl --user status udm-fork-backend udm-fork-frontend"
echo "  systemctl --user restart udm-fork-backend"
echo "  systemctl --user stop  udm-fork-frontend"
echo "  journalctl --user -u udm-fork-backend -f"
echo "  journalctl --user -u udm-fork-frontend -f"
echo ""
if ! loginctl show-user "$USER" 2>/dev/null | grep -q 'Linger=yes'; then
    warn "By default the services stop when you log out of your desktop session."
    warn "To keep them running even when logged out, enable lingering:"
    warn "  sudo loginctl enable-linger $USER"
fi

echo ""
log "To uninstall:  ./scripts/uninstall-systemd.sh"
