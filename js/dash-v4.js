/* Dashboard v4 helpers: switches html.v4 on for clients and adds two small panels built from the client's REAL data
   (available balance + account-security checklist). Nothing here claims anything the account does not have. */
(function () {
  'use strict';
  if (window.__dashV4) return; window.__dashV4 = 1;
  var de = document.documentElement;
  function $(s, r) { return (r || document).querySelector(s); }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg>';
  function staff() { return !!(document.getElementById('agd') || document.getElementById('adminPanel') && document.getElementById('adminPanel').getClientRects().length); }
  function kyc() { try { var v = st.verification && st.verification.status; return v === 'approved' || v === 'verified'; } catch (e) { return false; } }
  var totp = null, asked = 0;
  function askTotp_unused() {
    if (asked || totp !== null) return; var tk = ''; try { tk = localStorage.getItem('session_token'); } catch (e) { } if (!tk) return; asked = 1;
    try { fetch((window.WORKER_LOGIN_URL || 'https://nordic-deposit-checker.otis-790.workers.dev') + '?action=totpStatus', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: tk }) }).then(function (r) { return r.json(); }).then(function (d) { if (d && d.ok) { totp = !!d.enabled; var s = document.getElementById('v4Sec'); if (s) s.removeAttribute('data-h'); tick(); } }).catch(function () { }); } catch (e) { }
  }
  var SHI = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7.5 2.8v5.8c0 4.6-3.2 7.9-7.5 9.4-4.3-1.5-7.5-4.8-7.5-9.4V5.8z"/><path d="m8.8 12 2.3 2.3 4.3-4.6"/></svg>';
  function avail() {
    var card = $('.bd-cardc'); if (!card) return;
    var host = card.querySelector('.pay'), old = card.querySelector('.v4-av'); if (!host) return;
    var bal = $('#bdBal'), txt = bal ? bal.textContent.trim() : ''; if (!txt) return;
    var frozen = false; try { frozen = String(st.card && st.card.status).toLowerCase() === 'frozen'; } catch (e) { }
    var html = '<div><small>Available balance</small><b class="bd-sens">' + esc(txt) + '</b></div><span class="v4-badge' + (frozen ? ' warn' : '') + '">' + (frozen ? 'Card frozen' : SHI + 'Card active') + '</span>';
    if (!old) { old = document.createElement('div'); old.className = 'v4-av'; var slot = host.closest('.bd-slot') || host; slot.parentNode.insertBefore(old, slot.nextSibling); }
    if (old.getAttribute('data-h') !== html) { old.innerHTML = html; old.setAttribute('data-h', html); }
  }
  var SHIELD = '<svg class="v4-shield" viewBox="0 0 160 190" aria-hidden="true"><defs><linearGradient id="v4a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d9fff1" stop-opacity=".95"/><stop offset=".45" stop-color="#46e8b0" stop-opacity=".55"/><stop offset="1" stop-color="#0b3d30" stop-opacity=".9"/></linearGradient><linearGradient id="v4b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient><filter id="v4g" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="6"/></filter></defs><path d="M80 10 150 36v62c0 44-30 72-70 84C40 170 10 142 10 98V36z" fill="#46e8b0" opacity=".25" filter="url(#v4g)"/><path d="M80 12 146 37v60c0 41-28 68-66 80C42 165 14 138 14 97V37z" fill="url(#v4a)" stroke="#e8fff7" stroke-opacity=".7" stroke-width="2"/><path d="M80 24 136 45v52c0 34-23 56-56 67C47 153 24 131 24 97V45z" fill="#06241c" fill-opacity=".72" stroke="#46e8b0" stroke-opacity=".6" stroke-width="1.4"/><path d="M80 12 146 37v30C120 60 100 44 80 12z" fill="url(#v4b)" opacity=".5"/><path d="M52 94l20 20 38-44" fill="none" stroke="#9dffd8" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function health() {
    var h = $('#bdHealth'), card = $('#bdCard'); if (!h || !card) return;
    if (card.nextElementSibling !== h) card.parentNode.insertBefore(h, card.nextSibling);
    if (!h.querySelector('.v4-shield')) h.insertAdjacentHTML('beforeend', SHIELD);
  }
  var WK = (window.WORKER_LOGIN_URL || 'https://nordic-deposit-checker.otis-790.workers.dev'), svc = null, svcT = 0;
  function checkSvc() {
    var now = Date.now(); if (now - svcT < 60000) return; svcT = now;
    var ctl = window.AbortController ? new AbortController() : null, to = setTimeout(function () { try { ctl && ctl.abort(); } catch (e) { } }, 5000);
    fetch(WK + '?action=holidayConfig', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', signal: ctl ? ctl.signal : undefined }).then(function (r) { return r.json(); }).then(function (d) { clearTimeout(to); svc = !!(d && d.ok); pill(); }).catch(function () { svc = false; pill(); });
  }
  function pill() {
    var top = $('.bd-hero-top'); if (!top) return; var p = $('#v4Pill'), bad = svc === false;
    var html = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 3v6c0 4.5-3.2 7.6-8 9-4.8-1.4-8-4.5-8-9V6z"/><path d="M8.5 12.2l2.4 2.4 4.6-5"/></svg>' + (bad ? 'Connection problem' : svc === null ? 'Checking…' : 'All systems operational');
    if (!p) { p = document.createElement('span'); p.id = 'v4Pill'; top.insertBefore(p, top.children[1] || null); }
    if (p.getAttribute('data-h') !== html) { p.innerHTML = html; p.setAttribute('data-h', html); }
    p.className = 'v4-badge v4-stat' + (bad ? ' warn' : '');
  }
  var GEM = '<svg viewBox="0 0 120 100" aria-hidden="true"><defs><linearGradient id="v4c" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f1fffa"/><stop offset=".5" stop-color="#46e8b0"/><stop offset="1" stop-color="#0d5a45"/></linearGradient></defs><polygon points="60,6 100,32 84,86 36,86 20,32" fill="url(#v4c)" opacity=".92"/><polygon points="60,6 100,32 60,44" fill="#fff" opacity=".55"/><polygon points="20,32 60,44 36,86" fill="#06241c" opacity=".35"/><polygon points="60,44 100,32 84,86" fill="#06241c" opacity=".2"/><polyline points="20,32 60,44 100,32" fill="none" stroke="#fff" stroke-opacity=".6"/><polyline points="60,44 36,86 84,86 60,44" fill="none" stroke="#fff" stroke-opacity=".3"/></svg>';
  function promo() {
    var side = $('#sideBar'); if (!side) return; var user = side.querySelector('.umi'), pr = $('#v4Promo');
    var hol = false; try { hol = !!(window.__holApi && window.__holApi.active && window.__holApi.active()) && !(window.__cardSkins && st.card && (window.__cardSkins.keys || []).indexOf(st.card.design) > -1 && st.card.design !== 'obsidian'); } catch (e) { }
    var kind = hol ? 'skins' : 'invite';
    var html = GEM + (kind === 'skins' ? '<i class="v4-eb">NEW CARD DESIGNS</i><b>Holiday card skins</b><span>Snow, lights and Santa for your card.</span><a>See designs →</a>' : '<i class="v4-eb">NORDIC REWARDS</i><b>Invite friends, earn NC</b><span>Share your link and collect bonus points.</span><a>Learn more →</a>');
    if (!pr) { pr = document.createElement('div'); pr.id = 'v4Promo'; pr.className = 'v4-promo'; pr.setAttribute('role', 'button'); pr.tabIndex = 0;
      var go = function () { var k = pr.getAttribute('data-k'); if (k === 'skins' && window.__cardSkins && window.__cardSkins.show) window.__cardSkins.show(true); else if (typeof window.openClientBonus === 'function') window.openClientBonus(); };
      pr.addEventListener('click', go); pr.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
      var anchor = user || side.lastElementChild; side.insertBefore(pr, anchor); }
    pr.setAttribute('data-k', kind); if (pr.getAttribute('data-h') !== html) { pr.innerHTML = html; pr.setAttribute('data-h', html); }
  }
  function heading() {
    var bd = $('#bd'); if (!bd || !bd.parentNode) return; var h = $('#v4Head');
    var hi = ($('#bdHi') || {}).textContent || 'Welcome'; hi = hi.replace(/\s+/g, ' ').trim();
    var d = ''; try { d = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase().replace(',', ''); } catch (e) { }
    var html = '<div><span class="v4-eb">PERSONAL OVERVIEW</span><h1>' + esc(hi) + '<i>.</i></h1></div><span class="v4-dt">' + esc(d) + '</span>';
    if (!h) { h = document.createElement('div'); h.id = 'v4Head'; h.className = 'v4-head'; bd.parentNode.insertBefore(h, bd); }
    if (h.getAttribute('data-h') !== html) { h.innerHTML = html; h.setAttribute('data-h', html); }
  }
  function tip() {
    var c = $('#bdChart'), b = $('#bdBal'); if (!c || !b) return; var t = $('#v4Tip');
    if (!t) { t = document.createElement('div'); t.id = 'v4Tip'; t.className = 'v4-tip'; c.appendChild(t); }
    var v = b.textContent.trim(); if (t.textContent !== v) t.textContent = v;
  }
  function en() { try { var l = localStorage.getItem('nc_lang'); return !l || l === 'en'; } catch (e) { return true; } }
  var IC = {
    bars: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M4 20V10M9 20V4M14 20v-7M19 20V8"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
    gem: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5 21.5 12 12 21.5 2.5 12z" opacity=".9"/></svg>',
    dia: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M24 4.5 39.5 10v12.2c0 10-6.6 17.4-15.5 20.8C15.1 39.6 8.5 32.2 8.5 22.2V10z"/><path d="m16.5 24 5.4 5.4 9.8-10.6"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7.5 2.8v5.8c0 4.6-3.2 7.9-7.5 9.4-4.3-1.5-7.5-4.8-7.5-9.4V5.8z"/><path d="m8.8 12 2.3 2.3 4.3-4.6"/></svg>',
    info: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><circle cx="8" cy="8" r="7"/><path d="M8 7v4.2M8 4.6v.2" stroke-linecap="round"/></svg>',
    chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>'
  };
  function titles() {
    var M = { bdIns: ['Money Flow', IC.bars], bdTx: ['Recent activity', IC.clock], bdCrypto: ['Your assets', IC.gem] };
    Object.keys(M).forEach(function (id) {
      var sec = document.getElementById(id), h = sec && sec.querySelector('.bd-ch h3'); if (!h) return;
      if (!h.previousElementSibling || !h.previousElementSibling.classList.contains('v4-ti')) h.insertAdjacentHTML('beforebegin', '<span class="v4-ti">' + M[id][1] + '</span>');
      if (en() && h.textContent !== M[id][0]) h.textContent = M[id][0];
    });
    var k = $('.bd-hero > .bd-k');
    if (k && en() && !k.querySelector('.v4-i')) k.innerHTML = 'Total Wealth <span class="v4-i" title="Combined value of your accounts">' + IC.info + '</span>';
  }
  function curMore() {
    var cb = $('#bdCur'); if (!cb) return; var n = cb.querySelectorAll('button:not(.v4-more)').length;
    var m = cb.querySelector('.v4-more');
    if (n <= 4) { if (m) m.remove(); return; }
    if (!m) {
      m = document.createElement('button'); m.type = 'button'; m.className = 'v4-more'; m.setAttribute('aria-label', 'More currencies'); m.innerHTML = IC.chev;
      m.addEventListener('click', function (e) { e.stopPropagation(); var o = cb.classList.toggle('v4-all'); m.setAttribute('aria-expanded', o ? 'true' : 'false'); });
      cb.appendChild(m);
    } else if (m !== cb.lastElementChild) cb.appendChild(m);
  }
  function security() {
    var h = $('#bdHealth'); if (!h) return;
    var li = h.querySelectorAll('.bd-hli li'), ok = h.querySelectorAll('.bd-hli li.ok').length, all = li.length || 1, full = ok === all;
    var html = '<span class="v4-shi">' + IC.dia + '</span><div><h2>' + (full ? 'Protected' : 'Almost protected') + '</h2><small>' + (svc === false ? 'Connection problem' : full ? 'All systems operational' : ok + ' of ' + all + ' steps completed') + '</small></div>';
    var s = h.querySelector('.v4-sh');
    if (!s) { s = document.createElement('div'); s.className = 'v4-sh'; h.insertBefore(s, h.firstChild); }
    if (s.getAttribute('data-h') !== html) { s.innerHTML = html; s.setAttribute('data-h', html); }
    s.classList.toggle('warn', !full);
  }
  function cardLook() {
    var pb = document.getElementById('cardBrandDash');
    if (pb && !pb.querySelector('.v4-wm')) pb.insertAdjacentHTML('beforeend', '<span class="v4-wm"><b>Nordic</b>Crypto</span>');
    var fz = document.querySelector('#bdCardRest .bd-cacts button[data-t="btnFreezeCard"] .bd-ci');
    if (fz && !fz.querySelector('.v4-snow')) fz.innerHTML = '<svg class="v4-snow" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M3.3 7l17.4 10M20.7 7 3.3 17"/><path d="m9.5 3.5 2.5 2 2.5-2M9.5 20.5l2.5-2 2.5 2M4.3 10.4l3.1-.6-1-3M19.7 13.6l-3.1.6 1 3M6.4 17.2l1-3-3.1-.6M17.6 6.8l-1 3 3.1.6"/></svg>';
    var n = document.getElementById('cardNetwork1');
    if (n) n.classList.toggle('v4-isvisa', /VISA/.test(n.innerHTML) && !/circle/.test(n.innerHTML));
  }
  function tick() {
    if (staff() || !$('.bd')) return;
    de.classList.add('v4');
    try { avail(); health(); pill(); heading(); tip(); titles(); curMore(); security(); cardLook(); checkSvc(); promo(); } catch (e) { }
  }
  var t = 0; function soon() { clearTimeout(t); t = setTimeout(tick, 120); }
  new MutationObserver(soon).observe(document.body, { childList: true, subtree: true });
  setTimeout(tick, 600); setInterval(tick, 3000);
})();
