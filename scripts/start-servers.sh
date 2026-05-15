#!/usr/bin/env bash
# Start all tutorial servers.
# Each server is launched in the background; Ctrl-C kills them all.
#
# Usage: ./scripts/start-servers.sh
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

# ── Cleanup on exit ──────────────────────────────────────────────────────────
cleanup() {
  echo ""
  echo "Stopping all servers..."
  kill "${PIDS[@]}" 2>/dev/null || true
  wait "${PIDS[@]}" 2>/dev/null || true
  echo "Done."
}
trap cleanup EXIT INT TERM

PIDS=()

# ── Next.js (port 3000) ───────────────────────────────────────────────────────
echo "▶ Starting Next.js dev server on http://localhost:3000 ..."
(cd "$REPO_ROOT/nextjs" && npm run dev) &
PIDS+=($!)

# ── Express (port 3001) ───────────────────────────────────────────────────────
echo "▶ Starting Express server on http://localhost:3001 ..."
(cd "$REPO_ROOT/express" && npm run dev) &
PIDS+=($!)

# ── NestJS (port 3002) ───────────────────────────────────────────────────────
echo "▶ Starting NestJS server on http://localhost:3002 ..."
(cd "$REPO_ROOT/nestjs" && npm run dev) &
PIDS+=($!)

# ── Flask (port 3003) ─────────────────────────────────────────────────────────
echo "▶ Starting Flask server on http://localhost:3003 ..."
(cd "$REPO_ROOT/flask-api" && uv run python main.py) &
PIDS+=($!)

# ── FastAPI (port 3004) ───────────────────────────────────────────────────────
echo "▶ Starting FastAPI server on http://localhost:3004 ..."
(cd "$REPO_ROOT/fastapi-api" && uv run uvicorn main:app --host 0.0.0.0 --port 3004 --reload) &
PIDS+=($!)

echo ""
echo "All servers running. Press Ctrl-C to stop."
wait
