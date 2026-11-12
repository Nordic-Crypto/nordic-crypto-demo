/* access-admin.js v1 — admin tab "Access requests": see the client's questionnaire, a consistency score with flags, then Approve or Reject.
   Visible to the owner and to team members with the "kyc" permission. Needs worker actions listAccessRequests / reviewAccessRequest. */
(function () {
  'use strict';
  if (window.__acAdmin) return; window.__acAdmin = 1;
  var BASE = window.WORKER_LOGIN_URL || window.WORKER_URL || 'https://nordic-deposit-checker.otis-790.workers.dev';
  var TAB = 'accessReq', filt = 'pending', data = [], q = '';
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function token() { return typeof window.getSessionToken === 'function' ? window.getSessionToken() : localStorage.getItem('session_token'); }
  function post(action, body) {
    return fetch(BASE + '?action=' + action, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ token: token() }, body || {})) })
      .then(function (r) { return r.json(); }).catch(function () { return { ok: false, error: 'Connection error' }; });
  }
  var L = {
    experience: ['Trading experience', { none: 'No experience', lt1: 'Under 1 year', '1to3': '1–3 years', '3to5': '3–5 years', '5plus': 'Over 5 years' }],
    frequency: ['Trading frequency', { rare: 'Rarely', monthly: 'Monthly', weekly: 'Weekly', daily: 'Daily' }],
    instruments: ['Markets', { spot: 'Spot', futures: 'Futures', options: 'Options', forex: 'Forex', stocks: 'Stocks', defi: 'DeFi' }],
    goal: ['Main goal', { longterm: 'Long-term growth', active: 'Active trading', arbitrage: 'Arbitrage', payments: 'Payments', other: 'Other' }],
    volume: ['Monthly volume', { lt1k: '< $1k', '1to10k': '$1k–10k', '10to50k': '$10k–50k', '50to250k': '$50k–250k', '250kplus': '> $250k' }],
    risk: ['Risk appetite', { low: 'Low', medium: 'Medium', high: 'High' }],
    funds: ['Source of funds', { salary: 'Salary', business: 'Own business', savings: 'Savings', investments: 'Investments', crypto: 'Crypto gains', other: 'Other' }],
    purpose: ['Purpose', { daily: 'Daily spending', savings: 'Saving', business: 'Business payments', travel: 'Travel', salary: 'Receiving salary', other: 'Other' }],
    card: ['Card', { virtual: 'Virtual', metal: 'Metal', either: 'Either' }],
    employment: ['Employment', { employed: 'Employed', self: 'Self-employed', business: 'Business owner', student: 'Student', retired: 'Retired', other: 'Other' }],
    income: ['Monthly income', { lt1k: '< $1k', '1to3k': '$1k–3k', '3to6k': '$3k–6k', '6to10k': '$6k–10k', '10kplus': '> $10k' }],
    expected: ['Expected turnover', { lt1k: '< $1k', '1to5k': '$1k–5k', '5to20k': '$5k–20k', '20kplus': '> $20k' }]
  };
  var ORDER = { exchange: ['experience', 'frequency', 'instruments', 'goal', 'volume', 'risk', 'funds'], banking: ['purpose', 'card', 'employment', 'income', 'expected', 'funds'] };

  function css() {
    if ($('acaCss')) return; var s = document.createElement('style'); s.id = 'acaCss';
    s.textContent =
      '#acaBox h2{margin:0 0 4px;font-size:22px}#acaBox .sub{color:#8b95a5;font-size:13px;margin-bottom:16px}' +
      '#acaBox .bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:16px}' +
      '#acaBox .chip{padding:7px 13px;border-radius:99px;border:1px solid rgba(255,255,255,.14);background:transparent;color:inherit;font-size:13px;cursor:pointer}#acaBox .chip.on{background:rgba(198,255,61,.14);border-color:#c6ff3d;color:#d6ff5c}' +
      '#acaBox input.s{flex:1;min-width:160px;padding:9px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.25);color:inherit;font-size:14px}' +
      '#acaBox .rq{border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.03);border-radius:16px;padding:16px;margin-bottom:12px}' +
      '#acaBox .rq.pending{border-color:rgba(255,196,60,.35)}' +
      '#acaBox .hd{display:flex;gap:10px;align-items:flex-start;flex-wrap:wrap}#acaBox .hd .nm{font-weight:700;font-size:15px}#acaBox .hd .em{color:#8b95a5;font-size:12.5px;word-break:break-all}' +
      '#acaBox .tg{padding:3px 10px;border-radius:99px;font-size:11px;font-weight:800;letter-spacing:.05em;text-transform:uppercase}#acaBox .tg.ex{background:rgba(124,196,255,.14);color:#7cc4ff}#acaBox .tg.bk{background:rgba(198,255,61,.14);color:#d6ff5c}' +
      '#acaBox .tg.pending{background:rgba(255,196,60,.14);color:#ffc43c}#acaBox .tg.approved{background:rgba(34,197,94,.14);color:#4ade80}#acaBox .tg.rejected{background:rgba(239,68,68,.14);color:#f87171}' +
      '#acaBox .sc{margin-left:auto;text-align:center;min-width:58px}#acaBox .sc b{display:block;font-size:22px;line-height:1}#acaBox .sc span{font-size:10.5px;color:#8b95a5;text-transform:uppercase;letter-spacing:.05em}' +
      '#acaBox .meta{display:flex;gap:16px;flex-wrap:wrap;margin:12px 0;font-size:12.5px;color:#8b95a5}#acaBox .meta b{color:#e7edf5}' +
      '#acaBox .fl{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}#acaBox .fl span{font-size:12px;padding:4px 10px;border-radius:8px}' +
      '#acaBox .fl .ok{background:rgba(34,197,94,.12);color:#4ade80}#acaBox .fl .warn{background:rgba(255,196,60,.13);color:#ffc43c}#acaBox .fl .bad{background:rgba(239,68,68,.13);color:#f87171}' +
      '#acaBox .an{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:8px}#acaBox .an div{padding:9px 11px;border-radius:10px;background:rgba(0,0,0,.22);font-size:13px}#acaBox .an small{display:block;color:#8b95a5;font-size:11px;margin-bottom:2px}' +
      '#acaBox .nt{margin-top:10px;padding:10px 12px;border-radius:10px;background:rgba(255,255,255,.04);font-size:13px;color:#cbd5e1;white-space:pre-wrap;word-break:break-word}' +
      '#acaBox .ac{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px;align-items:center}#acaBox .ac input{flex:1;min-width:170px;padding:9px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.25);color:inherit;font-size:14px}' +
      '#acaBox .em0{padding:40px 10px;text-align:center;color:#8b95a5}';
    document.head.appendChild(s);
  }
  function build(main) {
    var sec = document.createElement('div'); sec.className = 'admin-section'; sec.setAttribute('data-section', TAB);
    sec.innerHTML = '<div id="acaBox"><h2>🔑 Access requests</h2><div class="sub">Clients who want a second account: Exchange for a Banking client, or Banking for an Exchange client. Read the answers, then approve or reject. Approved clients can switch between both accounts.</div>' +
      '<div class="bar"><button class="chip on" data-f="pending">Pending <span id="acaN"></span></button><button class="chip" data-f="approved">Approved</button><button class="chip" data-f="rejected">Rejected</button><button class="chip" data-f="all">All</button><input class="s" id="acaQ" placeholder="Search name or e-mail"></div><div id="acaList"><div class="em0">Loading…</div></div></div>';
    main.appendChild(sec);
    sec.querySelectorAll('.chip').forEach(function (b) { b.onclick = function () { filt = b.getAttribute('data-f'); sec.querySelectorAll('.chip').forEach(function (x) { x.classList.toggle('on', x === b); }); draw(); }; });
    $('acaQ').addEventListener('input', function () { q = this.value.toLowerCase().trim(); draw(); });
    sec.addEventListener('click', onClick);
  }
  function ans(r) {
    var o = r.answers || {}; return (ORDER[r.type] || []).filter(function (k) { return o[k] != null; }).map(function (k) {
      var m = L[k], v = o[k]; var txt = Array.isArray(v) ? v.map(function (x) { return m[1][x] || x; }).join(', ') : (m[1][v] || v);
      return '<div><small>' + esc(m[0]) + '</small>' + esc(txt) + '</div>';
    }).join('');
  }
  function card(r) {
    var sc = Number(r.score) || 0, col = sc >= 65 ? '#4ade80' : sc >= 40 ? '#ffc43c' : '#f87171';
    var when = new Date(r.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    var h = '<div class="rq ' + r.status + '" data-id="' + esc(r.id) + '" data-em="' + esc(r.email) + '"><div class="hd"><div><div class="nm">' + esc(r.name) + '</div><div class="em">' + esc(r.email) + '</div></div>' +
      '<span class="tg ' + (r.type === 'exchange' ? 'ex' : 'bk') + '">' + (r.type === 'exchange' ? 'Exchange' : 'Banking') + '</span><span class="tg ' + r.status + '">' + r.status + '</span>' +
      '<div class="sc" title="Advisory score from the answers. Not a decision."><b style="color:' + col + '">' + sc + '</b><span>score</span></div></div>' +
      '<div class="meta"><span>Applied <b>' + esc(when) + '</b></span><span>Has now <b>' + esc((r.has || []).join(' + ') || '—') + '</b></span><span>Balance <b>$' + (Number(r.balance) || 0).toLocaleString('en-US', { maximumFractionDigits: 2 }) + '</b></span>' + (r.country ? '<span>Country <b>' + esc(r.country) + '</b></span>' : '') + '<span>Transactions <b>' + (r.deposits || 0) + '</b></span></div>' +
      '<div class="fl">' + (r.flags || []).map(function (f) { return '<span class="' + esc(f[0]) + '">' + (f[0] === 'ok' ? '✓ ' : f[0] === 'bad' ? '⚠ ' : '• ') + esc(f[1]) + '</span>'; }).join('') + '</div>' +
      '<div class="an">' + ans(r) + '</div>' + (r.answers && r.answers.notes ? '<div class="nt">“' + esc(r.answers.notes) + '”</div>' : '');
    if (r.status === 'pending') h += '<div class="ac"><input maxlength="300" placeholder="Reason (shown to the client if you reject)" data-r="1"><button class="btn b1" data-d="approve">✓ Approve</button><button class="btn b2" data-d="reject">✕ Reject</button></div>';
    else h += '<div class="meta" style="margin:12px 0 0">Reviewed by <b>' + esc(r.reviewedBy || '—') + '</b>' + (r.reviewedAt ? ' · ' + esc(new Date(r.reviewedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })) : '') + (r.reason ? ' · “' + esc(r.reason) + '”' : '') + '</div>';
    return h + '</div>';
  }
  function draw() {
    var l = $('acaList'); if (!l) return;
    var rows = data.filter(function (r) { return (filt === 'all' || r.status === filt) && (!q || (r.email + ' ' + r.name).toLowerCase().indexOf(q) > -1); });
    var n = data.filter(function (r) { return r.status === 'pending'; }).length; var c = $('acaN'); if (c) c.textContent = n ? '(' + n + ')' : '';
    l.innerHTML = rows.length ? rows.map(card).join('') : '<div class="em0">' + (filt === 'pending' ? 'No applications waiting. ✨' : 'Nothing here yet.') + '</div>';
    var b = document.querySelector('#adminPanel .admin-nav-item[data-tab="' + TAB + '"] .admin-nav-badge'); if (b) { b.textContent = n; b.style.display = n ? '' : 'none'; }
  }
  function load() {
    post('listAccessRequests').then(function (r) {
      var l = $('acaList'); if (!l) return;
      if (!r || !r.ok) { l.innerHTML = '<div class="em0">' + esc((r && r.error) || 'Could not load') + (/unknown|not found/i.test(String(r && r.error)) ? '<br>Update the Cloudflare Worker with the newest worker.js.' : '') + '</div>'; return; }
      data = r.requests || []; draw();
    });
  }
  function onClick(e) {
    var bt = e.target.closest('[data-d]'); if (!bt) return; var card = bt.closest('.rq'); if (!card || bt.disabled) return;
    var dec = bt.getAttribute('data-d'), rs = card.querySelector('[data-r]'), reason = rs ? rs.value.trim() : '';
    if (dec === 'reject' && !reason && !bt.__armed) { bt.__armed = 1; bt.textContent = '✕ Click again to reject without a reason'; setTimeout(function () { bt.__armed = 0; bt.textContent = '✕ Reject'; }, 4000); if (rs) rs.focus(); return; }
    [].forEach.call(card.querySelectorAll('button'), function (b) { b.disabled = true; });
    post('reviewAccessRequest', { email: card.getAttribute('data-em'), id: card.getAttribute('data-id'), decision: dec, reason: reason }).then(function (r) {
      if (!r || !r.ok) { [].forEach.call(card.querySelectorAll('button'), function (b) { b.disabled = false; }); try { if (typeof toast === 'function') toast((r && r.error) || 'Failed', true); } catch (x) { } return; }
      data.forEach(function (x) { if (x.id === card.getAttribute('data-id')) { x.status = r.status; x.reviewedAt = Date.now(); x.reason = reason; x.reviewedBy = 'you'; } });
      try { if (typeof toast === 'function') toast(dec === 'approve' ? 'Approved. The client can now switch accounts.' : 'Rejected. The client was notified.'); } catch (x) { }
      draw();
    });
  }
  function boot() {
    post('adminMe').then(function (r) {
      if (!r || !r.ok || !r.me) return;
      var allowed = r.me.level === 'owner' || (r.perms || []).indexOf('kyc') > -1; if (!allowed) return;
      var nav = document.querySelector('#adminPanel .admin-sidebar'), main = document.querySelector('#adminPanel .admin-content');
      if (!nav || !main || nav.querySelector('[data-tab="' + TAB + '"]')) return;
      css(); build(main);
      var d = document.createElement('div'); d.className = 'admin-nav-item'; d.setAttribute('data-tab', TAB); d.setAttribute('onclick', "showAdminTab('" + TAB + "')");
      d.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;flex:none"><circle cx="8" cy="15" r="4"/><path d="M10.8 12.2L20 3M16 7l3 3M14 9l2 2"/></svg> Access requests <span class="admin-nav-badge" style="display:none">0</span>';
      var ver = nav.querySelector('[data-tab="verifications"]'); if (ver && ver.nextSibling) nav.insertBefore(d, ver.nextSibling); else nav.appendChild(d);
      var orig = window.showAdminTab; window.showAdminTab = function (t) { if (orig) orig.apply(this, arguments); if (t === TAB) load(); };
      post('listAccessRequests').then(function (x) { if (x && x.ok) { data = x.requests || []; draw(); } });
    });
  }
  function init() {
    var panel = $('adminPanel'); if (!panel) return; var seen = false;
    function check() { if (!panel.classList.contains('on') || seen) return; seen = true; boot(); }
    new MutationObserver(check).observe(panel, { attributes: true, attributeFilter: ['class'] }); check();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
