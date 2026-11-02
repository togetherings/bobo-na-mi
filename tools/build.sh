#!/usr/bin/env bash
# Build the game zip:  tools/build.sh [path/to/kolibri-games]
#
# 1. Runs the level tests.
# 2. Zips everything in game/ (files at the top of the zip, as Kolibri Games
#    needs) into releases/bobo-na-mi-<version>.zip. The version comes from
#    game/kolibri-game.json.
# 3. If you give the path to a kolibri-games checkout, checks the zip with
#    its kolibri-games-pack --check.
set -euo pipefail
cd "$(dirname "$0")/.."

node tests/test_levels.js > /dev/null || { node tests/test_levels.js; exit 1; }
echo "Level tests passed"

version=$(node -p "require('./game/kolibri-game.json').version")
out="releases/bobo-na-mi-$version.zip"
mkdir -p releases
rm -f "$out"
(cd game && zip -X -r -q "../$out" . -x '.*' -x '*/.*')
echo "Built $out"

if [ $# -ge 1 ]; then
  PYTHONPATH="$1" python3 -m kolibri_games.pack --check "$out"
fi
