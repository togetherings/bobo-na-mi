/* sprites.js — How every thing and word tile looks.
 *
 * Most pictures come from assets/sprites.png, built from the Petixel art packs by
 * tools/build_assets.py; src/atlas.js says where each one is. Things the packs have no
 * picture for (WATA, FAYA) are drawn here with simple shapes, and so is anything missing
 * from the atlas (a new word, before the art is built again), so the game always works.
 *
 * Directions: 0 = right, 1 = up, 2 = left, 3 = down.
 * Character sheets have 3 frames x 4 rows (down, left, right, up), each 16x32.
 */
var BNM = window.BNM = window.BNM || {};

BNM.sprites = (function () {
  var sheet = new Image();
  var ready = false;
  var ROW_OF_DIR = [2, 3, 1, 0];       // our direction -> row in a character sheet

  function load(onLoad) {
    sheet.onload = function () { ready = true; if (onLoad) onLoad(); };
    sheet.onerror = function () { console.warn('assets/sprites.png is missing: drawing simple shapes.'); };
    sheet.src = 'assets/sprites.png';
  }

  function entry(type) { return ready && BNM.ATLAS ? BNM.ATLAS[type] : null; }

  /* Draw part of the sheet (sx, sy, sw, sh) into the cell at (px, py) of size s:
   * as big as fits, standing on the bottom of the cell, centred. */
  function fit(ctx, sx, sy, sw, sh, px, py, s) {
    var k = Math.min(s / sw, s / sh);
    var w = Math.round(sw * k), h = Math.round(sh * k);
    ctx.drawImage(sheet, sx, sy, sw, sh, Math.round(px + (s - w) / 2), Math.round(py + s - h), w, h);
  }

  /* ---------- Things from the sheet ---------- */
  function drawSprite(ctx, type, e, px, py, s, dir, opts) {
    var frame = opts.frame || 0;
    if (e.fh) {                                     // a character: pick direction and step
      // The walking frame changes with each step, so moving looks like walking.
      var step = (opts.x + opts.y) % 2 ? (((opts.x + opts.y) >> 1) % 2 ? 0 : 2) : 1;
      // Characters are 16x32 with the body in the lower 24 rows (8-31). They're drawn
      // 0.8 of a cell wide, standing on the cell's bottom, so their hair may reach a
      // little into the cell above (rows are drawn top to bottom, see render.js).
      var k = s / 20, w = Math.round(e.fw * k), h = Math.round((e.fh - 8) * k);
      ctx.drawImage(sheet, e.x + step * e.fw, e.y + ROW_OF_DIR[dir] * e.fh + 8, e.fw, e.fh - 8,
        Math.round(px + (s - w) / 2), Math.round(py + s - h), w, h);
    } else if (e.tiles) {                           // a 2x2 pattern, like the bolted wall
      var q = e.w / 2;
      ctx.drawImage(sheet, e.x + (opts.x % 2) * q, e.y + (opts.y % 2) * q, q, q, px, py, s, s);
    } else if (e.frames) {                          // a little animation: 0 1 2 1
      var fw = e.w / e.frames, f = [0, 1, 2, 1][frame % 4];
      fit(ctx, e.x + f * fw, e.y, fw, e.h, px, py, s);
    } else {
      fit(ctx, e.x, e.y, e.w, e.h, px, py, s);
    }
  }

  /* ---------- Drawn with shapes (16 x 16 box) ---------- */
  function rect(ctx, c, x, y, w, h) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }
  function poly(ctx, c, pts) {
    ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
    for (var i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.closePath(); ctx.fill();
  }

  var DRAW = {
    wata: function (ctx, frame) {        // water with moving waves, in the art packs' blues
      rect(ctx, '#3a5fa8', 0, 0, 16, 16);
      ctx.strokeStyle = '#b0ceff'; ctx.lineWidth = 1;
      for (var y = 3; y < 16; y += 5) {
        ctx.beginPath();
        for (var x = -2; x <= 16; x += 1) {
          var yy = y + Math.round(Math.sin((x + frame * 2) * 0.8));
          if (x === -2) ctx.moveTo(x, yy + 0.5); else ctx.lineTo(x, yy + 0.5);
        }
        ctx.stroke();
      }
    },
    faya: function (ctx, frame) {        // fire that flickers
      rect(ctx, '#4a1d24', 0, 0, 16, 16);
      var f = frame % 2;
      poly(ctx, '#ff5a4a', [2, 16, 3, 9, 5, 11, 7, 3 + f, 10, 10, 12, 6 - f, 14, 16]);
      poly(ctx, '#ffd46e', [5, 16, 6, 11, 8, 12, 9, 8 + f, 11, 16]);
    }
  };

  function drawShape(ctx, type, px, py, s, frame) {
    ctx.save();
    ctx.translate(px, py);
    ctx.scale(s / 16, s / 16);
    ctx.beginPath(); ctx.rect(0, 0, 16, 16); ctx.clip();   // never draw outside the cell
    if (DRAW[type]) DRAW[type](ctx, frame);
    else {                                         // no picture yet: coloured box with a letter
      var w = BNM.WORDS[type] || { color: '#888', label: '?' };
      rect(ctx, w.color, 2, 2, 12, 12);
      ctx.fillStyle = '#111'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(w.label.charAt(0), 8, 8.5);
    }
    ctx.restore();
  }

  /* A word tile with no picture in the atlas: written with the browser's font. */
  function drawTextShape(ctx, word, px, py, s) {
    var w = BNM.WORDS[word];
    if (!w) return;
    var pad = Math.round(s * 0.06);
    ctx.fillStyle = w.kind === 'prop' ? w.color : '#2e2b3f';
    ctx.fillRect(px + pad, py + pad, s - pad * 2, s - pad * 2);
    ctx.fillStyle = w.kind === 'prop' ? '#221e2e' : w.color;
    var lines = w.label.length === 4 ? [w.label.slice(0, 2), w.label.slice(2)] : [w.label];
    ctx.font = 'bold ' + Math.round(s * (lines.length === 2 ? 0.34 : 0.3)) + 'px ui-monospace, Menlo, Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    lines.forEach(function (line, i) {
      ctx.fillText(line, px + s / 2, py + s / 2 + (lines.length === 2 ? (i ? 0.2 : -0.18) * s : 0));
    });
  }

  /* ---------- Main entry: draw one thing in the cell at (px, py), size s ----------
   * opts: { active (text in a rule is bright), frame (animation), x, y (grid cell) } */
  function draw(ctx, type, px, py, s, dir, opts) {
    opts = opts || {};
    dir = dir || 0;
    var e = entry(type), isText = BNM.isText(type);
    if (isText) {
      ctx.save();
      ctx.globalAlpha = opts.active === false ? 0.4 : 1;   // text that is not in a rule is dim
      if (e) fit(ctx, e.x, e.y, e.w, e.h, px, py, s);
      else drawTextShape(ctx, BNM.wordOf(type), px, py, s);
      ctx.restore();
      return;
    }
    if (e) drawSprite(ctx, type, e, px, py, s, dir, { frame: opts.frame || 0, x: opts.x || 0, y: opts.y || 0 });
    else drawShape(ctx, type, px, py, s, opts.frame || 0);
  }

  /* A small stand-alone canvas showing one thing (used by the palette and word list). */
  function toCanvas(type, size, dir) {
    var c = document.createElement('canvas'), dpr = window.devicePixelRatio || 1;
    c.width = Math.round(size * dpr); c.height = Math.round(size * dpr);
    c.style.width = size + 'px'; c.style.height = size + 'px';
    c.className = 'sprite';
    var ctx = c.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#15151f'; ctx.fillRect(0, 0, size, size);
    draw(ctx, type, 0, 0, size, dir || 0, { active: true });
    return c;
  }

  return { load: load, draw: draw, toCanvas: toCanvas, isReady: function () { return ready; } };
})();
