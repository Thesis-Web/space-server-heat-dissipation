#!/usr/bin/env bash
# start-ui.sh — Orbital Thermal Trade System UI Launcher
# Works in: Linux, macOS, WSL (Windows Subsystem for Linux)
set -euo pipefail
PORT="${PORT:-8080}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
UI_DIR="$SCRIPT_DIR/ui/app"
if [ ! -d "$UI_DIR" ]; then
  echo "ERROR: ui/app/ not found at $UI_DIR" >&2
  exit 1
fi
if ! command -v node &>/dev/null; then
  echo "ERROR: node not found. Install Node.js and re-run." >&2
  exit 1
fi
if [ ! -d "$SCRIPT_DIR/node_modules" ]; then
  echo "  node_modules/ not found — running npm install first..."
  cd "$SCRIPT_DIR" && npm install
fi
if [ ! -f "$SCRIPT_DIR/dist/runtime/runner/run-packet.js" ]; then
  echo "  dist/ not found — running npm run build first..."
  cd "$SCRIPT_DIR" && npm run build
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
  if grep -qi microsoft /proc/version 2>/dev/null; then
    cmd.exe /c start "$url" 2>/dev/null && return
  fi
  if command -v xdg-open &>/dev/null; then
    xdg-open "$url" &>/dev/null & return
  fi
  if command -v open &>/dev/null; then
    open "$url" && return
  fi
  echo "  Auto-open not available — navigate to: $url"
}
(sleep 1.5 && open_browser "http://localhost:$PORT") &
cd "$SCRIPT_DIR"
exec node server.js
