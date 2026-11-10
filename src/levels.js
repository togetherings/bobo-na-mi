/* levels.js — Built-in levels, level codes and the "Your levels" store.
 *
 * A main level is written as an ASCII map. One character per cell, using LEGEND:
 *      { id: 'fos-step', name: 'Fos Step', rows: ['.B=1.', ...],
 *        dirs: { '8,2': 1 } }            // optional facing for the thing at x,y
 * or as a level code from the editor (see "Level codes" below):
 *      { id: 'my-level', code: 'BNM1|12|9|My level|b0..,...' }
 *
 * Inside the game a level is { name, w, h, objects: [[type, x, y, dir], ...] }.
 * dir: 0 right, 1 up, 2 left, 3 down.
 *
 * Main levels need an "id" that never changes: saved progress refers to it.
 * Level names are Krio and stay as they are; the meaning shown under each name is
 * in lang/*.json ("level.fos-step": "First step"). When you add a main level, add
 * its meaning to every lang/*.json and its solution to tests/test_levels.js.
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
  { id: 'fos-step', name: 'Fos Step',          // push the rock, reach the flag
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

  { id: 'usay-fo-go', name: 'Usay fɔ Go?',      // break WOL NA TAP
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

  { id: 'bobo-na-win', name: 'Bobo na Win',        // build a rule downwards
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

  { id: 'wata', name: 'Wata',                    // a rock fills the water
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

  { id: 'ki-en-dor', name: 'Ki en Dor',        // OPIN meets SHET
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

  { id: 'ot-ot', name: 'Ot Ot',                 // stop melting
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

  { id: 'titi', name: 'Titi',                     // a second MI
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

  { id: 'padi-de-waka', name: 'Padi de Waka',  // time your steps
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

  { id: 'chenj', name: 'Chenj',                  // ROK NA FLAG
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

/* A main level (ASCII map or code) -> { id, name, w, h, objects }. */
BNM.parseLevel = function (src) {
  if (src.code) {
    var fromCode = BNM.decodeLevel(src.code);
    fromCode.id = src.id;
    return fromCode;
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
  return { id: src.id, name: src.name || 'Level', w: w, h: h, objects: objects };
};

/* ---------------- Level codes ----------------
 * A short text form of a level, used in saves (which must stay under 3,900 characters
 * on every platform) and to share levels:
 *
 *     BNM1|<width>|<height>|<name>|<groups>
 *
 * Each group is the things of one kind facing one way: the LEGEND character, the
 * direction (0-3), then each thing's cell as two base-36 characters (y * 24 + x).
 * Groups are separated by commas.  Example:  BNM1|5|3|Tiny|b0a1,B0010203
 */
BNM.CODE_PREFIX = 'BNM1';
BNM.TYPE_CHAR = {};
Object.keys(BNM.LEGEND).forEach(function (ch) { BNM.TYPE_CHAR[BNM.LEGEND[ch]] = ch; });

BNM.encodeLevel = function (l) {
  var groups = {}, order = [];
  l.objects.forEach(function (o) {
    var key = BNM.TYPE_CHAR[o[0]] + (o[3] & 3);
    if (!groups[key]) { groups[key] = ''; order.push(key); }
    var cell = (o[2] * BNM.MAX_SIZE + o[1]).toString(36);
    groups[key] += (cell.length < 2 ? '0' : '') + cell;
  });
  var name = String(l.name || '').replace(/[|\n]/g, ' ').trim().slice(0, 40);
  return [BNM.CODE_PREFIX, l.w, l.h, name, order.map(function (k) { return k + groups[k]; }).join(',')].join('|');
};

/* Throws an Error with a readable message if the code is broken. */
BNM.decodeLevel = function (code) {
  var parts = String(code).trim().split('|');
  if (parts.length !== 5 || parts[0] !== BNM.CODE_PREFIX) throw new Error('not a level code');
  var objects = [];
  if (parts[4]) parts[4].split(',').forEach(function (g) {
    var type = BNM.LEGEND[g.charAt(0)], dir = +g.charAt(1);
    if (!type || !(dir >= 0 && dir <= 3) || g.length % 2) throw new Error('broken group "' + g.slice(0, 6) + '"');
    for (var i = 2; i < g.length; i += 2) {
      var cell = parseInt(g.substr(i, 2), 36);
      objects.push([type, cell % BNM.MAX_SIZE, Math.floor(cell / BNM.MAX_SIZE), dir]);
    }
  });
  return BNM.validateLevel({ name: parts[3] || 'Level', w: +parts[1], h: +parts[2], objects: objects });
};

/* Check a level that came from outside (import / paste). Throws an Error with a readable message. */
BNM.validateLevel = function (d) {
  if (!d || typeof d !== 'object') throw new Error('not a level');
  if (d.rows || d.code) d = BNM.parseLevel(d);
  var w = d.w | 0, h = d.h | 0;
  if (w < 1 || h < 1 || w > BNM.MAX_SIZE || h > BNM.MAX_SIZE) throw new Error('size must be 1 to ' + BNM.MAX_SIZE);
  if (!Array.isArray(d.objects)) throw new Error('missing "objects" list');
  var objects = d.objects.map(function (o, i) {
    if (!Array.isArray(o) || !BNM.isKnownType(String(o[0]))) throw new Error('unknown thing #' + (i + 1));
    var x = o[1] | 0, y = o[2] | 0;
    if (x < 0 || y < 0 || x >= w || y >= h) throw new Error('thing #' + (i + 1) + ' is outside the grid');
    return [String(o[0]), x, y, (o[3] | 0) & 3];
  });
  return { name: String(d.name || 'Imported level').slice(0, 40), w: w, h: h, objects: objects };
};

/* All main levels, ready to play. */
BNM.BUILTIN = BNM.LEVELS.map(BNM.parseLevel);

/* "Your levels": levels made in the editor, kept as codes in the learner's save
 * (see save.js). Each has an id that stays the same while it is changed. */
BNM.custom = {
  list: function () {
    return BNM.save.data.levels.map(function (c, i) {
      try { var l = BNM.decodeLevel(c); l.id = String(i); return l; } catch (e) { return null; }
    }).filter(Boolean);
  },
  get: function (id) { return this.list().filter(function (l) { return l.id === id; })[0] || null; },
  /* Returns the level's id, or null if the save has no room for it. */
  save: function (level, id) {
    var codes = BNM.save.data.levels.slice(), code = BNM.encodeLevel(level);
    if (id !== null && id !== undefined && codes[+id] !== undefined) codes[+id] = code;
    else { codes.push(code); id = String(codes.length - 1); }
    return BNM.save.set('levels', codes) ? String(id) : null;
  },
  remove: function (id) {
    var codes = BNM.save.data.levels.slice();
    codes.splice(+id, 1);
    BNM.save.set('levels', codes);
  }
};
