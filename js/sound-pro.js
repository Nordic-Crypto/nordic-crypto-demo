/* NordicCrypto — sound-pro.js v1
   Soft, pleasant notification sounds. Replaces the old raw beeps (hard on/off sine tones that clicked)
   with short bell / marimba-like notes: smooth attack, natural decay, a gentle low-pass and a little room.
   Keeps the old function names (playChime, playChatSound, playTone) so every existing caller just sounds nicer.
   Turn sounds off with localStorage nc_sound_off = '1'. Load after app.legacy.js. */
(function () {
  'use strict';
  if (window.NCSound) return;
  var ctx = null, bus = null, last = 0;
  function off() { try { return localStorage.getItem('nc_sound_off') === '1'; } catch (e) { return false; } }
  function ac() {
    if (ctx) return ctx;
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
    /* master: soft low-pass + tiny room (two short delays) + limiter so nothing is ever sharp or loud */
    var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 5200; lp.Q.value = .4;
    var comp = ctx.createDynamicsCompressor(); comp.threshold.value = -20; comp.ratio.value = 4; comp.attack.value = .003; comp.release.value = .2;
    var master = ctx.createGain(); master.gain.value = .9;
    var d1 = ctx.createDelay(); d1.delayTime.value = .045; var g1 = ctx.createGain(); g1.gain.value = .16;
    var d2 = ctx.createDelay(); d2.delayTime.value = .11; var g2 = ctx.createGain(); g2.gain.value = .09;
    var room = ctx.createBiquadFilter(); room.type = 'lowpass'; room.frequency.value = 2600;
    lp.connect(comp); lp.connect(room); room.connect(d1); d1.connect(g1); g1.connect(comp); room.connect(d2); d2.connect(g2); g2.connect(comp);
    comp.connect(master); master.connect(ctx.destination);
    bus = lp; return ctx;
  }
  function ready() { var c = ac(); if (!c) return null; if (c.state === 'suspended') { try { c.resume(); } catch (e) { } } return c; }
  ['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) { document.addEventListener(ev, function () { var c = ac(); if (c && c.state === 'suspended') c.resume(); }, { passive: true, capture: true }); });

  /* one soft bell note: fundamental + quiet overtones, each with its own natural decay */
  function bell(freq, at, opt) {
    var c = ready(); if (!c || off()) return; opt = opt || {};
    var t = c.currentTime + (at || 0) + .01, vol = opt.vol == null ? .16 : opt.vol, dec = opt.decay || 1.1;
    var parts = opt.parts || [[1, 1, dec], [2, .22, dec * .55], [3, .06, dec * .35], [4.2, .025, dec * .2]];
    parts.forEach(function (p) {
      var o = c.createOscillator(), g = c.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(freq * p[0], t);
      if (opt.glide) o.frequency.exponentialRampToValueAtTime(freq * p[0] * opt.glide, t + .09);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol * p[1], t + (opt.attack || .008));
      g.gain.exponentialRampToValueAtTime(.0001, t + p[2]);
      o.connect(g); g.connect(bus); o.start(t); o.stop(t + p[2] + .05);
    });
  }
  /* one sound per moment: many events call two sound functions in a row (chime + notification), so anything within 1.2 s of the last sound is skipped */
  function guard() { var n = Date.now(); if (n - last < 1200) return false; last = n; return true; }

  var S = {
    /* new notification / success: two warm notes, a rising major sixth (G5 → E6) */
    notify: function () { if (!guard(250)) return; bell(783.99, 0, { vol: .15, decay: 1.2 }); bell(1318.51, .11, { vol: .12, decay: 1.5 }); },
    /* bigger moments (money arrived, card ready): three-note arpeggio C6-E6-G6 */
    success: function () { if (!guard(300)) return; bell(1046.5, 0, { vol: .12, decay: 1.1 }); bell(1318.51, .09, { vol: .11, decay: 1.2 }); bell(1567.98, .18, { vol: .1, decay: 1.7 }); },
    /* chat message: a single soft "pop" with a tiny upward glide */
    chat: function () { if (!guard(200)) return; bell(659.25, 0, { vol: .14, decay: .5, glide: 1.12, parts: [[1, 1, .5], [2, .12, .22]] }); bell(987.77, .07, { vol: .08, decay: .6, parts: [[1, 1, .6], [2, .1, .25]] }); },
    /* something went wrong: low, gentle, falling — never harsh */
    error: function () { if (!guard(250)) return; bell(392, 0, { vol: .13, decay: .55, parts: [[1, 1, .55], [2, .1, .25]] }); bell(329.63, .13, { vol: .12, decay: .8, parts: [[1, 1, .8], [2, .08, .3]] }); },
    /* tiny click-free tick for small confirmations */
    tick: function () { if (!guard(80)) return; bell(1760, 0, { vol: .05, decay: .18, parts: [[1, 1, .18]] }); },
    on: function (v) { try { if (v) localStorage.removeItem('nc_sound_off'); else localStorage.setItem('nc_sound_off', '1'); } catch (e) { } },
    get muted() { return off(); }
  };
  window.NCSound = S;

  /* old API → new sounds */
  window.playChime = function () { S.notify(); };
  window.playChatSound = function () { S.chat(); };
  window.playTone = function (freq) { if ((Number(freq) || 880) < 300) S.error(); else S.notify(); };
  window.playNotificationSound = function () { S.notify(); };
  try { window.getAudioCtx = function () { return ready(); }; } catch (e) { }
})();
