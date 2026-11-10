/* words.js — The Krio vocabulary of Bobo na Mi.
 *
 * Every word can appear on the grid as a pushable TEXT tile.
 *   kind 'noun' : names a kind of thing (BOBO, WOL ...). Nouns also exist as objects.
 *   kind 'op'   : joining words (NA = "is", EN = "and").
 *   kind 'prop' : properties a thing can have (MI = "you", WIN = "win" ...).
 *
 *   label : what is written on the tile (2–4 letters look best)
 *   en    : English meaning (shown in the Words screen and the rule bar)
 *   color : colour of the text tile
 *   layer : (nouns only) drawing order — low numbers are drawn underneath
 *
 * The spellings are a starting point; please review them with Krio speakers.
 * To add a new word: add an entry here, add a drawing in sprites.js
 * (nouns only), and if needed a behaviour in engine.js (properties only).
 */
var BNM = window.BNM = window.BNM || {};

BNM.WORDS = {
  // ----- Nouns (things) -----
  bobo: { kind: 'noun', label: 'BOBO', en: 'boy',         color: '#5ab4ff', layer: 3 },
  titi: { kind: 'noun', label: 'TITI', en: 'girl',        color: '#ff7eb6', layer: 3 },
  padi: { kind: 'noun', label: 'PADI', en: 'friend',      color: '#7be07b', layer: 3 },
  wol:  { kind: 'noun', label: 'WOL',  en: 'wall',        color: '#c08a5e', layer: 1 },
  rok:  { kind: 'noun', label: 'ROK',  en: 'rock',        color: '#c9b08a', layer: 2 },
  flag: { kind: 'noun', label: 'FLAG', en: 'flag',        color: '#ffd84a', layer: 1 },
  wata: { kind: 'noun', label: 'WATA', en: 'water',       color: '#4a90e2', layer: 0 },
  faya: { kind: 'noun', label: 'FAYA', en: 'fire',        color: '#ff6a2b', layer: 0 },
  ki:   { kind: 'noun', label: 'KI',   en: 'key',         color: '#ffd84a', layer: 2 },
  dor:  { kind: 'noun', label: 'DOR',  en: 'door',        color: '#e0533d', layer: 1 },
  wod:  { kind: 'noun', label: 'WOD',  en: 'word (text)', color: '#e8e8f0', layer: 4 },

  // ----- Joining words -----
  na:   { kind: 'op', label: 'NA', en: 'is',  color: '#ffffff' },
  en:   { kind: 'op', label: 'EN', en: 'and', color: '#ffffff' },

  // ----- Properties -----
  mi:   { kind: 'prop', label: 'MI',   en: 'you (me)',     color: '#ff7eb6' },
  win:  { kind: 'prop', label: 'WIN',  en: 'win',          color: '#ffd84a' },
  tap:  { kind: 'prop', label: 'TAP',  en: 'stop',         color: '#4bb36b' },
  shub: { kind: 'prop', label: 'SHUB', en: 'push',         color: '#c08a5e' },
  dai:  { kind: 'prop', label: 'DAI',  en: 'defeat (die)', color: '#d84848' },
  sink: { kind: 'prop', label: 'SINK', en: 'sink',         color: '#4a90e2' },
  ot:   { kind: 'prop', label: 'OT',   en: 'hot',          color: '#ff8a3c' },
  melt: { kind: 'prop', label: 'MELT', en: 'melt',         color: '#6fd3ff' },
  opin: { kind: 'prop', label: 'OPIN', en: 'open',         color: '#ffd84a' },
  shet: { kind: 'prop', label: 'SHET', en: 'shut',         color: '#e0533d' },
  waka: { kind: 'prop', label: 'WAKA', en: 'move (walk)',  color: '#9ad35a' }
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

/* English short form of a word, e.g. 'you (me)' -> 'you'. */
BNM.english = function (word) { return BNM.WORDS[word].en.split(' (')[0]; };
