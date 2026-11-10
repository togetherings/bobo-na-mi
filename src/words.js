/* words.js — The Krio vocabulary of Bobo na Mi.
 *
 * Every word can appear on the grid as a pushable TEXT tile.
 *   kind 'noun' : names a kind of thing (BOBO, WOL ...). Nouns also exist as objects.
 *   kind 'op'   : joining words (NA = "is", EN = "and").
 *   kind 'prop' : properties a thing can have (MI = "you", WIN = "win" ...).
 *
 *   label : what is written on the tile (2–4 letters look best)
 *   color : colour of the text tile
 *   layer : (nouns only) drawing order — low numbers are drawn underneath
 *
 * The meaning of each word, in the learner's language, is in lang/*.json
 * ("word.bobo": "boy"; "word_note.mi": "me", the word for word meaning, if it differs).
 *
 * The spellings are a starting point; please review them with Krio speakers.
 * To add a new word: add an entry here, its meaning in every lang/*.json, a map
 * character in LEGEND (levels.js), and run tools/build_assets.py for its tile
 * (and a picture, for nouns). Properties also need a behaviour in engine.js.
 */
var BNM = window.BNM = window.BNM || {};

BNM.WORDS = {
  // ----- Nouns (things) -----
  bobo: { kind: 'noun', label: 'BOBO', color: '#5ab4ff', layer: 3 },
  titi: { kind: 'noun', label: 'TITI', color: '#ff7eb6', layer: 3 },
  padi: { kind: 'noun', label: 'PADI', color: '#7be07b', layer: 3 },
  wol:  { kind: 'noun', label: 'WOL', color: '#c08a5e', layer: 1 },
  rok:  { kind: 'noun', label: 'ROK', color: '#c9b08a', layer: 2 },
  flag: { kind: 'noun', label: 'FLAG', color: '#ffd84a', layer: 1 },
  wata: { kind: 'noun', label: 'WATA', color: '#4a90e2', layer: 0 },
  faya: { kind: 'noun', label: 'FAYA', color: '#ff6a2b', layer: 0 },
  ki:   { kind: 'noun', label: 'KI', color: '#ffd84a', layer: 2 },
  dor:  { kind: 'noun', label: 'DOR', color: '#e0533d', layer: 1 },
  wod:  { kind: 'noun', label: 'WOD', color: '#e8e8f0', layer: 4 },

  // ----- Joining words -----
  na:   { kind: 'op', label: 'NA', color: '#ffffff' },
  en:   { kind: 'op', label: 'EN', color: '#ffffff' },

  // ----- Properties -----
  mi:   { kind: 'prop', label: 'MI', color: '#ff7eb6' },
  win:  { kind: 'prop', label: 'WIN', color: '#ffd84a' },
  tap:  { kind: 'prop', label: 'TAP', color: '#4bb36b' },
  shub: { kind: 'prop', label: 'SHUB', color: '#c08a5e' },
  dai:  { kind: 'prop', label: 'DAI', color: '#d84848' },
  sink: { kind: 'prop', label: 'SINK', color: '#4a90e2' },
  ot:   { kind: 'prop', label: 'OT', color: '#ff8a3c' },
  melt: { kind: 'prop', label: 'MELT', color: '#6fd3ff' },
  opin: { kind: 'prop', label: 'OPIN', color: '#ffd84a' },
  shet: { kind: 'prop', label: 'SHET', color: '#e0533d' },
  waka: { kind: 'prop', label: 'WAKA', color: '#9ad35a' }
};

/* Object types: a thing is just its noun ('bobo'); a text tile is 'T:' + word ('T:bobo', 'T:na'). */
BNM.isText = function (type) { return type.indexOf('T:') === 0; };
BNM.wordOf = function (type) { return type.slice(2); };
BNM.textOf = function (word) { return 'T:' + word; };

BNM.isKnownType = function (type) {
  if (BNM.isText(type)) return !!BNM.WORDS[BNM.wordOf(type)];
  var w = BNM.WORDS[type];
  return !!w && w.kind === 'noun' && type !== 'wod'; // WOD only exists as text
};

/* A word's meaning in the learner's language, e.g. 'mi' -> 'you'. */
BNM.meaning = function (word) { return BNM.t('word.' + word); };
