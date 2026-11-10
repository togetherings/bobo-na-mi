/* main.js — Glue code: screens, menus and the play loop. Loaded last.
 *
 * Script order (see index.html): edugame-config.js and edugame.js (made by the
 * build), then atlas, words, levels, engine, save, sprites, render, sound, input,
 * editor, main.
 *
 * Bobo na Mi is a Saved Game made with EduGame Kit: it keeps each learner's
 * progress (save.js), with no scores. When every main level is solved, it tells
 * the platform the activity is done (EduGame.complete), which Kolibri shows.
 */
var BNM = window.BNM = window.BNM || {};
BNM.VERSION = '0.2.0';
BNM.frame = 0;             // animation frame counter (waves, flames, flag, key)

(function () {
  var EG = window.EduGame || null;
  var t = BNM.t;
  function $(id) { return document.getElementById(id); }

  /* ================= Small UI helpers (no alert/confirm: Kolibri's sandbox blocks them) ================= */
  var toastTimer = null;
  function toast(msg) {
    var el = $('toast');
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.add('hidden'); }, 3000);
  }

  /* buttons: [{ label, primary, onClick }]; onClick returning false keeps the box open */
  function modal(title, body, buttons) {
    var box = $('modal');
    $('modal-title').textContent = title;
    var b = $('modal-body');
    b.innerHTML = '';
    b.appendChild(body);
    var bar = $('modal-buttons');
    bar.innerHTML = '';
    (buttons || [{ label: t('ok'), primary: true }]).forEach(function (spec) {
      var btn = document.createElement('button');
      btn.type = 'button';
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
    modal(title, p, [{ label: t('cancel') }, { label: yesLabel, primary: true, onClick: onYes }]);
  }

  BNM.ui = { toast: toast, modal: modal, confirm: confirmBox };

  /* ================= Screens ================= */
  var current = 'title';

  function show(name) {
    Array.prototype.forEach.call(document.querySelectorAll('.screen'), function (s) { s.classList.add('hidden'); });
    $('screen-' + name).classList.remove('hidden');
    current = name;
    refresh();
  }
  BNM.show = show;

  /* Make the current screen's text again (after a change of language, too). */
  function refresh() {
    if (current === 'levels') buildLevelList();
    if (current === 'keys') buildKeys();
    if (current === 'words') buildWords();
    if (current === 'editor') BNM.editor.show();
    if (current === 'game') updateHud();
  }

  // Any element with data-go="screen" switches screens
  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('[data-go]');
    if (el) show(el.getAttribute('data-go'));
  });

  /* ================= Title ================= */
  function buildLogo() {
    var logo = $('logo');
    logo.innerHTML = '';
    ['T:bobo', 'T:na', 'T:mi'].forEach(function (type) { logo.appendChild(BNM.sprites.toCanvas(type, 72, 0)); });
  }

  /* ================= Level select ================= */
  function best() { return BNM.save.data.best; }

  function levelButton(title, sub, done, onClick) {
    var b = document.createElement('button');
    b.type = 'button';
    var n = document.createElement('span'); n.className = 'name'; n.textContent = title;
    var s = document.createElement('span'); s.className = 'sub'; s.textContent = sub;
    if (done) { var d = document.createElement('span'); d.className = 'done'; d.textContent = '✓'; b.appendChild(d); }
    b.appendChild(n); b.appendChild(s);
    b.onclick = onClick;
    return b;
  }

  function buildLevelList() {
    var list = $('level-list');
    list.innerHTML = '';
    BNM.BUILTIN.forEach(function (lv, i) {
      var moves = best()[lv.id];
      var sub = t('level.' + lv.id) + (moves ? '  ·  ' + t('best', { n: moves }) : '');
      list.appendChild(levelButton((i + 1) + '. ' + lv.name, sub, !!moves, function () { startBuiltin(i); }));
    });
    var mine = $('custom-list');
    mine.innerHTML = '';
    var custom = BNM.custom.list();
    if (!custom.length) {
      var p = document.createElement('p');
      p.className = 'empty';
      p.textContent = t(editorAllowed ? 'no_levels' : 'no_levels_no_editor');
      mine.appendChild(p);
    }
    custom.forEach(function (lv) {
      mine.appendChild(levelButton(lv.name, lv.w + ' × ' + lv.h, false,
        function () { startLevel(lv, { kind: 'custom', id: lv.id }); }));
    });
  }

  /* ================= Playing a level ================= */
  var play = { game: null, ref: null };   // ref says where the level came from
  var DIRS = { right: 0, up: 1, left: 2, down: 3 };

  function startBuiltin(i) { startLevel(BNM.BUILTIN[i], { kind: 'builtin', index: i }); }

  function startLevel(level, ref) {
    play.game = new BNM.Game(level);
    play.ref = ref;
    $('win-box').classList.add('hidden');
    show('game');
  }
  BNM.startLevel = startLevel;

  function levelTitle() {
    var ref = play.ref, lv = play.game.level;
    return ref.kind === 'builtin' ? lv.name + '  ·  ' + t('level.' + lv.id) : lv.name;
  }

  function leaveGame() { show(play.ref && play.ref.kind === 'editor' ? 'editor' : 'levels'); }

  function doAction(action) {
    var g = play.game;
    if (!g) return;
    if (action === 'menu') { leaveGame(); return; }

    if (g.won) {                         // level finished: only undo or carry on
      if (action === 'undo') { g.undo(); $('win-box').classList.add('hidden'); BNM.sound.play('undo'); updateHud(); }
      else if (action === 'wait') nextLevel();
      return;
    }

    var changed = false;
    if (action in DIRS) changed = g.step(DIRS[action]);
    else if (action === 'wait') changed = g.step(-1);
    else if (action === 'undo') changed = g.undo();
    else if (action === 'restart') changed = g.restart();

    if (changed) playSounds(g.events);
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

  /* Level title, rule bar, "nobody is MI" hint, and the grid */
  function updateHud() {
    var g = play.game, keys = BNM.input.getKeys(), hint = $('hint');
    if (!g) return;
    $('level-title').textContent = levelTitle();
    BNM.ruleChips($('rules'), g.rules, BNM.option('meanings') === 'on');
    if (!g.won && !g.hasYou()) {
      hint.textContent = t('nobody_you', { undo: BNM.input.keyName(keys.undo[0]), restart: BNM.input.keyName(keys.restart[0]) });
      hint.classList.remove('hidden');
    } else {
      hint.classList.add('hidden');
    }
    drawGame();
  }

  function hasNext() { return play.ref.kind === 'builtin' && play.ref.index < BNM.BUILTIN.length - 1; }

  function onWin() {
    var ref = play.ref, moves = play.game.moveCount();
    if (ref.kind === 'builtin') {
      var id = BNM.BUILTIN[ref.index].id, b = best();
      if (!b[id] || moves < b[id]) {
        var copy = JSON.parse(JSON.stringify(b));
        copy[id] = moves;
        BNM.save.set('best', copy);       // saved straight away
      }
      var all = BNM.BUILTIN.every(function (lv) { return best()[lv.id]; });
      if (all && EG) EG.complete();       // every main level solved: the activity is done
    }
    $('win-next').classList.toggle('hidden', !hasNext());
    $('win-back').textContent = t(ref.kind === 'editor' ? 'back_to_editor' : 'levels');
    $('win-sub').textContent = t('won_in', { n: moves });
    $('win-box').classList.remove('hidden');
  }

  function nextLevel() {
    if (!hasNext()) { leaveGame(); return; }
    startBuiltin(play.ref.index + 1);
  }

  $('win-next').onclick = nextLevel;
  $('win-undo').onclick = function () { doAction('undo'); };
  $('win-back').onclick = leaveGame;

  /* ================= Keys ================= */
  function buildKeys() {
    var table = $('key-table'), keys = BNM.input.getKeys();
    table.innerHTML = '';
    BNM.input.ACTIONS.forEach(function (a) {
      var tr = document.createElement('tr');
      var name = document.createElement('td');
      name.textContent = BNM.input.label(a);
      tr.appendChild(name);
      [0, 1].forEach(function (slot) {
        var td = document.createElement('td'), b = document.createElement('button');
        b.type = 'button';
        b.className = 'key';
        b.textContent = BNM.input.keyName(keys[a][slot]);
        b.onclick = function () {
          b.textContent = t('press_key');
          b.classList.add('waiting');
          BNM.input.captureNext(function (code) {
            if (code === 'Escape' && a !== 'menu') { buildKeys(); return; }  // Esc cancels
            if (code === 'Delete') code = '';                                // Delete clears
            BNM.input.bind(a, slot, code);
            buildKeys();
          });
        };
        td.appendChild(b);
        tr.appendChild(td);
      });
      table.appendChild(tr);
    });
  }

  $('btn-keys-reset').onclick = function () { BNM.input.resetKeys(); buildKeys(); toast(t('keys_reset')); };
  $('btn-progress-reset').onclick = function () {
    confirmBox(t('progress_reset'), t('progress_reset_ask'), t('progress_reset'), function () {
      BNM.save.set('best', {});
      toast(t('progress_cleared'));
    });
  };

  /* ================= Words list (a small Krio dictionary) ================= */
  function buildWords() {
    var grid = $('word-grid');
    grid.innerHTML = '';
    Object.keys(BNM.WORDS).forEach(function (word) {
      var w = BNM.WORDS[word], card = document.createElement('div');
      card.className = 'word-card';
      card.appendChild(BNM.sprites.toCanvas(BNM.textOf(word), 44, 0));
      if (BNM.isKnownType(word)) card.appendChild(BNM.sprites.toCanvas(word, 44, 3));
      var info = document.createElement('div');
      var b = document.createElement('b'); b.textContent = w.label;
      var m = document.createElement('span'); m.textContent = BNM.meaning(word);
      var k = document.createElement('small'); k.textContent = t('kind.' + w.kind);
      info.appendChild(b); info.appendChild(m); info.appendChild(k);
      card.appendChild(info);
      grid.appendChild(card);
    });
  }

  /* ================= Touch buttons ================= */
  function applyTouch() {
    var touchDevice = ('ontouchstart' in window) || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    var choice = BNM.option('touch');
    document.body.classList.toggle('show-touch', choice === 'on' || (choice === 'auto' && touchDevice));
    drawGame();
  }

  /* ================= Start-up ================= */
  var editorAllowed = true;

  BNM.input.setHandler(function (action) {
    if (!$('modal').classList.contains('hidden')) return;          // a dialog is open
    if (document.querySelector('.eg-overlay')) return;            // the kit's Options panel is open
    if (current === 'game') doAction(action);
    else if (action === 'menu' && current !== 'title' && current !== 'editor') show('title');
  });
  BNM.input.attachButtons($('screen-game'));

  function redrawCurrent() {
    if (current === 'game') drawGame();
    else if (current === 'editor') BNM.editor.redraw();
  }
  window.addEventListener('resize', redrawCurrent);
  setInterval(function () { BNM.frame = (BNM.frame + 1) % 4; redrawCurrent(); }, 400);

  // Keyboard keys need focus inside the game's frame (Kolibri shows games in a frame)
  document.addEventListener('pointerdown', function () { window.focus(); });

  BNM.save.setErrorHandler(toast);
  $('version').textContent = BNM.VERSION;

  if (EG) {
    BNM.OPTIONS.forEach(function (o) { EG.addOption(o); });
    EG.on('optionchange', function () { applyTouch(); refresh(); });
    EG.on('languagechange', function () { BNM.editor.relabel(); refresh(); });
    EG.on('leave', function () { BNM.save.write(); });   // the last save, where the platform allows
  }

  function start(info) {
    info = info || { save: null, settings: {}, canExit: false };
    BNM.save.load(info.save);
    BNM.input.reloadKeys();
    editorAllowed = !info.settings || info.settings.editor !== false;
    $('btn-editor').classList.toggle('hidden', !editorAllowed);
    $('btn-exit').classList.toggle('hidden', !info.canExit);
    $('btn-exit').onclick = function () { if (EG) EG.exit(); };
    applyTouch();
    $('btn-play').disabled = false;
    window.focus();
  }

  // Draw the pictures once the sprite sheet has loaded (shapes until then).
  BNM.sprites.load(function () { buildLogo(); redrawCurrent(); refresh(); });
  buildLogo();
  show('title');
  if (EG) EG.ready().then(start, function (err) { toast(err.message); start(null); });
  else start(null);
})();
