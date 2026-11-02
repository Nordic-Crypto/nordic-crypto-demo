/* security-pro.js v1 — admin "Security" tab: sign-in history with IP, IP / account bans, suspicious activity */
(function () {
  'use strict';
  if (window.__ncAdminSec) return; window.__ncAdminSec = 1;
  var S = { q: '', fail: false, rows: [], bans: [], susp: [], bu: [], stats: null, busy: false, err: '' };
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

  var CSS = '' +
    '.sx{color:#e8ecf4;font-family:inherit}.sx *{box-sizing:border-box}' +
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

  function inject() {
    if ($('#nc-sx-css')) return;
    var st = document.createElement('style'); st.id = 'nc-sx-css'; st.textContent = CSS; document.head.appendChild(st);
  }
  function mount() {
    var side = $('.admin-sidebar'), main = $('.admin-content');
    if (!side || !main || $('[data-section="security"]')) return !!$('[data-section="security"]');
    inject();
    var nav = document.createElement('div'); nav.className = 'admin-nav-item'; nav.setAttribute('data-tab', 'security');
    nav.innerHTML = '<span>🛡️</span> Security <span class="admin-nav-badge" id="navSecCount" style="display:none;background:#ff5252;color:#fff">0</span>';
    nav.onclick = function () { if (typeof showAdminTab === 'function') showAdminTab('security'); load(); };
    var sys = side.querySelector('[data-tab="system"]'); side.insertBefore(nav, sys || null);
    var sec = document.createElement('div'); sec.className = 'admin-section'; sec.setAttribute('data-section', 'security');
    sec.innerHTML = '<div class="sx" id="sxRoot"><div class="sx-e">Loading…</div></div>';
    main.appendChild(sec);
    sec.addEventListener('click', onClick); sec.addEventListener('input', onInput);
    return true;
  }
  function render() {
    var r = $('#sxRoot'); if (!r) return;
    var st = S.stats || {};
    var h = '';
    if (S.err) h += '<div class="sx-card" style="border-color:rgba(255,82,82,.4);color:#ff8a8a">' + esc(S.err) + '</div>';
    h += '<div class="sx-stats">' +
      '<div class="sx-st"><small>Sign-ins · 24h</small><b>' + (st.last24h || 0) + '</b></div>' +
      '<div class="sx-st ' + (st.failed24h ? 'w' : '') + '"><small>Failed · 24h</small><b>' + (st.failed24h || 0) + '</b></div>' +
      '<div class="sx-st g"><small>Banned IPs</small><b>' + (st.bannedIps || 0) + '</b></div>' +
      '<div class="sx-st g"><small>Suspended clients</small><b>' + (st.bannedUsers || 0) + '</b></div></div>';
    // ban form
    h += '<div class="sx-card"><h3>🚫 Ban an IP address</h3><div class="sx-form">' +
      '<input class="sx-in sx-ip" id="sxIp" placeholder="IP, e.g. 203.0.113.5">' +
      '<select class="sx-in" id="sxHrs"><option value="0">Permanent</option><option value="1">1 hour</option><option value="24">24 hours</option><option value="168">7 days</option><option value="720">30 days</option></select>' +
      '<input class="sx-in" id="sxWhy" placeholder="Reason (optional)">' +
      '<button class="sx-btn d" data-a="ban">Ban IP</button></div>' +
      '<div style="color:#8b95a5;font-size:12px;margin-top:8px">A banned IP cannot open the site or sign in. Admins with an active admin session are never locked out. Sessions of clients seen on that IP are ended.</div></div>';
    // suspicious
    if (S.susp.length) {
      h += '<div class="sx-card"><h3>⚠️ Suspicious activity · 24h</h3><div class="sx-w"><table class="sx-tb"><tr><th>IP</th><th>Country</th><th>Failed</th><th>OK</th><th>Accounts</th><th>Last</th><th></th></tr>';
      S.susp.forEach(function (o) {
        h += '<tr><td class="sx-ip">' + esc(o.ip) + '</td><td>' + flag(o.country) + ' ' + esc(o.country) + '</td><td>' + (o.fail ? '<span class="sx-tag no">' + o.fail + '</span>' : '0') + '</td><td>' + o.ok + '</td><td>' + (o.accounts >= 3 ? '<span class="sx-tag am">' + o.accounts + '</span>' : o.accounts) + '</td><td>' + ago(o.last) + '</td><td style="text-align:right">' +
          (o.banned ? '<span class="sx-tag no">banned</span>' : '<button class="sx-btn s d" data-a="banip" data-ip="' + esc(o.ip) + '">Ban IP</button>') + '</td></tr>';
      });
      h += '</table></div></div>';
    }
    // bans
    h += '<div class="sx-card"><h3>Banned IPs</h3>';
    if (!S.bans.length) h += '<div class="sx-e">No banned IPs</div>';
    else {
      h += '<div class="sx-w"><table class="sx-tb"><tr><th>IP</th><th>Reason</th><th>By</th><th>Since</th><th>Expires</th><th></th></tr>';
      S.bans.forEach(function (b) {
        h += '<tr><td class="sx-ip">' + esc(b.ip) + (b.auto ? ' <span class="sx-tag am">auto</span>' : '') + '</td><td>' + esc(b.reason) + '</td><td>' + esc(b.by) + '</td><td>' + dt(b.at) + '</td><td>' + (b.until ? dt(b.until) : 'Never') + '</td><td style="text-align:right"><button class="sx-btn s" data-a="unban" data-ip="' + esc(b.ip) + '">Unban</button></td></tr>';
      });
      h += '</table></div>';
    }
    h += '</div>';
    if (S.bu.length) {
      h += '<div class="sx-card"><h3>Suspended clients</h3><div class="sx-w"><table class="sx-tb"><tr><th>Client</th><th>Reason</th><th>Since</th><th></th></tr>';
      S.bu.forEach(function (u) { h += '<tr><td><button class="sx-lnk" data-a="hist" data-em="' + esc(u.email) + '">' + esc(u.email) + '</button></td><td>' + esc(u.reason) + '</td><td>' + dt(u.at) + '</td><td style="text-align:right"><button class="sx-btn s" data-a="restore" data-em="' + esc(u.email) + '">Restore</button></td></tr>'; });
      h += '</table></div></div>';
    }
    // logins
    h += '<div class="sx-card"><h3>Recent sign-ins <span><button class="sx-btn s ' + (S.fail ? 'on' : '') + '" data-a="fail">Failed only</button> <button class="sx-btn s" data-a="refresh">🔄 Refresh</button></span></h3>' +
      '<div class="sx-top"><input class="sx-in" id="sxQ" placeholder="🔍 Search by e-mail, IP or country" value="' + esc(S.q) + '"></div>';
    if (!S.rows.length) h += '<div class="sx-e">No sign-ins recorded yet</div>';
    else {
      h += '<div class="sx-w"><table class="sx-tb"><tr><th>When</th><th>Account</th><th>IP</th><th>Location</th><th>Device</th><th>Result</th><th></th></tr>';
      S.rows.forEach(function (x) {
        h += '<tr><td title="' + esc(dt(x.ts)) + '">' + ago(x.ts) + '</td><td><button class="sx-lnk" data-a="hist" data-em="' + esc(x.email) + '">' + esc(x.email) + '</button>' + (x.kind === 'register' ? ' <span class="sx-tag am">new</span>' : '') + '</td><td class="sx-ip">' + esc(x.ip) + '</td><td>' + flag(x.country) + ' ' + esc([x.city, x.country].filter(Boolean).join(', ') || '—') + '</td><td>' + esc(dev(x.ua)) + '</td><td>' +
          (x.ok ? '<span class="sx-tag ok">OK</span>' : '<span class="sx-tag no">' + esc(x.why === 'suspended' ? 'suspended' : 'failed') + '</span>') + '</td><td style="text-align:right"><button class="sx-btn s d" data-a="banip" data-ip="' + esc(x.ip) + '">Ban IP</button></td></tr>';
      });
      h += '</table></div>';
    }
    h += '</div>';
    var act = document.activeElement && document.activeElement.id, val = act && document.activeElement.value, ss = act && document.activeElement.selectionStart;
    r.innerHTML = h;
    if (act && $('#' + act)) { var el = $('#' + act); el.value = val; el.focus(); try { el.setSelectionRange(ss, ss); } catch (e) {} }
    var n = $('#navSecCount'); if (n) { var c = (st.failed24h || 0) >= 10 ? S.susp.filter(function (o) { return !o.banned; }).length : 0; n.textContent = c; n.style.display = c ? '' : 'none'; }
  }
  function load() {
    if (S.busy) return; S.busy = true;
    api('secOverview', { q: S.q, onlyFailed: S.fail, limit: 150 }).then(function (d) {
      S.busy = false;
      if (!d || !d.ok) { S.err = (d && d.error) || 'Failed to load'; if (/owner/i.test(S.err)) S.err = 'Only the owner account can open Security.'; render(); return; }
      S.err = ''; S.rows = d.logins || []; S.bans = d.bans || []; S.susp = d.suspicious || []; S.bu = d.bannedUsers || []; S.stats = d.stats; render();
    }).catch(function () { S.busy = false; S.err = 'Connection error'; render(); });
  }
  function modal(html) {
    var m = document.createElement('div'); m.className = 'sx-m'; m.innerHTML = '<div class="sx-md">' + html + '</div>';
    m.addEventListener('click', function (e) { if (e.target === m || e.target.getAttribute('data-x')) m.remove(); });
    document.body.appendChild(m); return m;
  }
  function hist(em) {
    api('secLogins', { email: em, limit: 60 }).then(function (d) {
      var rows = (d && d.logins) || [];
      var h = '<h3 style="margin:0 0 12px;display:flex;justify-content:space-between">' + esc(em) + ' <button class="sx-btn s" data-x="1">Close</button></h3>';
      h += '<div style="display:flex;gap:8px;margin-bottom:12px"><button class="sx-btn s d" id="sxSusp">Suspend account</button></div>';
      h += rows.length ? '<div class="sx-w"><table class="sx-tb"><tr><th>When</th><th>IP</th><th>Location</th><th>Device</th><th>Result</th></tr>' + rows.map(function (x) {
        return '<tr><td>' + esc(dt(x.ts)) + '</td><td class="sx-ip">' + esc(x.ip) + '</td><td>' + flag(x.country) + ' ' + esc([x.city, x.country].filter(Boolean).join(', ') || '—') + '</td><td>' + esc(dev(x.ua)) + '</td><td>' + (x.ok ? '<span class="sx-tag ok">OK</span>' : '<span class="sx-tag no">failed</span>') + '</td></tr>';
      }).join('') + '</table></div>' : '<div class="sx-e">No history</div>';
      var m = modal(h); var b = $('#sxSusp', m);
      if (b) b.onclick = function () { var why = prompt('Reason for suspending ' + em + ' (optional):'); if (why === null) return; api('secBanUser', { email: em, ban: true, reason: why }).then(function (d) { if (d.ok) { m.remove(); load(); } else alert(d.error || 'Error'); }); };
    });
  }
  function onClick(e) {
    var b = e.target.closest('[data-a]'); if (!b) return; var a = b.getAttribute('data-a'), ip = b.getAttribute('data-ip'), em = b.getAttribute('data-em');
    if (a === 'refresh') return load();
    if (a === 'fail') { S.fail = !S.fail; return load(); }
    if (a === 'hist') return hist(em);
    if (a === 'restore') { if (confirm('Restore ' + em + '?')) api('secBanUser', { email: em, ban: false }).then(function (d) { d.ok ? load() : alert(d.error || 'Error'); }); return; }
    if (a === 'unban') { if (confirm('Unban ' + ip + '?')) api('secUnbanIp', { ip: ip }).then(function (d) { d.ok ? load() : alert(d.error || 'Error'); }); return; }
    if (a === 'banip') { var why = prompt('Ban ' + ip + ' permanently?\nReason (optional):', ''); if (why === null) return; api('secBanIp', { ip: ip, reason: why, hours: 0 }).then(function (d) { d.ok ? load() : alert(d.error || 'Error'); }); return; }
    if (a === 'ban') {
      var v = ($('#sxIp') || {}).value || ''; if (!v.trim()) return alert('Enter an IP address');
      api('secBanIp', { ip: v.trim(), hours: Number(($('#sxHrs') || {}).value) || 0, reason: ($('#sxWhy') || {}).value || '' }).then(function (d) { d.ok ? load() : alert(d.error || 'Error'); });
    }
  }
  var tm; function onInput(e) { if (e.target.id === 'sxQ') { S.q = e.target.value; clearTimeout(tm); tm = setTimeout(load, 350); } }
  var tries = 0;
  (function wait() {
    if (mount()) { var a = $('.admin-nav-item.active'); return; }
    if (++tries < 120) setTimeout(wait, 500);
  })();
  var mo = new MutationObserver(function () { if (!$('[data-section="security"]')) mount(); });
  document.addEventListener('DOMContentLoaded', function () { mo.observe(document.body, { childList: true, subtree: true }); });
  if (document.body) mo.observe(document.body, { childList: true, subtree: true });
})();
