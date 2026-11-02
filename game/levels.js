/* levels.js — Built-in levels, level loading and the "Your levels" store.
 *
 * A level can be written in either of two formats:
 *
 * 1) ASCII map (easy to type by hand). One character per cell, using LEGEND:
 *      { id: 'fos-step', name: 'Fos Step', en: 'First step', rows: ['.B=1.', ...],
 *        dirs: { '8,2': 1 } }            // optional facing for the thing at x,y
 *
 * 2) Object list (what the Level Editor exports; allows stacking things):
 *      { name: 'My level', w: 12, h: 9,
 *        objects: [ ['bobo', 2, 3, 0], ['T:na', 4, 1, 0], ... ] }
 *    Each object is [type, x, y, dir]. dir: 0 right, 1 up, 2 left, 3 down.
 *
 * Main levels need an "id" that never changes: saved progress and coaches'
 * challenge settings refer to it. If you add, rename or remove a main level,
 * also update the "level" choices in kolibri-game.json (tests/test_levels.js
 * checks that the two match).
 *
 * To add a main level: append it to BNM.LEVELS below, with a new id. You can
 * paste a level exported from the editor and add an id to it.
 */
var BNM = window.BNM = window.BNM || {};

BNM.MAX_SIZE = 24;

/* Characters used in ASCII maps. '.' or ' ' is an empty cell. */
BNM.LEGEND = {
  // things (lower case)
  b: 'bobo', t: 'titi', p: 'padi', w: 'wol', r: 'rok', f: 'flag',
  a: 'wata', h: 'faya', k: 'ki', d: 'dor',
  // noun text (upper case)
  B: 'T:bobo', T: 'T:titi', P: 'T:padi', W: 'T:wol', R: 'T:rok', F: 'T:flag',
  A: 'T:wata', H: 'T:faya', K: 'T:ki', D: 'T:dor', O: 'T:wod',
  // joining words
  '=': 'T:na', '&': 'T:en',
  // properties
  '1': 'T:mi', '2': 'T:win', '3': 'T:tap', '4': 'T:shub', '5': 'T:dai',
  '6': 'T:sink', '7': 'T:ot', '8': 'T:melt', '9': 'T:opin', '0': 'T:shet',
  M: 'T:waka'
};

/* ---------------- The main levels ---------------- */
BNM.LEVELS = [
  { id: 'fos-step', name: 'Fos Step', en: 'First step',          // push the rock, reach the flag
    rows: [
      '..............',
      '.B=1......F=2.',
      '..............',
      '.wwwwwwwwwwww.',
      '..............',
      '....b..r...f..',
      '..............',
      '.wwwwwwwwwwww.',
      '..............',
      '.W=3......R=4.',
      '..............'
    ] },

  { id: 'usay-fo-go', name: 'Usay fɔ Go?', en: 'Where to go?',      // break WOL NA TAP
    rows: [
      '...........',
      '.B=1.......',
      '...........',
      '..wwwwwww..',
      '..w.....w..',
      '..w..f..w..',
      '..w.....w..',
      '..wwwwwww..',
      '...........',
      '.W=3..F=2..',
      '...b.......'
    ] },

  { id: 'bobo-na-win', name: 'Bobo na Win', en: 'Boy is win',        // build a rule downwards
    rows: [
      'wwwwwwwwwwww',
      'w..........w',
      'w.B=1......w',
      'w..........w',
      'w.....=....w',
      'w..........w',
      'w..b...2...w',
      'w..W=3.....w',
      'wwwwwwwwwwww'
    ] },

  { id: 'wata', name: 'Wata', en: 'Water',                    // a rock fills the water
    rows: [
      '.............',
      '.B=1...F=2...',
      '.R=4.........',
      'wwwwwwwwwwwww',
      'w.....a.....w',
      'w.b.r.a...f.w',
      'w.....a.....w',
      'wwwwwwwwwwwww',
      '.A=6...W=3...'
    ] },

  { id: 'ki-en-dor', name: 'Ki en Dor', en: 'Key and door',        // OPIN meets SHET
    rows: [
      '.B=1....F=2.....',
      '.D=3&0..K=4&9...',
      '................',
      'wwwwwwwwwwwwwwww',
      'w.......w......w',
      'w.b..k..d...f..w',
      'w.......w......w',
      'wwwwwwwwwwwwwwww',
      '.W=3............'
    ] },

  { id: 'ot-ot', name: 'Ot Ot', en: 'Hot hot',                 // stop melting
    rows: [
      '.............',
      '.B=1...H=7...',
      '.F=2.........',
      '.............',
      '...b.....hhh.',
      '.........hfh.',
      '...B=8...hhh.',
      '.............'
    ] },

  { id: 'titi', name: 'Titi', en: 'Girl',                     // a second MI
    rows: [
      '.B=1..........',
      '..............',
      '..........wwww',
      '.T..=1....w..w',
      '..........w..w',
      '...b......wt.w',
      '..........w.fw',
      '..........wwww',
      '.F=2...W=3....'
    ],
    dirs: { '11,5': 2 } },

  { id: 'padi-de-waka', name: 'Padi de Waka', en: 'Friend is walking',  // time your steps
    rows: [
      'wwwwwwwwwwwwwww',
      'w.............w',
      'w.b.....p...f.w',
      'w.............w',
      'wwwwwwwwwwwwwww',
      '.B=1.P=M.F=2...',
      '.W=3.P=5.......'
    ],
    dirs: { '8,2': 1 } },

  { id: 'chenj', name: 'Chenj', en: 'Change',                  // ROK NA FLAG
    rows: [
      '..............',
      '.R=4..........',
      '....=.........',
      '..............',
      '.F=2....F.....',
      '..............',
      '..b.......r...',
      '..............',
      '.B=1..........'
    ] }
];

/* Turn either level format into { name, en, w, h, objects: [[type,x,y,dir]...] }. */
BNM.parseLevel = function (src) {
  if (src.objects) {
    return { id: src.id, name: src.name || 'Level', en: src.en || '', w: src.w, h: src.h,
             objects: src.objects.map(function (o) { return o.slice(); }) };
  }
  var rows = src.rows, h = rows.length, w = 0, objects = [];
  rows.forEach(function (row) { w = Math.max(w, row.length); });
  rows.forEach(function (row, y) {
    for (var x = 0; x < row.length; x++) {
      var ch = row.charAt(x);
      if (ch === '.' || ch === ' ') continue;
      var type = BNM.LEGEND[ch];
      if (!type) { console.warn('Unknown map character "' + ch + '" in ' + src.name); continue; }
      var dir = (src.dirs && src.dirs[x + ',' + y]) || 0;
      objects.push([type, x, y, dir]);
    }
  });
  return { id: src.id, name: src.name || 'Level', en: src.en || '', w: w, h: h, objects: objects };
};

/* Check a level that came from outside (import / paste). Throws an Error with a readable message. */
BNM.validateLevel = function (d) {
  if (!d || typeof d !== 'object') throw new Error('not a level');
  if (d.rows) d = BNM.parseLevel(d);
  var w = d.w | 0, h = d.h | 0;
  if (w < 1 || h < 1 || w > BNM.MAX_SIZE || h > BNM.MAX_SIZE) throw new Error('size must be 1 to ' + BNM.MAX_SIZE);
  if (!Array.isArray(d.objects)) throw new Error('missing "objects" list');
  var objects = d.objects.map(function (o, i) {
    if (!Array.isArray(o) || !BNM.isKnownType(String(o[0]))) throw new Error('unknown thing #' + (i + 1));
    var x = o[1] | 0, y = o[2] | 0;
    if (x < 0 || y < 0 || x >= w || y >= h) throw new Error('thing #' + (i + 1) + ' is outside the grid');
    return [String(o[0]), x, y, (o[3] | 0) & 3];
  });
  return { name: String(d.name || 'Imported level').slice(0, 40), en: String(d.en || ''), w: w, h: h, objects: objects };
};

/* Level -> tidy JSON text (one object per line, easy to read and diff). */
BNM.levelToJSON = function (l) {
  return '{\n  "name": ' + JSON.stringify(l.name) + ',\n  "w": ' + l.w + ', "h": ' + l.h + ',\n  "objects": [\n' +
    l.objects.map(function (o) { return '    ' + JSON.stringify(o); }).join(',\n') + '\n  ]\n}';
};

/* All main levels, ready to play. */
BNM.BUILTIN = BNM.LEVELS.map(BNM.parseLevel);

/* "Your levels": levels saved from the editor (kept in storage). */
BNM.custom = {
  list: function () { return BNM.storage.get('custom', []); },
  get: function (id) {
    var all = this.list();
    for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
    return null;
  },
  save: function (level, id) {           // returns the id, or null if there is no room
    var all = this.list();
    id = id || ('L' + Date.now().toString(36));
    var entry = { id: id, name: level.name, w: level.w, h: level.h, objects: level.objects };
    var found = false;
    for (var i = 0; i < all.length; i++) if (all[i].id === id) { all[i] = entry; found = true; }
    if (!found) all.push(entry);
    if (!BNM.storage.set('custom', all)) return null;   // save is full
    return id;
  },
  remove: function (id) {
    BNM.storage.set('custom', this.list().filter(function (l) { return l.id !== id; }));
  }
};
