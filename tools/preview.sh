#!/usr/bin/env bash
# Try the game in the real Kolibri Games page, without Kolibri:
#   tools/preview.sh path/to/kolibri-games [--port 8765]
# Then open http://127.0.0.1:8765/ and switch between pretend learners and a
# coach with the bar at the bottom. Nothing is kept when it stops.
set -euo pipefail
platform=$(cd "$1" && pwd); shift
game=$(cd "$(dirname "$0")/../game" && pwd)
games=$(mktemp -d)                      # a folder with only this game in it
ln -s "$game" "$games/bobo-na-mi"
PYTHONPATH="$platform" exec python3 -m kolibri_games.devserver "$games" "$@"
