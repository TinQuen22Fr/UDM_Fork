#!/usr/bin/env bash
# UDM Fork installer (Linux).
# Installs backend (Python venv) + frontend (Node deps).
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
cd "$ROOT"

echo ">>> UDM Fork installer"
echo ">>> Root: $ROOT"

# ---------- Backend ----------
echo ">>> Setting up Python backend ..."
cd "$ROOT/backend"
if [ ! -d ".venv" ]; then
    python3 -m venv .venv
fi
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
deactivate
echo "    backend dependencies installed."

# ---------- Frontend ----------
echo ">>> Setting up React frontend ..."
cd "$ROOT/frontend"
if command -v yarn >/dev/null 2>&1; then
    yarn install
else
    echo "!! 'yarn' is not installed. Install Yarn 1.x (npm install -g yarn) or use npm install at your own risk."
    exit 1
fi
echo "    frontend dependencies installed."

# ---------- udev rules (optional but recommended) ----------
echo ""
read -p ">>> Install udev rules for CH340 / FTDI / CP210x (requires sudo)? [y/N] " yn
case "$yn" in
    [Yy]*)
        sudo cp "$ROOT/scripts/99-sqm.rules" /etc/udev/rules.d/
        sudo udevadm control --reload-rules
        sudo udevadm trigger
        echo "    udev rules installed."
        ;;
    *)
        echo "    skipped."
        ;;
esac

# ---------- dialout group ----------
if ! id -nG "$USER" | grep -qw dialout; then
    echo ""
    echo ">>> Your user '$USER' is not in the 'dialout' group."
    echo "    Run:  sudo usermod -aG dialout $USER"
    echo "    Then log out and back in."
fi

echo ""
echo ">>> Done! Start the backend with: ./scripts/run-backend.sh"
echo "                 the frontend with: ./scripts/run-frontend.sh"
