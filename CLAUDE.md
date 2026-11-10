# Notes for working on this repository

- Bobo na Mi is a Free-play Game for Kolibri Games (github.com/togetherings/kolibri-games).
  Read its docs/GAME_FORMAT.md before changing how the game talks to the platform
  (`game/platform.js`, `game/storage.js`).
- Everything in `game/` goes into the zip; keep other files out of it.
- Keep the code light and easy to follow: plain JavaScript (ES5 style, no libraries, no build
  step), short comments that explain why.
- The game runs in a sandboxed iframe: no localStorage, downloads, alert/confirm or outside
  network. Save only through `BNM.storage` (the SDK's getState/setState, 64 KB per learner).
- Main level ids in `game/levels.js` must never change. Keep the "level" choices in
  `game/kolibri-game.json` and the solutions in `tests/test_levels.js` in step with the levels.
- Every update: bump the three-part version in `game/kolibri-game.json` and `BNM.VERSION` in
  `game/main.js`, add a CHANGELOG entry, run `node tests/test_levels.js`, the browser test
  (`python3 tests/browser_test.py <kolibri-games checkout>`), and `tools/build.sh`, and commit
  the new zip in `releases/`.
- Krio words are in `game/words.js`; spellings should be checked with Krio speakers.
- Writing style for anything players see: plain words, sentence case, active voice.
