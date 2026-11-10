/* render.js — Draws a whole grid onto a canvas, and shows rules as text.
 * Used by both the game and the level editor.
 */
var BNM = window.BNM = window.BNM || {};

/* Draw objects ({type, x, y, dir, id}) on a w x h grid, scaled to fit the
 * canvas's parent element. opts.activeText: ids of text that is in a rule.
 * Returns the tile size in CSS pixels. */
BNM.render = function (canvas, w, h, objects, opts) {
  opts = opts || {};
  var box = canvas.parentElement;
  var tile = Math.max(8, Math.floor(Math.min((box.clientWidth - 12) / w, (box.clientHeight - 12) / h)));
  var dpr = window.devicePixelRatio || 1;
  var cssW = tile * w, cssH = tile * h;

  // Resize the canvas only when needed (resizing clears it and is slow)
  if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
  }
  var ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;               // crisp pixel art

  // Background and faint grid lines
  ctx.fillStyle = '#15151f';
  ctx.fillRect(0, 0, cssW, cssH);
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (var x = 1; x < w; x++) { ctx.moveTo(x * tile + 0.5, 0); ctx.lineTo(x * tile + 0.5, cssH); }
  for (var y = 1; y < h; y++) { ctx.moveTo(0, y * tile + 0.5); ctx.lineTo(cssW, y * tile + 0.5); }
  ctx.stroke();

  // Draw floor-like things first and text last (see "layer" in words.js);
  // within a layer, lower rows go on top, so tall sprites overlap naturally.
  function layerOf(type) {
    if (BNM.isText(type)) return 10;
    var word = BNM.WORDS[type];
    return word && word.layer !== undefined ? word.layer : 5;
  }
  var list = objects.map(function (o, i) { return { o: o, i: i }; });
  list.sort(function (a, b) {
    return (layerOf(a.o.type) - layerOf(b.o.type)) || (a.o.y - b.o.y) || (a.i - b.i);
  });

  list.forEach(function (item) {
    var o = item.o;
    BNM.sprites.draw(ctx, o.type, o.x * tile, o.y * tile, tile, o.dir, {
      active: !opts.activeText || !!opts.activeText[o.id],
      frame: opts.frame || 0,
      x: o.x, y: o.y
    });
  });
  return tile;
};

/* Fill an element with the current rules, e.g. "BOBO NA MI  boy is you".
 * showMeaning adds the meaning in the learner's language (lang/*.json: "rule"). */
BNM.ruleChips = function (el, rules, showMeaning) {
  el.innerHTML = '';
  if (!rules.length) {
    var none = document.createElement('span');
    none.className = 'none';
    none.textContent = BNM.t('no_rules');
    el.appendChild(none);
    return;
  }
  rules.forEach(function (r) {
    var W = BNM.WORDS, chip = document.createElement('span');
    chip.textContent = W[r.subject].label + ' NA ' + W[r.pred].label;
    if (showMeaning) {
      var em = document.createElement('em');
      em.textContent = '  ' + BNM.t('rule', { a: BNM.meaning(r.subject), b: BNM.meaning(r.pred) });
      chip.appendChild(em);
    }
    el.appendChild(chip);
  });
};
