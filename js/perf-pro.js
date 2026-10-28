/* PERF PRO — load FIRST (in <head>, before app.legacy.js).
   1) Adaptive polling: the existing timers are re-tuned without editing the old files
      - fast while a deposit is being waited for, normal otherwise, slow when the tab is hidden
      - an immediate refresh the moment the tab becomes visible again
   2) Lite mode for weak computers (no blur / glass / endless animations); decided from hardware + a short frame-rate probe. */
(function () {
  'use strict';
  if (window.__ncPerf) return; window.__ncPerf = true;
  var doc = document, root = doc.documentElement;
  var _si = window.setInterval, _ci = window.clearInterval, _st = window.setTimeout, _ct = window.clearTimeout;

  /* ---------------- fast window (set after "Confirm" on a crypto deposit) ---------------- */
  function fastUntil() { var a = window.__ncFastUntil || 0; if (!a) { try { a = +localStorage.getItem('nc_fast_until') || 0; } catch (e) {} } return a; }
  var loops = {}, nid = 9000000;

  function cfgFor(fn, ms) {
    var name = fn && fn.name, src = '';
    try { src = Function.prototype.toString.call(fn); } catch (e) {}
    if (name === 'checkDeposits') return { fast: 4000, normal: 15000, hidden: 60000, hiddenFast: 10000 };
    if (name === 'refreshCurrentTab' && ms === 8000) return { normal: 6000, hidden: 30000 };
    if (ms === 10000 && src.indexOf('listPendingDeposits') > -1 && src.indexOf('listVerifications') > -1) return { normal: 5000, hidden: 30000 };
    if (ms === 15000 && src.indexOf('syncPendingDeposits') > -1) return { fast: 4000, normal: 8000, hidden: 45000, hiddenFast: 12000 };
    if (ms === 15000 && src.indexOf('fetchBlockchainConfirmations') > -1) return { normal: 5000, hidden: 20000 };
    if (name === 'poll' && ms === 4000 && src.indexOf('kyc') > -1) return { normal: 4000, hidden: 20000 };
    return null;
  }
  function nextDelay(c) {
    var fast = fastUntil() > Date.now();
    if (doc.hidden) return (fast && c.hiddenFast) ? c.hiddenFast : c.hidden;
    return (fast && c.fast) ? c.fast : c.normal;
  }
  function adaptive(fn, c) {
    var id = ++nid, L = loops[id] = { fn: fn, c: c, t: 0 };
    function run() { try { var r = fn(); if (r && typeof r.catch === 'function') r.catch(function () {}); } catch (e) {} }
    function loop() { if (!loops[id]) return; L.t = _st(function () { if (!loops[id]) return; run(); loop(); }, nextDelay(c)); }
    L.kick = function () { if (!loops[id]) return; _ct(L.t); run(); loop(); };
    loop(); return id;
  }
  window.setInterval = function (fn, ms) {
    try { if (typeof fn === 'function') { var c = cfgFor(fn, ms); if (c) return adaptive(fn, c); } } catch (e) {}
    return _si.apply(window, arguments);
  };
  window.clearInterval = function (id) {
    if (loops[id]) { _ct(loops[id].t); delete loops[id]; return; }
    return _ci.apply(window, arguments);
  };
  var lastKick = 0;
  doc.addEventListener('visibilitychange', function () {
    if (doc.hidden) return;
    var n = Date.now(); if (n - lastKick < 1500) return; lastKick = n;
    Object.keys(loops).forEach(function (k) { try { loops[k].kick(); } catch (e) {} });
  });
  /* start / extend the fast window, e.g. NCPerf.fast(30) */
  function fast(min) {
    var u = Date.now() + (min || 30) * 60000; window.__ncFastUntil = u;
    try { localStorage.setItem('nc_fast_until', String(u)); } catch (e) {}
    Object.keys(loops).forEach(function (k) { try { loops[k].kick(); } catch (e) {} });
  }
  function fastStop() { window.__ncFastUntil = 0; try { localStorage.removeItem('nc_fast_until'); } catch (e) {} }

  /* ---------------- lite mode ---------------- */
  function setLite(on, persist) {
    root.classList.toggle('nc-lite', !!on);
    if (persist) { try { localStorage.setItem('nc_lite', on ? '1' : '0'); } catch (e) {} }
  }
  var pref = null; try { pref = localStorage.getItem('nc_lite'); } catch (e) {}
  var weak = false;
  try {
    var cores = navigator.hardwareConcurrency || 8, mem = navigator.deviceMemory || 8, c = navigator.connection;
    weak = cores <= 2 || mem <= 2 || !!(c && c.saveData) || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch (e) {}
  var autoLite = false; try { autoLite = localStorage.getItem('nc_lite_auto') === '1'; } catch (e) {}
  if (pref === '1' || (pref !== '0' && (weak || autoLite))) setLite(true);

  /* frame-rate probe: ~1.6 s of requestAnimationFrame a few seconds after load */
  function probe() {
    if (pref === '0' || root.classList.contains('nc-lite') || doc.hidden) return;
    var n = 0, t0 = 0, worst = 0, last = 0;
    function f(t) {
      if (doc.hidden) return;
      if (!t0) t0 = t; if (last) worst = Math.max(worst, t - last); last = t; n++;
      if (t - t0 < 1600) requestAnimationFrame(f);
      else {
        var fps = n / ((t - t0) / 1000);
        if (fps < 38) { setLite(true); try { localStorage.setItem('nc_lite_auto', '1'); } catch (e) {} }
      }
    }
    requestAnimationFrame(f);
  }
  function startProbe() { _st(probe, 3500); }
  if (doc.readyState === 'complete') startProbe(); else window.addEventListener('load', startProbe);

  window.NCPerf = { fast: fast, fastStop: fastStop, lite: function (on) { setLite(!!on, true); try { localStorage.removeItem('nc_lite_auto'); } catch (e) {} }, auto: function () { try { localStorage.removeItem('nc_lite'); localStorage.removeItem('nc_lite_auto'); } catch (e) {} } };
})();
