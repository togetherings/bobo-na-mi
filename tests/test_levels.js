/* test_levels.js — Checks the puzzles without a browser.  Run:  node tests/test_levels.js
 *
 *  1. Every main level can be won with its solution below.
 *  2. Undo, restart and the move count (the score) work.
 *  3. The "level" choices in kolibri-game.json match the main levels.
 *
 * Solutions use r u l d (moves) and w (wait). When you add a level, add its solution here.
 */
var fs = require('fs'), path = require('path');
var GAME = path.join(__dirname, '..', 'game');
global.window = global;
window.addEventListener = function () {};   // the page events storage.js listens for
['storage.js', 'words.js', 'levels.js', 'engine.js'].forEach(function (f) {
  (0, eval)(fs.readFileSync(path.join(GAME, f), 'utf8'));
});

var SOLUTIONS = {
  'fos-step': 'rrrrrrr',
  'usay-fo-go': 'uruuuur',
  'bobo-na-win': 'urrrrulllldlurrrrrrddlllllullddruu',
  'wata': 'rrrrrrrr',
  'ki-en-dor': 'rrrrrrrrrr',
  'ot-ot': 'rrddurrrrr',
  'titi': 'llluurrdr',
  'padi-de-waka': 'rrrrrwrrrrr',
  'chenj': 'rrruuuullldrrrrrrrddlurulllllllrrrrrrrrddd'
};
var DIR = { r: 0, u: 1, l: 2, d: 3, w: -1 };
var failures = 0;
function check(ok, msg) { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) failures++; }

// 1. Solutions
var ids = {};
BNM.BUILTIN.forEach(function (lv, i) {
  check(/^[a-z0-9-]+$/.test(lv.id || '') && !ids[lv.id], 'level ' + (i + 1) + ' has a unique id (' + lv.id + ')');
  ids[lv.id] = true;
  check(lv.w <= BNM.MAX_SIZE && lv.h <= BNM.MAX_SIZE, lv.id + ' fits in ' + BNM.MAX_SIZE + ' x ' + BNM.MAX_SIZE);
  var sol = SOLUTIONS[lv.id], g = new BNM.Game(lv);
  if (!sol) { check(false, lv.id + ' has a solution in this test'); return; }
  for (var k = 0; k < sol.length && !g.won; k++) g.step(DIR[sol[k]]);
  check(g.won && k === sol.length, lv.id + ' is won by its solution (' + sol.length + ' moves)');
  check(g.moveCount() === sol.length, lv.id + ' counts ' + g.moveCount() + ' moves');
});

// 2. Undo, restart and the move count
var g = new BNM.Game(BNM.BUILTIN[0]);
g.step(0); g.step(0); g.step(1);
check(g.moveCount() === 3, 'three moves count 3');
g.undo();
check(g.moveCount() === 2, 'an undone move does not count');
g.restart();
check(g.moveCount() === 0, 'restart starts the count again');
g.undo();
check(g.moveCount() === 2, 'undoing a restart brings the count back');
g.undo(); g.undo();
check(g.history.length === 0 && g.trail.length === 0, 'undo goes back to the start');

// 3. Manifest choices match the levels
var manifest = JSON.parse(fs.readFileSync(path.join(GAME, 'kolibri-game.json'), 'utf8'));
var choices = manifest.settings.filter(function (s) { return s.key === 'level'; })[0].choices
  .map(function (c) { return c.value; }).filter(function (v) { return v !== 'any'; });
check(JSON.stringify(choices) === JSON.stringify(BNM.BUILTIN.map(function (l) { return l.id; })),
  'kolibri-game.json lists every main level, in order');
var mainJs = fs.readFileSync(path.join(GAME, 'main.js'), 'utf8');
check(mainJs.indexOf("BNM.VERSION = '" + manifest.version + "'") >= 0, 'main.js and kolibri-game.json have the same version');

console.log(failures ? '\n' + failures + ' failed' : '\nAll passed');
process.exit(failures ? 1 : 0);
