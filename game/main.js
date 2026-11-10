/* main.js — Glue code: screens, menus, options and the play loop.
 *
 * Script order (see index.html):
 *   Kolibri Games SDK, storage, words, levels, engine, sprites, render, sound,
 *   input, platform, editor, main
 */
var BNM = window.BNM = window.BNM || {};
BNM.VERSION = '0.1.0';
BNM.frame = 0;             // animation frame counter (idle wobble, waves, flames)

(function () {
  function $(id) { return document.getElementById(id); }

  /* ================= Small UI helpers (no alert/confirm: the sandbox blocks them) ================= */
  var toastTimer = null;
  function toast(msg) {
    var t = $('toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.add('hidden'); }, 3000);
  }

  /* buttons: [{ label, primary, onClick }] — onClick returning false keeps the box open */
  function modal(title, body, buttons) {
    var box = $('modal');
    $('modal-title').textContent = title;
    var b = $('modal-body');
    b.innerHTML = '';
    b.appendChild(body);
    var bar = $('modal-buttons');
    bar.innerHTML = '';
    (buttons || [{ label: 'OK', primary: true }]).forEach(function (spec) {
      var btn = document.createElement('button');
      btn.textContent = spec.label;
      if (spec.primary) btn.className = 'primary';
      btn.onclick = function () {
        if (spec.onClick && spec.onClick() === false) return;
        box.classList.add('hidden');
      };
      bar.appendChild(btn);
    });
    box.classList.remove('hidden');
  }

  function confirmBox(title, text, yesLabel, onYes) {
    var p = document.createElement('p');
    p.textContent = text;
    modal(title, p, [{ label: 'Cancel' }, { label: yesLabel, primary: true, onClick: onYes }]);
  }

  BNM.ui = { toast: toast, modal: modal, confirm: confirmBox };

  /* ================= Screens ================= */
  var current = 'title';

  function show(name) {
    Array.prototype.forEach.call(document.querySelectorAll('.screen'), function (s) { s.classList.add('hidden'); });
    $('screen-' + name).classList.remove('hidden');
    current = name;
    if (name === 'levels') buildLevelList();
    if (name === 'options') buildOptions();
    if (name === 'words') buildWords();
    if (name === 'editor') BNM.editor.show();
    if (name === 'game') drawGame();
  }
  BNM.show = show;

  // Any element with data-go="screen" switches screens
  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('[data-go]');
    if (el) show(el.getAttribute('data-go'));
  });

  /* ================= Progress ================= */
  // cleared: { 'b:<level id>': true, 'c:<custom id>': true }   best: { '<level id>': fewest moves }
  var cleared = {}, best = {};

  function levelIndex(id) {
    for (var i = 0; i < BNM.BUILTIN.length; i++) if (BNM.BUILTIN[i].id === id) return i;
    return -1;
  }

  /* ================= Level select ================= */
  function levelButton(title, sub, done, onClick) {
    var b = document.createElement('button');
    var t = document.createElement('span'); t.className = 'name'; t.textContent = title;
    var s = document.createElement('span'); s.className = 'sub'; s.textContent = sub;
    if (done) { var d = document.createElement('span'); d.className = 'done'; d.textContent = '✓'; b.appendChild(d); }
    b.appendChild(t); b.appendChild(s);
    b.onclick = onClick;
    return b;
  }

  function buildLevelList() {
    var list = $('level-list');
    list.innerHTML = '';
    BNM.BUILTIN.forEach(function (lv, i) {
      var sub = lv.en + (best[lv.id] ? '  ·  best ' + best[lv.id] + ' moves' : '');
      list.appendChild(levelButton((i + 1) + '. ' + lv.name, sub, cleared['b:' + lv.id],
        function () { startBuiltin(i); }));
    });
    var mine = $('custom-list');
    mine.innerHTML = '';
    var custom = BNM.custom.list();
    if (!custom.length) mine.innerHTML = '<p class="empty">No levels yet. Make one in the Level Editor!</p>';
    custom.forEach(function (lv) {
      mine.appendChild(levelButton(lv.name, lv.w + ' × ' + lv.h, cleared['c:' + lv.id],
        function () { startLevel(lv, { kind: 'custom', id: lv.id }); }));
    });
  }

  /* ================= Playing a level ================= */
  var play = { game: null, ref: null, over: false };   // ref says where the level came from
  var DIRS = { right: 0, up: 1, left: 2, down: 3 };

  function startBuiltin(i) {
    var lv = BNM.BUILTIN[i];
    startLevel(lv, { kind: 'builtin', index: i });
    BNM.platform.openLevel({ id: lv.id, name: lv.name, number: i + 1 });  // Kolibri Games attempt
  }

  function startLevel(level, ref) {
    if (ref.kind !== 'builtin') BNM.platform.leave();
    play.game = new BNM.Game(level);
    play.ref = ref;
    play.over = false;
    $('level-title').textContent = level.name + (level.en ? '  ·  ' + level.en : '');
    $('win-box').classList.add('hidden');
    show('game');
    updateHud();
  }
  BNM.startLevel = startLevel;

  function leaveGame() {
    BNM.platform.leave();
    if (play.ref && play.ref.kind === 'editor') show('editor');
    else if (BNM.platform.fixedLevel()) show('title');
    else show('levels');
  }

  function doAction(action) {
    var g = play.game;
    if (!g) return;
    if (action === 'menu') { leaveGame(); return; }
    if (play.over) return;               // time is up

    if (g.won) {                         // level finished: only undo or continue
      if (action === 'undo') { g.undo(); $('win-box').classList.add('hidden'); BNM.sound.play('undo'); updateHud(); }
      else if (action === 'wait') nextLevel();
      return;
    }

    var changed = false, letter = '';
    if (action in DIRS) { changed = g.step(DIRS[action]); letter = 'ruld'.charAt(DIRS[action]); }
    else if (action === 'wait') { changed = g.step(-1); letter = 'w'; }
    else if (action === 'undo') { changed = g.undo(); letter = 'z'; }
    else if (action === 'restart') { changed = g.restart(); letter = 'x'; }

    if (changed) {
      playSounds(g.events);
      if (play.ref.kind === 'builtin') BNM.platform.action(letter);
    }
    updateHud();
    if (g.won) onWin();
  }

  function playSounds(ev) {
    if (ev.won) BNM.sound.play('win');
    else if (ev.destroyed) BNM.sound.play('destroy');
    else if (ev.undo) BNM.sound.play('undo');
    else if (ev.restart) BNM.sound.play('restart');
    else if (ev.pushed) BNM.sound.play('push');
    else if (ev.moved) BNM.sound.play('move');
  }

  function drawGame() {
    if (!play.game || current !== 'game') return;
    var g = play.game;
    BNM.render($('game-canvas'), g.w, g.h, g.objects, { activeText: g.activeText, frame: BNM.frame });
  }

  /* Rule bar, "nobody is MI" hint, and the grid */
  function updateHud() {
    var g = play.game, keys = BNM.input.getKeys(), hint = $('hint');
    BNM.ruleChips($('rules'), g.rules, BNM.settings.english);
    if (!g.won && !g.hasYou()) {
      hint.textContent = 'Nobody na MI! Undo (' + BNM.input.keyName(keys.undo[0]) + ') or restart (' +
        BNM.input.keyName(keys.restart[0]) + ').';
      hint.classList.remove('hidden');
    } else {
      hint.classList.add('hidden');
    }
    drawGame();
  }

  function hasNext() {
    return play.ref.kind === 'builtin' && !BNM.platform.fixedLevel() && play.ref.index < BNM.BUILTIN.length - 1;
  }

  function ordinal(n) {
    var s = ['th', 'st', 'nd', 'rd'], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  function showEnd(title, sub, info) {
    $('win-title').textContent = title;
    $('win-sub').textContent = sub;
    $('win-info').textContent = info || '';
    $('win-box').classList.remove('hidden');
  }

  function onWin() {
    var ref = play.ref, moves = play.game.moveCount();
    if (ref.kind === 'builtin') {
      var id = BNM.BUILTIN[ref.index].id;
      cleared['b:' + id] = true;
      if (!best[id] || moves < best[id]) best[id] = moves;
      BNM.storage.set('best', best);
    } else if (ref.kind === 'custom') {
      cleared['c:' + ref.id] = true;
    }
    BNM.storage.set('cleared', cleared);

    $('win-next').classList.toggle('hidden', !hasNext());
    $('win-undo').classList.remove('hidden');
    $('win-back').textContent = ref.kind === 'editor' ? 'Back to editor' : BNM.platform.fixedLevel() ? 'Menu' : 'Levels';
    showEnd('Yu win!', 'You won in ' + moves + (moves === 1 ? ' move.' : ' moves.'), '');

    if (ref.kind !== 'builtin') return;
    BNM.platform.won(moves).then(function (res) {
      if (!res || !res.attempt) return;
      var text = res.attempt.practice ? 'Practice round: your first attempt is the one that counts.' : '';
      if (res.standing) text = 'You are ' + ordinal(res.standing.rank) + ' of ' + res.standing.of + ' on the scoreboard.';
      $('win-info').textContent = text;
    });
  }

  function onTimeUp() {
    play.over = true;
    BNM.platform.leave();
    if (current !== 'game') return;
    $('win-next').classList.add('hidden');
    $('win-undo').classList.add('hidden');
    $('win-back').textContent = 'Menu';
    showEnd('Taim don!', 'Time is up.', '');
  }

  function nextLevel() {
    if (!hasNext()) { leaveGame(); return; }
    startBuiltin(play.ref.index + 1);
  }

  $('win-next').onclick = nextLevel;
  $('win-undo').onclick = function () { doAction('undo'); };
  $('win-back').onclick = leaveGame;

  /* Play button: the coach's chosen level, or the level list */
  $('btn-play').onclick = function () {
    var i = levelIndex(BNM.platform.fixedLevel());
    if (i >= 0) startBuiltin(i); else show('levels');
  };
  $('btn-exit').onclick = function () { BNM.platform.exit(); };

  /* ================= Options ================= */
  function buildOptions() {
    var table = $('key-table'), keys = BNM.input.getKeys();
    table.innerHTML = '';
    BNM.input.ACTIONS.forEach(function (a) {
      var tr = document.createElement('tr');
      var name = document.createElement('td');
      name.textContent = BNM.input.LABELS[a];
      tr.appendChild(name);
      [0, 1].forEach(function (slot) {
        var td = document.createElement('td'), b = document.createElement('button');
        b.className = 'key';
        b.textContent = BNM.input.keyName(keys[a][slot]);
        b.onclick = function () {
          b.textContent = 'Press a key…';
          b.classList.add('waiting');
          BNM.input.captureNext(function (code) {
            if (code === 'Escape' && a !== 'menu') { buildOptions(); return; }  // Esc cancels
            if (code === 'Delete') code = '';                                    // Delete clears
            BNM.input.bind(a, slot, code);
            buildOptions();
          });
        };
        td.appendChild(b);
        tr.appendChild(td);
      });
      table.appendChild(tr);
    });
    $('opt-touch').value = BNM.settings.touch;
    $('opt-sound').checked = BNM.settings.sound;
    $('opt-english').checked = BNM.settings.english;
  }

  $('opt-touch').onchange = function () { BNM.settings.touch = this.value; BNM.saveSettings(); applyTouch(); };
  $('opt-sound').onchange = function () { BNM.settings.sound = this.checked; BNM.saveSettings(); };
  $('opt-english').onchange = function () { BNM.settings.english = this.checked; BNM.saveSettings(); };
  $('btn-keys-reset').onclick = function () { BNM.input.resetKeys(); buildOptions(); toast('Keys reset'); };
  $('btn-progress-reset').onclick = function () {
    confirmBox('Reset progress', 'Clear all ✓ marks and best moves? Your own levels are kept.', 'Reset', function () {
      cleared = {}; best = {};
      BNM.storage.set('cleared', cleared);
      BNM.storage.set('best', best);
      toast('Progress cleared');
    });
  };

  /* Show on-screen buttons on touch devices (or when forced on in Options) */
  function applyTouch() {
    var touchDevice = ('ontouchstart' in window) || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    var on = BNM.settings.touch === 'on' || (BNM.settings.touch === 'auto' && touchDevice);
    document.body.classList.toggle('show-touch', on);
    drawGame();
  }

  /* ================= Words list (a small Krio dictionary) ================= */
  function buildWords() {
    var grid = $('word-grid');
    if (grid.childNodes.length) return;            // build only once
    var KINDS = { noun: 'Thing', op: 'Joining word', prop: 'Property' };
    Object.keys(BNM.WORDS).forEach(function (word) {
      var w = BNM.WORDS[word], card = document.createElement('div');
      card.className = 'word-card';
      card.appendChild(BNM.sprites.toCanvas(BNM.textOf(word), 44, 0));
      if (BNM.isKnownType(word)) card.appendChild(BNM.sprites.toCanvas(word, 44, 3));
      var info = document.createElement('div');
      var b = document.createElement('b'); b.textContent = w.label;
      var en = document.createElement('span'); en.textContent = w.en;
      var k = document.createElement('small'); k.textContent = KINDS[w.kind];
      info.appendChild(b); info.appendChild(en); info.appendChild(k);
      card.appendChild(info);
      grid.appendChild(card);
    });
  }

  /* ================= Title screen for this player ================= */
  function setupTitle() {
    var p = BNM.platform, fixed = levelIndex(p.fixedLevel()), info = p.info();
    var play = $('btn-play');
    play.textContent = fixed >= 0 ? '▶ Ple: ' + BNM.BUILTIN[fixed].name : '▶ Ple (Play)';
    $('btn-editor').classList.toggle('hidden', !p.editorAllowed());
    $('btn-exit').classList.toggle('hidden', !p.embedded);
    var note = '';
    if (info.challenge) note = 'Challenge: ' + info.challenge.title + (fixed >= 0 ? '. Solve it in as few moves as you can!' : '');
    $('challenge-note').textContent = note;
    $('challenge-note').classList.toggle('hidden', !note);
    play.disabled = false;
  }

  /* ================= Start-up ================= */
  BNM.input.setHandler(function (action) {
    if (!$('modal').classList.contains('hidden')) return;          // a dialog is open
    if (current === 'game') doAction(action);
    else if (action === 'menu' && (current === 'levels' || current === 'options' || current === 'words')) show('title');
  });
  BNM.input.attachButtons($('screen-game'));

  function redrawCurrent() {
    if (current === 'game') drawGame();
    else if (current === 'editor') BNM.editor.redraw();
  }
  BNM.sprites.load(redrawCurrent);                // optional PNG sprites
  window.addEventListener('resize', redrawCurrent);
  setInterval(function () { BNM.frame = (BNM.frame + 1) % 4; redrawCurrent(); }, 400);

  // Keyboard needs focus inside the game's frame
  document.addEventListener('pointerdown', function () { window.focus(); });

  BNM.storage.setErrorHandler(toast);
  BNM.platform.setErrorHandler(toast);
  BNM.platform.setTimeUpHandler(onTimeUp);

  $('version').textContent = BNM.VERSION;
  show('title');

  BNM.platform.ready()
    .then(function () { return BNM.storage.init(); })
    .then(function () {
      BNM.loadSettings();
      BNM.input.reloadKeys();
      cleared = BNM.storage.get('cleared', {});
      best = BNM.storage.get('best', {});
      applyTouch();
      setupTitle();
      window.focus();
    });
})();
