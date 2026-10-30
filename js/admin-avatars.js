/* admin-avatars.js v1.0 — shows client profile photos everywhere in the admin UI. Needs worker >= 6.5.0 */
(function () {
  'use strict';
  if (window.__ncAdAv) return; window.__ncAdAv = 1;
  var WORKER = 'https://nordic-deposit-checker.otis-790.workers.dev';
  var RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
  var SEL = '.ap-av, .admin-client-avatar';
  var mem = {}, KEY = 'nc_aav2', lastAsk = {}, timer = null, busy = false;
  try { mem = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { mem = {}; }
  function isAdmin() { try { return localStorage.getItem('user_role') === 'admin' && !!localStorage.getItem('session_token'); } catch (e) { return false; } }
  function save() {
    var ks = Object.keys(mem); if (ks.length > 120) ks.slice(0, ks.length - 120).forEach(function (k) { delete mem[k]; });
    try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) { try { localStorage.removeItem(KEY); } catch (x) {} }
  }
  function emailsIn(n) {
    var out = {}, w = document.createTreeWalker(n, NodeFilter.SHOW_TEXT), t;
    while ((t = w.nextNode())) { var m = RE.exec(t.nodeValue || ''); if (m) out[m[0].toLowerCase()] = 1; }
    return Object.keys(out);
  }
  function emailFor(el) {
    var n = el, i = 0;
    while (n && i < 6) {
      n = n.parentElement; i++; if (!n) break;
      var de = n.getAttribute && (n.getAttribute('data-open') || n.getAttribute('data-e'));
      if (de && RE.test(de)) return de.toLowerCase();
      var found = emailsIn(n);
      if (found.length === 1) return found[0];
      if (found.length > 1) return null;
    }
    return null;
  }
  function paint(el, d) {
    var st = el.style;
    if (d) {
      st.setProperty('background-image', 'url(' + d + ')', 'important'); st.setProperty('background-size', 'cover', 'important');
      st.setProperty('background-position', 'center', 'important'); st.setProperty('color', 'transparent', 'important');
      st.setProperty('font-size', '0', 'important'); el.setAttribute('data-ncph', '1');
    }
  }
  function applyCache() {
    if (!isAdmin()) return;
    var els = document.querySelectorAll(SEL);
    for (var i = 0; i < els.length; i++) {
      var el = els[i]; if (el.getAttribute('data-ncph')) continue;
      var em = el.getAttribute('data-ncav');
      if (!em) { em = emailFor(el); if (!em) continue; el.setAttribute('data-ncav', em); }
      var c = mem[em]; if (c && c.d) paint(el, c.d);
    }
  }
  function scan() {
    timer = null; if (!isAdmin()) return;
    var need = {}, els = document.querySelectorAll(SEL);
    for (var i = 0; i < els.length; i++) {
      var el = els[i], em = el.getAttribute('data-ncav');
      if (!em) { em = emailFor(el); if (!em) continue; el.setAttribute('data-ncav', em); }
      var c = mem[em];
      if (c && c.d) { if (!el.getAttribute('data-ncph')) paint(el, c.d); }
      if (!c || (Date.now() - (lastAsk[em] || 0) > 90000)) need[em] = 1;
    }
    var list = Object.keys(need).slice(0, 40); if (!list.length || busy) return;
    busy = true; var have = {};
    list.forEach(function (e) { lastAsk[e] = Date.now(); if (mem[e]) have[e] = mem[e].ts; });
    fetch(WORKER + '?action=getAvatars', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: localStorage.getItem('session_token'), emails: list, have: have }) })
      .then(function (r) { return r.json(); }).then(function (d) {
        busy = false; if (!d || !d.ok) return;
        Object.keys(d.items || {}).forEach(function (e) {
          var it = d.items[e];
          if (it.same) return;
          mem[e] = { ts: it.ts, d: it.dataUrl || null };
          [].forEach.call(document.querySelectorAll('[data-ncav="' + e.replace(/"/g, '') + '"]'), function (el) {
            if (it.dataUrl) paint(el, it.dataUrl);
            else { ['background-image', 'background-size', 'background-position', 'color', 'font-size'].forEach(function (k) { el.style.removeProperty(k); }); el.removeAttribute('data-ncph'); }
          });
        });
        save(); if (document.querySelector(SEL + ':not([data-ncav])')) later();
      }).catch(function () { busy = false; });
  }
  function later() { if (!timer) timer = setTimeout(scan, 250); }
  function boot() {
    new MutationObserver(function () { applyCache(); later(); }).observe(document.body, { childList: true, subtree: true });
    setInterval(later, 5000); later();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
