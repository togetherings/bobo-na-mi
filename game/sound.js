/* sound.js — Tiny beeps made in code (no audio files needed).
 * Each sound is a list of notes: [frequency Hz, start s, length s, wave].
 * Sound can be switched off in Options.
 */
var BNM = window.BNM = window.BNM || {};

BNM.sound = (function () {
  var ac = null;

  var SOUNDS = {
    move:    [[330, 0, 0.05, 'triangle']],
    push:    [[180, 0, 0.08, 'square']],
    undo:    [[520, 0, 0.05, 'triangle'], [400, 0.05, 0.05, 'triangle']],
    restart: [[300, 0, 0.08, 'triangle'], [200, 0.08, 0.1, 'triangle']],
    destroy: [[140, 0, 0.18, 'sawtooth']],
    win:     [[523, 0, 0.12, 'square'], [659, 0.12, 0.12, 'square'], [784, 0.24, 0.12, 'square'], [1047, 0.36, 0.3, 'square']]
  };

  function play(name) {
    if (!BNM.settings.sound || !SOUNDS[name]) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      var now = ac.currentTime;
      SOUNDS[name].forEach(function (n) {
        var osc = ac.createOscillator(), gain = ac.createGain();
        osc.type = n[3];
        osc.frequency.value = n[0];
        gain.gain.setValueAtTime(0.06, now + n[1]);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + n[1] + n[2]);
        osc.connect(gain); gain.connect(ac.destination);
        osc.start(now + n[1]); osc.stop(now + n[1] + n[2] + 0.02);
      });
    } catch (e) { /* audio not available: stay silent */ }
  }

  return { play: play };
})();
