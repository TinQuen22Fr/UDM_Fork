#!/usr/bin/env bash
set -euo pipefail
rm -f "$HOME/.local/share/applications/UDM-Fork.desktop"
rm -f "$HOME/.local/share/icons/hicolor/scalable/apps/udm-fork.svg"
rm -rf "$HOME/.config/udm-fork-ssb"
rm -rf "$HOME/.mozilla/firefox-udm-fork"
command -v update-desktop-database >/dev/null 2>&1 && update-desktop-database "$HOME/.local/share/applications" 2>/dev/null || true
command -v gtk-update-icon-cache    >/dev/null 2>&1 && gtk-update-icon-cache "$HOME/.local/share/icons/hicolor"   2>/dev/null || true
echo ">>> UDM Fork desktop entry removed."
