#!/usr/bin/env bash
# Install a desktop entry so 'UDM Fork' shows up in your applications menu / Activities.
# Uses the SVG icon shipped with the repo.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"

APP_DIR="$HOME/.local/share/applications"
ICON_DIR="$HOME/.local/share/icons/hicolor/scalable/apps"
mkdir -p "$APP_DIR" "$ICON_DIR"

ICON_SRC="$ROOT/scripts/desktop/udm-fork-icon.svg"
ICON_DST="$ICON_DIR/udm-fork.svg"
LAUNCHER="$ROOT/scripts/launch-udm.sh"
DESKTOP_DST="$APP_DIR/UDM-Fork.desktop"

cp "$ICON_SRC" "$ICON_DST"
chmod +x "$LAUNCHER"

sed -e "s|__ICON__|udm-fork|g" \
    -e "s|__LAUNCHER__|$LAUNCHER|g" \
    "$ROOT/scripts/desktop/UDM-Fork.desktop.in" > "$DESKTOP_DST"
chmod +x "$DESKTOP_DST"

if command -v update-desktop-database >/dev/null 2>&1; then
    update-desktop-database "$APP_DIR" 2>/dev/null || true
fi
if command -v gtk-update-icon-cache >/dev/null 2>&1; then
    gtk-update-icon-cache "$HOME/.local/share/icons/hicolor" 2>/dev/null || true
fi

echo ">>> Installed:"
echo "    $DESKTOP_DST"
echo "    $ICON_DST"
echo ""
echo ">>> 'UDM Fork' should now appear in your application menu."
echo ">>> You can also launch it from the terminal with:  $LAUNCHER"
