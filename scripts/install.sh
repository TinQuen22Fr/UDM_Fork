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

# Need Node first - offer to auto-install on Debian/Ubuntu
if ! command -v node >/dev/null 2>&1; then
    warn "Node.js is not installed."
    if command -v apt-get >/dev/null 2>&1; then
        echo ""
        echo "  Two options to install Node.js on Ubuntu/Debian:"
        echo "    1) apt-get nodejs (simple, but may be an old version)"
        echo "    2) NodeSource LTS 20.x (recommended, newer, more compatible)"
        echo "    3) skip - I'll install it myself"
        read -r -p "  Choice [1/2/3]: " nopt
        case "$nopt" in
            1)
                sudo apt-get update
                sudo apt-get install -y nodejs npm
                ;;
            2)
                log "Installing Node.js 20 LTS from NodeSource..."
                curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
                sudo apt-get install -y nodejs
                ;;
            *)
                err "Skipped. Install Node.js manually then re-run this script."
                exit 1
                ;;
        esac
    else
        err "Install Node.js manually (see https://nodejs.org/) then re-run this script."
        exit 1
    fi
fi

if ! command -v node >/dev/null 2>&1; then
    err "Node.js still not available after install. Aborting."
    exit 1
fi
log "Using node $(node --version)"

# Resolve a working 'yarn' command.
# WARNING: on Ubuntu/Debian the apt package 'yarn' is actually 'cmdtest'
# (a test runner) — NOT the JavaScript Yarn we need. We detect that and
# fall back to corepack.
YARN_BIN=""
yarn_is_real() {
    # Real Yarn versions start with 1.x, 3.x or 4.x. cmdtest's yarn reports "0.32+git".
    local v
    v="$(yarn --version 2>/dev/null || true)"
    [[ "$v" =~ ^[1-9][0-9]*\. ]]
}

if command -v yarn >/dev/null 2>&1 && yarn_is_real; then
    YARN_BIN="yarn"
elif command -v yarn >/dev/null 2>&1; then
    warn "An impostor 'yarn' is installed (version '$(yarn --version 2>/dev/null)') - this is the 'cmdtest' package from Ubuntu apt, not the real Yarn."
    warn "Removing it and switching to corepack..."
    sudo apt-get remove -y cmdtest yarn 2>/dev/null || true
    hash -r
fi

if [ -z "$YARN_BIN" ]; then
    # Try corepack first (Node >=16.10 ships it - but Debian/Ubuntu strip it out)
    if command -v corepack >/dev/null 2>&1; then
        log "Enabling Yarn via corepack..."
        sudo corepack enable 2>/dev/null || corepack enable 2>/dev/null || true
        corepack prepare yarn@stable --activate >/dev/null 2>&1 || \
            sudo corepack prepare yarn@stable --activate >/dev/null 2>&1 || true
        hash -r
        if command -v yarn >/dev/null 2>&1 && yarn_is_real; then
            YARN_BIN="yarn"
        fi
    fi
fi

# Fallback: npm install -g yarn  (Ubuntu strips corepack from the nodejs package)
if [ -z "$YARN_BIN" ] && command -v npm >/dev/null 2>&1; then
    log "Installing Yarn via 'sudo npm install -g yarn'..."
    if sudo npm install -g yarn; then
        hash -r
        if command -v yarn >/dev/null 2>&1 && yarn_is_real; then
            YARN_BIN="yarn"
        fi
    fi
fi

if [ -z "$YARN_BIN" ]; then
    err "Could not install the real Yarn automatically."
    err "Try manually:"
    err "  sudo apt-get remove -y cmdtest yarn   # remove the impostor first"
    err "  sudo npm install -g yarn              # install the real Yarn"
    err "Then re-run this installer."
    exit 1
fi

log "Using yarn $(yarn --version)"
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
