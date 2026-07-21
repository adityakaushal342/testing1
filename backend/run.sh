#!/usr/bin/env bash
# AI Trading Master - one-click backend runner (macOS / Linux)
set -e
cd "$(dirname "$0")"

if ! command -v python3 >/dev/null 2>&1; then
  echo "[!] Python3 not found. Install it first: https://www.python.org/downloads/"
  exit 1
fi

[ -d .venv ] || python3 -m venv .venv
# shellcheck disable=SC1091
source .venv/bin/activate

echo "Installing dependencies (first run takes a moment)..."
python -m pip install --quiet --upgrade pip
pip install --quiet -r requirements.txt

echo "Seeding demo accounts..."
python seed.py

echo
echo "============================================================"
echo "  Server running! Open in your browser:"
echo "    http://localhost:8000/auth.html   (Login / Register)"
echo "    http://localhost:8000/            (Landing page)"
echo "    http://localhost:8000/docs        (API docs)"
echo "  Press Ctrl+C in this window to stop."
echo "============================================================"
echo
uvicorn app.main:app --reload
