/* sprites.js — How every thing and text tile looks.
 *
 * Sprites are drawn with simple shapes (no image files needed), inside a
 * 16 x 16 box that is scaled to the tile size. Each thing can face four
 * ways: dir 0 = right, 1 = up (seen from behind), 2 = left, 3 = down.
 *
 * Want hand-drawn art instead? Put PNG files next to index.html and list them
 * in BNM.SPRITE_FILES below. Each PNG is a strip of 4 equal square frames in
 * the order: right, up, left, down. Example:  BNM.SPRITE_FILES = { bobo: 'bobo.png' };
 */
var BNM = window.BNM = window.BNM || {};

BNM.SPRITE_FILES = {
  // bobo: 'bobo.png',
};

BNM.sprites = (function () {
  var images = {};              // type -> loaded Image

  function load(onLoad) {
    Object.keys(BNM.SPRITE_FILES).forEach(function (type) {
      var img = new Image();
      img.onload = function () { images[type] = img; if (onLoad) onLoad(); };
      img.onerror = function () { console.warn('Sprite file not found: ' + BNM.SPRITE_FILES[type]); };
      img.src = BNM.SPRITE_FILES[type];
    });
  }

  /* ---------- Tiny drawing helpers (coordinates are in the 16 x 16 box) ---------- */
  function rect(ctx, c, x, y, w, h) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }
  function circle(ctx, c, x, y, r) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
  function poly(ctx, c, pts) {
    ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
    for (var i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.closePath(); ctx.fill();
  }
  function topArc(ctx, c, y, r) {  // a cap of hair/hat over the top of the head
    ctx.fillStyle = c; ctx.beginPath(); ctx.arc(8, y, r, Math.PI * 1.02, Math.PI * 1.98); ctx.fill();
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  /* ---------- People (Bobo, Titi, Padi) ---------- */
  var SKIN = '#8d5524', HAIR = '#1a1a1a';

  function person(ctx, dir, frame, look) {
    var b = frame % 2 ? 0.5 : 0;                 // small idle bounce
    rect(ctx, '#2b2b2b', 5.5, 13, 2, 3);          // legs
    rect(ctx, '#2b2b2b', 8.5, 13, 2, 3);
    look.body(ctx, b);
    circle(ctx, SKIN, 8, 5.5 + b, 4);             // head
    if (dir === 1) { look.back(ctx, b); return; } // facing away: no face
    look.hair(ctx, b, dir);
    var ex = dir === 0 ? 1.3 : dir === 2 ? -1.3 : 0; // eyes look where we are going
    circle(ctx, '#fff', 6.4 + ex, 6.2 + b, 1.15);
    circle(ctx, '#fff', 9.6 + ex, 6.2 + b, 1.15);
    circle(ctx, '#111', 6.4 + ex * 1.3, 6.2 + b, 0.6);
    circle(ctx, '#111', 9.6 + ex * 1.3, 6.2 + b, 0.6);
  }

  var LOOKS = {
    bobo: {   // boy: blue shirt, short hair
      body: function (ctx, b) { rect(ctx, '#3a8dde', 4, 9 + b, 8, 4.5); },
      hair: function (ctx, b) { topArc(ctx, HAIR, 5.5 + b, 4.15); },
      back: function (ctx, b) { circle(ctx, HAIR, 8, 5.5 + b, 4.15); }
    },
    titi: {   // girl: pink dress, two hair puffs
      body: function (ctx, b) { poly(ctx, '#ff6fae', [5, 9 + b, 11, 9 + b, 12.8, 14, 3.2, 14]); },
      hair: function (ctx, b) {
        topArc(ctx, HAIR, 5.5 + b, 4.15);
        circle(ctx, HAIR, 3.8, 2.8 + b, 1.9); circle(ctx, HAIR, 12.2, 2.8 + b, 1.9);
      },
      back: function (ctx, b) {
        circle(ctx, HAIR, 8, 5.5 + b, 4.15);
        circle(ctx, HAIR, 3.8, 2.8 + b, 1.9); circle(ctx, HAIR, 12.2, 2.8 + b, 1.9);
      }
    },
    padi: {   // friend: green shirt, red cap with a brim that points where Padi looks
      body: function (ctx, b) { rect(ctx, '#3fae5a', 4, 9 + b, 8, 4.5); },
      hair: function (ctx, b, dir) {
        topArc(ctx, '#d9443a', 5.2 + b, 4.3);
        if (dir === 0) rect(ctx, '#a8302a', 10, 3.6 + b, 4.5, 1.3);
        if (dir === 2) rect(ctx, '#a8302a', 1.5, 3.6 + b, 4.5, 1.3);
        if (dir === 3) rect(ctx, '#a8302a', 3.5, 4 + b, 9, 1.2);
      },
      back: function (ctx, b) { circle(ctx, HAIR, 8, 5.8 + b, 4); topArc(ctx, '#d9443a', 5.2 + b, 4.3); }
    }
  };

  /* ---------- Other things ---------- */
  var DRAW = {
    wol: function (ctx) {          // brick wall
      rect(ctx, '#4a3224', 0, 0, 16, 16);
      for (var row = 0; row < 4; row++) {
        var off = row % 2 ? -4 : 0;
        for (var col = 0; col < 3; col++) rect(ctx, '#7a5238', off + col * 8 + 0.5, row * 4 + 0.5, 7, 3);
      }
    },
    rok: function (ctx) {          // rock
      poly(ctx, '#7d6c53', [2, 13, 3, 7, 6, 3.5, 11, 3.5, 14, 7.5, 14.5, 13, 11, 14.5, 4, 14.5]);
      poly(ctx, '#a8957a', [4, 8, 6.5, 5, 10.5, 5, 12, 7.5, 8, 8.5]);
    },
    flag: function (ctx, dir, frame) {   // flag on a pole; flips when facing left
      if (dir === 2) { ctx.translate(16, 0); ctx.scale(-1, 1); }
      rect(ctx, '#dddddd', 4, 2, 1.3, 13);
      rect(ctx, '#999999', 2.5, 14.5, 4.5, 1.2);
      var tip = frame % 2 ? 5.5 : 4.8;
      poly(ctx, '#ffd84a', [5.3, 2.5, 13.5, tip, 5.3, 8.5]);
    },
    wata: function (ctx, dir, frame) {   // water with moving waves
      rect(ctx, '#1d5ea8', 0, 0, 16, 16);
      ctx.strokeStyle = '#7cc0ff'; ctx.lineWidth = 0.9;
      for (var y = 3; y < 16; y += 5) {
        ctx.beginPath();
        for (var x = -2; x <= 16; x += 1) {
          var yy = y + Math.sin((x + frame * 2) * 0.8) * 0.9;
          if (x === -2) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
        }
        ctx.stroke();
      }
    },
    faya: function (ctx, dir, frame) {   // fire that flickers
      rect(ctx, '#3a120b', 0, 0, 16, 16);
      var f = frame % 2 ? 1 : 0;
      poly(ctx, '#ff6a2b', [2, 16, 3, 9, 5.5, 11.5, 7.5, 3 + f, 10, 10, 12, 6 - f, 14, 16]);
      poly(ctx, '#ffd84a', [5, 16, 6.5, 11, 8, 12.5, 9.5, 8 + f, 11, 16]);
    },
    ki: function (ctx, dir) {            // key; rotates with its direction
      ctx.translate(8, 8); ctx.rotate(-dir * Math.PI / 2); ctx.translate(-8, -8);
      ctx.strokeStyle = '#ffd84a'; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.arc(4.5, 8, 2.6, 0, Math.PI * 2); ctx.stroke();
      rect(ctx, '#ffd84a', 7, 7.1, 7.5, 1.8);
      rect(ctx, '#ffd84a', 11, 8.9, 1.4, 2.2);
      rect(ctx, '#ffd84a', 13.1, 8.9, 1.4, 3);
    },
    dor: function (ctx) {                // door
      rect(ctx, '#4a1d15', 1.5, 0.5, 13, 15.5);
      rect(ctx, '#8b3a2b', 2.5, 1.5, 11, 14.5);
      rect(ctx, '#6e2c20', 4, 3, 8, 4.5);
      rect(ctx, '#6e2c20', 4, 9.5, 8, 4.5);
      circle(ctx, '#ffd84a', 11.6, 8.5, 0.9);
    }
  };

  /* ---------- Text tiles ---------- */
  function drawText(ctx, word, px, py, s, active) {
    var w = BNM.WORDS[word];
    if (!w) return;
    ctx.save();
    ctx.globalAlpha = active ? 1 : 0.4;            // text that is not in a rule is dim
    var pad = s * 0.06;
    roundRect(ctx, px + pad, py + pad, s - pad * 2, s - pad * 2, s * 0.12);
    if (w.kind === 'prop') { ctx.fillStyle = w.color; ctx.fill(); ctx.fillStyle = '#14141c'; }
    else { ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fill(); ctx.fillStyle = w.color; }
    // 4-letter words are written as 2 lines of 2 letters, so they stay big
    var lines = w.label.length === 4 ? [w.label.slice(0, 2), w.label.slice(2)] : [w.label];
    var fs = lines.length === 2 ? s * 0.36 : (w.label.length <= 2 ? s * 0.46 : s * 0.33);
    ctx.font = 'bold ' + fs + 'px ui-monospace, Menlo, Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    lines.forEach(function (line, i) {
      var dy = lines.length === 2 ? (i ? 0.21 : -0.19) * s : 0;
      ctx.fillText(line, px + s / 2, py + s / 2 + dy + s * 0.02);
    });
    ctx.restore();
  }

  /* ---------- Main entry: draw one thing at pixel position (px, py) with size s ---------- */
  function draw(ctx, type, px, py, s, dir, opts) {
    opts = opts || {};
    dir = dir || 0;
    if (BNM.isText(type)) return drawText(ctx, BNM.wordOf(type), px, py, s, opts.active !== false);

    var img = images[type];
    if (img) {                                     // optional PNG strip
      var fw = img.naturalWidth / 4;
      ctx.drawImage(img, dir * fw, 0, fw, img.naturalHeight, px, py, s, s);
      return;
    }
    ctx.save();
    ctx.translate(px, py);
    ctx.scale(s / 16, s / 16);
    ctx.beginPath(); ctx.rect(0, 0, 16, 16); ctx.clip();  // never draw outside the cell
    if (LOOKS[type]) person(ctx, dir, opts.frame || 0, LOOKS[type]);
    else if (DRAW[type]) DRAW[type](ctx, dir, opts.frame || 0);
    else {                                         // unknown thing: coloured box with a letter
      var w = BNM.WORDS[type] || { color: '#888', label: '?' };
      rect(ctx, w.color, 2, 2, 12, 12);
      ctx.fillStyle = '#111'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(w.label.charAt(0), 8, 8.5);
    }
    ctx.restore();
  }

  /* A small stand-alone canvas showing one thing (used by the palette and word list). */
  function toCanvas(type, size, dir) {
    var c = document.createElement('canvas'), dpr = window.devicePixelRatio || 1;
    c.width = Math.round(size * dpr); c.height = Math.round(size * dpr);
    c.style.width = size + 'px'; c.style.height = size + 'px';
    var ctx = c.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#15151f'; ctx.fillRect(0, 0, size, size);
    draw(ctx, type, 0, 0, size, dir || 0, { active: true });
    return c;
  }

  return { load: load, draw: draw, toCanvas: toCanvas };
})();
