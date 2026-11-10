/* test_levels.js — Checks the puzzles without a browser.  Run:  node tests/test_levels.js
 *
 *  1. Every main level can be won with its solution below.
 *  2. Undo, restart and the move count work.
 *  3. Level codes: every level comes back the same, and a big level still fits the save.
 *  4. Every word and level has its meaning in every language (lang/*.json).
 *
 * Solutions use r u l d (moves) and w (wait). When you add a level, add its solution here.
 */
var fs = require('fs'), path = require('path');
var ROOT = path.join(__dirname, '..');
global.window = global;
['src/words.js', 'src/levels.js', 'src/engine.js', 'src/save.js'].forEach(function (f) {
  (0, eval)(fs.readFileSync(path.join(ROOT, f), 'utf8'));
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

// 3. Level codes
BNM.BUILTIN.forEach(function (lv) {
  var back = BNM.decodeLevel(BNM.encodeLevel(lv));
  var sort = function (list) { return JSON.stringify(list.map(function (o) { return o.join(); }).sort()); };
  check(back.w === lv.w && back.h === lv.h && back.name === lv.name && sort(back.objects) === sort(lv.objects),
    lv.id + ' comes back the same from its level code');
});
Object.keys(BNM.WORDS).forEach(function (w) {
  check(!!BNM.TYPE_CHAR[BNM.textOf(w)], 'the word ' + w + ' has a map character (LEGEND)');
  if (BNM.isKnownType(w)) check(!!BNM.TYPE_CHAR[w], 'the thing ' + w + ' has a map character (LEGEND)');
});
var big = { name: 'Big', w: 24, h: 24, objects: [] };
for (var y = 0; y < 24; y++) for (var x = 0; x < 24; x++) if (x === 0 || y === 0 || x === 23 || y === 23 || (x + y) % 3 === 0) big.objects.push(['wol', x, y, 0]);
var bigCode = BNM.encodeLevel(big);
check(BNM.save.set('levels', [bigCode]), 'a 24 x 24 level with ' + big.objects.length + ' walls fits the save (' + bigCode.length + ' characters)');
var bad = ['BNM1|5|5|x|z0', 'BNM1|5|5|x|b0zz', 'BNM2|5|5|x|', 'nonsense'];
bad.forEach(function (code) {
  var threw = false;
  try { BNM.decodeLevel(code); } catch (e) { threw = true; }
  check(threw, 'a broken code is refused: ' + code);
});

// 4. Every language has every word and level meaning, and the same keys as English
var en = JSON.parse(fs.readFileSync(path.join(ROOT, 'lang', 'en.json'), 'utf8'));
var config = JSON.parse(fs.readFileSync(path.join(ROOT, 'edugame.json'), 'utf8'));
Object.keys(BNM.WORDS).forEach(function (w) { check(!!en['word.' + w], 'lang/en.json has word.' + w); });
BNM.BUILTIN.forEach(function (lv) { check(!!en['level.' + lv.id], 'lang/en.json has level.' + lv.id); });
config.languages.forEach(function (code) {
  var words = JSON.parse(fs.readFileSync(path.join(ROOT, 'lang', code + '.json'), 'utf8'));
  var missing = Object.keys(en).filter(function (k) { return k.charAt(0) !== '_' && !(k in words); });
  check(!missing.length, 'lang/' + code + '.json has every word' + (missing.length ? ' (missing: ' + missing.join(', ') + ')' : ''));
});
var mainJs = fs.readFileSync(path.join(ROOT, 'src', 'main.js'), 'utf8');
check(mainJs.indexOf("BNM.VERSION = '" + config.version + "'") >= 0, 'main.js and edugame.json have the same version');

console.log(failures ? '\n' + failures + ' failed' : '\nAll passed');
process.exit(failures ? 1 : 0);
