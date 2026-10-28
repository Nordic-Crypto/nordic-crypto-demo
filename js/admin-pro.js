/* ============================================================
   NC ADMIN PRO v1.0
   Load AFTER app.legacy.js and after the inline dashboard script
   (just before </body>).  It re-uses every existing admin handler
   (adminAddBalance, adminSetIban, adminResetPassword, approveKyc …),
   so nothing server-side changes.
   ============================================================ */
(function () {
  'use strict';
  if (window.__apProLoaded) return;
  window.__apProLoaded = true;

  var BASE = window.WORKER_LOGIN_URL || window.WORKER_URL || 'https://nordic-deposit-checker.otis-790.workers.dev';
  var S = { users: [], vers: [], stats: {}, deps: [], wds: [], txs: [], loaded: false, ts: 0, filter: 'all', sort: { k: 'createdAt', d: -1 }, q: '', page: 1, vFilter: 'pending' };
  var PAGE = 25;

  /* ---------- helpers ---------- */
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function arg(s) { return typeof window.ncArg === 'function' ? window.ncArg(s) : "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;') + "'"; }
  function token() { return (typeof window.getSessionToken === 'function' ? window.getSessionToken() : localStorage.getItem('session_token')); }
  function usd(v) { v = Number(v || 0); return (v < 0 ? '-' : '') + '$' + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function usdC(v) { v = Number(v || 0); if (Math.abs(v) < 1e6 && Math.abs(v) >= 1e4) return usd(v).replace(/\.00$/, ''); if (Math.abs(v) >= 1e6) return '$' + (v / 1e6).toFixed(2) + 'M'; if (Math.abs(v) >= 1e4) return '$' + (v / 1e3).toFixed(1) + 'K'; return usd(v); }
  function num(v) { return Number(v || 0).toLocaleString('en-US'); }
  function crypto(v) { v = Number(v || 0); return v === 0 ? '0' : v.toFixed(v < 1 ? 6 : 4).replace(/0+$/, '').replace(/\.$/, ''); }
  function ini(n, e) { var p = String(n || e || 'U').replace(/@.*/, '').trim().split(/[\s._-]+/).filter(Boolean); return ((p[0] || 'U').charAt(0) + (p[1] ? p[1].charAt(0) : (p[0] || '').charAt(1))).toUpperCase(); }
  var GR = [['#6366f1', '#8b5cf6'], ['#0ea5e9', '#22d3ee'], ['#10b981', '#34d399'], ['#f59e0b', '#f97316'], ['#ec4899', '#f43f5e'], ['#14b8a6', '#3b82f6']];
  function grad(s) { var h = 0; s = String(s || ''); for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; var g = GR[h % GR.length]; return 'linear-gradient(135deg,' + g[0] + ',' + g[1] + ')'; }
  function av(n, e, cls) { return '<span class="ap-av ' + (cls || '') + '" style="background:' + grad(e || n) + '">' + esc(ini(n, e)) + '</span>'; }
  function ago(ts) {
    if (!ts) return '—'; var t = typeof ts === 'number' ? ts : Date.parse(ts); if (!t) return String(ts);
    var s = Math.max(0, (Date.now() - t) / 1000);
    if (s < 60) return 'just now'; if (s < 3600) return Math.floor(s / 60) + ' min ago'; if (s < 86400) return Math.floor(s / 3600) + ' h ago';
    if (s < 604800) return Math.floor(s / 86400) + ' d ago'; return new Date(t).toLocaleDateString('en-GB');
  }
  function dt(ts) { var t = typeof ts === 'number' ? ts : Date.parse(ts); return t ? new Date(t).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'; }
  function toast(m, w) { if (typeof window.toast === 'function') window.toast(m, w); }
  var IC = {
    dash: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="m9 12 2 2 4-4"/>',
    chat: '<path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    out: '<path d="M7 17 17 7M8 7h9v9"/>', inn: '<path d="M17 7 7 17M16 17H7V8"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v5M14 11v5"/>',
    cog: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    wallet: '<path d="M3 7a2 2 0 0 1 2-2h13v4"/><path d="M3 7v11a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2z"/><circle cx="16" cy="14.5" r="1"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    check: '<path d="m5 12 5 5 9-10"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>',
    refresh: '<path d="M21 12a9 9 0 0 1-15.5 6.2L3 16M3 12a9 9 0 0 1 15.5-6.2L21 8M21 3v5h-5M3 21v-5h5"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M16 7l3 3"/>',
    bank: '<path d="M3 10 12 4l9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18"/>',
    coin: '<circle cx="12" cy="12" r="9"/><path d="M9 8h4.5a2 2 0 0 1 0 4H9m0 0h5a2 2 0 0 1 0 4H9M9 7v10"/>',
    dl: '<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>', copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>',
    card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>', user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    pulse: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>', send: '<path d="m22 2-7 20-4-9-9-4zM22 2 11 13"/>', alert: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
    snow: '<path d="M12 3v18M4 7l16 10M20 7 4 17"/>', arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>', cmd: '<path d="M9 6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3z"/>'
  };
  function ic(n, c) { return '<svg class="ap-ico ' + (c || '') + '" viewBox="0 0 24 24">' + (IC[n] || '') + '</svg>'; }

  /* ---------- data layer ---------- */
  function post(action, body) {
    var b = Object.assign({ token: token() }, body || {});
    return fetch(BASE + '?action=' + action, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) })
      .then(function (r) { return r.json(); }).catch(function () { return { ok: false }; });
  }
  var _inflight = null;
  function load(force) {
    if (_inflight) return _inflight;
    if (!force && S.loaded && Date.now() - S.ts < 6000) return Promise.resolve(S);
    _inflight = Promise.all([post('listUsers'), post('listVerifications'), post('getStats'), post('listPendingDeposits')]).then(function (r) {
      S.users = (r[0].ok && r[0].users) || [];
      S.vers = (r[1].ok && r[1].verifications) || [];
      S.stats = (r[2].ok && r[2].stats) || {};
      S.deps = (r[3].ok && r[3].deposits) || [];
      S.verBy = {}; S.vers.forEach(function (v) { S.verBy[String(v.email).toLowerCase()] = v; });
      S.loaded = true; S.ts = Date.now();
      return Promise.all(S.users.map(function (u) { return post('getUserState', { email: u.email }).then(function (d) { return { u: u, d: d }; }); }));
    }).then(function (rows) {
      var wds = [], txs = [];
      rows.forEach(function (x) {
        var d = x.d || {};
        (d.withdrawals || []).forEach(function (w) { if (w) { w.userEmail = x.u.email; w.userName = x.u.name || x.u.email; wds.push(w); } });
        (d.txs || []).forEach(function (t) { if (t) { t.userEmail = x.u.email; t.userName = x.u.name || x.u.email; txs.push(t); } });
      });
      S.wds = wds; S.txs = txs;
      _inflight = null; renderAll(); return S;
    }).catch(function () { _inflight = null; return S; });
    return _inflight;
  }
  function pendingVers() { return S.vers.filter(function (v) { return v.status === 'pending'; }); }
  function pendingWds() { return S.wds.filter(function (w) { return w.status === 'pending'; }); }
  function unreadTotal() { return S.users.reduce(function (a, u) { return a + (u.unreadChat || 0); }, 0); }
  function addrs(u) { var a = u.cryptoAddress; if (!a) return []; if (typeof a === 'string') return [['', a]]; return Object.keys(a).filter(function (k) { return /^(btc|eth|usdt|sol|bnb)$/i.test(k) && a[k] && typeof a[k] === 'string'; }).map(function (k) { return [k.toUpperCase(), a[k]]; }); }
  function userBy(email) { email = String(email).toLowerCase(); for (var i = 0; i < S.users.length; i++) if (String(S.users[i].email).toLowerCase() === email) return S.users[i]; return null; }
  function kyc(u) { var v = S.verBy && S.verBy[String(u.email).toLowerCase()]; return v ? v.status : (u.verified ? 'approved' : 'none'); }
  function kycPill(s) { return s === 'approved' ? '<span class="ap-pill ok">Verified</span>' : s === 'pending' ? '<span class="ap-pill warn">KYC pending</span>' : s === 'rejected' ? '<span class="ap-pill bad">Rejected</span>' : '<span class="ap-pill mute">Not started</span>'; }
  function typePill(t) { return t === 'banking' ? '<span class="ap-pill vio">Banking</span>' : t === 'exchange' ? '<span class="ap-pill cyan">Exchange</span>' : '<span class="ap-pill mute">—</span>'; }

  /* ---------- nav icons ---------- */
  function fixNav() {
    var map = { stats: 'dash', clients: 'users', verifications: 'shield', chats: 'chat', emailChanges: 'mail', withdrawals: 'out', deposits: 'inn', deleted: 'trash', system: 'cog' };
    document.querySelectorAll('#adminPanel .admin-nav-item').forEach(function (el) {
      var t = el.getAttribute('data-tab'), sp = el.firstElementChild;
      if (!map[t] || !sp || sp.getAttribute('data-ap')) return;
      sp.setAttribute('data-ap', '1'); sp.style.cssText = 'background:none;-webkit-mask:none;mask:none;font-size:0';
      sp.innerHTML = ic(map[t], 'lg');
    });
    var lo = $('adminLogoutBtn'); if (lo && !lo.getAttribute('data-ap')) { lo.setAttribute('data-ap', '1'); lo.innerHTML = ic('x') + ' Log out'; lo.firstChild.style.cssText = 'display:none'; lo.innerHTML = '<svg class="ap-ico" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg> Log out'; }
    var top = document.querySelector('#adminPanel .admin-top-actions');
    if (top && !$('apSearchBtn')) {
      var b = document.createElement('button'); b.className = 'btn b2'; b.id = 'apSearchBtn'; b.type = 'button';
      b.innerHTML = '<span style="display:inline-flex;gap:8px;align-items:center">' + ic('search') + '<span>Search…</span></span><kbd class="ap-kbd">Ctrl K</kbd>';
      b.onclick = function () { openPalette(); }; top.insertBefore(b, top.firstChild);
    }
    var ub = $('adminUser'); if (ub && !ub.getAttribute('data-ap')) { ub.setAttribute('data-ap', '1'); }
  }

  /* ---------- dashboard ---------- */
  function spark(vals, color) {
    if (!vals.length) return '';
    var mx = Math.max.apply(null, vals), mn = Math.min.apply(null, vals), w = 100, h = 40, pts = [];
    var rng = (mx - mn) || 1;
    vals.forEach(function (v, i) { pts.push((vals.length === 1 ? 50 : (i / (vals.length - 1)) * w).toFixed(1) + ',' + (h - 4 - ((v - mn) / rng) * (h - 10)).toFixed(1)); });
    var hs = 0, hk = color + pts.join(' '); for (var q = 0; q < hk.length; q++) hs = (hs * 31 + hk.charCodeAt(q)) | 0; var id = 'g' + (hs >>> 0).toString(36);
    return '<svg class="ap-spark" viewBox="0 0 100 40" preserveAspectRatio="none"><defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + color + '" stop-opacity=".35"/><stop offset="1" stop-color="' + color + '" stop-opacity="0"/></linearGradient></defs><polyline fill="url(#' + id + ')" stroke="none" points="0,40 ' + pts.join(' ') + ' 100,40"/><polyline fill="none" stroke="' + color + '" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" points="' + pts.join(' ') + '"/></svg>';
  }
  function dayKey(t) { var d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); }
  function series(items, getT, getV, days) {
    var out = [], base = dayKey(Date.now()) - (days - 1) * 86400000;
    for (var i = 0; i < days; i++) out.push({ t: base + i * 86400000, v: 0 });
    items.forEach(function (it) { var t = getT(it); if (!t) return; var k = dayKey(t), idx = Math.round((k - base) / 86400000); if (idx >= 0 && idx < days) out[idx].v += getV(it); });
    return out;
  }
  function parseT(t) { if (!t) return 0; if (typeof t === 'number') return t; var p = Date.parse(t); return isNaN(p) ? 0 : p; }
  function donut(parts) {
    var tot = parts.reduce(function (a, p) { return a + p.v; }, 0) || 1, r = 15.9155, off = 25, svg = '<svg viewBox="0 0 42 42"><circle cx="21" cy="21" r="' + r + '" fill="none" stroke="var(--ap-s3)" stroke-width="5"/>';
    parts.forEach(function (p) { var pct = p.v / tot * 100; if (pct > 0) svg += '<circle cx="21" cy="21" r="' + r + '" fill="none" stroke="' + p.c + '" stroke-width="5" stroke-dasharray="' + pct.toFixed(2) + ' ' + (100 - pct).toFixed(2) + '" stroke-dashoffset="' + off.toFixed(2) + '"/>'; off -= pct; });
    return svg + '<text x="21" y="23" text-anchor="middle" font-size="8" font-weight="800" fill="var(--ap-ink)">' + tot + '</text></svg>';
  }
  /* write only when the markup really changed, and never replay the fade-in on refreshes (stops the dashboard from flickering every 15 s) */
  function ncSet(el) {
    return {
      set innerHTML(h) {
        if (el.__h === h && el.__len === el.innerHTML.length) return;
        el.innerHTML = h; el.__h = h; el.__len = el.innerHTML.length;
        if (el.__seen) el.classList.add('ap-still'); else el.__seen = 1;
      }
    };
  }
  function renderDash() {
    var sec = document.querySelector('[data-section="stats"]'); if (!sec) return;
    var root = $('apDash');
    if (!root) {
      sec.innerHTML = '<div class="ap-dash" id="apDash"></div><div id="ncDash" style="display:none"><table><tbody id="ncRecentBody"></tbody><tbody id="ncQueueBody"></tbody></table></div>';
      root = $('apDash');
    }
    if (!S.loaded) { root.innerHTML = '<div class="ap-kpis">' + [1, 2, 3, 4].map(function () { return '<div class="ap-card ap-kpi"><div class="ap-skel" style="width:40%"></div><div class="ap-skel" style="height:28px;margin-top:14px;width:70%"></div></div>'; }).join('') + '</div>'; return; }
    var st = S.stats || {}, us = S.users;
    var totalBal = st.totalBalance != null ? st.totalBalance : us.reduce(function (a, u) { return a + (u.balance || 0); }, 0);
    var pv = pendingVers(), pw = pendingWds(), pd = S.deps, ur = unreadTotal();
    var sign = series(us, function (u) { return parseT(u.createdAt); }, function () { return 1; }, 14);
    var tx14 = series(S.txs, function (t) { return parseT(t.ts || t.createdAt || t.date); }, function () { return 1; }, 14);
    var today = new Date().getHours(), greet = today < 5 ? 'Good night' : today < 12 ? 'Good morning' : today < 18 ? 'Good afternoon' : 'Good evening';
    var sumToday = sign[13].v, sumYest = sign[12].v;
    var banking = us.filter(function (u) { return u.accountType === 'banking'; }).length, exch = us.filter(function (u) { return u.accountType === 'exchange'; }).length, none = us.length - banking - exch;
    var kv = { approved: 0, pending: 0, rejected: 0, none: 0 }; us.forEach(function (u) { kv[kyc(u)]++; });
    var top = us.slice().sort(function (a, b) { return (b.balance || 0) - (a.balance || 0); }).slice(0, 5), mx = (top[0] && top[0].balance) || 1;
    var oldKyc = pv.filter(function (v) { return v.submittedAt && Date.now() - parseT(v.submittedAt) > 86400000; });
    var maxSign = Math.max.apply(null, sign.map(function (x) { return x.v; }).concat([1]));

    var feed = [];
    S.vers.forEach(function (v) { if (v.submittedAt) feed.push({ t: parseT(v.submittedAt), ic: 'shield', c: '#fbbf24', tint: 'rgba(245,158,11,.14)', h: 'KYC submitted', s: (v.name || v.email) + ' · ' + (v.docType || 'document'), go: 'verifications' }); if (v.reviewedAt) feed.push({ t: parseT(v.reviewedAt), ic: v.status === 'approved' ? 'check' : 'x', c: v.status === 'approved' ? '#34d399' : '#f87171', tint: v.status === 'approved' ? 'rgba(16,185,129,.14)' : 'rgba(239,68,68,.14)', h: 'KYC ' + v.status, s: v.name || v.email, go: 'verifications' }); });
    S.deps.forEach(function (d) { feed.push({ t: parseT(d.createdAt || d.time || d.ts), ic: 'inn', c: '#47dcff', tint: 'rgba(71,220,255,.14)', h: 'Deposit pending', s: (d.userName || d.email || '') + ' · ' + (d.amount || '') + ' ' + (d.coin || d.currency || ''), go: 'deposits' }); });
    S.wds.forEach(function (w) { feed.push({ t: parseT(w.createdAt), ic: 'out', c: w.status === 'pending' ? '#fbbf24' : '#a78bfa', tint: 'rgba(139,92,246,.14)', h: 'Withdrawal ' + (w.status || ''), s: w.userName + ' · ' + usd(w.amount), go: 'withdrawals' }); });
    us.forEach(function (u) { if (u.createdAt) feed.push({ t: parseT(u.createdAt), ic: 'user', c: '#a78bfa', tint: 'rgba(139,92,246,.14)', h: 'New client', s: (u.name || u.email), email: u.email }); });
    feed.sort(function (a, b) { return b.t - a.t; }); feed = feed.slice(0, 12);

    ncSet(root).innerHTML =
      '<div class="ap-greet ap-fade"><div><h2>' + greet + ', admin</h2><p>' + (pv.length + pw.length + pd.length + ur ? 'You have <b style="color:var(--ap-warn)">' + (pv.length + pw.length + pd.length + ur) + '</b> items that need attention.' : 'Everything is under control. Nothing is waiting.') + '</p></div>' +
      '<div style="display:flex;gap:8px"><button class="ap-btn" id="apExport">' + ic('dl') + ' Export clients</button><button class="ap-btn pri" id="apRefreshDash">' + ic('refresh') + ' Refresh</button></div></div>' +
      (oldKyc.length ? '<div class="ap-alert">' + ic('alert', 'lg') + '<span><b>' + oldKyc.length + ' KYC review' + (oldKyc.length > 1 ? 's are' : ' is') + ' waiting more than 24 hours.</b> Fast verification keeps new clients active.</span><button class="ap-btn sm" data-go="verifications">Review now</button></div>' : '') +
      '<div class="ap-kpis ap-fade">' +
      kpi('users', 'Clients', num(st.totalClients != null ? st.totalClients : us.length), '<b>+' + sumToday + '</b> today · +' + sumYest + ' yesterday', spark(sign.map(function (x) { return x.v; }), '#47dcff'), '#47dcff', 'rgba(71,220,255,.14)') +
      kpi('wallet', 'Total balance', usdC(totalBal), 'across ' + us.length + ' accounts', spark(us.map(function (u) { return u.balance || 0; }).sort(function (a, b) { return a - b; }), '#10b981'), '#34d399', 'rgba(16,185,129,.14)') +
      kpi('inn', 'Real deposits', usdC(st.realDeposits || 0), 'money actually received from clients', spark([0, st.realDeposits || 0].sort(function (a, b) { return a - b; }), '#34d399'), '#34d399', 'rgba(16,185,129,.14)') +
      kpi('wallet', 'Admin credits', usdC(st.adminCredits || 0), 'added from the admin panel (not real money)', spark([0, st.adminCredits || 0], '#fbbf24'), '#fbbf24', 'rgba(245,158,11,.14)') +
      kpi('inn', 'Total deposits', usdC(st.totalDeposits || 0), '<b>+' + usdC(st.depositsToday || 0) + '</b> today · +' + usdC(st.depositsYesterday || 0) + ' yesterday', spark([st.depositsYesterday || 0, st.depositsToday || 0, st.totalDeposits ? st.totalDeposits / Math.max(1, us.length) : 0].sort(function (a, b) { return a - b; }), '#f59e0b'), '#fbbf24', 'rgba(245,158,11,.14)') +
      kpi('pulse', 'Transactions', num(st.totalTx != null ? st.totalTx : S.txs.length), 'last 14 days: <b>' + tx14.reduce(function (a, x) { return a + x.v; }, 0) + '</b>', spark(tx14.map(function (x) { return x.v; }), '#a78bfa'), '#a78bfa', 'rgba(139,92,246,.14)') +
      '</div>' +
      '<div class="ap-card ap-fade"><div class="ap-card-h"><div><h3>Action center</h3><small>Everything that needs a decision</small></div></div><div class="ap-actions">' +
      act('shield', 'KYC reviews', pv.length, 'verifications', '#fbbf24', 'rgba(245,158,11,.14)') +
      act('out', 'Withdrawals', pw.length, 'withdrawals', '#f87171', 'rgba(239,68,68,.14)') +
      act('inn', 'Pending deposits', pd.length, 'deposits', '#47dcff', 'rgba(71,220,255,.14)') +
      act('chat', 'Unread chats', ur, 'chats', '#a78bfa', 'rgba(139,92,246,.14)') +
      '</div></div>' +
      '<div class="ap-grid2 ap-fade">' +
      '<div class="ap-card"><div class="ap-card-h"><div><h3>New clients</h3><small>Last 14 days</small></div><span class="ap-pill vio">' + sign.reduce(function (a, x) { return a + x.v; }, 0) + ' total</span></div><div class="ap-bars">' +
      sign.map(function (x, i) { var d = new Date(x.t); return '<div class="ap-bar" title="' + d.toLocaleDateString('en-GB') + ': ' + x.v + '"><b>' + (x.v || '') + '</b><i class="' + (x.v ? '' : 'z') + '" style="height:' + (x.v ? Math.max(8, x.v / maxSign * 100) : 3) + '%"></i><em>' + (i % 2 === 0 || sign.length < 8 ? d.getDate() : '') + '</em></div>'; }).join('') + '</div></div>' +
      '<div class="ap-card"><div class="ap-card-h"><div><h3>Account types</h3><small>Banking vs exchange</small></div></div><div class="ap-donut">' + donut([{ v: banking, c: '#8b5cf6' }, { v: exch, c: '#47dcff' }, { v: none, c: '#475569' }]) +
      '<div class="ap-legend"><div><i style="background:#8b5cf6"></i>Banking<b>' + banking + '</b></div><div><i style="background:#47dcff"></i>Exchange<b>' + exch + '</b></div><div><i style="background:#475569"></i>Not assigned<b>' + none + '</b></div></div></div></div>' +
      '</div>' +
      '<div class="ap-grid3 ap-fade">' +
      '<div class="ap-card"><div class="ap-card-h"><div><h3>Top balances</h3><small>Largest accounts</small></div></div><div class="ap-hbar" style="padding-top:16px">' +
      (top.length ? top.map(function (u) { return '<div class="r" style="cursor:pointer" data-open="' + esc(u.email) + '"><span class="n">' + esc(u.name || u.email) + '</span><span class="t"><i style="width:' + Math.max(3, (u.balance || 0) / mx * 100) + '%"></i></span><b>' + usdC(u.balance) + '</b></div>'; }).join('') : '<div class="ap-mute">No data</div>') + '</div></div>' +
      '<div class="ap-card"><div class="ap-card-h"><div><h3>KYC funnel</h3><small>Verification status</small></div></div><div class="ap-donut">' + donut([{ v: kv.approved, c: '#10b981' }, { v: kv.pending, c: '#f59e0b' }, { v: kv.rejected, c: '#ef4444' }, { v: kv.none, c: '#475569' }]) +
      '<div class="ap-legend"><div><i style="background:#10b981"></i>Verified<b>' + kv.approved + '</b></div><div><i style="background:#f59e0b"></i>Pending<b>' + kv.pending + '</b></div><div><i style="background:#ef4444"></i>Rejected<b>' + kv.rejected + '</b></div><div><i style="background:#475569"></i>Not started<b>' + kv.none + '</b></div></div></div></div>' +
      '<div class="ap-card"><div class="ap-card-h"><div><h3>Recent activity</h3><small>Live from your data</small></div></div>' +
      (feed.length ? '<ul class="ap-feed">' + feed.map(function (f) { return '<li ' + (f.go ? 'data-go="' + f.go + '"' : 'data-open="' + esc(f.email) + '"') + '><i style="--c:' + f.c + ';--tint:' + f.tint + '">' + ic(f.ic) + '</i><div style="min-width:0"><b>' + esc(f.h) + '</b><span>' + esc(f.s) + '</span></div><time>' + ago(f.t) + '</time></li>'; }).join('') + '</ul>' : '<div class="ap-empty">' + ic('pulse') + 'No activity yet</div>') + '</div>' +
      '</div>';
  }
  function kpi(i, l, v, d, sp, c, t) { return '<div class="ap-card ap-kpi"><div class="l"><i style="--c:' + c + ';--tint:' + t + '">' + ic(i) + '</i>' + l + '</div><div class="v">' + v + '</div><div class="d">' + d + '</div>' + sp + '</div>'; }
  function act(i, l, n, go, c, t) { return '<button class="ap-act ' + (n ? 'hot' : '') + '" data-go="' + go + '"><i style="--c:' + c + ';--tint:' + t + '">' + ic(i, 'lg') + '</i><div><b>' + n + '</b><span>' + l + '</span></div></button>'; }

  /* ---------- clients table ---------- */
  function filtered() {
    var q = S.q.toLowerCase().trim(), f = S.filter;
    var list = S.users.filter(function (u) {
      if (q && (String(u.name || '') + ' ' + u.email + ' ' + (u.iban || '') + ' ' + addrs(u).map(function (x) { return x[1]; }).join(' ')).toLowerCase().indexOf(q) < 0) return false;
      if (f === 'banking' || f === 'exchange') return u.accountType === f;
      if (f === 'verified') return kyc(u) === 'approved';
      if (f === 'unverified') return kyc(u) !== 'approved';
      if (f === 'unread') return (u.unreadChat || 0) > 0;
      if (f === 'zero') return !(u.balance > 0);
      return true;
    });
    var k = S.sort.k, d = S.sort.d;
    list.sort(function (a, b) {
      var x = k === 'createdAt' ? parseT(a.createdAt) : k === 'name' ? String(a.name || a.email).toLowerCase() : k === 'kyc' ? kyc(a) : (a[k] || 0), y = k === 'createdAt' ? parseT(b.createdAt) : k === 'name' ? String(b.name || b.email).toLowerCase() : k === 'kyc' ? kyc(b) : (b[k] || 0);
      return (x > y ? 1 : x < y ? -1 : 0) * d;
    });
    return list;
  }
  function renderClients() {
    var box = $('adminClientsList'); if (!box) return;
    var sec = box.parentNode, bar = sec.querySelector('#apClientBar');
    if (!bar) {
      Array.prototype.slice.call(sec.children).forEach(function (c) { if (c !== box) c.style.display = 'none'; });
      bar = document.createElement('div'); bar.id = 'apClientBar';
      bar.innerHTML = '<div class="ap-toolbar"><div class="ap-search">' + ic('search') + '<input id="apCs" placeholder="Search by name, e-mail, IBAN or address…" autocomplete="off"></div>' +
        '<button class="ap-btn" id="apCsv">' + ic('dl') + ' Export CSV</button><button class="ap-btn" id="apCr">' + ic('refresh') + ' Refresh</button></div><div class="ap-chips" id="apChips"></div>';
      sec.insertBefore(bar, box);
      $('apCs').addEventListener('input', function () { S.q = this.value; S.page = 1; renderClients(); var el = $('apCs'); });
      $('apCsv').onclick = exportCsv; $('apCr').onclick = function () { load(true); };
    }
    if (!S.loaded) { box.innerHTML = '<div class="ap-card" style="padding:20px">' + [1, 2, 3, 4, 5].map(function () { return '<div class="ap-skel" style="margin:16px 0"></div>'; }).join('') + '</div>'; return; }
    var all = S.users, cnt = { all: all.length, banking: 0, exchange: 0, verified: 0, unverified: 0, unread: 0, zero: 0 };
    all.forEach(function (u) { if (u.accountType === 'banking') cnt.banking++; if (u.accountType === 'exchange') cnt.exchange++; if (kyc(u) === 'approved') cnt.verified++; else cnt.unverified++; if (u.unreadChat) cnt.unread++; if (!(u.balance > 0)) cnt.zero++; });
    var defs = [['all', 'All'], ['banking', 'Banking'], ['exchange', 'Exchange'], ['verified', 'Verified'], ['unverified', 'Unverified'], ['unread', 'Unread chat'], ['zero', 'Zero balance']];
    $('apChips').innerHTML = defs.map(function (d) { return '<button class="ap-chip ' + (S.filter === d[0] ? 'on' : '') + '" data-f="' + d[0] + '">' + d[1] + ' <em>' + cnt[d[0]] + '</em></button>'; }).join('');
    var list = filtered(), pages = Math.max(1, Math.ceil(list.length / PAGE)); if (S.page > pages) S.page = pages;
    var rows = list.slice((S.page - 1) * PAGE, S.page * PAGE);
    function th(k, l, cls) { var on = S.sort.k === k; return '<th class="s ' + (cls || '') + '" data-s="' + k + '">' + l + (on ? '<span class="arr">' + (S.sort.d > 0 ? '↑' : '↓') + '</span>' : '') + '</th>'; }
    box.className = '';
    ncSet(box).innerHTML = '<div class="ap-card"><div class="ap-tw"><table class="ap-t"><thead><tr>' + th('name', 'Client') + th('accountType', 'Account', 'hide-m') + th('kyc', 'KYC', 'hide-m') + th('balance', 'Balance', 'num') + th('realDeposits', 'Real deposits', 'num hide-m') + th('adminCredits', 'Admin credits', 'num hide-m') + th('btc', 'Crypto', 'num hide-m') + th('txCount', 'Tx', 'num hide-m') + th('createdAt', 'Joined', 'hide-m') + '<th></th></tr></thead><tbody>' +
      (rows.length ? rows.map(function (u) {
        return '<tr class="row" data-open="' + esc(u.email) + '"><td><div class="who">' + av(u.name, u.email) + '<div><b>' + esc(u.name || '—') + (u.unreadChat ? '<span class="ap-unread" title="Unread messages">' + u.unreadChat + '</span>' : '') + '</b><small>' + esc(u.email) + '</small></div></div></td>' +
          '<td class="hide-m">' + typePill(u.accountType) + '</td><td class="hide-m">' + kycPill(kyc(u)) + '</td><td class="num"><b>' + usd(u.balance) + '</b></td>' +
          '<td class="num hide-m" style="color:#34d399">' + usd(u.realDeposits) + '</td><td class="num hide-m" style="color:#fbbf24">' + (u.adminCredits ? usd(u.adminCredits) : '<span class="ap-mute">—</span>') + '</td>' +
          '<td class="num hide-m ap-mute">' + crypto(u.btc) + ' BTC<br>' + crypto(u.eth) + ' ETH</td><td class="num hide-m">' + num(u.txCount) + '</td><td class="hide-m ap-mute">' + ago(u.createdAt) + '</td>' +
          '<td><div class="acts"><button class="ap-btn sm ic" data-act="add" data-e="' + esc(u.email) + '" title="Add balance">' + ic('wallet') + '</button><button class="ap-btn sm ic" data-act="view" data-e="' + esc(u.email) + '" title="View as client">' + ic('eye') + '</button><button class="ap-btn sm" data-open="' + esc(u.email) + '">Open</button></div></td></tr>';
      }).join('') : '<tr><td colspan="10"><div class="ap-empty">' + ic('users') + (S.users.length ? 'No clients match your filters' : 'No clients yet') + '</div></td></tr>') +
      '</tbody></table></div><div class="ap-foot"><span>' + list.length + ' of ' + all.length + ' clients</span><span style="display:flex;gap:8px;align-items:center"><button class="ap-btn sm" data-p="-1" ' + (S.page <= 1 ? 'disabled' : '') + '>Prev</button>Page ' + S.page + ' / ' + pages + '<button class="ap-btn sm" data-p="1" ' + (S.page >= pages ? 'disabled' : '') + '>Next</button></span></div></div>';
    var cnE = $('navClientsCount'); if (cnE) cnE.textContent = all.length;
  }
  function exportCsv() {
    var rows = [['Name', 'Email', 'Account', 'KYC', 'Balance USD', 'BTC', 'ETH', 'IBAN', 'Deposit address', 'Transactions', 'Joined']];
    filtered().forEach(function (u) { rows.push([u.name, u.email, u.accountType || '', kyc(u), u.balance || 0, u.btc || 0, u.eth || 0, u.iban || '', addrs(u).map(function (x) { return (x[0] ? x[0] + ':' : '') + x[1]; }).join(' | '), u.txCount || 0, u.createdAt ? new Date(parseT(u.createdAt)).toISOString() : '']); });
    var csv = rows.map(function (r) { return r.map(function (c) { c = String(c == null ? '' : c); if (/^[=+\-@]/.test(c)) c = "'" + c; return '"' + c.replace(/"/g, '""') + '"'; }).join(','); }).join('\n');
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv' })); a.download = 'nordiccrypto-clients-' + new Date().toISOString().slice(0, 10) + '.csv'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    toast('Exported ' + (rows.length - 1) + ' clients');
  }

  /* ---------- drawer ---------- */
  var drawer, overlay, drEmail = null;
  function ensureDrawer() {
    if (drawer) return;
    overlay = document.createElement('div'); overlay.className = 'ap-ov'; overlay.onclick = closeDrawer;
    drawer = document.createElement('aside'); drawer.className = 'ap-dr'; drawer.setAttribute('role', 'dialog'); drawer.setAttribute('aria-label', 'Client details');
    document.body.appendChild(overlay); document.body.appendChild(drawer);
  }
  function closeDrawer() { if (!drawer) return; drawer.classList.remove('on'); overlay.classList.remove('on'); drEmail = null; }
  function copyBtn(v) { return v ? '<button class="ap-cp" data-copy="' + esc(v) + '" title="Copy">' + ic('copy') + '</button>' : ''; }
  function openClient(email) {
    var u = userBy(email); if (!u) { toast('Client not found', true); return; }
    ensureDrawer(); drEmail = u.email;
    var v = S.verBy && S.verBy[String(u.email).toLowerCase()], ks = kyc(u), e = u.email, n = u.name || u.email;
    var wds = S.wds.filter(function (w) { return w.userEmail === e; }).slice(0, 4), txs = S.txs.filter(function (t) { return t.userEmail === e; }).slice(0, 5);
    drawer.innerHTML =
      '<div class="ap-dr-h">' + av(n, e, 'lg') + '<div style="min-width:0;flex:1"><h2>' + esc(n) + '</h2><p>' + esc(e) + '</p><div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">' + typePill(u.accountType) + kycPill(ks) + (u.card ? '<span class="ap-pill ' + (u.card.status === 'Frozen' ? 'bad' : 'ok') + '">Card ' + esc(u.card.status) + '</span>' : '') + '</div></div><button class="ap-btn ic" id="apDrX" aria-label="Close">' + ic('x') + '</button></div>' +
      '<div class="ap-dr-b">' +
      '<div class="ap-stats"><div class="ap-stat big"><small>Balance</small><b>' + usd(u.balance) + '</b></div><div class="ap-stat"><small>BTC</small><b>' + crypto(u.btc) + '</b></div><div class="ap-stat"><small>ETH</small><b>' + crypto(u.eth) + '</b></div><div class="ap-stat"><small>Transactions</small><b>' + num(u.txCount) + '</b></div></div>' +
      '<div class="ap-sec"><h4>Balance breakdown</h4><div class="ap-kv">' +
      '<div><span>Real deposits (money received)</span><b style="color:#34d399">' + usd(u.realDeposits) + '</b></div>' +
      '<div><span>Added by admin (bonus / manual)</span><b style="color:#fbbf24">' + usd(u.adminCredits) + '</b></div>' +
      '<div><span>Real balance (balance − admin credits)</span><b>' + usd((u.balance || 0) - (u.adminCredits || 0)) + '</b></div></div></div>' +
      '<div class="ap-sec"><h4>Quick actions</h4><div class="ap-agrid">' +
      '<button class="ap-btn pri" data-act="add" data-e="' + esc(e) + '">' + ic('wallet') + ' Add balance</button>' +
      '<button class="ap-btn" data-act="view" data-e="' + esc(e) + '">' + ic('eye') + ' View as client</button>' +
      '<button class="ap-btn" data-act="addr" data-e="' + esc(e) + '">' + ic('coin') + ' Deposit address</button>' +
      '<button class="ap-btn" data-act="iban" data-e="' + esc(e) + '">' + ic('bank') + ' Issue IBAN</button>' +
      '<button class="ap-btn" data-act="pwd" data-e="' + esc(e) + '">' + ic('key') + ' Reset password</button>' +
      '<button class="ap-btn" data-act="msg" data-e="' + esc(e) + '">' + ic('send') + ' Send notification</button>' +
      '<button class="ap-btn bad full" data-act="del" data-e="' + esc(e) + '">' + ic('trash') + ' Delete client</button></div></div>' +
      '<div class="ap-sec"><h4>Account</h4><div class="ap-kv">' +
      '<div><span>Joined</span><b>' + dt(parseT(u.createdAt)) + '</b></div>' +
      '<div><span>Currency</span><b>' + esc(u.currency || 'USD') + '</b></div>' +
      '<div><span>IBAN</span><b class="ap-mono">' + (u.iban ? esc(u.iban) + copyBtn(u.iban) : '<i class="ap-mute">not issued</i>') + '</b></div>' +
      '<div><span>Deposit address' + (addrs(u).length > 1 ? 'es' : '') + '</span><b class="ap-mono" style="font-size:12px;flex-direction:column;align-items:flex-end;gap:4px">' + (addrs(u).length ? addrs(u).map(function (x) { return '<span>' + (x[0] ? '<em style="font-style:normal;color:var(--ap-mute)">' + esc(x[0]) + '</em> ' : '') + esc(x[1].slice(0, 14)) + '…' + copyBtn(x[1]) + '</span>'; }).join('') : '<i class="ap-mute">not set</i>') + '</b></div>' +
      '<div><span>Card</span><b>' + (u.card ? esc(u.card.type) + ' •••• ' + esc(String(u.card.num).slice(-4)) : '<i class="ap-mute">none</i>') + '</b></div>' +
      '<div><span>Last transaction</span><b>' + esc(u.lastTx || '—') + '</b></div></div></div>' +
      '<div class="ap-sec"><h4>Verification (KYC)</h4><div class="ap-kv"><div><span>Status</span><b>' + kycPill(ks) + '</b></div>' +
      (v ? '<div><span>Document</span><b>' + esc(v.docType || '—') + '</b></div><div><span>Submitted</span><b>' + dt(parseT(v.submittedAt)) + '</b></div>' + (v.reason ? '<div><span>Reason</span><b>' + esc(v.reason) + '</b></div>' : '') : '') + '</div>' +
      (v ? '<div class="ap-agrid" style="margin-top:8px"><button class="ap-btn" data-act="docs" data-e="' + esc(e) + '">' + ic('eye') + ' View documents</button>' + (ks !== 'approved' ? '<button class="ap-btn pri" data-act="approve" data-e="' + esc(e) + '">' + ic('check') + ' Approve</button>' : '') + (ks !== 'rejected' ? '<button class="ap-btn bad" data-act="reject" data-e="' + esc(e) + '">' + ic('x') + ' Reject</button>' : '') + '</div>' : '') + '</div>' +
      (wds.length ? '<div class="ap-sec"><h4>Withdrawals</h4><div class="ap-kv">' + wds.map(function (w) { return '<div><span>' + ago(w.createdAt) + ' · ' + esc(w.method || '') + '</span><b>' + usd(w.amount) + ' <span class="ap-pill ' + (w.status === 'approved' ? 'ok' : w.status === 'rejected' ? 'bad' : 'warn') + '">' + esc(w.status) + '</span></b></div>'; }).join('') + '</div></div>' : '') +
      (txs.length ? '<div class="ap-sec"><h4>Latest transactions</h4><div class="ap-kv">' + txs.map(function (t) { return '<div><span>' + esc(t.title || t.type || t.name || 'Transaction') + '</span><b>' + (t.amount != null ? esc(typeof t.amount === 'number' ? usd(t.amount) : t.amount) : '') + '</b></div>'; }).join('') + '</div></div>' : '') +
      '</div>';
    requestAnimationFrame(function () { overlay.classList.add('on'); drawer.classList.add('on'); });
  }

  /* ---------- action dispatcher ---------- */
  function doAct(a, e) {
    var u = userBy(e) || { email: e, name: e }, n = u.name || e;
    if (a === 'add') return window.adminAddBalance(e, n);
    if (a === 'view') { closeDrawer(); return window.adminViewClient(e); }
    if (a === 'addr') return window.adminSetCryptoAddress(e, n);
    if (a === 'iban') return window.adminSetIban(e);
    if (a === 'pwd') return window.adminResetPassword(e, n);
    if (a === 'msg') return window.adminSendMessage();
    if (a === 'docs') return window.viewKycDocs(e);
    if (a === 'approve') return window.approveKyc(e);
    if (a === 'reject') return window.rejectKyc(e);
    if (a === 'del') return window.adminDeleteUser(e, n);
  }

  /* ---------- confirm / reject modals ---------- */
  function modal(html) { var m = document.createElement('div'); m.className = 'ap-mo'; m.innerHTML = '<div class="ap-mo-b">' + html + '</div>'; m.addEventListener('mousedown', function (ev) { if (ev.target === m) m.remove(); }); document.body.appendChild(m); return m; }
  function confirmBox(title, text, okLabel, danger) {
    return new Promise(function (res) {
      var m = modal('<h3>' + esc(title) + '</h3><p>' + esc(text) + '</p><div class="ap-mo-f"><button class="ap-btn" data-x="0">Cancel</button><button class="ap-btn ' + (danger ? 'bad' : 'pri') + '" data-x="1">' + esc(okLabel) + '</button></div>');
      m.addEventListener('click', function (ev) { var b = ev.target.closest('[data-x]'); if (!b) return; m.remove(); res(b.getAttribute('data-x') === '1'); });
      m.addEventListener('mousedown', function (ev) { if (ev.target === m) res(false); });
    });
  }
  window.rejectKyc = function (email) {
    var reasons = ['Documents are unclear. Please upload higher quality photos.', 'Your documents have expired. Please provide valid documents.', 'The selfie does not match the document photo.', 'We could not confirm your address. Please provide proof of address.'];
    var m = modal('<h3>Reject verification</h3><p>' + esc(email) + ' will see the reason and can upload new documents.</p><div class="ap-reasons">' +
      reasons.map(function (r, i) { return '<label><input type="radio" name="apR" value="' + i + '"' + (i === 0 ? ' checked' : '') + '> ' + esc(r) + '</label>'; }).join('') +
      '<label><input type="radio" name="apR" value="x"> Other…</label></div><textarea id="apRT" placeholder="Write your own reason" style="display:none"></textarea>' +
      '<div class="ap-mo-f"><button class="ap-btn" data-x="0">Cancel</button><button class="ap-btn bad" data-x="1">Reject</button></div>');
    m.addEventListener('change', function () { var o = m.querySelector('input[value="x"]').checked; m.querySelector('#apRT').style.display = o ? 'block' : 'none'; });
    m.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-x]'); if (!b) return; if (b.getAttribute('data-x') === '0') { m.remove(); return; }
      var sel = m.querySelector('input[name=apR]:checked').value, reason = sel === 'x' ? m.querySelector('#apRT').value.trim() : reasons[+sel];
      if (!reason) { m.querySelector('#apRT').focus(); return; }
      b.disabled = true;
      post('rejectVerification', { email: email, reason: reason }).then(function (d) { m.remove(); if (d.ok) { toast('Rejected: ' + email, true); refreshAfter(); } else toast(d.error || 'Failed', true); });
    });
  };
  var _del = window.adminDeleteUser;
  window.adminDeleteUser = function (email, name) {
    confirmBox('Delete ' + (name || email) + '?', 'The account moves to “Deleted” and can be restored later.', 'Delete', true).then(function (ok) {
      if (!ok) return; var oc = window.confirm; window.confirm = function () { return true; }; try { _del(email, name); } finally { window.confirm = oc; }
      closeDrawer(); setTimeout(function () { load(true); }, 700);
    });
  };
  function refreshAfter() { closeDrawer(); setTimeout(function () { load(true); }, 400); }

  /* ---------- verifications ---------- */
  window.loadAdminVerifications = function (opts) {
    return load(!!(opts && opts.force)).then(function () { renderVerifs(); });
  };
  function renderVerifs() {
    var box = $('adminVerifsList'); if (!box) return;
    var sec = box.parentNode, bar = sec.querySelector('#apVBar');
    if (!bar) {
      Array.prototype.slice.call(sec.children).forEach(function (c) { if (c !== box) c.style.display = 'none'; });
      bar = document.createElement('div'); bar.id = 'apVBar'; sec.insertBefore(bar, box);
    }
    var cnt = { pending: 0, approved: 0, rejected: 0, all: S.vers.length }; S.vers.forEach(function (v) { cnt[v.status] = (cnt[v.status] || 0) + 1; });
    bar.innerHTML = '<div class="ap-toolbar"><div class="ap-chips" style="margin:0;flex:1">' + [['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected'], ['all', 'All']].map(function (d) { return '<button class="ap-chip ' + (S.vFilter === d[0] ? 'on' : '') + '" data-vf="' + d[0] + '">' + d[1] + ' <em>' + (cnt[d[0]] || 0) + '</em></button>'; }).join('') + '</div><button class="ap-btn" id="apVr">' + ic('refresh') + ' Refresh</button></div>';
    $('apVr').onclick = function () { load(true); };
    var nb = $('navVerifCount'); if (nb) { var p = cnt.pending || 0; nb.textContent = p; nb.style.display = p ? 'inline-block' : 'none'; }
    var list = S.vers.filter(function (v) { return S.vFilter === 'all' || v.status === S.vFilter; }).sort(function (a, b) { return parseT(b.submittedAt) - parseT(a.submittedAt); });
    if (!S.loaded) { box.innerHTML = '<div class="ap-card" style="padding:20px"><div class="ap-skel"></div></div>'; return; }
    if (!list.length) { box.innerHTML = '<div class="ap-card"><div class="ap-empty">' + ic('shield') + (S.vFilter === 'pending' ? 'No verifications are waiting. Nice work.' : 'Nothing here yet') + '</div></div>'; return; }
    ncSet(box).innerHTML = '<div class="ap-vgrid">' + list.map(function (v) {
      var pi = v.personalInfo || {}, addr = [pi.street, pi.city, pi.zip, pi.country].filter(Boolean).join(', '), old = v.status === 'pending' && v.submittedAt && Date.now() - parseT(v.submittedAt) > 86400000;
      return '<div class="ap-card ap-vc ap-fade"><div class="ap-vc-top">' + av(v.name, v.email) + '<div class="who"><b>' + esc(v.name || v.email) + '</b><small>' + esc(v.email) + '</small></div>' + kycPill(v.status) + '</div>' +
        '<div class="ap-meta"><span>' + ic('card') + esc(v.docType || 'No document') + '</span><span>' + ic('pulse') + dt(parseT(v.submittedAt)) + '</span>' + (old ? '<span style="color:#fbbf24">' + ic('alert') + 'Waiting > 24h</span>' : '') + (addr ? '<span>' + ic('user') + esc(addr) + '</span>' : '') + '</div>' +
        (v.status === 'rejected' && v.reason ? '<div class="ap-reason">' + esc(v.reason) + '</div>' : '') +
        '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="ap-btn" data-act="docs" data-e="' + esc(v.email) + '">' + ic('eye') + ' View docs</button>' + (v.status !== 'approved' ? '<button class="ap-btn pri" data-act="approve" data-e="' + esc(v.email) + '">' + ic('check') + ' Approve</button>' : '') + (v.status !== 'rejected' ? '<button class="ap-btn bad" data-act="reject" data-e="' + esc(v.email) + '">' + ic('x') + ' Reject</button>' : '') + '<button class="ap-btn" data-open="' + esc(v.email) + '" style="margin-left:auto">Profile</button></div></div>';
    }).join('') + '</div>';
  }

  /* ---------- clients override ---------- */
  window.loadAdminUsers = function () { return load(false).then(function () { renderClients(); }); };
  window.filterClients = function (q) { S.q = q || ''; S.page = 1; var i = $('apCs'); if (i && i.value !== S.q) i.value = S.q; renderClients(); };
  window.refreshDashboard = function () { load(false).then(renderAll); };
  window.openClient360 = openClient;

  /* ---------- palette ---------- */
  var pal, palSel = 0, palItems = [];
  function openPalette() {
    if (!pal) {
      pal = document.createElement('div'); pal.className = 'ap-pal';
      pal.innerHTML = '<div class="ap-pal-box"><div class="ap-pal-in">' + ic('search', 'lg') + '<input id="apPi" placeholder="Search clients, jump to a section, run an action…" autocomplete="off"><span class="ap-kbd">Esc</span></div><div class="ap-pal-l" id="apPl"></div><div class="ap-pal-f"><span><span class="ap-kbd">↑↓</span> navigate</span><span><span class="ap-kbd">Enter</span> open</span></div></div>';
      document.body.appendChild(pal);
      pal.addEventListener('mousedown', function (e) { if (e.target === pal) closePalette(); });
      $('apPi').addEventListener('input', function () { palSel = 0; palRender(this.value); });
      $('apPl').addEventListener('click', function (e) { var it = e.target.closest('[data-pi]'); if (it) palRun(+it.getAttribute('data-pi')); });
    }
    pal.classList.add('on'); var i = $('apPi'); i.value = ''; palSel = 0; palRender(''); setTimeout(function () { i.focus(); }, 20); load(false);
  }
  function closePalette() { if (pal) pal.classList.remove('on'); }
  function palRender(q) {
    q = q.toLowerCase().trim(); palItems = [];
    var nav = [['stats', 'Dashboard', 'dash'], ['clients', 'Clients', 'users'], ['verifications', 'Verifications', 'shield'], ['chats', 'Live chats', 'chat'], ['emailChanges', 'Email changes', 'mail'], ['withdrawals', 'Withdrawals', 'out'], ['deposits', 'Pending deposits', 'inn'], ['deleted', 'Deleted', 'trash'], ['system', 'System', 'cog']];
    var go = nav.filter(function (n) { return !q || n[1].toLowerCase().indexOf(q) > -1; }).map(function (n) { return { g: 'Go to', ic: n[2], t: n[1], run: function () { window.showAdminTab(n[0]); } }; });
    var cl = S.users.filter(function (u) { return q && (String(u.name || '') + ' ' + u.email).toLowerCase().indexOf(q) > -1; }).slice(0, 6).map(function (u) { return { g: 'Clients', ic: 'user', t: (u.name || u.email), s: u.email, run: function () { openClient(u.email); } }; });
    var ac = [{ g: 'Actions', ic: 'dl', t: 'Export clients to CSV', run: function () { window.showAdminTab('clients'); setTimeout(exportCsv, 200); } }, { g: 'Actions', ic: 'refresh', t: 'Refresh all data', run: function () { load(true); toast('Refreshing…'); } }].filter(function (a) { return !q || a.t.toLowerCase().indexOf(q) > -1; });
    palItems = cl.concat(go, ac);
    var h = '', last = '';
    palItems.forEach(function (it, i) { if (it.g !== last) { h += '<div class="ap-pal-g">' + it.g + '</div>'; last = it.g; } h += '<div class="ap-pal-i ' + (i === palSel ? 'on' : '') + '" data-pi="' + i + '">' + ic(it.ic, 'lg') + '<span>' + esc(it.t) + '</span>' + (it.s ? '<small>' + esc(it.s) + '</small>' : '') + '</div>'; });
    $('apPl').innerHTML = h || '<div class="ap-empty">' + ic('search') + 'No results</div>';
  }
  function palRun(i) { var it = palItems[i]; if (!it) return; closePalette(); it.run(); }

  /* ---------- events ---------- */
  document.addEventListener('click', function (e) {
    var t = e.target; if (!t.closest) return;
    var adm = $('adminPanel'); var inDr = t.closest('.ap-dr');
    if (!inDr && (!adm || !adm.contains(t))) return;
    var c = t.closest('[data-copy]'); if (c) { e.stopPropagation(); try { navigator.clipboard.writeText(c.getAttribute('data-copy')); toast('Copied'); } catch (x) { } return; }
    var a = t.closest('[data-act]'); if (a) { e.stopPropagation(); doAct(a.getAttribute('data-act'), a.getAttribute('data-e')); return; }
    if (t.closest('#apDrX')) { closeDrawer(); return; }
    var o = t.closest('[data-open]'); if (o) { openClient(o.getAttribute('data-open')); return; }
    var g = t.closest('[data-go]'); if (g) { window.showAdminTab(g.getAttribute('data-go')); return; }
    var f = t.closest('[data-f]'); if (f) { S.filter = f.getAttribute('data-f'); S.page = 1; renderClients(); return; }
    var s = t.closest('[data-s]'); if (s) { var k = s.getAttribute('data-s'); S.sort = S.sort.k === k ? { k: k, d: -S.sort.d } : { k: k, d: k === 'name' ? 1 : -1 }; renderClients(); return; }
    var p = t.closest('[data-p]'); if (p) { S.page += +p.getAttribute('data-p'); renderClients(); return; }
    var vf = t.closest('[data-vf]'); if (vf) { S.vFilter = vf.getAttribute('data-vf'); renderVerifs(); return; }
    if (t.closest('#apRefreshDash')) { load(true); return; }
    if (t.closest('#apExport')) { exportCsv(); return; }
  }, true);
  document.addEventListener('keydown', function (e) {
    var adm = $('adminPanel'); var on = adm && adm.classList.contains('on');
    if (on && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); pal && pal.classList.contains('on') ? closePalette() : openPalette(); return; }
    if (on && e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || '')) { e.preventDefault(); openPalette(); return; }
    if (e.key === 'Escape') { if (pal && pal.classList.contains('on')) closePalette(); else if (drEmail) closeDrawer(); return; }
    if (pal && pal.classList.contains('on')) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); palSel = (palSel + (e.key === 'ArrowDown' ? 1 : -1) + palItems.length) % Math.max(1, palItems.length); palRender($('apPi').value); var el = pal.querySelector('.ap-pal-i.on'); el && el.scrollIntoView({ block: 'nearest' }); }
      else if (e.key === 'Enter') { e.preventDefault(); palRun(palSel); }
    }
  });

  /* ---------- auto-refresh after any admin mutation ---------- */
  (function () {
    var of = window.fetch, t = null, MUT = /^(approve|reject|set|delete|restore|reset|update|add|send|issue|permanent|clear|freeze|credit|adjust|save|mark|change|remove|grant|revoke)/i;
    window.fetch = function (u) {
      var p = of.apply(this, arguments), m = typeof u === 'string' && u.indexOf(BASE) === 0 && /[?&]action=([A-Za-z]+)/.exec(u);
      if (m && MUT.test(m[1])) p.then(function () { S.ts = 0; clearTimeout(t); t = setTimeout(function () { var a = $('adminPanel'); if (a && a.classList.contains('on')) load(true); }, 500); }, function () { });
      return p;
    };
  })();

  /* ---------- bootstrap ---------- */
  function renderAll() { fixNav(); renderDash(); renderClients(); renderVerifs(); badges(); }
  function badges() {
    var w = $('navWdsCount'); if (w && S.loaded) { var n = pendingWds().length; w.textContent = n; w.style.display = n ? 'inline-block' : 'none'; }
    var d = $('navDepositsCount'); if (d && S.loaded) { d.textContent = S.deps.length; d.style.display = S.deps.length ? 'inline-block' : 'none'; }
    var c = $('navChatsCount'); if (c && S.loaded) { var u = unreadTotal(); c.textContent = u; c.style.display = u ? 'inline-block' : 'none'; }
  }
  function boot() {
    fixNav(); renderDash(); renderClients();
    var adm = $('adminPanel');
    if (adm && adm.classList.contains('on')) load(true);
    if (adm) new MutationObserver(function () { if (adm.classList.contains('on')) { fixNav(); if (!S.loaded) load(true); } else closeDrawer(); }).observe(adm, { attributes: true, attributeFilter: ['class'] });
    setInterval(function () { if (adm && adm.classList.contains('on') && !document.hidden && !document.querySelector('#adminBalanceMask.on,#adminMsgMask.on,#kycApproveModal,#kycDocsModal,#adminIbanModal,.ap-mo')) load(true); }, 15000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(boot, 50); }); else setTimeout(boot, 50);
})();
