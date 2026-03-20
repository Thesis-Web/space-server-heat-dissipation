#!/usr/bin/env bash
# start-ui.sh — Orbital Thermal Trade System UI Launcher
# Serves ui/app/ on localhost:8080 and opens the browser.
set -euo pipefail

PORT="${PORT:-8080}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
UI_DIR="$SCRIPT_DIR/ui/app"

if [ ! -d "$UI_DIR" ]; then
  echo "ERROR: ui/app/ not found at $UI_DIR" >&2
  exit 1
fi

if ! command -v python3 &>/dev/null; then
  echo "ERROR: python3 not found. Install Python 3 and re-run." >&2
  exit 1
fi

echo ""
echo "  Orbital Thermal Trade System — UI Launcher"
echo "  -------------------------------------------"
echo "  Serving : $UI_DIR"
echo "  URL     : http://localhost:$PORT"
echo "  Stop    : Ctrl+C"
echo ""

open_browser() {
  local url="$1"
  if command -v xdg-open &>/dev/null; then
    xdg-open "$url" &>/dev/null &
  elif command -v open &>/dev/null; then
    open "$url"
  else
    echo "  Auto-open not available — navigate to: $url"
  fi
}

(sleep 1.2 && open_browser "http://localhost:$PORT") &

cd "$UI_DIR"
exec python3 -m http.server "$PORT"
