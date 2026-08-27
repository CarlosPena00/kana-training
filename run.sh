#!/usr/bin/env bash
#
# Launch the Kana Flashcards web app.
#
#   ./run.sh            dev server with hot reload      (fastest loop)
#   ./run.sh preview    production build + preview      (service worker active — test offline here)
#   ./run.sh test       unit tests, then lint
#   ./run.sh e2e        browser tests (Playwright)
#
# Both server modes listen on the network too, so you can open the printed LAN address on a
# phone and test kana input with a real Japanese keyboard.

set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/app"
MODE="${1:-dev}"

if ! command -v node >/dev/null 2>&1; then
  echo "node is not installed. This project needs Node.js 24 or newer." >&2
  exit 1
fi

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "Node $(node -v) is too old. This project needs Node.js 24 (20 may work, 18 will not)." >&2
  exit 1
fi

cd "$APP_DIR"

if [ ! -d node_modules ]; then
  echo "Installing dependencies (first run only)…"
  npm install --no-audit --no-fund
fi

lan_address() {
  local ip
  ip="$(hostname -I 2>/dev/null | awk '{print $1}')"
  [ -n "$ip" ] && echo "$ip" || echo ""
}

banner() {
  local port="$1" ip
  ip="$(lan_address)"
  echo
  echo "  Kana Flashcards"
  echo "  ───────────────────────────────────────────"
  echo "  On this machine:  http://localhost:${port}"
  [ -n "$ip" ] && echo "  On your phone:    http://${ip}:${port}   (same Wi-Fi)"
  echo
  [ "$MODE" = "preview" ] && echo "  Service worker is active — load once, then turn off Wi-Fi and reload." && echo
  echo "  Press Ctrl+C to stop."
  echo
}

case "$MODE" in
  dev)
    banner 5173
    exec npm run dev -- --host
    ;;
  preview)
    echo "Building…"
    npm run build
    banner 4173
    exec npm run preview -- --host
    ;;
  test)
    npm test
    echo
    echo "Linting…"
    npm run lint
    echo "All checks passed."
    ;;
  e2e)
    if [ ! -d "${HOME}/.cache/ms-playwright" ]; then
      echo "Downloading the test browser (first run only)…"
      npx playwright install chromium
    fi
    exec npm run test:e2e
    ;;
  *)
    echo "Unknown mode: $MODE" >&2
    echo "Usage: ./run.sh [dev|preview|test|e2e]" >&2
    exit 1
    ;;
esac
