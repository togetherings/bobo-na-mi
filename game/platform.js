/* platform.js — The connection to Kolibri Games (attempts, scores, coach settings).
 *
 * Kolibri Games is a Kolibri plugin: learners sign in, coaches see results
 * and set up class challenges. See docs/GAME_FORMAT.md in
 * https://github.com/togetherings/kolibri-games
 *
 * How Bobo na Mi uses it:
 *   - Each main level a learner plays is one *attempt*. The attempt starts on
 *     the learner's first move (just looking at a level doesn't count).
 *   - Solving the level finishes the attempt. The score is the number of
 *     moves in the solution (fewer is better; undone moves don't count).
 *   - Leaving a level unsolved records the attempt as left unfinished.
 *   - Coaches see every move: they are sent as letters (r u l d = moves,
 *     w = wait, z = undo, x = restart) in small batches.
 *   - Coach settings (kolibri-game.json): "level" fixes the level to play
 *     (so a challenge's scoreboard compares one level), and "editor" shows or
 *     hides the level editor.
 *   - Your own levels and editor tests are not recorded as attempts.
 *
 * Without the SDK (index.html opened from a folder, or a plain Kolibri HTML5
 * app) everything here quietly does nothing, and the game works on its own.
 */
var BNM = window.BNM = window.BNM || {};

BNM.platform = (function () {
  var KG = window.KolibriGames || null;
  var BATCH = 500;              // send the move letters every 500 letters

  var info = { settings: {}, challenge: null, preview: true, player: null };
  var queue = Promise.resolve(); // SDK calls run one after another, in order
  var current = null;           // { level, started, sent, letters, done }
  var onTimeUp = null;
  var onError = null;

  /* Run an SDK call after the ones before it. Errors are shown, not thrown. */
  function call(fn) {
    var p = queue.then(fn);
    queue = p.then(null, function (err) {
      if (onError && err && err.code !== 'time_up') onError(err.message);
    });
    return p;
  }

  function ready() {
    if (!KG) return Promise.resolve(info);
    KG.on('timeup', function () { if (onTimeUp) onTimeUp(); });
    return KG.ready().then(function (i) { info = i; return info; }, function (err) {
      if (onError) onError(err.message);
      return info;
    });
  }

  /* The level coaches chose (a level id), or null when learners may choose. */
  function fixedLevel() {
    var id = info.settings.level;
    return id && id !== 'any' ? id : null;
  }

  function editorAllowed() { return info.settings.editor !== false && !info.challenge; }

  /* Send the move letters that haven't been sent yet. */
  function sendLetters(a) {
    if (!a.started || a.sent >= a.letters.length) return;
    var from = a.sent, steps = a.letters.slice(from).join('');
    a.sent = a.letters.length;
    call(function () { return KG.move('steps', { from: from, steps: steps }); });
  }

  /* A main level was opened. levelInfo: { id, name, number } */
  function openLevel(levelInfo) {
    leave();
    current = { level: levelInfo, started: false, sent: 0, letters: [], done: false };
  }

  /* Something happened in the level (one letter, see the top of this file). */
  function action(letter) {
    var a = current;
    if (!KG || !a || a.done) return;
    if (!a.started) {
      a.started = true;
      call(function () { return KG.start({ resume: false }); });  // a reload can't continue a level
    }
    a.letters.push(letter);
    if (a.letters.length - a.sent >= BATCH) sendLetters(a);
  }

  /* The level was solved in `moves` moves. Resolves to the SDK's result
   * ({ attempt, standing }) or null when nothing was recorded. */
  function won(moves) {
    var a = current;
    if (!KG || !a || !a.started || a.done) return Promise.resolve(null);
    a.done = true;
    sendLetters(a);
    return call(function () {
      return KG.finish({ score: moves, detail: { level: a.level.id, name: a.level.name, number: a.level.number } });
    }).then(null, function () { return null; });
  }

  /* Leaving a level: record it as unfinished if it was started. */
  function leave() {
    var a = current;
    current = null;
    if (!KG || !a || !a.started || a.done) return;
    sendLetters(a);
    call(function () { return KG.abandon(); });
  }

  function exit() { leave(); if (KG) call(function () { return KG.exit(); }); }

  return {
    ready: ready,
    info: function () { return info; },
    hasSdk: !!KG,
    embedded: !!KG && !KG.preview,   // inside Kolibri Games (downloads are blocked there)
    fixedLevel: fixedLevel,
    editorAllowed: editorAllowed,
    openLevel: openLevel,
    action: action,
    won: won,
    leave: leave,
    exit: exit,
    setTimeUpHandler: function (fn) { onTimeUp = fn; },
    setErrorHandler: function (fn) { onError = fn; }
  };
})();
