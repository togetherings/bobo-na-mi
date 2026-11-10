# Notes for working on this repository

- Bobo na Mi is a **Saved Game** made with EduGame Kit (github.com/togetherings/edugame-kit). Read the
  kit's docs/MAKING_GAMES.md and docs/HELPER.md before changing saving (`src/save.js`) or start-up
  (`src/main.js`).
- The game folder is the repository's top folder; `exclude` in `edugame.json` keeps docs, tests,
  tools and `art-src/` out of the zip.
- Keep the code light and easy to follow: plain JavaScript (ES5 style, no libraries, no build step),
  short comments that explain why.
- The game runs in sandboxed frames (Kolibri: `allow-scripts allow-same-origin`): no forms, pop-ups,
  `alert()` or downloads. Save only through `BNM.save` (the kit's helper). Saves must stay under
  3,900 characters, and are made straight away after each change (Kolibri drops a save made as the
  learner leaves).
- Every word players see is in `lang/*.json` (English and French), through `BNM.t` or `data-t`.
  Krio words and level names stay Krio. `edugame check .` lists missing words.
- Main level ids in `src/levels.js` must never change. Every main level needs `level.<id>` in every
  language and a solution in `tests/test_levels.js`.
- **Art:** the Petixel packs are bought and must never be committed (`art-src/` is ignored). Only
  `assets/` and the generated `src/atlas.js` are in git, made by `python3 tools/build_assets.py`.
- Every update: bump `version` in `edugame.json` and `BNM.VERSION` in `src/main.js`, add a CHANGELOG
  entry, run `node tests/test_levels.js`, `edugame check .` and `python3 tests/browser_test.py`.
  GitHub runs those plus the real-Kolibri test; the owner publishes releases (tag `vX.Y.Z`).
- Krio words are in `src/words.js`; spellings should be checked with Krio speakers.
- Writing style for anything players see: plain words, sentence case, active voice.
- Changes reach `main` through pull requests only (see the project's working-with-github notes).
