#!/usr/bin/env bash
# UDM Fork installer (Linux).
# Installs backend (Python venv) + frontend (Node deps).
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
cd "$ROOT"

C_RED=$'\e[31m'; C_GREEN=$'\e[32m'; C_YELLOW=$'\e[33m'; C_RESET=$'\e[0m'
log()  { echo "${C_GREEN}>>>${C_RESET} $*"; }
warn() { echo "${C_YELLOW}!! ${C_RESET} $*"; }
err()  { echo "${C_RED}xx ${C_RESET} $*" >&2; }

log "UDM Fork installer"
log "Root: $ROOT"

# ---------- Detect Python ----------
PYTHON_BIN=""
for cand in python3.12 python3.11 python3.10 python3.9 python3; do
    if command -v "$cand" >/dev/null 2>&1; then
        PYTHON_BIN="$cand"
        break
    fi
done
if [ -z "$PYTHON_BIN" ]; then
    err "No suitable python3 found on PATH."
    err "Install it with: sudo apt-get install python3 python3-venv python3-pip"
    exit 1
fi
log "Using $PYTHON_BIN ($($PYTHON_BIN --version 2>&1))"

# Check venv module is available (Debian/Ubuntu separate it from Python)
if ! "$PYTHON_BIN" -c "import venv" >/dev/null 2>&1; then
    err "Python venv module is missing."
    err "On Debian/Ubuntu run:"
    PYVER=$("$PYTHON_BIN" -c 'import sys;print(f"{sys.version_info.major}.{sys.version_info.minor}")')
    err "  sudo apt-get install -y python3-venv python${PYVER}-venv python3-pip"
    err "On Fedora/RHEL:    sudo dnf install -y python3 python3-pip"
    err "On Arch:           sudo pacman -S --needed python python-pip"
    exit 1
fi

# ---------- Backend ----------
log "Setting up Python backend..."
cd "$ROOT/backend"

# (Re)create venv if missing or broken
if [ ! -x ".venv/bin/python" ]; then
    # Wipe a half-broken venv from previous attempts (e.g. when python3-venv was missing)
    rm -rf .venv
    if ! "$PYTHON_BIN" -m venv .venv; then
        err "Failed to create the virtualenv. Make sure python3-venv is installed."
        exit 1
    fi
fi

# Use the venv directly without sourcing activate (more portable)
VENV_PY="$ROOT/backend/.venv/bin/python"
VENV_PIP="$ROOT/backend/.venv/bin/pip"

if [ ! -x "$VENV_PY" ]; then
    err "Virtualenv was created but $VENV_PY is missing. Aborting."
    exit 1
fi

log "Upgrading pip..."
"$VENV_PY" -m pip install --upgrade pip wheel setuptools

log "Installing backend dependencies (this can take a minute)..."
"$VENV_PIP" install -r requirements.txt

log "Backend dependencies installed."

# Initial .env if missing
if [ ! -f "$ROOT/backend/.env" ] && [ -f "$ROOT/backend/.env.example" ]; then
    cp "$ROOT/backend/.env.example" "$ROOT/backend/.env"
    log "Created backend/.env from .env.example (SQM_MOCK=0 by default)."
fi

# ---------- Frontend ----------
log "Setting up React frontend..."
cd "$ROOT/frontend"

# Need Node first
if ! command -v node >/dev/null 2>&1; then
    err "Node.js is not installed."
    err "Install it with:  sudo apt-get install -y nodejs npm"
    err "Or (preferred, newer Node): https://github.com/nodesource/distributions"
    exit 1
fi
log "Using node $(node --version)"

# Resolve a working 'yarn' command
YARN_BIN=""
if command -v yarn >/dev/null 2>&1; then
    YARN_BIN="yarn"
elif command -v corepack >/dev/null 2>&1; then
    # Node >=16.10 ships corepack which can provide yarn without a global install
    log "yarn not found - enabling it via corepack (bundled with Node)..."
    if corepack enable 2>/dev/null || sudo corepack enable; then
        corepack prepare yarn@stable --activate >/dev/null 2>&1 || true
        if command -v yarn >/dev/null 2>&1; then
            YARN_BIN="yarn"
        fi
    fi
fi

# Last-resort: try npm install
if [ -z "$YARN_BIN" ] && command -v npm >/dev/null 2>&1; then
    warn "Trying 'sudo npm install -g yarn' as a fallback..."
    if sudo npm install -g yarn >/dev/null 2>&1; then
        YARN_BIN="yarn"
    fi
fi

if [ -z "$YARN_BIN" ]; then
    err "Could not find or install Yarn automatically."
    err "Please install it manually with one of:"
    err "  sudo corepack enable && corepack prepare yarn@stable --activate"
    err "  sudo npm install -g yarn"
    err "  sudo apt install yarn   (after adding the official Yarn apt repo)"
    err "Then re-run this installer (it resumes from this step)."
    exit 1
fi

log "Using yarn $(yarn --version 2>/dev/null || echo '(version unknown)')"
yarn install
log "Frontend dependencies installed."

# Initial frontend .env if missing
if [ ! -f "$ROOT/frontend/.env" ] && [ -f "$ROOT/frontend/.env.example" ]; then
    cp "$ROOT/frontend/.env.example" "$ROOT/frontend/.env"
    log "Created frontend/.env from .env.example (points to http://localhost:8001)."
fi

# ---------- udev rules ----------
echo ""
read -r -p ">>> Install udev rules for CH340 / FTDI / CP210x (requires sudo)? [y/N] " yn
case "$yn" in
    [Yy]*)
        sudo cp "$ROOT/scripts/99-sqm.rules" /etc/udev/rules.d/
        sudo udevadm control --reload-rules
        sudo udevadm trigger
        log "udev rules installed."
        ;;
    *)
        warn "Skipped udev rules. You can install them later with:"
        warn "  sudo cp scripts/99-sqm.rules /etc/udev/rules.d/ && sudo udevadm control --reload-rules && sudo udevadm trigger"
        ;;
esac

# ---------- dialout group ----------
if ! id -nG "$USER" | grep -qw dialout; then
    echo ""
    warn "Your user '$USER' is NOT in the 'dialout' group."
    warn "Without it you'll get 'Permission denied' when opening /dev/ttyUSB*."
    warn "Fix it with:  sudo usermod -aG dialout $USER"
    warn "Then log out and back in (or reboot)."
fi

# ---------- ModemManager warning ----------
if systemctl is-active --quiet ModemManager 2>/dev/null; then
    warn "ModemManager is running. It can grab /dev/ttyUSB* and break SQM/ESP8266 serial."
    warn "If you have issues, disable it with: sudo systemctl disable --now ModemManager.service"
fi

echo ""
log "All done!"
echo ""
echo "Start the backend:   ./scripts/run-backend.sh"
echo "Start the frontend:  ./scripts/run-frontend.sh"
echo "Open:                http://localhost:3000"
