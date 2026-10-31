/* NordicCrypto — Top bar PRO v1.0
   Does NOT move the original elements (other scripts keep working): it only tags them with classes,
   adds a "more" toggle for mobile and a "/" shortcut for search. */
(function () {
  'use strict';
  if (window.__tbPro) return; window.__tbPro = true;
  var TIER = /(bronze|silver|gold|platinum|diamond|elite|vip)/i;
  var tg = null, br = null, timer = 0;

  function top() { return document.querySelector('#mainApp > .top') || document.querySelector('.main > .top') || document.querySelector('.top'); }
  function cluster(t) { var c = null; Array.prototype.forEach.call(t.children, function (el) { if (!el.classList.contains('top-search') && !el.classList.contains('tbp-x') && el.children.length) c = el; }); return c; }

  function tag(el) {
    if (!el || el.nodeType !== 1 || el.classList.contains('tbp-x') || el.classList.contains('top-search')) return;
    var txt = (el.textContent || '').trim().toLowerCase(), k;
    if (el.id === 'ncLang' || el.classList.contains('nc-lang')) k = 'tbp-lang';
    else if (el.id === 'notifBell' || el.classList.contains('notif-bell')) k = 'tbp-bell';
    else if (el.classList.contains('st')) k = 'tbp-st';
    else if ((/\bnc\b/.test(txt) && TIER.test(txt)) || /reward|loyal|tier/i.test(el.className + ' ' + el.id)) k = 'tbp-rw';
    else k = 'tbp-t';
    ['tbp-bell', 'tbp-st', 'tbp-rw', 'tbp-t', 'tbp-lang'].forEach(function (c) { if (c !== k) el.classList.remove(c); });
    el.classList.add(k);
  }

  function ensure() {
    var t = top(); if (!t) return false;
    t.classList.add('tbp');
    var c = cluster(t); if (c) c.classList.add('tbp-cl');
    // everything that is not search / cluster but sits directly in .top
    Array.prototype.forEach.call(t.children, function (el) { if (el !== c) tag(el); });
    if (c) Array.prototype.forEach.call(c.children, tag);
    var host = c || t;
    if (!tg || !host.contains(tg)) {
      tg = document.createElement('button'); tg.type = 'button'; tg.className = 'tbp-x tbp-tg'; tg.setAttribute('aria-label', 'More'); tg.setAttribute('aria-expanded', 'false');
      tg.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
      host.appendChild(tg);
      br = document.createElement('i'); br.className = 'tbp-x tbp-br'; host.appendChild(br);
    }
    var search = t.querySelector('input');
    if (search && !search.__tbp) { search.__tbp = 1; if (!search.placeholder || /search/i.test(search.placeholder)) search.setAttribute('data-ph', search.placeholder); }
    var ss = t.querySelector('.top-search'); if (ss && !ss.querySelector('.tbp-kbd')) { var k = document.createElement('kbd'); k.className = 'tbp-x tbp-kbd'; k.textContent = '/'; ss.appendChild(k); }
    return true;
  }
  function schedule() { clearTimeout(timer); timer = setTimeout(ensure, 120); }

  function init() {
    if (!ensure()) { setTimeout(init, 500); return; }
    var t = top();
    try { new MutationObserver(function (m) { for (var i = 0; i < m.length; i++) { var n = m[i].target; if (!n.classList || !n.classList.contains('tbp-x')) { schedule(); return; } } }).observe(t, { childList: true, subtree: true }); } catch (e) {}
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('.tbp-tg');
      if (b) { var o = t.classList.toggle('tbp-open'); b.setAttribute('aria-expanded', o ? 'true' : 'false'); return; }
      if (t.classList.contains('tbp-open') && !(e.target.closest && e.target.closest('.tbp-t, .curr-menu, .top-search'))) { t.classList.remove('tbp-open'); tg && tg.setAttribute('aria-expanded', 'false'); }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === '/' && !/^(input|textarea|select)$/i.test((e.target.tagName || '')) && !e.target.isContentEditable) {
        var i = t.querySelector('.top-search input'); if (i && i.offsetParent !== null) { e.preventDefault(); i.focus(); i.select(); }
      }
      if (e.key === 'Escape') t.classList.remove('tbp-open');
    });
    // re-tag after app login/render (elements may appear later)
    [800, 2000, 4500].forEach(function (ms) { setTimeout(ensure, ms); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
