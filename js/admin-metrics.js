/* admin-metrics.js v1 — admin "Metrics" tab (owner): growth, conversion funnel, activity, money totals, CSV export */
(function () {
  'use strict';
  if (window.__ncAdminMx) return; window.__ncAdminMx = 1;
  var S = { d: null, busy: false, err: '' };
  function $(s, r) { return (r || document).querySelector(s); }
  function esc(x) { return String(x == null ? '' : x).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function api(action, body) {
    var tok = (typeof getSessionToken === 'function') ? getSessionToken() : localStorage.getItem('session_token');
    var url = (typeof WORKER_LOGIN_URL !== 'undefined' ? WORKER_LOGIN_URL : '') + '?action=' + action;
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ token: tok }, body || {})) }).then(function (r) { return r.json(); });
  }
  function ago(ts) {
    if (!ts) return '—'; var s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
    if (s < 60) return s + 's ago'; if (s < 3600) return Math.floor(s / 60) + 'm ago'; if (s < 86400) return Math.floor(s / 3600) + 'h ago'; return Math.floor(s / 86400) + 'd ago';
  }
  function dt(ts) { try { return new Date(ts).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }
  function dev(ua) {
    ua = ua || ''; var b = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
    var o = /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : '';
    return b + (o ? ' · ' + o : '');
  }
  function flag(cc) { if (!cc || cc.length !== 2) return '🌐'; return String.fromCodePoint.apply(null, cc.toUpperCase().split('').map(function (c) { return 127397 + c.charCodeAt(0); })); }



  function usd(n) { n = Number(n) || 0; return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 }); }
  function pct(a, b) { return b ? Math.round(a / b * 1000) / 10 : 0; }
  function delta(a, b) { if (!b) return a ? '<span style="color:#34d399">new</span>' : ''; var p = Math.round((a - b) / b * 100); return '<span style="color:' + (p >= 0 ? '#34d399' : '#ff8a8a') + '">' + (p >= 0 ? '▲ ' : '▼ ') + Math.abs(p) + '% vs prev. 7d</span>'; }
  var CSS = '' +
    '.sx{color:#e8ecf4;font-family:inherit}.sx *{box-sizing:border-box}' +
    '.bk-kind{display:inline-block;padding:3px 9px;border-radius:99px;font-size:11px;font-weight:700}.bk-kind.auto{background:rgba(52,211,153,.15);color:#34d399}.bk-kind.manual{background:rgba(200,255,77,.15);color:#c8ff4d}.bk-kind.pre{background:rgba(255,193,7,.15);color:#ffc107}.bk-prog{height:8px;border-radius:99px;background:rgba(255,255,255,.08);overflow:hidden;margin:12px 0}.bk-prog i{display:block;height:100%;width:0;background:#c8ff4d;transition:width .2s}' +
    '.sx-top{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px;align-items:center}' +
    '.sx-in{flex:1;min-width:200px;padding:11px 14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:12px;color:#fff;font-size:14px;outline:none}' +
    '.sx-in:focus{border-color:#c8ff4d}' +
    '.sx-btn{padding:10px 14px;border-radius:11px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);color:#e8ecf4;font-weight:600;font-size:13px;cursor:pointer;white-space:nowrap}' +
    '.sx-btn:hover{background:rgba(255,255,255,.1)}.sx-btn.p{background:#c8ff4d;color:#0b0f08;border-color:#c8ff4d}.sx-btn.d{background:rgba(255,82,82,.14);border-color:rgba(255,82,82,.4);color:#ff8a8a}.sx-btn.s{padding:6px 10px;font-size:12px}' +
    '.sx-btn.on{border-color:#c8ff4d;color:#c8ff4d}' +
    '.sx-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:16px}' +
    '.sx-st{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:14px}.sx-st small{display:block;color:#8b95a5;font-size:11px;letter-spacing:.06em;text-transform:uppercase;margin-bottom:6px}.sx-st b{font-size:24px}' +
    '.sx-st.w b{color:#ff8a8a}.sx-st.g b{color:#c8ff4d}' +
    '.sx-card{background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:16px;margin-bottom:16px}' +
    '.sx-card h3{margin:0 0 12px;font-size:15px;display:flex;align-items:center;gap:8px;justify-content:space-between}' +
    '.sx-tb{width:100%;border-collapse:collapse;font-size:13px}.sx-tb th{text-align:left;color:#8b95a5;font-weight:600;font-size:11px;letter-spacing:.05em;text-transform:uppercase;padding:6px 8px;border-bottom:1px solid rgba(255,255,255,.08)}' +
    '.sx-tb td{padding:9px 8px;border-bottom:1px solid rgba(255,255,255,.05);vertical-align:middle}.sx-tb tr:hover td{background:rgba(255,255,255,.025)}' +
    '.sx-w{overflow-x:auto}.sx-ip{font-family:ui-monospace,Menlo,monospace;font-size:12.5px}' +
    '.sx-tag{display:inline-block;padding:3px 9px;border-radius:99px;font-size:11px;font-weight:700}.sx-tag.ok{background:rgba(52,211,153,.15);color:#34d399}.sx-tag.no{background:rgba(255,82,82,.15);color:#ff8a8a}.sx-tag.am{background:rgba(246,195,68,.15);color:#f6c344}' +
    '.sx-e{color:#8b95a5;padding:14px;text-align:center}.sx-form{display:grid;grid-template-columns:1.2fr .7fr 1.6fr auto;gap:8px}' +
    '.sx-form .sx-in{min-width:0}.sx-lnk{color:#c8ff4d;cursor:pointer;background:none;border:0;padding:0;font:inherit}' +
    '.sx-m{position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:100000;display:flex;align-items:center;justify-content:center;padding:16px}.sx-md{background:#0f131c;border:1px solid rgba(255,255,255,.12);border-radius:18px;max-width:760px;width:100%;max-height:86vh;overflow:auto;padding:18px}' +
    '@media(max-width:700px){.sx-form{grid-template-columns:1fr 1fr}.sx-form>*:nth-child(3){grid-column:1/-1}}';



  var X = '.mx-bars{display:flex;align-items:flex-end;gap:3px;height:120px;margin-top:8px}.mx-bars i{flex:1;background:linear-gradient(#c8ff4d,#6fa11c);border-radius:3px 3px 0 0;min-height:2px;position:relative}.mx-bars i:hover{filter:brightness(1.25)}' +
    '.mx-fn{display:grid;grid-template-columns:150px 1fr 90px;gap:10px;align-items:center;margin:9px 0;font-size:13px}.mx-fn div.b{height:22px;border-radius:7px;background:rgba(255,255,255,.06);overflow:hidden}.mx-fn div.b i{display:block;height:100%;background:linear-gradient(90deg,#c8ff4d,#34d399)}' +
    '.mx-2{display:grid;grid-template-columns:1fr 1fr;gap:16px}@media(max-width:900px){.mx-2{grid-template-columns:1fr}.mx-fn{grid-template-columns:110px 1fr 70px}}';
  function inject() { if ($('#nc-mx-css')) return; var st = document.createElement('style'); st.id = 'nc-mx-css'; st.textContent = CSS + X; document.head.appendChild(st); }
  function mount() {
    var side = $('.admin-sidebar'), main = $('.admin-content');
    if (!side || !main || $('[data-section="metrics"]')) return !!$('[data-section="metrics"]');
    inject();
    var nav = document.createElement('div'); nav.className = 'admin-nav-item'; nav.setAttribute('data-tab', 'metrics');
    nav.innerHTML = '<span data-ap="1" style="background:none;-webkit-mask:none;mask:none;font-size:0"><svg class="ap-ico lg" viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/></svg></span> Metrics';
    nav.onclick = function () { if (typeof showAdminTab === 'function') showAdminTab('metrics'); load(); };
    var sys = side.querySelector('[data-tab="system"]'); side.insertBefore(nav, sys || null);
    var sec = document.createElement('div'); sec.className = 'admin-section'; sec.setAttribute('data-section', 'metrics');
    sec.innerHTML = '<div class="sx" id="mxRoot"><div class="sx-e">Loading…</div></div>';
    main.appendChild(sec); sec.addEventListener('click', onClick); return true;
  }
  function bars(series, key, fmt) {
    var mx = Math.max.apply(null, series.map(function (x) { return x[key]; }).concat([1]));
    return '<div class="mx-bars">' + series.map(function (x) { return '<i style="height:' + Math.max(2, Math.round(x[key] / mx * 100)) + '%" title="' + esc(x.d + ': ' + fmt(x[key])) + '"></i>'; }).join('') + '</div><div style="display:flex;justify-content:space-between;color:#8b95a5;font-size:11px;margin-top:4px"><span>' + esc(series[0].d.slice(5)) + '</span><span>' + esc(series[series.length - 1].d.slice(5)) + '</span></div>';
  }
  function render() {
    var r = $('#mxRoot'); if (!r) return; var d = S.d, h = '';
    if (S.err) h += '<div class="sx-card" style="border-color:rgba(255,82,82,.4);color:#ff8a8a">' + esc(S.err) + '</div>';
    if (!d) { r.innerHTML = h || '<div class="sx-e">Loading…</div>'; return; }
    var t = d.totals, f = d.funnel, a = d.activity, g = d.growth;
    h += '<div class="sx-stats">' +
      '<div class="sx-st g"><small>Clients</small><b>' + t.clients + '</b><div style="font-size:11px;margin-top:4px">' + delta(g.signups7, g.signups7prev) + ' · +' + g.signups7 + ' this week</div></div>' +
      '<div class="sx-st g"><small>Real deposits (total)</small><b style="font-size:20px">' + usd(t.realDeposits) + '</b><div style="font-size:11px;margin-top:4px">' + delta(g.deposits7, g.deposits7prev) + '</div></div>' +
      '<div class="sx-st"><small>Client balances</small><b style="font-size:20px">' + usd(t.liabilities) + '</b><div style="font-size:11px;margin-top:4px;color:#8b95a5">avg ' + usd(t.avgBalance) + '</div></div>' +
      '<div class="sx-st"><small>Paid out</small><b style="font-size:20px">' + usd(t.withdrawn) + '</b><div style="font-size:11px;margin-top:4px;color:#8b95a5">pending ' + t.pendingWithdrawals + ' · ' + usd(t.pendingWithdrawalsAmount) + '</div></div>' +
      '<div class="sx-st"><small>Active · day / week / month</small><b style="font-size:20px">' + a.dau + ' / ' + a.wau + ' / ' + a.mau + '</b></div>' +
      '<div class="sx-st ' + (t.newDestinationPending ? 'w' : '') + '"><small>Pending → new destination</small><b>' + t.newDestinationPending + '</b></div></div>';
    h += '<div class="sx-card"><h3>Conversion funnel</h3>' + [['Registered', f.registered], ['Verification sent', f.kycSubmitted], ['Verified', f.kycApproved], ['Made a deposit', f.funded], ['Withdrew money', f.withdrew]].map(function (x) {
      return '<div class="mx-fn"><span>' + x[0] + '</span><div class="b"><i style="width:' + pct(x[1], f.registered) + '%"></i></div><b>' + x[1] + ' <span style="color:#8b95a5;font-weight:500">' + pct(x[1], f.registered) + '%</span></b></div>'; }).join('') + '</div>';
    h += '<div class="mx-2"><div class="sx-card"><h3>New clients · 30 days</h3>' + bars(d.series, 'signups', function (v) { return v + ' new'; }) + '</div><div class="sx-card"><h3>Real deposits · 30 days</h3>' + bars(d.series, 'deposits', usd) + '</div></div>';
    h += '<div class="mx-2"><div class="sx-card"><h3>Account types</h3><div style="font-size:14px;line-height:2">Banking: <b>' + t.banking + '</b> · Exchange: <b>' + t.exchange + '</b><br>Admin-added credits: <b>' + usd(t.adminCredits) + '</b> <span style="color:#8b95a5;font-size:12px">(not real money)</span></div></div>' +
      '<div class="sx-card"><h3>Largest balances</h3>' + (d.top.length ? '<table class="sx-tb">' + d.top.map(function (c) { return '<tr><td>' + esc(c.name || c.email) + '<div style="color:#8b95a5;font-size:11px">' + esc(c.email) + '</div></td><td style="text-align:right"><b>' + usd(c.balance) + '</b></td></tr>'; }).join('') + '</table>' : '<div class="sx-e">No data</div>') + '</div></div>';
    h += '<div class="sx-card"><h3>Export <span><button class="sx-btn s" data-a="refresh">🔄 Refresh</button></span></h3><div class="sx-top" style="margin:0"><button class="sx-btn p" data-a="csvc">⬇ Clients (CSV)</button><button class="sx-btn" data-a="csvw">⬇ Withdrawals (CSV)</button><span style="color:#8b95a5;font-size:12px">' + (d.truncated ? 'Limited to the first 5000 clients. ' : '') + 'Generated ' + esc(new Date(d.generatedAt).toLocaleString()) + '</span></div></div>';
    r.innerHTML = h;
  }
  function load() {
    if (S.busy) return; S.busy = true;
    api('metricsOverview').then(function (d) {
      S.busy = false;
      if (!d || !d.ok) { S.err = (d && d.error) || 'Failed to load'; if (/owner|admin/i.test(S.err)) S.err = 'Only the owner account can open Metrics.'; render(); return; }
      S.err = ''; S.d = d; render();
    }).catch(function () { S.busy = false; S.err = 'Connection error'; render(); });
  }
  function csv(rows, cols, name) {
    function cell(v) { v = v == null ? '' : String(v); if (/^[=+\-@\t\r]/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"'; }   // blocks spreadsheet formula injection
    var out = '﻿' + cols.map(function (c) { return cell(c[1]); }).join(',') + '\r\n' + rows.map(function (r) { return cols.map(function (c) { return cell(typeof c[2] === 'function' ? c[2](r[c[0]], r) : r[c[0]]); }).join(','); }).join('\r\n');
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([out], { type: 'text/csv;charset=utf-8' })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  function iso(t) { return t ? new Date(t).toISOString().replace('T', ' ').slice(0, 19) : ''; }
  function onClick(e) {
    var b = e.target.closest('[data-a]'); if (!b || !S.d) return; var a = b.getAttribute('data-a');
    if (a === 'refresh') return load();
    var day = new Date().toISOString().slice(0, 10);
    if (a === 'csvc') csv(S.d.clients, [['email', 'Email'], ['name', 'Name'], ['created', 'Registered', iso], ['type', 'Account type'], ['kyc', 'Verification'], ['balance', 'Balance USD'], ['realDeposits', 'Real deposits USD'], ['adminCredits', 'Admin credits USD'], ['withdrawn', 'Withdrawn USD'], ['txs', 'Transactions']], 'clients-' + day + '.csv');
    if (a === 'csvw') csv(S.d.withdrawals, [['id', 'ID'], ['email', 'Client'], ['amount', 'Amount USD'], ['method', 'Method'], ['status', 'Status'], ['createdAt', 'Created', iso], ['newDest', 'New destination', function (v) { return v ? 'yes' : ''; }]], 'withdrawals-' + day + '.csv');
  }
  var tries = 0;
  (function wait() { if (mount()) return; if (++tries < 120) setTimeout(wait, 500); })();
  var mo = new MutationObserver(function () { if (!$('[data-section="metrics"]')) mount(); });
  document.addEventListener('DOMContentLoaded', function () { mo.observe(document.body, { childList: true, subtree: true }); });
  if (document.body) mo.observe(document.body, { childList: true, subtree: true });
})();
