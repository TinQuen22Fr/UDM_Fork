#!/usr/bin/env bash
# Launch the UDM Fork web app in a 'native' window (no URL bar, own taskbar entry).
# Tries (in order): chromium --app, google-chrome --app, brave --app, microsoft-edge --app,
# then falls back to firefox in its own SSB-like profile, then xdg-open as last resort.
#
# Also makes sure the systemd user services are running before opening the window.
set -euo pipefail

URL="${UDM_URL:-http://localhost:3000}"
APP_CLASS="udm-fork"

# --- ensure backend is reachable, otherwise (try to) start the services ---
if ! curl -fsS --max-time 1 "$URL" >/dev/null 2>&1; then
    if command -v systemctl >/dev/null 2>&1 \
        && systemctl --user list-unit-files 2>/dev/null | grep -q '^udm-fork-backend.service'; then
        systemctl --user start udm-fork-backend.service udm-fork-frontend.service 2>/dev/null || true
        # Wait up to 10s
        for i in 1 2 3 4 5 6 7 8 9 10; do
            sleep 1
            if curl -fsS --max-time 1 "$URL" >/dev/null 2>&1; then
                break
            fi
        done
    fi
fi

# --- pick a browser ---
for candidate in \
    chromium chromium-browser \
    google-chrome google-chrome-stable \
    brave-browser brave \
    microsoft-edge microsoft-edge-stable \
    vivaldi-stable vivaldi \
; do
    if command -v "$candidate" >/dev/null 2>&1; then
        exec "$candidate" --app="$URL" --class="$APP_CLASS" --user-data-dir="$HOME/.config/udm-fork-ssb" "$@"
    fi
done

# Firefox SSB-style fallback (Firefox dropped --app years ago; we use a dedicated profile + kiosk window)
if command -v firefox >/dev/null 2>&1; then
    PROFILE="$HOME/.mozilla/firefox-udm-fork"
    mkdir -p "$PROFILE"
    if [ ! -f "$PROFILE/prefs.js" ]; then
        cat > "$PROFILE/user.js" <<'EOF'
user_pref("browser.tabs.inTitlebar", 0);
user_pref("browser.toolbars.bookmarks.visibility", "never");
user_pref("browser.uidensity", 1);
user_pref("toolkit.legacyUserProfileCustomizations.stylesheets", true);
EOF
        mkdir -p "$PROFILE/chrome"
        cat > "$PROFILE/chrome/userChrome.css" <<'EOF'
/* hide URL bar + tabs to make Firefox look like an app shell */
#nav-bar, #TabsToolbar, #PersonalToolbar { visibility: collapse !important; }
EOF
    fi
    exec firefox --class="$APP_CLASS" --name="$APP_CLASS" --profile "$PROFILE" --new-window "$URL" "$@"
fi

if command -v xdg-open >/dev/null 2>&1; then
    exec xdg-open "$URL"
fi

echo "No browser found. Please open $URL manually." >&2
exit 1
