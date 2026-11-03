/* NordicCrypto explore-pro.js v1 — "Explore" page for banking accounts: travel concierge (airport lounge, hotel), travel notice, places nearby */
(function () {
  'use strict';
  if (window.__ncExplore) return; window.__ncExplore = 1;
  var W = 'https://nordic-deposit-checker.otis-790.workers.dev';
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function tok() { try { return localStorage.getItem('session_token') || ''; } catch (e) { return ''; } }
  function api(action, body) { return fetch(W + '?action=' + action, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ token: tok() }, body || {})) }).then(function (r) { return r.json(); }).catch(function () { return { ok: false, error: 'No connection. Check your internet and try again.' }; }); }
  function say(m, bad) { if (typeof toast === 'function') toast(m, bad); }
  function stNow() { try { return (typeof st !== 'undefined' && st) || null; } catch (e) { return null; } }
  function day(n) { return new Date(Date.now() + n * 864e5).toISOString().slice(0, 10); }
  function dshort(s) { try { return new Date(s + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); } catch (e) { return s; } }

  var CSS =
    '#explore{padding-bottom:40px}.ex-hero{position:relative;overflow:hidden;margin:18px 0 22px;padding:28px 28px 26px;border-radius:26px;background:linear-gradient(135deg,rgba(0,229,255,.16),rgba(139,92,246,.2));border:1px solid var(--bd2,rgba(255,255,255,.14))}' +
    '.ex-hero:after{content:"";position:absolute;right:-60px;top:-80px;width:280px;height:280px;border-radius:50%;background:radial-gradient(circle,var(--pri,#00E5FF),transparent 65%);opacity:.18;pointer-events:none}' +
    '.ex-hero h2{margin:0 0 6px;font-size:clamp(22px,3vw,28px);letter-spacing:-.02em}.ex-hero p{margin:0;color:var(--mut,#94A3B8);max-width:560px;line-height:1.55}' +
    '.ex-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px}' +
    '.ex-card{position:relative;display:flex;flex-direction:column;gap:10px;padding:22px;border-radius:22px;background:var(--pan,#111827);border:1px solid var(--bd,rgba(255,255,255,.08));text-align:left;color:inherit;font:inherit;cursor:pointer;transition:transform .25s,border-color .25s,box-shadow .25s}' +
    '.ex-card:hover{transform:translateY(-4px);border-color:var(--pri,#00E5FF);box-shadow:0 20px 44px -26px var(--pri,#00E5FF)}' +
    '.ex-ico{width:48px;height:48px;border-radius:16px;display:grid;place-items:center;font-size:24px;background:linear-gradient(135deg,rgba(0,229,255,.18),rgba(139,92,246,.22));border:1px solid var(--bd2,rgba(255,255,255,.14))}' +
    '.ex-card b{font-size:17px}.ex-card span.d{color:var(--mut,#94A3B8);font-size:14px;line-height:1.5}.ex-card .go{margin-top:auto;font-size:13px;font-weight:700;color:var(--pri,#00E5FF)}' +
    '.ex-sec{margin:30px 0 12px;font-size:12px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:var(--mut,#94A3B8)}' +
    '.ex-chips{display:flex;gap:10px;flex-wrap:wrap}.ex-chip{padding:11px 16px;border-radius:99px;border:1px solid var(--bd2,rgba(255,255,255,.14));background:var(--pan,#111827);color:inherit;font:inherit;font-weight:600;font-size:14px;cursor:pointer;text-decoration:none;transition:border-color .2s,transform .2s}.ex-chip:hover{border-color:var(--pri,#00E5FF);transform:translateY(-2px)}' +
    '.ex-list{display:flex;flex-direction:column;gap:10px}.ex-row{display:flex;gap:14px;align-items:center;padding:14px 16px;border-radius:16px;background:var(--pan,#111827);border:1px solid var(--bd,rgba(255,255,255,.08))}.ex-row .t{flex:1;min-width:0}.ex-row b{display:block;font-size:15px}.ex-row small{color:var(--mut,#94A3B8)}' +
    '.ex-pill{font-size:11px;font-weight:700;padding:4px 10px;border-radius:99px;white-space:nowrap}.ex-pill.pending{background:rgba(251,191,36,.14);color:#fbbf24}.ex-pill.confirmed,.ex-pill.done{background:rgba(52,211,153,.14);color:#34d399}.ex-pill.declined{background:rgba(255,107,107,.14);color:#ff8f8f}.ex-pill.noted{background:rgba(125,160,255,.16);color:#9db8ff}' +
    '.ex-empty{padding:26px;text-align:center;color:var(--mut,#94A3B8);border:1px dashed var(--bd2,rgba(255,255,255,.14));border-radius:18px}' +
    '.ex-fine{margin-top:26px;font-size:12.5px;color:var(--mut,#94A3B8);line-height:1.55}' +
    '.ex-ov{position:fixed;inset:0;z-index:100250;display:grid;place-items:center;padding:16px;background:rgba(5,8,14,.72);backdrop-filter:blur(8px);animation:exIn .25s ease}.ex-box{width:min(480px,100%);max-height:92vh;overflow:auto;padding:26px 24px 22px;border-radius:26px;background:#0f1626;border:1px solid rgba(255,255,255,.12);color:#eef2f9;box-shadow:0 50px 100px -30px rgba(0,0,0,.85)}' +
    '.ex-box h3{margin:0 0 4px;font-size:21px}.ex-box .s{color:#93a0b5;font-size:14px;line-height:1.5;margin-bottom:14px}.ex-box label{display:block;margin:12px 0 5px;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#7f8ba0}' +
    '.ex-box input,.ex-box textarea{width:100%;padding:13px 14px;border-radius:13px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);color:#fff;font:inherit;font-size:15px;color-scheme:dark}.ex-box input:focus,.ex-box textarea:focus{outline:none;border-color:var(--pri,#00E5FF);box-shadow:0 0 0 4px rgba(0,229,255,.12)}' +
    '.ex-two{display:grid;grid-template-columns:1fr 1fr;gap:10px}.ex-msg{min-height:20px;margin-top:10px;font-size:13.5px;color:#ff8f8f}.ex-act{display:flex;gap:10px;margin-top:14px}.ex-act button{flex:1;min-height:48px;border-radius:14px;border:1px solid rgba(255,255,255,.14);background:transparent;color:#eef2f9;font:inherit;font-weight:700;cursor:pointer}.ex-act .go{border:0;color:#06101f;background:linear-gradient(90deg,var(--pri,#00E5FF),var(--pri2,#8B5CF6))}.ex-act button:disabled{opacity:.6}' +
    '@keyframes exIn{from{opacity:0}to{opacity:1}}@media(prefers-reduced-motion:reduce){.ex-ov{animation:none}.ex-card,.ex-chip{transition:none}}@media(max-width:560px){.ex-two{grid-template-columns:1fr}.ex-hero{padding:22px 18px}}';

  var FORMS = {
    lounge: { icon: '✈️', title: 'Airport lounge', sub: 'Tell us where and when you fly. Our team arranges lounge access where it is available and confirms in your notifications.', send: 'Send request',
      f: [['airport', 'Airport', 'text', 'e.g. Stockholm Arlanda (ARN)'], ['date', 'Date', 'date'], ['guests', 'Guests', 'number', '', 1, 6], ['note', 'Note (optional)', 'area', 'Terminal, flight number…']] },
    hotel: { icon: '🏨', title: 'Hotel booking', sub: 'Share your plans and budget. Our team looks for options and replies in your notifications.', send: 'Send request',
      f: [['city', 'City', 'text', 'e.g. Paris'], ['checkin', 'Check-in', 'date', '', 0], ['checkout', 'Check-out', 'date', '', 0], ['guests', 'Guests', 'number', '', 1, 8], ['budget', 'Budget per night (optional)', 'text', 'e.g. 150 EUR'], ['note', 'Note (optional)', 'area', 'Area, stars, breakfast…']] },
    travel: { icon: '🧭', title: 'Travel notice', sub: 'Let us know where you will use your card, so we can keep an eye on it while you are away.', send: 'Save notice',
      f: [['country', 'Country', 'text', 'e.g. Spain'], ['from', 'From', 'date'], ['to', 'To', 'date'], ['note', 'Note (optional)', 'area', 'Anything we should know']] }
  };
  var KIND = { lounge: ['✈️', 'Airport lounge'], hotel: ['🏨', 'Hotel'], travel: ['🧭', 'Travel notice'] };
  var STAT = { pending: 'In review', confirmed: 'Confirmed', declined: 'Not available', noted: 'Noted', done: 'Done' };
  var reqs = null;

  function sum(r) { var d = r.d || {}; return r.kind === 'lounge' ? (d.airport + ' · ' + dshort(d.date) + ' · ' + d.guests + ' guest' + (d.guests > 1 ? 's' : '')) : r.kind === 'hotel' ? (d.city + ' · ' + dshort(d.checkin) + ' – ' + dshort(d.checkout)) : (d.country + ' · ' + dshort(d.from) + ' – ' + dshort(d.to)); }
  function paintList() {
    var el = $('exList'); if (!el) return;
    if (reqs === null) { el.innerHTML = '<div class="ex-empty">Loading…</div>'; return; }
    if (!reqs.length) { el.innerHTML = '<div class="ex-empty">No requests yet. Pick something above to get started.</div>'; return; }
    el.innerHTML = reqs.map(function (r) { var k = KIND[r.kind] || ['•', r.kind]; return '<div class="ex-row"><div class="ex-ico" style="width:42px;height:42px;font-size:20px;border-radius:14px">' + k[0] + '</div><div class="t"><b>' + esc(k[1]) + '</b><small>' + esc(sum(r)) + (r.note ? ' · “' + esc(r.note) + '”' : '') + '</small></div><span class="ex-pill ' + esc(r.status) + '">' + esc(STAT[r.status] || r.status) + '</span></div>'; }).join('');
  }
  function loadList() { api('conciergeMine').then(function (r) { if (r && r.ok) { reqs = r.requests; paintList(); } else if (reqs === null) { reqs = []; paintList(); } }); }

  function openForm(kind) {
    var F = FORMS[kind]; if (!F) return;
    var ov = document.createElement('div'); ov.className = 'ex-ov'; ov.setAttribute('role', 'dialog');
    var h = '<div class="ex-box"><h3>' + F.icon + ' ' + esc(F.title) + '</h3><div class="s">' + esc(F.sub) + '</div>';
    var row = [];
    F.f.forEach(function (x) {
      var id = 'exf_' + x[0], c = x[2] === 'area' ? '<textarea id="' + id + '" rows="2" maxlength="200" placeholder="' + esc(x[3] || '') + '"></textarea>' :
        '<input id="' + id + '" type="' + x[2] + '" ' + (x[2] === 'date' ? 'min="' + day(0) + '" max="' + day(399) + '"' : 'maxlength="60"') + (x[2] === 'number' ? ' min="' + x[4] + '" max="' + x[5] + '" value="1"' : '') + ' placeholder="' + esc(x[3] || '') + '">';
      var cell = '<div><label for="' + id + '">' + esc(x[1]) + '</label>' + c + '</div>';
      if (x[2] === 'date' || (x[2] === 'number' && kind === 'hotel')) { row.push(cell); if (row.length === 2) { h += '<div class="ex-two">' + row.join('') + '</div>'; row = []; } }
      else { if (row.length) { h += '<div class="ex-two">' + row.join('') + '</div>'; row = []; } h += cell; }
    });
    if (row.length) h += '<div class="ex-two">' + row.join('') + '</div>';
    h += '<div class="ex-msg" id="exMsg"></div><div class="ex-act"><button type="button" id="exX">Cancel</button><button type="button" class="go" id="exGo">' + esc(F.send) + '</button></div></div>';
    ov.innerHTML = h; document.body.appendChild(ov);
    function close() { ov.remove(); document.removeEventListener('keydown', esc2); }
    function esc2(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', esc2);
    ov.addEventListener('click', function (e) { if (e.target === ov) close(); }); $('exX').onclick = close;
    var first = ov.querySelector('input,textarea'); if (first && !('ontouchstart' in window)) first.focus();
    $('exGo').onclick = function () {
      var d = {}; F.f.forEach(function (x) { d[x[0]] = ($('exf_' + x[0]) || {}).value || ''; });
      var b = $('exGo'), m = $('exMsg'); b.disabled = true; m.style.color = '#93a0b5'; m.textContent = 'Sending…';
      api('conciergeSubmit', { kind: kind, d: d }).then(function (r) {
        if (r && r.ok) { close(); say(kind === 'travel' ? 'Travel notice saved' : 'Request sent. We will reply in your notifications.'); loadList(); }
        else { b.disabled = false; m.style.color = '#ff8f8f'; m.textContent = (r && r.error) || 'Could not send'; }
      });
    };
  }

  function page() {
    var p = $('explore'); if (p) return p;
    var after = $('order') || document.querySelector('.pg:last-of-type'); if (!after) return null;
    if (!$('nc-ex-css')) { var s = document.createElement('style'); s.id = 'nc-ex-css'; s.textContent = CSS; document.head.appendChild(s); }
    p = document.createElement('div'); p.id = 'explore'; p.className = 'pg';
    var nm = (localStorage.getItem('user_name') || '').split(/\s+/)[0];
    p.innerHTML = '<div class="page-head" style="padding:0"><h1 style="margin:0;font-size:1.5rem">Explore</h1><p style="margin:2px 0 0;color:var(--mut,#94A3B8);font-size:.9rem">Travel perks and tools for your account</p></div>' +
      '<div class="ex-hero"><h2>' + (nm ? 'Planning a trip, ' + esc(nm) + '?' : 'Planning a trip?') + '</h2><p>Ask our team for airport lounge access or a hotel, and tell us where you will use your card. Requests are handled by real people and answered in your notifications.</p></div>' +
      '<div class="ex-grid">' +
      '<button class="ex-card" data-k="lounge"><div class="ex-ico">✈️</div><b>Airport lounge</b><span class="d">Relax before your flight. Request access for you and your guests.</span><span class="go">Request →</span></button>' +
      '<button class="ex-card" data-k="hotel"><div class="ex-ico">🏨</div><b>Hotel booking</b><span class="d">Tell us the city, dates and budget. We look for good options.</span><span class="go">Request →</span></button>' +
      '<button class="ex-card" data-k="travel"><div class="ex-ico">🧭</div><b>Travel notice</b><span class="d">Tell us where you are going so your card use abroad is expected.</span><span class="go">Add notice →</span></button></div>' +
      '<div class="ex-sec">Places near you</div><div class="ex-chips">' +
      '<a class="ex-chip" target="_blank" rel="noopener noreferrer" href="https://www.google.com/maps/search/ATM">🏧 ATMs</a>' +
      '<a class="ex-chip" target="_blank" rel="noopener noreferrer" href="https://www.google.com/maps/search/currency+exchange">💱 Currency exchange</a>' +
      '<a class="ex-chip" target="_blank" rel="noopener noreferrer" href="https://www.google.com/maps/search/pharmacy">💊 Pharmacies</a>' +
      '<a class="ex-chip" target="_blank" rel="noopener noreferrer" href="https://www.google.com/maps/search/airport">🛫 Airports</a></div>' +
      '<div class="ex-sec">Your requests</div><div class="ex-list" id="exList"></div>' +
      '<div class="ex-fine">Airport lounge and hotel requests are arranged by our team and are not instant. Availability depends on the airport, hotel and dates. Places open in your maps app and use your browser’s location only if you allow it.</div>';
    after.parentNode.insertBefore(p, after.nextSibling);
    p.addEventListener('click', function (e) { var c = e.target.closest('[data-k]'); if (c) openForm(c.getAttribute('data-k')); });
    return p;
  }
  function show() {
    var p = page(); if (!p) return;
    [].forEach.call(document.querySelectorAll('.pg'), function (x) { x.classList.remove('on'); x.style.display = 'none'; });
    p.classList.add('on'); p.style.display = 'block';
    [].forEach.call(document.querySelectorAll('.mi'), function (x) { x.classList.remove('on'); });
    var m = document.querySelector('.mi[data-p="explore"]'); if (m) m.classList.add('on');
    paintList(); loadList();
    var main = p.closest('.main'); if (main && main.scrollTo) main.scrollTo(0, 0);
  }
  function addNav() {
    var ul = document.querySelector('.menu'); if (!ul) return false;
    var ex = (stNow() && stNow().user && stNow().user.accountType) === 'exchange';
    var cur = ul.querySelector('[data-p="explore"]');
    if (ex || localStorage.getItem('user_role') === 'admin') { if (cur) cur.remove(); return true; }
    if (cur) return true;
    var li = document.createElement('li'); li.className = 'mi'; li.setAttribute('data-p', 'explore');
    li.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/></svg><span class="tx">Explore</span>';
    li.onclick = show; ul.appendChild(li); return true;
  }
  var tries = 0, t = setInterval(function () { if (!tok()) return; var s = stNow(); if (s && s.user && s.user.verified && $('mainApp') && addNav()) { if (++tries > 3) { clearInterval(t); setInterval(addNav, 5000); } } }, 1500);
})();
