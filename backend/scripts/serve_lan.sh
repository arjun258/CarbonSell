#!/usr/bin/env bash
# Serve the dashboard and the API to everything on this network.
#
#   ./backend/scripts/serve_lan.sh
#
# Stop both with Ctrl-C.
set -euo pipefail
cd "$(dirname "$0")/../.."

IP=$(ip -4 route get 1.1.1.1 2>/dev/null | sed -n 's/.*src \([0-9.]*\).*/\1/p')
IP=${IP:-$(hostname -I | awk '{print $1}')}

echo "dashboard   http://$IP:5173"
echo "api / docs  http://$IP:8000/docs"
echo

trap 'kill 0' EXIT
(cd backend && ../.venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000) &
(cd frontend && npm run dev -- --host --port 5173 --strictPort) &
wait
