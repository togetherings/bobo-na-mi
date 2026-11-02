/* editor.js — The level editor.
 *
 * Pick a thing or a word from the palette, then click / drag on the grid to
 * place it. Right-click (or the ✖ tool) erases; the ⟳ tool turns a thing.
 * "Stack" lets several things share one cell. Levels can be tested, saved
 * to "Your levels", and exported / imported as JSON text.
 *
 * The level being edited: { name, w, h, objects: [[type, x, y, dir], ...] }
 */
var BNM = window.BNM = window.BNM || {};

BNM.editor = (function () {
  function $(id) { return document.getElementById(id); }
  var MIN = 3, MAX = BNM.MAX_SIZE;

  var level = blank(12, 10);
  var savedId = null;      // id in "Your levels" once saved
  var tool = 'bobo';       // a type ('bobo', 'T:na' ...) or 'erase' / 'turn'
  var placeDir = 0;        // direction new things face
  var preview = null;      // a Game made from the level, to see which rules are active
  var undoStack = [];
  var painting = false, erasing = false, lastCell = '';
  var ready = false;

  function blank(w, h) { return { name: 'Nyu level', w: w, h: h, objects: [] }; }
  function clone(x) { return JSON.parse(JSON.stringify(x)); }

  /* ---------- Setup (runs the first time the editor opens) ---------- */
  function init() {
    $('ed-new').onclick = function () {
      BNM.ui.confirm('New level', 'Start a new empty level? Unsaved changes will be lost.', 'New',
        function () { open(blank(12, 10), null); });
    };
    $('ed-resize').onclick = resize;
    $('ed-save').onclick = save;
    $('ed-export').onclick = exportLevel;
    $('ed-import').onclick = importLevel;
    $('ed-delete').onclick = del;
    $('ed-undo').onclick = undo;
    $('ed-test').onclick = function () { syncName(); BNM.startLevel(clone(level), { kind: 'editor' }); };
    $('ed-name').oninput = syncName;
    $('ed-load').onchange = onLoadSelect;
    Array.prototype.forEach.call(document.querySelectorAll('[data-dir]'), function (b) {
      b.onclick = function () { placeDir = +b.getAttribute('data-dir'); buildPalette(); syncFields(); };
    });

    var c = $('ed-canvas');
    c.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      c.setPointerCapture(e.pointerId);
      painting = true; erasing = (e.button === 2); lastCell = '';
      remember();
      paint(e);
    });
    c.addEventListener('pointermove', function (e) { if (painting) paint(e); });
    ['pointerup', 'pointercancel'].forEach(function (ev) { c.addEventListener(ev, function () { painting = false; }); });
    c.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }

  /* Called by main.js each time the editor screen is shown. */
  function show() {
    if (!ready) { init(); ready = true; buildPalette(); }
    buildLoadList();
    syncFields();
    changed();
  }

  /* ---------- Palette ---------- */
  function buildPalette() {
    var pal = $('ed-palette'), scroll = pal.scrollLeft;
    pal.innerHTML = '';
    function add(t, child, title) {
      var b = document.createElement('button');
      b.title = title;
      b.setAttribute('data-tool', t);
      b.appendChild(child);
      b.onclick = function () { tool = t; markTool(); };
      pal.appendChild(b);
    }
    function icon(ch) { var s = document.createElement('span'); s.className = 'tool-icon'; s.textContent = ch; return s; }
    function sep() { var s = document.createElement('span'); s.className = 'sep'; pal.appendChild(s); }

    add('erase', icon('✖'), 'Eraser (or right-click)');
    add('turn', icon('⟳'), 'Turn: rotate the top thing in a cell');
    sep();
    Object.keys(BNM.WORDS).forEach(function (w) {          // things
      if (BNM.isKnownType(w)) add(w, BNM.sprites.toCanvas(w, 34, placeDir), BNM.WORDS[w].label + ' (' + BNM.WORDS[w].en + ')');
    });
    sep();
    Object.keys(BNM.WORDS).forEach(function (w) {          // text tiles
      add(BNM.textOf(w), BNM.sprites.toCanvas(BNM.textOf(w), 34, 0), 'Text ' + BNM.WORDS[w].label + ' = ' + BNM.WORDS[w].en);
    });
    markTool();
    pal.scrollLeft = scroll;
  }

  function markTool() {
    Array.prototype.forEach.call($('ed-palette').querySelectorAll('button'), function (b) {
      b.classList.toggle('sel', b.getAttribute('data-tool') === tool);
    });
  }

  /* ---------- Painting on the grid ---------- */
  function cellAt(e) {
    var r = $('ed-canvas').getBoundingClientRect();
    var x = Math.floor((e.clientX - r.left) / (r.width / level.w));
    var y = Math.floor((e.clientY - r.top) / (r.height / level.h));
    return (x < 0 || y < 0 || x >= level.w || y >= level.h) ? null : { x: x, y: y };
  }

  function paint(e) {
    var cell = cellAt(e);
    if (!cell) return;
    var key = cell.x + ',' + cell.y;
    if (key === lastCell) return;                  // each cell once per stroke
    lastCell = key;
    applyTool(cell.x, cell.y, erasing ? 'erase' : tool);
    changed();
  }

  function applyTool(x, y, t) {
    function here(o) { return o[1] === x && o[2] === y; }
    var inCell = level.objects.filter(here);
    var top = inCell[inCell.length - 1];

    if (t === 'erase') { level.objects = level.objects.filter(function (o) { return !here(o); }); return; }
    if (t === 'turn') { if (top) top[3] = (top[3] + 3) % 4; return; }    // clockwise
    if (!$('ed-stack').checked) level.objects = level.objects.filter(function (o) { return !here(o); });
    else if (top && top[0] === t) { top[3] = placeDir; return; }         // don't stack duplicates
    level.objects.push([t, x, y, placeDir]);
  }

  /* ---------- Redrawing ---------- */
  function changed() {
    preview = new BNM.Game(level);
    BNM.ruleChips($('ed-rules'), preview.rules, BNM.settings.english);
    redraw();
  }

  function redraw() {
    if ($('screen-editor').classList.contains('hidden')) return;
    // ids match the ones the preview Game gives (1, 2, 3 ... in list order)
    var objs = level.objects.map(function (o, i) { return { id: i + 1, type: o[0], x: o[1], y: o[2], dir: o[3] }; });
    BNM.render($('ed-canvas'), level.w, level.h, objs, { activeText: preview && preview.activeText, frame: BNM.frame });
  }

  function syncFields() {
    $('ed-name').value = level.name;
    $('ed-w').value = level.w;
    $('ed-h').value = level.h;
    Array.prototype.forEach.call(document.querySelectorAll('[data-dir]'), function (b) {
      b.classList.toggle('sel', +b.getAttribute('data-dir') === placeDir);
    });
  }
  function syncName() { level.name = $('ed-name').value.trim() || 'Nyu level'; }

  /* ---------- Undo for edits ---------- */
  function remember() {
    undoStack.push(JSON.stringify({ w: level.w, h: level.h, objects: level.objects }));
    if (undoStack.length > 200) undoStack.shift();
  }
  function undo() {
    if (!undoStack.length) return;
    var s = JSON.parse(undoStack.pop());
    level.w = s.w; level.h = s.h; level.objects = s.objects;
    syncFields(); changed();
  }

  /* ---------- Toolbar actions ---------- */
  function open(l, id) {
    level = { name: l.name, w: l.w, h: l.h, objects: clone(l.objects) };
    savedId = id;
    undoStack = [];
    syncFields(); changed();
  }

  function resize() {
    function clamp(v) { v = parseInt(v, 10) || MIN; return Math.max(MIN, Math.min(MAX, v)); }
    var w = clamp($('ed-w').value), h = clamp($('ed-h').value);
    remember();
    level.w = w; level.h = h;
    level.objects = level.objects.filter(function (o) { return o[1] < w && o[2] < h; });
    syncFields(); changed();
  }

  function buildLoadList() {
    var sel = $('ed-load');
    sel.innerHTML = '<option value="">Open level…</option>';
    var g1 = document.createElement('optgroup');
    g1.label = 'Main levels (opens a copy)';
    BNM.BUILTIN.forEach(function (l, i) {
      var o = document.createElement('option'); o.value = 'b:' + i; o.textContent = (i + 1) + '. ' + l.name; g1.appendChild(o);
    });
    sel.appendChild(g1);
    var mine = BNM.custom.list();
    if (mine.length) {
      var g2 = document.createElement('optgroup');
      g2.label = 'Your levels';
      mine.forEach(function (l) {
        var o = document.createElement('option'); o.value = 'c:' + l.id; o.textContent = l.name; g2.appendChild(o);
      });
      sel.appendChild(g2);
    }
  }

  function onLoadSelect() {
    var v = this.value;
    this.value = '';
    if (!v) return;
    if (v.charAt(0) === 'b') open(BNM.BUILTIN[+v.slice(2)], null);
    else { var l = BNM.custom.get(v.slice(2)); if (l) open(l, l.id); }
  }

  function save() {
    syncName();
    var id = BNM.custom.save(level, savedId);
    if (!id) { BNM.ui.toast('Your save is full. Delete one of your levels first.'); return; }
    savedId = id;
    buildLoadList();
    BNM.ui.toast('Saved "' + level.name + '" to Your levels (save ' +
      Math.round(BNM.storage.fullness() * 100) + '% full)');
  }

  function del() {
    if (!savedId) { BNM.ui.toast('This level is not saved yet.'); return; }
    BNM.ui.confirm('Delete level', 'Delete "' + level.name + '" from Your levels?', 'Delete', function () {
      BNM.custom.remove(savedId);
      savedId = null;
      buildLoadList();
      BNM.ui.toast('Deleted');
    });
  }

  function exportLevel() {
    syncName();
    var wrap = document.createElement('div');
    var p = document.createElement('p');
    p.textContent = 'Copy this text to share the level, or paste it into levels.js (with a new id) to make it a main level.';
    var ta = document.createElement('textarea');
    ta.value = BNM.levelToJSON(level);
    ta.readOnly = true;
    wrap.appendChild(p); wrap.appendChild(ta);
    var buttons = [
      { label: 'Copy', onClick: function () {
        ta.select();
        try { document.execCommand('copy'); BNM.ui.toast('Copied'); } catch (e) { BNM.ui.toast('Select the text and copy it'); }
        return false;                              // keep the box open
      } },
      { label: 'Close', primary: true }
    ];
    // Kolibri Games' sandbox blocks downloads, so only offer Download outside it
    if (!BNM.platform.embedded) {
      buttons.splice(1, 0, { label: 'Download', onClick: function () { download(level.name, ta.value); return false; } });
    }
    BNM.ui.modal('Export level', wrap, buttons);
  }

  /* Save the level as a .json file (not offered inside Kolibri Games). */
  function download(name, text) {
    try {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
      a.download = (name.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_') || 'level') + '.json';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); document.body.removeChild(a); }, 1000);
    } catch (e) { BNM.ui.toast('Download is blocked here. Use Copy instead.'); }
  }

  function importLevel() {
    var wrap = document.createElement('div');
    var p = document.createElement('p');
    p.textContent = 'Paste level text below, or choose a .json file.';
    var file = document.createElement('input');
    file.type = 'file';
    file.accept = '.json,application/json,text/plain';
    var ta = document.createElement('textarea');
    ta.placeholder = '{ "name": "...", "w": 12, "h": 9, "objects": [ ... ] }';
    file.onchange = function () {
      if (!file.files[0]) return;
      var reader = new FileReader();
      reader.onload = function () { ta.value = reader.result; };
      reader.readAsText(file.files[0]);
    };
    wrap.appendChild(p); wrap.appendChild(file); wrap.appendChild(ta);
    BNM.ui.modal('Import level', wrap, [
      { label: 'Cancel' },
      { label: 'Load', primary: true, onClick: function () {
        try {
          open(BNM.validateLevel(JSON.parse(ta.value)), null);
          BNM.ui.toast('Imported. Press Save to keep it.');
        } catch (e) {
          BNM.ui.toast('Could not read level: ' + e.message);
          return false;
        }
      } }
    ]);
  }

  return { show: show, redraw: redraw };
})();
