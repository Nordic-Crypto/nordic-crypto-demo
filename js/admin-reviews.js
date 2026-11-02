/* admin-reviews.js v1 — admin "Reviews" tab: approve or reject client reviews before they appear on the website */
(function () {
  'use strict';
  if (window.__ncAdminRev) return; window.__ncAdminRev = 1;
  var S = { list: null, err: '', tab: 'pending' };
  function $(s, r) { return (r || document).querySelector(s); }
  function esc(x) { return String(x == null ? '' : x).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function api(action, body) {
    var tok = (typeof getSessionToken === 'function') ? getSessionToken() : localStorage.getItem('session_token');
    var url = (typeof WORKER_LOGIN_URL !== 'undefined' ? WORKER_LOGIN_URL : '') + '?action=' + action;
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ token: tok }, body || {})) }).then(function (r) { return r.json(); });
  }
  function dt(ts) { try { return new Date(ts).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }
  var CSS = '.rv{color:#e8ecf4}.rv-tabs{display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;align-items:center}' +
    '.rv-b{padding:9px 14px;border-radius:11px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);color:#e8ecf4;font-weight:600;font-size:13px;cursor:pointer}.rv-b.on{border-color:#c8ff4d;color:#c8ff4d}.rv-b.p{background:#c8ff4d;color:#0b0f08;border-color:#c8ff4d}.rv-b.d{background:rgba(255,82,82,.14);border-color:rgba(255,82,82,.4);color:#ff8a8a}' +
    '.rv-c{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:16px;margin-bottom:12px}.rv-h{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:8px}' +
    '.rv-st{color:#c8ff4d;letter-spacing:2px}.rv-st i{font-style:normal;color:rgba(255,255,255,.18)}.rv-t{font-size:15px;line-height:1.55;margin:6px 0 10px}.rv-m{color:#8b95a5;font-size:12.5px}' +
    '.rv-pill{font-size:11px;font-weight:700;padding:3px 9px;border-radius:99px}.rv-pill.pending{background:rgba(251,191,36,.14);color:#fbbf24}.rv-pill.approved{background:rgba(52,211,153,.14);color:#34d399}.rv-pill.rejected{background:rgba(255,107,107,.14);color:#ff8f8f}' +
    '.rv-in{width:100%;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);color:#fff;font:inherit;margin:8px 0}';
  function inject() { if ($('#nc-rv-css')) return; var st = document.createElement('style'); st.id = 'nc-rv-css'; st.textContent = CSS; document.head.appendChild(st); }
  function mount() {
    var side = $('.admin-sidebar'), main = $('.admin-content');
    if (!side || !main || $('[data-section="reviews"]')) return !!$('[data-section="reviews"]');
    inject();
    var nav = document.createElement('div'); nav.className = 'admin-nav-item'; nav.setAttribute('data-tab', 'reviews');
    nav.innerHTML = '<span data-ap="1" style="background:none;-webkit-mask:none;mask:none;font-size:0"><svg class="ap-ico lg" viewBox="0 0 24 24"><path d="M12 3l2.7 5.7 6.3.8-4.6 4.3 1.2 6.2L12 17l-5.6 3 1.2-6.2L3 9.5l6.3-.8z"/></svg></span> Reviews <span id="rvBadge" class="admin-badge" style="display:none"></span>';
    nav.onclick = function () { if (typeof showAdminTab === 'function') showAdminTab('reviews'); load(); };
    var sys = side.querySelector('[data-tab="system"]'); side.insertBefore(nav, sys || null);
    var sec = document.createElement('div'); sec.className = 'admin-section'; sec.setAttribute('data-section', 'reviews');
    sec.innerHTML = '<div class="rv" id="rvRoot"><div class="rv-m">Loading…</div></div>';
    main.appendChild(sec); return true;
  }
  function load() { api('reviewsList').then(function (r) { if (r && r.ok) { S.list = r.reviews; S.err = ''; } else S.err = (r && r.error) || 'Could not load'; render(); }).catch(function () { S.err = 'Connection error'; render(); }); }
  function stars(n) { var h = ''; for (var i = 1; i <= 5; i++) h += i <= n ? '★' : '<i>★</i>'; return '<span class="rv-st">' + h + '</span>'; }
  function render() {
    var r = $('#rvRoot'); if (!r) return;
    if (S.err) { r.innerHTML = '<div class="rv-m">' + esc(S.err) + '</div>'; return; }
    var all = S.list || [], pend = all.filter(function (x) { return x.status === 'pending'; });
    var b = $('#rvBadge'); if (b) { b.textContent = pend.length; b.style.display = pend.length ? '' : 'none'; }
    var show = all.filter(function (x) { return S.tab === 'all' ? true : S.tab === 'pending' ? x.status === 'pending' : x.status === S.tab; });
    var h = '<div class="rv-tabs">' + [['pending', 'Pending (' + pend.length + ')'], ['approved', 'Published'], ['rejected', 'Rejected'], ['all', 'All']].map(function (t) { return '<button class="rv-b' + (S.tab === t[0] ? ' on' : '') + '" data-tab="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '<button class="rv-b" data-act="refresh" style="margin-left:auto">Refresh</button></div>';
    h += '<div class="rv-m" style="margin-bottom:12px">Reviews appear on the website only after you approve them. Check that the author is a real client. Texts cannot be edited, only approved or rejected.</div>';
    if (!show.length) h += '<div class="rv-c rv-m" style="text-align:center;padding:34px">Nothing here yet.</div>';
    h += show.map(function (x) {
      var pending = x.status === 'pending';
      return '<div class="rv-c" data-id="' + esc(x.id) + '"><div class="rv-h"><div>' + stars(x.rating) + ' <span class="rv-pill ' + esc(x.status) + '">' + esc(x.status) + '</span></div><div class="rv-m">' + esc(dt(x.at)) + '</div></div>' +
        '<div class="rv-t">“' + esc(x.text) + '”</div><div class="rv-m"><b style="color:#e8ecf4">' + esc(x.name) + '</b>' + (x.location ? ' · ' + esc(x.location) : '') + '<br>Account: ' + esc(x.email) + (x.realName ? ' (' + esc(x.realName) + ')' : '') + ' · consent given ' + esc(dt(x.consentAt)) + '</div>' +
        (pending ? '<input class="rv-in" data-note placeholder="Note to the client if you reject (optional)"><div style="display:flex;gap:8px"><button class="rv-b p" data-act="ok">Publish</button><button class="rv-b d" data-act="no">Reject</button></div>' : (x.status === 'approved' ? '<div style="margin-top:10px"><button class="rv-b d" data-act="no">Unpublish</button></div>' : '<div style="margin-top:10px"><button class="rv-b p" data-act="ok">Publish again</button></div>')) + '</div>';
    }).join('');
    r.innerHTML = h;
  }
  function onClick(e) {
    var t = e.target.closest('[data-tab],[data-act]'); if (!t) return;
    if (t.getAttribute('data-tab')) { S.tab = t.getAttribute('data-tab'); render(); return; }
    var act = t.getAttribute('data-act');
    if (act === 'refresh') return load();
    var card = t.closest('[data-id]'); if (!card) return;
    var note = card.querySelector('[data-note]');
    var msg = card.querySelector('.rv-msg');
    if (!msg) { msg = document.createElement('div'); msg.className = 'rv-msg rv-m'; msg.style.marginTop = '8px'; card.appendChild(msg); }
    t.disabled = true; msg.style.color = ''; msg.textContent = 'Saving…';
    api('reviewDecide', { id: card.getAttribute('data-id'), approve: act === 'ok', note: note ? note.value : '' }).then(function (r) {
      if (!r || !r.ok) { t.disabled = false; msg.style.color = '#ff8f8f'; msg.textContent = 'Error: ' + ((r && r.error) || 'no response from server'); return; }
      msg.textContent = 'Done'; load();
    }).catch(function (er) { t.disabled = false; msg.style.color = '#ff8f8f'; msg.textContent = 'Error: ' + (er && er.message || 'network'); });
  }
  document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('[data-section="reviews"]')) onClick(e); }, true);
  var tries = 0;
  (function wait() { if (mount()) { load(); return; } if (++tries < 120) setTimeout(wait, 500); })();
  var mo = new MutationObserver(function () { if (!$('[data-section="reviews"]')) mount(); });
  if (document.body) mo.observe(document.body, { childList: true, subtree: true });
})();
