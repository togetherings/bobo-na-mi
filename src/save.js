/* save.js — The learner's save, and words in their language.
 *
 * EduGame Kit's helper (edugame.js, added by the build) saves where the game runs:
 * the learner's Kolibri or Moodle account (SCORM), the Kolibri Games games page,
 * Sugarizer's Journal, or the browser. On every platform but the games page a save
 * must stay under 3,900 characters, so it holds only what the learner has done:
 *
 *   { "v": 1,
 *     "b": { "fos-step": 7, ... },     fewest moves for each main level solved
 *     "k": { "undo": ["KeyU", ""] },   keys the learner changed (the rest are default)
 *     "l": [ "BNM1|12|9|...", ... ] }  their own levels, as level codes (levels.js)
 *
 * Saves happen straight away after each change (a solved level, an edited level, a
 * key), because Kolibri drops a save made as the learner leaves.
 *
 * Without the helper (index.html opened from the folder, without a build), the save
 * goes to this browser's localStorage, and words show as their keys: use
 * "edugame preview ." to play with words and the helper.
 */
var BNM = window.BNM = window.BNM || {};

BNM.save = (function () {
  var EG = window.EduGame || null;
  var LIMIT = 3600;               // leave room for the helper's own data (language, options)
  var LOCAL_KEY = 'bobo-na-mi:save';
  var data = { best: {}, keys: {}, levels: [] };
  var onError = null;

  function compact() { return { v: 1, b: data.best, k: data.keys, l: data.levels }; }

  function size() { return JSON.stringify(compact()).length; }

  /* Read the save that EduGame.ready() returned (or the browser's, without the helper). */
  function load(saved) {
    if (!EG) {
      try { saved = JSON.parse(window.localStorage.getItem(LOCAL_KEY)); } catch (e) { saved = null; }
    }
    if (!saved || typeof saved !== 'object') return;
    if (saved.b && typeof saved.b === 'object') data.best = saved.b;
    if (saved.k && typeof saved.k === 'object') data.keys = saved.k;
    if (Array.isArray(saved.l)) data.levels = saved.l.filter(function (c) { return typeof c === 'string'; });
  }

  function write() {
    var save = compact();
    if (!EG) {
      try { window.localStorage.setItem(LOCAL_KEY, JSON.stringify(save)); } catch (e) { /* storage blocked */ }
      return;
    }
    EG.save(save).then(null, function (err) {
      if (onError) onError(BNM.t('save_failed', { error: err.message }));
    });
  }

  /* Change part of the save and write it. Returns false (and changes nothing)
   * if the save would be too big. */
  function set(key, value) {
    var old = data[key];
    data[key] = value;
    if (size() > LIMIT) { data[key] = old; return false; }
    write();
    return true;
  }

  return {
    data: data,
    load: load,
    set: set,
    write: write,
    fullness: function () { return size() / LIMIT; },
    setErrorHandler: function (fn) { onError = fn; }
  };
})();

/* ---------- Words in the learner's language (lang/*.json) ---------- */
BNM.t = function (key, values) {
  if (window.EduGame) return window.EduGame.t(key, values);
  return key;                       // no helper: show the key (see the top of this file)
};

/* ---------- Options in the kit's Options panel ----------
 * BNM.option('touch') -> 'auto' | 'on' | 'off'; 'sound' -> 'on' | 'off';
 * 'meanings' -> 'on' | 'off' (show what rules mean, under the grid). */
BNM.OPTIONS = [
  { key: 'touch', label: 'option.touch', 'default': 'auto', keep: 'device',
    choices: [{ value: 'auto', label: 'option.touch_auto' }, { value: 'on', label: 'option.touch_on' },
              { value: 'off', label: 'option.touch_off' }] },
  { key: 'sound', label: 'option.sound', 'default': 'on', keep: 'device',
    choices: [{ value: 'on', label: 'option.on' }, { value: 'off', label: 'option.off' }] },
  { key: 'meanings', label: 'option.meanings', 'default': 'on', keep: 'learner',
    choices: [{ value: 'on', label: 'option.on' }, { value: 'off', label: 'option.off' }] }
];

BNM.option = function (key) {
  if (window.EduGame) return window.EduGame.option(key);
  return BNM.OPTIONS.filter(function (o) { return o.key === key; })[0]['default'];
};
