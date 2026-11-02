/* input.js — Keyboard (with player-chosen keys) and on-screen touch buttons.
 *
 * Both turn presses into "actions": up, down, left, right, wait, undo,
 * restart, menu. main.js decides what each action does.
 * Keys are stored by KeyboardEvent.code (the physical key), so WASD works
 * on any keyboard layout.
 */
var BNM = window.BNM = window.BNM || {};

BNM.input = (function () {
  var ACTIONS = ['up', 'down', 'left', 'right', 'wait', 'undo', 'restart', 'menu'];
  var LABELS = {
    up: 'Move up', down: 'Move down', left: 'Move left', right: 'Move right',
    wait: 'Wait (skip a turn)', undo: 'Undo (rewind)', restart: 'Restart level', menu: 'Back / menu'
  };
  var DEFAULTS = {                 // two keys per action
    up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'],
    left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'],
    wait: ['Space', 'Period'], undo: ['KeyZ', 'Backspace'],
    restart: ['KeyR', ''], menu: ['Escape', 'KeyP']
  };
  var REPEATS = { up: 1, down: 1, left: 1, right: 1, wait: 1, undo: 1 }; // can be held down

  var keys = loadKeys();
  var handler = null;   // function(action) set by main.js
  var capture = null;   // when choosing a new key: function(code)
  var lastFire = 0;

  function loadKeys() {
    var saved = BNM.storage.get('keys', {}), k = {};
    ACTIONS.forEach(function (a) {
      k[a] = (saved[a] && saved[a].length === 2) ? saved[a].slice() : DEFAULTS[a].slice();
    });
    return k;
  }
  function saveKeys() { BNM.storage.set('keys', keys); }

  function actionFor(code) {
    if (!code) return null;
    for (var i = 0; i < ACTIONS.length; i++) if (keys[ACTIONS[i]].indexOf(code) >= 0) return ACTIONS[i];
    return null;
  }

  /* A friendly name for a key code, e.g. 'KeyW' -> 'W', 'ArrowUp' -> '↑'. */
  function keyName(code) {
    if (!code) return '—';
    var NAMES = { ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Space: 'Space',
                  Escape: 'Esc', Period: '.', Comma: ',', Slash: '/', Semicolon: ';' };
    if (NAMES[code]) return NAMES[code];
    if (code.indexOf('Key') === 0) return code.slice(3);
    if (code.indexOf('Digit') === 0) return code.slice(5);
    if (code.indexOf('Numpad') === 0) return 'Num ' + code.slice(6);
    return code;
  }

  /* Give an action a new key (slot 0 or 1). A key can only belong to one action. */
  function bind(action, slot, code) {
    if (code) ACTIONS.forEach(function (a) {
      for (var s = 0; s < 2; s++) if (keys[a][s] === code) keys[a][s] = '';
    });
    keys[action][slot] = code;
    saveKeys();
  }

  function resetKeys() {
    ACTIONS.forEach(function (a) { keys[a] = DEFAULTS[a].slice(); });
    saveKeys();
  }

  function fire(action, isRepeat) {
    var now = Date.now();
    if (isRepeat && now - lastFire < 90) return;  // limit very fast auto-repeat
    lastFire = now;
    if (handler) handler(action);
  }

  document.addEventListener('keydown', function (e) {
    if (capture) {                                  // waiting for a new key in Options
      e.preventDefault();
      var cb = capture; capture = null; cb(e.code);
      return;
    }
    var tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return; // typing
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var action = actionFor(e.code);
    if (!action) return;
    e.preventDefault();
    if (e.repeat && !REPEATS[action]) return;
    fire(action, e.repeat);
  });

  /* Make every [data-action] button inside root work by touch or mouse.
   * Movement, wait and undo repeat while held down. */
  function attachButtons(root) {
    Array.prototype.forEach.call(root.querySelectorAll('[data-action]'), function (btn) {
      var action = btn.getAttribute('data-action'), timer = null;
      function stop() { clearTimeout(timer); clearInterval(timer); timer = null; }
      btn.addEventListener('pointerdown', function (e) {
        e.preventDefault();                         // no focus, no double-tap zoom
        stop();
        fire(action, false);
        if (REPEATS[action]) {
          timer = setTimeout(function () {
            timer = setInterval(function () { fire(action, true); }, 140);
          }, 320);
        }
      });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) { btn.addEventListener(ev, stop); });
      btn.addEventListener('click', function (e) { e.preventDefault(); }); // already handled
    });
  }

  return {
    ACTIONS: ACTIONS,
    LABELS: LABELS,
    getKeys: function () { return keys; },
    reloadKeys: function () { keys = loadKeys(); },   // after the save has loaded
    keyName: keyName,
    bind: bind,
    resetKeys: resetKeys,
    setHandler: function (fn) { handler = fn; },
    captureNext: function (fn) { capture = fn; },
    attachButtons: attachButtons
  };
})();
