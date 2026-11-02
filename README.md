# Bobo na Mi

A puzzle game in Sierra Leonean Krio, inspired by *Baba Is You*. Push word tiles to make sentences
like **BOBO NA MI** ("boy is you") and change the rules of each level, then reach the flag.

Bobo na Mi is a Free-play Game for [Kolibri Games](https://github.com/togetherings/kolibri-games),
a Kolibri plugin for offline learning games (for example on Internet-in-a-Box). Learners sign in
with Kolibri, so their progress and the levels they make are saved on the server and follow them
to any device. Plain HTML5 and JavaScript: no libraries, no build step, no internet needed.

## Install on Kolibri Games

1. Download the newest zip from [`releases/`](releases/), for example `bobo-na-mi-0.1.0.zip`.
2. In Kolibri, open **Games**, then **Setup**, choose the zip and click **Install**. (Only device
   administrators can install games. Installing a newer version keeps the old one, so you can go back.)

Without Kolibri Games, open `game/index.html` in a browser to play. Progress is then kept in
that browser only.

## For learners and coaches

- **Learners** pick any level, or play the level their coach chose. Each solved level shows ✓ and
  the fewest moves used.
- **Each level played is an attempt.** It starts with the first move. Solving the level finishes it,
  scored by the number of moves in the solution (fewer is better; undone moves don't count).
  Leaving a level unsolved records it as unfinished. Your own levels aren't recorded.
- **Coaches see every move** of every attempt, as letters: `r u l d` moves, `w` wait, `z` undo,
  `x` restart.
- **Coach settings:**
  - **Level**: "Any level", or one level. For a challenge, choose one level so the scoreboard
    compares everyone on the same puzzle. The free-play scoreboard is off, because different
    levels can't be compared.
  - **Show the level editor**: on by default. The editor is always hidden in challenges.
- **Saves** hold settings, keys, progress and up to about 60 KB of the learner's own levels
  (the editor shows how full the save is).

## Controls (change keys in Options)

| Action | Keys | Touch |
|---|---|---|
| Move | Arrow keys / W A S D | D-pad |
| Wait (skip a turn) | Space / . | ● in the D-pad |
| Undo (rewind, unlimited) | Z / Backspace | ↶ |
| Restart (can be undone) | R | ⟲ |
| Back / menu | Esc / P | ◀ |

## Repository

```
game/            the game: everything here goes in the zip
  kolibri-game.json   manifest for Kolibri Games (id, version, scoring, coach settings)
  icon.svg            icon on the games page
  index.html          all screens
  style.css           look and layout, including touch controls
  storage.js          saving through the Kolibri Games SDK (getState/setState)
  platform.js         attempts, moves, scores, coach settings, time limits
  words.js            Krio vocabulary
  levels.js           main levels (each with a fixed id), level loading, "Your levels"
  engine.js           puzzle rules, undo, move count
  sprites.js          drawings of each thing in 4 directions (or PNG strips)
  render.js           draws the grid and the rule bar
  sound.js            small beeps made in code
  input.js            remappable keys and touch buttons
  editor.js           level editor
  main.js             screens, menus and the play loop (BNM.VERSION is here)
tests/
  test_levels.js      every level can be solved; scoring; manifest matches the levels
  browser_test.py     plays the game in the Kolibri Games preview server
tools/build.sh    runs the tests and builds releases/bobo-na-mi-<version>.zip
tools/preview.sh  runs the game in the Kolibri Games preview server
releases/         built zips, one per version
```

## Making changes

```bash
node tests/test_levels.js                       # level tests (Node.js only)
git clone https://github.com/togetherings/kolibri-games ../kolibri-games
tools/preview.sh ../kolibri-games               # try it at http://127.0.0.1:8765/
python3 tests/browser_test.py ../kolibri-games  # browser test (needs Playwright)
tools/build.sh ../kolibri-games                 # build and check the zip
```

The preview runs the real games page without Kolibri. Switch between pretend learners and a
coach with the bar at the bottom. Nothing is kept when it stops.

- **New main level:** add it to `BNM.LEVELS` in `game/levels.js` with a new `id` (never change an
  existing id: saves and challenges use it), add it to the "level" choices in
  `game/kolibri-game.json`, and add its solution to `tests/test_levels.js`.
- **New word:** see the notes at the top of `game/words.js`.
- **Releasing:** a version has three numbers, `MAJOR.MINOR.PATCH`. Change it in
  `game/kolibri-game.json` and `BNM.VERSION` in `game/main.js` (the tests check that they match),
  add a section to `CHANGELOG.md`, then run `tools/build.sh`, which writes the zip into
  `releases/`.

## License

MIT. See [LICENSE](LICENSE).
