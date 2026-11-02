/* storage.js — Saving settings, progress and custom levels.
 *
 * In Kolibri Games, each learner's save is kept on the Kolibri server through
 * the Kolibri Games SDK (KolibriGames.getState / setState), so it follows the
 * learner to any device. The whole save is one JSON object of up to 64 KB:
 *
 *   { settings: {...}, keys: {...}, cleared: {...}, best: {...}, custom: [...] }
 *
 * The save is loaded once at start-up (BNM.storage.init) and kept in memory,
 * so get() and set() are instant. Changes are sent to the server a moment
 * later, several changes at once.
 *
 * Without Kolibri Games (index.html opened straight from a folder, or as a
 * plain Kolibri HTML5 app) the save goes to localStorage instead, or stays in
 * memory if the browser blocks storage.
 */
var BNM = window.BNM = window.BNM || {};

BNM.storage = (function () {
  var KG = window.KolibriGames || null;
  var LOCAL_KEY = 'bobo-na-mi:save';
  var LIMIT = 60000;            // stay under the SDK's 64 KB limit
  var DELAY = 800;              // ms to wait so several changes go in one save
  var data = {};
  var timer = null;
  var onError = null;           // function(message), set by main.js

  function readLocal() {
    try { return JSON.parse(window.localStorage.getItem(LOCAL_KEY)) || {}; } catch (e) { return {}; }
  }
  function writeLocal(text) {
    try { window.localStorage.setItem(LOCAL_KEY, text); } catch (e) { /* storage blocked: memory only */ }
  }

  /* Load the save. Returns a Promise; the game starts when it resolves. */
  function init() {
    if (!KG) { data = readLocal(); return Promise.resolve(); }
    return KG.getState().then(function (saved) {
      data = (saved && typeof saved === 'object') ? saved : {};
    }, function (err) {
      data = {};
      if (onError) onError('Could not load your saved game: ' + err.message);
    });
  }

  function flush() {
    clearTimeout(timer);
    timer = null;
    var text = JSON.stringify(data);
    if (!KG) { writeLocal(text); return; }
    KG.setState(data).catch(function (err) {
      if (onError) onError('Could not save: ' + err.message);
    });
  }

  function get(key, fallback) {
    return (key in data) ? JSON.parse(JSON.stringify(data[key])) : fallback;  // a copy
  }

  /* Returns false (and changes nothing) if the save would be too big. */
  function set(key, value) {
    var old = data[key];
    data[key] = value;
    if (JSON.stringify(data).length > LIMIT) { data[key] = old; return false; }
    clearTimeout(timer);
    timer = setTimeout(flush, DELAY);
    return true;
  }

  /* How full the save is, from 0 to 1 (shown in the editor). */
  function fullness() { return JSON.stringify(data).length / LIMIT; }

  // Send any waiting change before the page closes.
  window.addEventListener('pagehide', function () { if (timer) flush(); });

  return {
    init: init, get: get, set: set, flush: flush, fullness: fullness,
    setErrorHandler: function (fn) { onError = fn; }
  };
})();

/* Player settings. Change and then call BNM.saveSettings().
 * BNM.loadSettings() runs after the save has loaded. */
BNM.settings = { touch: 'auto', sound: true, english: true };

BNM.loadSettings = function () {
  var saved = BNM.storage.get('settings', {});
  for (var k in BNM.settings) if (k in saved) BNM.settings[k] = saved[k];
};
BNM.saveSettings = function () { BNM.storage.set('settings', BNM.settings); };
