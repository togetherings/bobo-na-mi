# Changelog

## 0.2.0

- **EduGame Kit.** Bobo na Mi is now a Saved Game made with the kit. One zip works in Kolibri
  (through Kolibri Studio), Moodle and other SCORM 1.2 learning systems, and RACHEL. Each learner's
  progress is kept in their account (or the browser), with no scores. When every main level is
  solved, Kolibri shows the activity as done.
- **GitHub Pages:** anyone can play it at https://togetherings.github.io/bobo-na-mi/.
- **New pictures** from the Petixel packs: Bobo, Titi and Padi in four directions with walking
  frames, the flag, key, door, rock and wall, word tiles spelled with the Prototype letters, touch
  buttons and the dialog frame. The packs stay out of git; `tools/build_assets.py` builds `assets/`.
- **Translations:** every word is in `lang/`, in English and French. Word and level meanings are
  translated; the Krio words and level names stay Krio.
- **Options** are in the kit's panel: appearance (light or dark), language, on-screen buttons,
  sound and rule meanings. Keys keep their own screen.
- **Level codes:** levels in Your levels are kept in the save as short codes, and Export and Import
  share them. Version 0.1 JSON still imports.
- **Fixed:** tapping Back or Restart on a phone could also press the button that appeared in the
  same place.
- Saves happen straight away after each change, because Kolibri drops a save made as the learner
  leaves.
- Kolibri Games' attempts, coach challenges and time limits are gone: Saved Games have no scores.
  Coaches can still hide the level editor on the games page.
- Workflows from the kit's starter: Build (checks, zips, the real-Kolibri test, a browser test,
  "Checks passed") and GitHub Pages. Zips are attached to releases instead of committed.

## 0.1.0

- **Kolibri Games.** Bobo na Mi is now a Free-play Game for
  [Kolibri Games](https://github.com/togetherings/kolibri-games). Learners sign in with Kolibri,
  and their progress, settings, keys and own levels are saved on the server, so they follow the
  learner to any device.
- **Attempts and scores.** Each main level played is an attempt, scored by the number of moves in
  the solution. Coaches see every move.
- **Challenges.** Coaches can choose one level for a challenge, and the scoreboard ranks the
  fewest moves. The win screen shows the learner's place. A "Time is up" screen appears when a
  time limit runs out or the challenge closes.
- **Coach settings:** choose the level, and show or hide the level editor.
- Main levels have fixed ids, so saves and challenges keep working when levels are added or
  reordered.
- Each level shows the fewest moves used.
- The editor shows how full the save is, and Export offers Copy only inside Kolibri Games
  (downloads are blocked there).
- The project now lives at github.com/togetherings/bobo-na-mi, with tests and a build script.

## 0.0.1

- First playable version: 9 levels, Bobo, Titi and Padi, 24 Krio words, undo, restart and wait,
  remappable keys, touch controls, a level editor with save, export and import, and a word list.
  Ran as a plain Kolibri HTML5 app.
