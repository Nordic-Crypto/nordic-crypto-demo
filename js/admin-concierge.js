/* admin-concierge.js v1 — admin "Concierge" tab: airport lounge / hotel requests and travel notices from clients */
(function () {
  'use strict';
  if (window.__ncAdminConc) return; window.__ncAdminConc = 1;
  var S = { list: null, err: '', tab: 'open' };
  function $(s, r) { return (r || document).querySelector(s); }
  function esc(x) { return String(x == null ? '' : x).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function api(action, body) {
    var tok = (typeof getSessionToken === 'function') ? getSessionToken() : localStorage.getItem('session_token');
    var url = (typeof WORKER_LOGIN_URL !== 'undefined' ? WORKER_LOGIN_URL : '') + '?action=' + action;
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ token: tok }, body || {})) }).then(function (r) { return r.json(); });
  }
  function dt(ts) { try { return new Date(ts).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }
  var CSS = '.cc{color:#e8ecf4}.cc-tabs{display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;align-items:center}' +
    '.cc-b{padding:9px 14px;border-radius:11px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);color:#e8ecf4;font-weight:600;font-size:13px;cursor:pointer}.cc-b.on{border-color:#c8ff4d;color:#c8ff4d}.cc-b.p{background:#c8ff4d;color:#0b0f08;border-color:#c8ff4d}.cc-b.d{background:rgba(255,82,82,.14);border-color:rgba(255,82,82,.4);color:#ff8f8f}' +
    '.cc-c{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:16px;margin-bottom:12px}.cc-h{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:8px}' +
    '.cc-m{color:#8b95a5;font-size:12.5px}.cc-k{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px 18px;margin:8px 0 10px;font-size:14px}.cc-k span{display:block;color:#8b95a5;font-size:11.5px;text-transform:uppercase;letter-spacing:.05em}' +
    '.cc-pill{font-size:11px;font-weight:700;padding:3px 9px;border-radius:99px}.cc-pill.pending{background:rgba(251,191,36,.14);color:#fbbf24}.cc-pill.confirmed,.cc-pill.done{background:rgba(52,211,153,.14);color:#34d399}.cc-pill.declined{background:rgba(255,107,107,.14);color:#ff8f8f}.cc-pill.noted{background:rgba(125,160,255,.16);color:#9db8ff}' +
    '.cc-in{width:100%;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);color:#fff;font:inherit;margin:8px 0}';
  var KIND = { lounge: '✈️ Airport lounge', hotel: '🏨 Hotel', travel: '🧭 Travel notice' };
  var LAB = { airport: 'Airport', date: 'Date', guests: 'Guests', city: 'City', checkin: 'Check-in', checkout: 'Check-out', budget: 'Budget / night', country: 'Country', from: 'From', to: 'To', note: 'Note' };
  function inject() { if ($('#nc-cc-css')) return; var st = document.createElement('style'); st.id = 'nc-cc-css'; st.textContent = CSS; document.head.appendChild(st); }
  function mount() {
    var side = $('.admin-sidebar'), main = $('.admin-content');
    if (!side || !main || $('[data-section="concierge"]')) return !!$('[data-section="concierge"]');
    inject();
    var nav = document.createElement('div'); nav.className = 'admin-nav-item'; nav.setAttribute('data-tab', 'concierge');
    nav.innerHTML = '<span data-ap="1" style="background:none;-webkit-mask:none;mask:none;font-size:0"><svg class="ap-ico lg" viewBox="0 0 24 24"><path d="M3 17h18M5 17a7 7 0 0114 0M12 6v3M10 6h4"/></svg></span> Concierge <span id="ccBadge" class="admin-badge" style="display:none"></span>';
    nav.onclick = function () { if (typeof showAdminTab === 'function') showAdminTab('concierge'); load(); };
    var sys = side.querySelector('[data-tab="system"]'); side.insertBefore(nav, sys || null);
    var sec = document.createElement('div'); sec.className = 'admin-section'; sec.setAttribute('data-section', 'concierge');
    sec.innerHTML = '<div class="cc" id="ccRoot"><div class="cc-m">Loading…</div></div>';
    main.appendChild(sec); return true;
  }
  function load() { api('conciergeList').then(function (r) { if (r && r.ok) { S.list = r.requests; S.err = ''; } else S.err = (r && r.error) || 'Could not load'; render(); }).catch(function () { S.err = 'Connection error'; render(); }); }
  function render() {
    var r = $('#ccRoot'); if (!r) return;
    if (S.err) { r.innerHTML = '<div class="cc-m">' + esc(S.err) + '</div>'; return; }
    var all = S.list || [], open = all.filter(function (x) { return x.status === 'pending'; });
    var b = $('#ccBadge'); if (b) { b.textContent = open.length; b.style.display = open.length ? '' : 'none'; }
    var show = all.filter(function (x) { return S.tab === 'all' ? true : S.tab === 'open' ? x.status === 'pending' : x.status !== 'pending' && S.tab === 'closed'; });
    var h = '<div class="cc-tabs">' + [['open', 'Open (' + open.length + ')'], ['closed', 'Handled / notices'], ['all', 'All']].map(function (t) { return '<button class="cc-b' + (S.tab === t[0] ? ' on' : '') + '" data-tab="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '<button class="cc-b" data-act="refresh" style="margin-left:auto">Refresh</button></div>';
    h += '<div class="cc-m" style="margin-bottom:12px">Lounge and hotel requests are arranged by your team, outside the app. Confirm or decline and add a note: the client receives a notification. Travel notices are informational.</div>';
    if (!show.length) h += '<div class="cc-c cc-m" style="text-align:center;padding:34px">Nothing here yet.</div>';
    h += show.map(function (x) {
      var d = x.d || {}, k = Object.keys(d).map(function (f) { return '<div><span>' + esc(LAB[f] || f) + '</span>' + esc(d[f]) + '</div>'; }).join('');
      var act = x.status === 'pending' ? '<input class="cc-in" data-note maxlength="300" placeholder="Note to the client (shown in their notification)"><div style="display:flex;gap:8px"><button class="cc-b p" data-st="confirmed">Confirm</button><button class="cc-b d" data-st="declined">Decline</button></div>' :
        (x.status === 'noted' ? '<div style="margin-top:6px"><button class="cc-b" data-st="done">Mark as seen</button></div>' : (x.note ? '<div class="cc-m">Note: ' + esc(x.note) + '</div>' : ''));
      return '<div class="cc-c" data-id="' + esc(x.id) + '"><div class="cc-h"><div><b>' + esc(KIND[x.kind] || x.kind) + '</b> <span class="cc-pill ' + esc(x.status) + '">' + esc(x.status) + '</span></div><div class="cc-m">' + esc(dt(x.at)) + '</div></div>' +
        '<div class="cc-m"><b style="color:#e8ecf4">' + esc(x.name || x.email) + '</b> · ' + esc(x.email) + '</div><div class="cc-k">' + k + '</div>' + act + '</div>';
    }).join('');
    r.innerHTML = h;
  }
  document.addEventListener('click', function (e) {
    var sec = e.target.closest && e.target.closest('[data-section="concierge"]'); if (!sec) return;
    var t = e.target.closest('[data-tab],[data-act],[data-st]'); if (!t) return;
    if (t.getAttribute('data-tab')) { S.tab = t.getAttribute('data-tab'); render(); return; }
    if (t.getAttribute('data-act') === 'refresh') return load();
    var card = t.closest('[data-id]'); if (!card) return;
    var note = card.querySelector('[data-note]'), msg = card.querySelector('.cc-msg');
    if (!msg) { msg = document.createElement('div'); msg.className = 'cc-msg cc-m'; msg.style.marginTop = '8px'; card.appendChild(msg); }
    t.disabled = true; msg.style.color = ''; msg.textContent = 'Saving…';
    api('conciergeDecide', { id: card.getAttribute('data-id'), status: t.getAttribute('data-st'), note: note ? note.value : '' }).then(function (r) {
      if (!r || !r.ok) { t.disabled = false; msg.style.color = '#ff8f8f'; msg.textContent = 'Error: ' + ((r && r.error) || 'no response'); return; }
      load();
    }).catch(function (er) { t.disabled = false; msg.style.color = '#ff8f8f'; msg.textContent = 'Error: ' + (er && er.message || 'network'); });
  }, true);
  var tries = 0;
  (function wait() { if (mount()) { load(); return; } if (++tries < 120) setTimeout(wait, 500); })();
  var mo = new MutationObserver(function () { if (!$('[data-section="concierge"]')) mount(); });
  if (document.body) mo.observe(document.body, { childList: true, subtree: true });
})();
