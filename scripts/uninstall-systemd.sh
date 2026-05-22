#!/usr/bin/env bash
# Uninstall the UDM Fork user systemd services.
set -euo pipefail

UNIT_DIR="$HOME/.config/systemd/user"

for name in udm-fork-frontend udm-fork-backend; do
    if systemctl --user list-unit-files | grep -q "^${name}.service"; then
        systemctl --user disable --now "${name}.service" 2>/dev/null || true
    fi
    rm -f "$UNIT_DIR/${name}.service"
    echo ">>> Removed ${name}.service"
done

systemctl --user daemon-reload
systemctl --user reset-failed 2>/dev/null || true

echo ">>> Done."
echo "   (Production frontend bundle in frontend/build/ was kept. Delete manually if you wish.)"
