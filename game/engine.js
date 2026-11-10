/* engine.js — The puzzle rules (game logic). Nothing here draws anything.
 *
 * A level is { w, h, objects: [[type, x, y, dir], ...] }   (see levels.js)
 *   dir: 0 = right, 1 = up, 2 = left, 3 = down
 *
 * One turn (Game.step) works like this:
 *   1. Everything that is MI moves one cell in the chosen direction, pushing SHUB things.
 *   2. Everything that is WAKA moves forward one cell (and turns around when blocked).
 *   3. Rules are read again from the text; NOUN NA NOUN changes things into other things.
 *   4. Things sharing a cell react: SINK, DAI, OT + MELT, OPIN + SHET.
 *   5. If something MI shares a cell with something WIN, the level is won.
 * The state before each turn is saved, so turns can be undone (rewind).
 * Each saved turn also has a letter in "trail" (r u l d = moves, w = wait,
 * x = restart). The trail gives the score (moveCount) and the list of moves
 * that coaches see.
 *
 * Sentences are read left-to-right and top-to-bottom:
 *   NOUN [EN NOUN ...] NA (PROPERTY|NOUN) [EN (PROPERTY|NOUN) ...]
 *   e.g.  BOBO NA MI      BOBO EN TITI NA MI      DOR NA TAP EN SHET
 * Text is always SHUB (pushable), even without a rule.
 */
var BNM = window.BNM = window.BNM || {};

(function () {
  var DX = [1, 0, -1, 0];
  var DY = [0, -1, 0, 1];
  var MAX_UNDO = 5000;
  BNM.DX = DX;
  BNM.DY = DY;

  function Game(level) {
    this.level = level;          // kept so the level can be restarted
    this.w = level.w;
    this.h = level.h;
    this.history = [];           // saved states for undo
    this.trail = [];             // one letter per saved state (see top of file)
    this.nextId = 1;
    this.load(level.objects);
  }

  /* ---------- Setting up, saving and restoring ---------- */

  Game.prototype.load = function (list) {
    this.objects = [];
    for (var i = 0; i < list.length; i++) {
      var a = list[i];
      this.objects.push({ id: this.nextId++, type: a[0], x: a[1], y: a[2], dir: a[3] || 0 });
    }
    this.won = false;
    this.events = {};
    this.refreshRules();
  };

  Game.prototype.snapshot = function () {
    return JSON.stringify(this.objects.map(function (o) { return [o.id, o.type, o.x, o.y, o.dir]; }));
  };

  Game.prototype.restore = function (snap) {
    this.objects = JSON.parse(snap).map(function (a) {
      return { id: a[0], type: a[1], x: a[2], y: a[3], dir: a[4] };
    });
    this.won = false;
    this.parseRules();
  };

  Game.prototype.undo = function () {
    if (!this.history.length) return false;
    this.restore(this.history.pop());
    this.trail.pop();
    this.events = { undo: true };
    return true;
  };

  /* Restart is saved in the history too, so a restart can be undone. */
  Game.prototype.restart = function () {
    var before = this.snapshot();
    this.load(this.level.objects);
    if (this.snapshot() === before) return false;
    this.remember(before, 'x');
    this.events = { restart: true };
    return true;
  };

  /* ---------- Asking questions about things ---------- */

  /* Does this object have a property (e.g. 'mi', 'shub') right now? */
  Game.prototype.has = function (obj, prop) {
    var key = BNM.isText(obj.type) ? 'wod' : obj.type;
    var p = this.props[key];
    return !!(p && p[prop]);
  };

  Game.prototype.objectsAt = function (x, y) {
    var out = [];
    for (var i = 0; i < this.objects.length; i++) {
      var o = this.objects[i];
      if (o.x === x && o.y === y) out.push(o);
    }
    return out;
  };

  Game.prototype.hasYou = function () {
    for (var i = 0; i < this.objects.length; i++) if (this.has(this.objects[i], 'mi')) return true;
    return false;
  };

  /* ---------- Reading the rules from the text tiles ---------- */

  Game.prototype.parseRules = function () {
    var W = BNM.WORDS;
    var grid = {};                     // "x,y" -> { word, id } (one text per cell)
    this.objects.forEach(function (o) {
      if (!BNM.isText(o.type)) return;
      var k = o.x + ',' + o.y;
      if (!grid[k]) grid[k] = { word: BNM.wordOf(o.type), id: o.id };
    });

    var rules = [], seen = {}, active = {};
    function at(x, y) { return grid[x + ',' + y]; }
    function kind(t) { return t && W[t.word] ? W[t.word].kind : null; }
    function is(t, word) { return !!t && t.word === word; }
    function isPred(t) { var k = kind(t); return k === 'noun' || k === 'prop'; }

    // Try to read a sentence that starts at line[i]
    function readSentence(line, i) {
      var used = [], subjects = [], preds = [], j = i;
      if (kind(line[j]) !== 'noun') return;                   // NOUN
      subjects.push(line[j].word); used.push(line[j].id); j++;
      while (is(line[j], 'en') && kind(line[j + 1]) === 'noun') { // EN NOUN ...
        used.push(line[j].id, line[j + 1].id); subjects.push(line[j + 1].word); j += 2;
      }
      if (!is(line[j], 'na')) return;                          // NA
      used.push(line[j].id); j++;
      if (!isPred(line[j])) return;                            // PROPERTY or NOUN
      preds.push(line[j].word); used.push(line[j].id); j++;
      while (is(line[j], 'en') && isPred(line[j + 1])) {       // EN ... more
        used.push(line[j].id, line[j + 1].id); preds.push(line[j + 1].word); j += 2;
      }
      subjects.forEach(function (s) {
        preds.forEach(function (p) {
          if (seen[s + '>' + p]) return;
          seen[s + '>' + p] = true;
          rules.push({ subject: s, pred: p });
        });
      });
      used.forEach(function (id) { active[id] = true; });
    }

    // Read every horizontal and vertical line of touching text tiles
    Object.keys(grid).forEach(function (k) {
      var xy = k.split(','), x0 = +xy[0], y0 = +xy[1];
      [[1, 0], [0, 1]].forEach(function (d) {
        if (at(x0 - d[0], y0 - d[1])) return;          // not the start of a line
        var line = [], x = x0, y = y0;
        while (at(x, y)) { line.push(at(x, y)); x += d[0]; y += d[1]; }
        for (var i = 0; i < line.length; i++) readSentence(line, i);
      });
    });

    // Turn the rules into quick lookup tables
    var props = {}, transforms = {}, locked = {};
    rules.concat([{ subject: 'wod', pred: 'shub' }]).forEach(function (r) {
      if (W[r.pred].kind === 'prop') {
        (props[r.subject] = props[r.subject] || {})[r.pred] = true;
      } else if (r.pred === r.subject) {
        locked[r.subject] = true;      // "BOBO NA BOBO" stops Bobo changing
      } else {
        (transforms[r.subject] = transforms[r.subject] || []).push(r.pred);
      }
    });

    this.rules = rules;                // for showing in the rule bar
    this.activeText = active;          // ids of text that is part of a rule (drawn bright)
    this.props = props;
    this.transforms = transforms;
    this.locked = locked;
  };

  /* NOUN NA NOUN: change things into other things. Returns true if anything changed. */
  Game.prototype.applyTransforms = function () {
    var self = this, born = [], changed = false;
    this.objects.forEach(function (o) {
      var key = BNM.isText(o.type) ? 'wod' : o.type;
      if (self.locked[key] || !self.transforms[key]) return;
      var newTypes = [];
      self.transforms[key].forEach(function (t) {
        if (t === 'wod') { if (!BNM.isText(o.type)) newTypes.push(BNM.textOf(o.type)); } // BOBO NA WOD
        else newTypes.push(t);
      });
      if (!newTypes.length) return;
      o.type = newTypes[0];
      for (var i = 1; i < newTypes.length; i++) {                 // one copy per extra target
        born.push({ id: self.nextId++, type: newTypes[i], x: o.x, y: o.y, dir: o.dir });
      }
      changed = true;
    });
    this.objects = this.objects.concat(born);
    return changed;
  };

  Game.prototype.refreshRules = function () {
    this.parseRules();
    if (this.applyTransforms()) this.parseRules();
  };

  /* ---------- Movement ---------- */

  /* OPIN things may walk into SHET things (and the other way round); they then destroy each other. */
  Game.prototype.passesThrough = function (a, b) {
    return (this.has(a, 'opin') && this.has(b, 'shet')) || (this.has(a, 'shet') && this.has(b, 'opin'));
  };

  /* Could obj move one cell in dir (pushing whatever it needs to)? */
  Game.prototype.canMove = function (obj, dir) {
    var nx = obj.x + DX[dir], ny = obj.y + DY[dir];
    if (nx < 0 || ny < 0 || nx >= this.w || ny >= this.h) return false;
    var others = this.objectsAt(nx, ny);
    for (var i = 0; i < others.length; i++) {
      var o = others[i];
      if (o === obj || this.passesThrough(obj, o)) continue;
      if (this.has(o, 'shub')) { if (!this.canMove(o, dir)) return false; } // SHUB beats TAP
      else if (this.has(o, 'tap')) return false;
    }
    return true;
  };

  /* Move obj (and everything it pushes). Only call after canMove said yes. */
  Game.prototype.doMove = function (obj, dir) {
    var nx = obj.x + DX[dir], ny = obj.y + DY[dir];
    var others = this.objectsAt(nx, ny);
    for (var i = 0; i < others.length; i++) {
      var o = others[i];
      if (o !== obj && !this.passesThrough(obj, o) && this.has(o, 'shub')) {
        this.doMove(o, dir);
        this.events.pushed = true;
      }
    }
    obj.x = nx;
    obj.y = ny;
    obj.dir = dir;
  };

  Game.prototype.tryMove = function (obj, dir) {
    if (!this.canMove(obj, dir)) return false;
    this.doMove(obj, dir);
    return true;
  };

  Game.prototype.moveYou = function (dir) {
    var self = this;
    var movers = this.objects.filter(function (o) { return self.has(o, 'mi'); });
    // Move the ones furthest ahead first, so a line of MI things doesn't block itself
    movers.sort(function (a, b) {
      return (b.x * DX[dir] + b.y * DY[dir]) - (a.x * DX[dir] + a.y * DY[dir]);
    });
    movers.forEach(function (o) {
      o.dir = dir;                                  // always turn to face the key pressed
      if (self.tryMove(o, dir)) self.events.moved = true;
    });
  };

  Game.prototype.moveWalkers = function () {
    var self = this;
    this.objects.filter(function (o) { return self.has(o, 'waka'); }).forEach(function (o) {
      if (!self.tryMove(o, o.dir)) {                // blocked: turn around and try once
        o.dir = (o.dir + 2) % 4;
        self.tryMove(o, o.dir);
      }
    });
  };

  /* ---------- What happens when things share a cell ---------- */

  Game.prototype.resolveCells = function () {
    var self = this, cells = {}, dead = {};
    this.objects.forEach(function (o) {
      var k = o.x + ',' + o.y;
      (cells[k] = cells[k] || []).push(o);
    });
    function kill(o) { dead[o.id] = true; }
    function withProp(list, prop) { return list.filter(function (o) { return self.has(o, prop); }); }

    Object.keys(cells).forEach(function (k) {
      var list = cells[k];
      // SINK: a sinking thing takes everything else in the cell with it
      if (list.length > 1 && withProp(list, 'sink').length) list.forEach(kill);
      // DAI: MI things are defeated
      if (withProp(list, 'dai').length) withProp(list, 'mi').forEach(kill);
      // OT: MELT things melt
      if (withProp(list, 'ot').length) withProp(list, 'melt').forEach(kill);
      // OPIN + SHET: destroy each other in pairs
      var opens = withProp(list, 'opin'), shuts = withProp(list, 'shet');
      for (var n = 0; n < Math.min(opens.length, shuts.length); n++) { kill(opens[n]); kill(shuts[n]); }
    });

    var before = this.objects.length;
    this.objects = this.objects.filter(function (o) { return !dead[o.id]; });
    if (this.objects.length !== before) this.events.destroyed = true;
  };

  Game.prototype.checkWin = function () {
    var self = this, you = {}, win = {};
    this.objects.forEach(function (o) {
      var k = o.x + ',' + o.y;
      if (self.has(o, 'mi')) you[k] = true;
      if (self.has(o, 'win')) win[k] = true;
    });
    for (var k in you) if (win[k]) { this.won = true; this.events.won = true; return; }
  };

  /* ---------- One turn ----------
   * dir: 0..3 to move, or -1 to wait. Returns true if anything changed.
   */
  Game.prototype.step = function (dir) {
    if (this.won) return false;
    var before = this.snapshot();
    this.events = {};
    if (dir >= 0) this.moveYou(dir);
    this.moveWalkers();
    this.refreshRules();
    this.resolveCells();
    this.refreshRules();
    this.checkWin();
    if (this.snapshot() === before) return false;
    this.remember(before, dir >= 0 ? 'ruld'.charAt(dir) : 'w');
    return true;
  };

  Game.prototype.remember = function (snap, letter) {
    this.history.push(snap);
    this.trail.push(letter);
    if (this.history.length > MAX_UNDO) { this.history.shift(); this.trail.shift(); }
  };

  /* Moves (and waits) since the last restart, not counting undone ones: the score. */
  Game.prototype.moveCount = function () {
    var t = this.trail.join(''), x = t.lastIndexOf('x');
    return t.length - x - 1;
  };

  BNM.Game = Game;
})();
