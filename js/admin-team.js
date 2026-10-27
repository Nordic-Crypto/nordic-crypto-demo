/* ============================================================
   NC ADMIN TEAM v1.0
   Owner: create admin accounts, set permissions, activity log, per-agent reports.
   Staff: sees only the tabs they are allowed to use + "My activity".
   Load AFTER admin-pro.js.  Needs worker v6.
   ============================================================ */
(function () {
  'use strict';
  if (window.__atLoaded) return;
  window.__atLoaded = true;

  var BASE = window.WORKER_LOGIN_URL || window.WORKER_URL || 'https://nordic-deposit-checker.otis-790.workers.dev';
  var ME = null, PERMS = {}, LABELS = {};
  var S = { tab: 'members', members: [], log: [], logMore: false, logOffset: 0, rep: null, repAgent: '', range: '30', from: '', to: '', f: { agent: '', action: '', q: '', target: '' } };

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function token() { return typeof window.getSessionToken === 'function' ? window.getSessionToken() : localStorage.getItem('session_token'); }
  function toast(m, w) { if (typeof window.toast === 'function') window.toast(m, w); }
  function post(action, body) {
    return fetch(BASE + '?action=' + action, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ token: token() }, body || {})) })
      .then(function (r) { return r.json(); }).catch(function () { return { ok: false, error: 'Connection error' }; });
  }
  function usd(v) { v = Number(v || 0); return '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function dt(ts) { return ts ? new Date(ts).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'; }
  function dtFull(ts) { return ts ? new Date(ts).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'; }
  function ago(ts) {
    if (!ts) return 'never'; var s = Math.max(0, (Date.now() - ts) / 1000);
    if (s < 60) return 'just now'; if (s < 3600) return Math.floor(s / 60) + ' min ago'; if (s < 86400) return Math.floor(s / 3600) + ' h ago';
    if (s < 604800) return Math.floor(s / 86400) + ' d ago'; return new Date(ts).toLocaleDateString('en-GB');
  }
  function ini(n, e) { var p = String(n || e || 'A').replace(/@.*/, '').trim().split(/[\s._-]+/).filter(Boolean); return ((p[0] || 'A').charAt(0) + (p[1] ? p[1].charAt(0) : '')).toUpperCase(); }
  var GR = [['#6366f1', '#8b5cf6'], ['#0ea5e9', '#22d3ee'], ['#10b981', '#34d399'], ['#f59e0b', '#f97316'], ['#ec4899', '#f43f5e'], ['#14b8a6', '#3b82f6']];
  function av(n, e) { var h = 0, s = String(e || n); for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; var g = GR[h % GR.length]; return '<span class="ap-av" style="background:linear-gradient(135deg,' + g[0] + ',' + g[1] + ')">' + esc(ini(n, e)) + '</span>'; }
  function label(a) { return LABELS[a] || a; }
  function copy(t) { try { navigator.clipboard.writeText(t); toast('Copied'); } catch (e) { var x = document.createElement('textarea'); x.value = t; document.body.appendChild(x); x.select(); try { document.execCommand('copy'); } catch (er) {} document.body.removeChild(x); toast('Copied'); } }
  function genPass() {
    var a = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789', o = '', r = new Uint32Array(14);
    (window.crypto || window.msCrypto).getRandomValues(r);
    for (var i = 0; i < 14; i++) o += a[r[i] % a.length];
    return o.slice(0, 4) + '-' + o.slice(4, 9) + '-' + o.slice(9, 14) + '7';
  }
  function csvCell(v) { v = String(v == null ? '' : v); return /[",\n;]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function downloadCsv(name, rows) {
    var blob = new Blob(['﻿' + rows.map(function (r) { return r.map(csvCell).join(','); }).join('\n')], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function dayStr(d) { return new Date(d).toISOString().slice(0, 10); }

  /* ---------------- icons & css hooks ---------------- */
  var ICO = {
    shield: "%3Cpath d='M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z'/%3E%3Cpath d='m9 12 2 2 4-4'/%3E",
    pulse: "%3Cpath d='M22 12h-4l-3 9L9 3l-3 9H2'/%3E"
  };

  /* ---------------- bootstrap ---------------- */
  function init() {
    var panel = $('adminPanel'); if (!panel) return;
    var seen = false;
    function check() {
      if (!panel.classList.contains('on') || seen) return;
      seen = true; boot();
    }
    new MutationObserver(check).observe(panel, { attributes: true, attributeFilter: ['class'] });
    check();
    var orig = window.showAdminTab;
    window.showAdminTab = function (tab) {
      if (orig) orig.apply(this, arguments);
      if (tab === 'team') renderTeam();
      if (tab === 'myActivity') renderMine();
    };
  }

  function boot() {
    post('adminMe').then(function (r) {
      if (!r || !r.ok) return;                                    // old worker: leave everything as is
      ME = r.me; PERMS = r.allPerms || {}; LABELS = r.labels || {}; ME.perms = r.perms || [];
      var nav = document.querySelector('#adminPanel .admin-sidebar'), main = document.querySelector('#adminPanel .admin-content');
      if (!nav || !main) return;
      if (ME.level === 'owner') {
        addNav(nav, 'team', 'Team & reports', 'shield');
        addSection(main, 'team');
      } else {
        addNav(nav, 'myActivity', 'My activity', 'pulse');
        addSection(main, 'myActivity');
        applyStaffNav(nav);
        chip();
      }
      if (ME.mustChangePassword) forcePassword();
    });
  }
  function addNav(nav, tab, text, ico) {
    if (nav.querySelector('[data-tab="' + tab + '"]')) return;
    var d = document.createElement('div');
    d.className = 'admin-nav-item'; d.setAttribute('data-tab', tab);
    d.setAttribute('onclick', "showAdminTab('" + tab + "')");
    d.innerHTML = '<span class="at-ico at-ico-' + ico + '">•</span> ' + esc(text);
    nav.appendChild(d);
  }
  function addSection(main, tab) {
    if (main.querySelector('[data-section="' + tab + '"]')) return;
    var d = document.createElement('div'); d.className = 'admin-section'; d.setAttribute('data-section', tab); d.id = 'at_' + tab;
    main.appendChild(d);
  }
  var TAB_PERM = { stats: 'stats', clients: 'clients.view', verifications: 'kyc', chats: 'chat', emailChanges: 'clients.edit', withdrawals: 'withdrawals', deposits: 'deposits', deleted: 'clients.view', kycIncomplete: 'kyc' };
  function applyStaffNav(nav) {
    var first = null;
    nav.querySelectorAll('.admin-nav-item').forEach(function (n) {
      var t = n.getAttribute('data-tab');
      if (t === 'myActivity') return;
      var need = TAB_PERM[t];
      var allowed = need ? ME.perms.indexOf(need) >= 0 : false;          // unknown / owner-only tabs (System) are hidden
      if (!allowed) n.style.display = 'none'; else if (!first) first = t;
    });
    var active = nav.querySelector('.admin-nav-item.active');
    if ((!active || active.style.display === 'none') && window.showAdminTab) window.showAdminTab(first || 'myActivity');
    var q = document.querySelector('#adminPanel .admin-top-actions'); // hide owner-only controls if any
    if (q) q.querySelectorAll('[data-owner-only]').forEach(function (e) { e.style.display = 'none'; });
  }
  function chip() {
    var top = document.querySelector('#adminPanel .admin-top-actions'); if (!top || $('atChip')) return;
    var c = document.createElement('div'); c.id = 'atChip'; c.className = 'at-chip';
    c.innerHTML = av(ME.name, ME.email) + '<div><b>' + esc(ME.name) + '</b><small>Admin · ' + ME.perms.length + ' permissions</small></div>';
    top.insertBefore(c, top.firstChild);
  }

  /* ---------------- shared UI bits ---------------- */
  function modal(html, cls) {
    closeModal();
    var m = document.createElement('div'); m.className = 'at-mask'; m.id = 'atMask';
    m.innerHTML = '<div class="at-modal ' + (cls || '') + '">' + html + '</div>';
    m.addEventListener('mousedown', function (e) { if (e.target === m && !m.getAttribute('data-sticky')) closeModal(); });
    document.body.appendChild(m);
    return m;
  }
  function closeModal() { var m = $('atMask'); if (m) m.remove(); }
  window.__atClose = closeModal;
  function pill(t, c) { return '<span class="ap-pill ' + (c || 'mute') + '">' + esc(t) + '</span>'; }
  function tabs(active) {
    return '<div class="at-tabs">' + [['members', 'Admins'], ['log', 'Activity log'], ['reports', 'Agent reports']].map(function (t) {
      return '<button class="at-tab' + (active === t[0] ? ' on' : '') + '" onclick="__atTab(\'' + t[0] + '\')">' + t[1] + '</button>';
    }).join('') + '</div>';
  }
  window.__atTab = function (t) { S.tab = t; renderTeam(); };

  /* ================= OWNER: TEAM ================= */
  function renderTeam() {
    var box = $('at_team'); if (!box) return;
    box.innerHTML = '<div class="at-head"><div><h2>Team & reports</h2><p>Create admin accounts, control what each admin can do, and see everything they did.</p></div>' +
      '<button class="ap-btn pri" onclick="__atEdit()">+ New admin</button></div>' + tabs(S.tab) + '<div id="atBody"><div class="ap-empty">Loading…</div></div>';
    if (S.tab === 'members') loadMembers();
    else if (S.tab === 'log') renderLog(true);
    else renderReports();
  }

  /* ---- members ---- */
  function loadMembers() {
    post('adminTeamList').then(function (r) {
      if (!r.ok) { $('atBody').innerHTML = '<div class="ap-empty">' + esc(r.error || 'Failed to load') + '</div>'; return; }
      S.members = r.members; drawMembers();
    });
  }
  function drawMembers() {
    var rows = S.members.map(function (m) {
      var perms = m.level === 'owner' ? pill('Full access', 'vio') : (m.perms.length ? m.perms.slice(0, 3).map(function (p) { return pill(shortPerm(p), 'cyan'); }).join(' ') + (m.perms.length > 3 ? ' ' + pill('+' + (m.perms.length - 3)) : '') : pill('No permissions', 'warn'));
      var st = m.disabled ? pill('Disabled', 'bad') : pill('Active', 'ok');
      var act = m.level === 'owner' ? '<span class="ap-mute">—</span>' :
        '<button class="ap-btn sm" onclick="__atReport(\'' + esc(m.email) + '\')">Report</button> <button class="ap-btn sm" onclick="__atEdit(\'' + esc(m.email) + '\')">Edit</button> ' +
        '<button class="ap-btn sm" onclick="__atReset(\'' + esc(m.email) + '\')">Password</button> ' +
        '<button class="ap-btn sm" onclick="__atToggle(\'' + esc(m.email) + '\',' + (m.disabled ? 'false' : 'true') + ')">' + (m.disabled ? 'Enable' : 'Disable') + '</button> ' +
        '<button class="ap-btn sm bad" onclick="__atDelete(\'' + esc(m.email) + '\')">Delete</button>';
      return '<tr><td><div class="at-who">' + av(m.name, m.email) + '<div><b>' + esc(m.name) + '</b><small>' + esc(m.email) + '</small></div></div></td>' +
        '<td>' + (m.level === 'owner' ? pill('Owner', 'vio') : pill('Admin', 'cyan')) + '</td><td>' + perms + '</td>' +
        '<td>' + (m.lastLoginAt ? '<span title="' + dtFull(m.lastLoginAt) + '">' + ago(m.lastLoginAt) + '</span>' : '<span class="ap-mute">never</span>') + '</td>' +
        '<td class="at-num">' + (m.todayActions || 0) + '</td><td>' + st + '</td><td class="at-act">' + act + '</td></tr>';
    }).join('');
    $('atBody').innerHTML = '<div class="ap-card"><div class="at-scroll"><table class="at-table"><thead><tr><th>Admin</th><th>Role</th><th>Access</th><th>Last sign-in</th><th class="at-num">Actions today</th><th>Status</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div></div>' +
      '<p class="at-note">Admin accounts sign in on the same page as the owner, with their own e-mail and password. Every action they take is recorded in the activity log. The owner account itself cannot be edited here.</p>';
  }
  function shortPerm(p) { return ({ 'clients.view': 'View clients', 'clients.edit': 'Edit clients', 'clients.balance': 'Balances', 'clients.password': 'Passwords', 'clients.delete': 'Deactivate', deposits: 'Deposits', withdrawals: 'Withdrawals', kyc: 'KYC', chat: 'Chat', stats: 'Stats' })[p] || p; }

  var PRESETS = {
    support: { n: 'Support agent', p: ['clients.view', 'chat', 'kyc'] },
    finance: { n: 'Finance', p: ['clients.view', 'deposits', 'withdrawals', 'clients.balance', 'stats'] },
    full: { n: 'Everything', p: Object.keys({ 'clients.view': 1, 'clients.edit': 1, 'clients.balance': 1, 'clients.password': 1, 'clients.delete': 1, deposits: 1, withdrawals: 1, kyc: 1, chat: 1, stats: 1 }) },
    none: { n: 'Clear', p: [] }
  };
  window.__atPreset = function (k) {
    var list = PRESETS[k].p;
    document.querySelectorAll('#atMask input[name=perm]').forEach(function (i) { i.checked = list.indexOf(i.value) >= 0; });
  };
  window.__atGen = function () { var i = $('atPw'); i.value = genPass(); i.type = 'text'; };
  window.__atEye = function () { var i = $('atPw'); i.type = i.type === 'password' ? 'text' : 'password'; };

  window.__atEdit = function (email) {
    var m = email ? S.members.filter(function (x) { return x.email === email; })[0] : null;
    var perms = Object.keys(PERMS).map(function (k) {
      return '<label class="at-perm"><input type="checkbox" name="perm" value="' + k + '"' + (m && m.perms.indexOf(k) >= 0 ? ' checked' : '') + '><span><b>' + esc(shortPerm(k)) + '</b><small>' + esc(PERMS[k]) + '</small></span></label>';
    }).join('');
    modal('<div class="at-mh"><h3>' + (m ? 'Edit admin' : 'New admin') + '</h3><button class="at-x" onclick="__atClose()">×</button></div>' +
      '<div class="at-form"><label>Name<input id="atName" value="' + esc(m ? m.name : '') + '" placeholder="Agent name"></label>' +
      '<label>Login e-mail<input id="atEmail" type="email" value="' + esc(m ? m.email : '') + '" placeholder="agent1@nordiccrypto.com"' + (m ? ' disabled' : '') + '></label>' +
      (m ? '' : '<label>Password<div class="at-pw"><input id="atPw" type="password" placeholder="min. 10 characters" autocomplete="new-password"><button type="button" class="ap-btn sm" onclick="__atEye()">Show</button><button type="button" class="ap-btn sm" onclick="__atGen()">Generate</button></div></label>') +
      '<label>Internal note<input id="atNote" value="' + esc(m ? m.note : '') + '" placeholder="Shift, team, etc. (optional)"></label>' +
      '<div class="at-ptitle">Permissions <span>' + Object.keys(PRESETS).map(function (k) { return '<button type="button" class="at-link" onclick="__atPreset(\'' + k + '\')">' + PRESETS[k].n + '</button>'; }).join('') + '</span></div>' +
      '<div class="at-perms">' + perms + '</div><div id="atErr" class="at-err"></div></div>' +
      '<div class="at-mf"><button class="ap-btn" onclick="__atClose()">Cancel</button><button class="ap-btn pri" id="atSave" onclick="__atSave(' + (m ? "'" + esc(m.email) + "'" : '') + ')">' + (m ? 'Save changes' : 'Create admin') + '</button></div>');
    if (!m) __atPreset('support');
  };
  function pickedPerms() { var a = []; document.querySelectorAll('#atMask input[name=perm]:checked').forEach(function (i) { a.push(i.value); }); return a; }
  window.__atSave = function (email) {
    var err = $('atErr'); err.textContent = '';
    var name = $('atName').value.trim(), perms = pickedPerms(), note = $('atNote').value.trim();
    var btn = $('atSave'); btn.disabled = true;
    var p;
    if (email) p = post('adminTeamUpdate', { email: email, name: name, perms: perms, note: note });
    else {
      var em = $('atEmail').value.trim().toLowerCase(), pw = $('atPw').value;
      p = post('adminTeamCreate', { email: em, name: name, password: pw, perms: perms, note: note }).then(function (r) { if (r.ok) r._pw = pw; return r; });
    }
    p.then(function (r) {
      btn.disabled = false;
      if (!r.ok) { err.textContent = r.error || 'Failed'; return; }
      if (!email) credentials(r.member, r._pw); else { closeModal(); toast('Saved'); }
      loadMembers();
    });
  };
  function credentials(m, pw) {
    var url = location.origin + location.pathname.replace(/[^/]*$/, '') + 'index.html';
    var text = 'NordicCrypto admin access\nSign in: ' + url + '\nE-mail: ' + m.email + '\nPassword: ' + pw + '\n(You will be asked to set your own password after the first sign-in.)';
    var mk = modal('<div class="at-mh"><h3>Admin created</h3></div><div class="at-cred"><div class="at-ok">✓</div><p>Give these details to <b>' + esc(m.name) + '</b>. The password is shown <b>only now</b> and cannot be viewed again.</p>' +
      '<div class="at-box"><div><small>Sign in</small><b>' + esc(url) + '</b></div><div><small>E-mail</small><b>' + esc(m.email) + '</b></div><div><small>Password</small><b class="ap-mono">' + esc(pw) + '</b></div></div>' +
      '<button class="ap-btn pri" id="atCopyAll">Copy all details</button></div><div class="at-mf"><button class="ap-btn" onclick="__atClose()">Done</button></div>');
    mk.setAttribute('data-sticky', '1');
    $('atCopyAll').onclick = function () { copy(text); };
  }
  window.__atToggle = function (email, dis) {
    if (dis && !confirm('Disable ' + email + '? They will be signed out immediately.')) return;
    post('adminTeamUpdate', { email: email, disabled: dis }).then(function (r) { toast(r.ok ? (dis ? 'Disabled' : 'Enabled') : (r.error || 'Failed'), !r.ok); loadMembers(); });
  };
  window.__atDelete = function (email) {
    if (!confirm('Delete admin ' + email + '? Their account is removed. Their past actions stay in the activity log.')) return;
    post('adminTeamDelete', { email: email }).then(function (r) { toast(r.ok ? 'Deleted' : (r.error || 'Failed'), !r.ok); loadMembers(); });
  };
  window.__atReset = function (email) {
    var mk = modal('<div class="at-mh"><h3>Reset password</h3><button class="at-x" onclick="__atClose()">×</button></div><div class="at-form"><p class="at-note" style="margin:0">' + esc(email) + ' will be signed out and must set their own password after the next sign-in.</p>' +
      '<label>New password<div class="at-pw"><input id="atPw" type="text" value="' + genPass() + '"><button type="button" class="ap-btn sm" onclick="__atGen()">Generate</button></div></label><div id="atErr" class="at-err"></div></div>' +
      '<div class="at-mf"><button class="ap-btn" onclick="__atClose()">Cancel</button><button class="ap-btn pri" id="atSave">Reset password</button></div>');
    $('atSave').onclick = function () {
      var pw = $('atPw').value;
      post('adminTeamUpdate', { email: email, password: pw }).then(function (r) {
        if (!r.ok) { $('atErr').textContent = r.error || 'Failed'; return; }
        credentials({ name: email, email: email }, pw); loadMembers();
      });
    };
  };

  /* ---- activity log ---- */
  function rangeDates() {
    if (S.range === 'custom') return { from: S.from || undefined, to: S.to || undefined };
    var d = { today: 0, '7': 6, '30': 29, '90': 89 }[S.range]; if (d === undefined) d = 29;
    return { from: dayStr(Date.now() - d * 86400000), to: dayStr(Date.now()) };
  }
  function rangeBar(onchange) {
    var opts = [['today', 'Today'], ['7', '7 days'], ['30', '30 days'], ['90', '90 days'], ['custom', 'Custom']];
    return '<div class="at-seg">' + opts.map(function (o) { return '<button class="' + (S.range === o[0] ? 'on' : '') + '" onclick="__atRange(\'' + o[0] + '\',\'' + onchange + '\')">' + o[1] + '</button>'; }).join('') + '</div>' +
      (S.range === 'custom' ? '<input type="date" class="at-in" id="atFrom" value="' + esc(S.from) + '"> <input type="date" class="at-in" id="atTo" value="' + esc(S.to) + '"> <button class="ap-btn sm" onclick="__atRange(\'custom\',\'' + onchange + '\',1)">Apply</button>' : '');
  }
  window.__atRange = function (r, then, apply) {
    S.range = r;
    if (r === 'custom' && apply) { S.from = ($('atFrom') || {}).value || ''; S.to = ($('atTo') || {}).value || ''; }
    if (then === 'log') renderLog(true); else if (then === 'mine') renderMine(true); else renderReports();
  };
  function actionOptions() {
    var keys = Object.keys(LABELS).sort(function (a, b) { return label(a).localeCompare(label(b)); });
    return '<option value="">All actions</option>' + keys.map(function (k) { return '<option value="' + k + '"' + (S.f.action === k ? ' selected' : '') + '>' + esc(label(k)) + '</option>'; }).join('');
  }
  function agentOptions() {
    return '<option value="">All admins</option>' + S.members.map(function (m) { return '<option value="' + esc(m.email) + '"' + (S.f.agent === m.email ? ' selected' : '') + '>' + esc(m.name) + (m.level === 'owner' ? ' (owner)' : '') + '</option>'; }).join('');
  }
  function renderLog(reset) {
    var go = function () {
      if (reset) { S.log = []; S.logOffset = 0; }
      var body = $('atBody'); if (!body) return;
      body.innerHTML = '<div class="at-filters">' + rangeBar('log') + '<select id="atFAgent" class="at-in">' + agentOptions() + '</select><select id="atFAct" class="at-in">' + actionOptions() + '</select>' +
        '<input id="atFQ" class="at-in" placeholder="Search client or text" value="' + esc(S.f.q) + '"><button class="ap-btn sm" onclick="__atApply()">Search</button><button class="ap-btn sm" onclick="__atExportLog()">Export CSV</button></div>' +
        '<div class="ap-card"><div class="at-scroll"><table class="at-table at-log"><thead><tr><th>Time</th><th>Admin</th><th>Action</th><th>Client</th><th>Details</th><th class="at-num">Amount</th><th></th></tr></thead><tbody id="atLogRows"></tbody></table></div><div id="atLogFoot" class="at-foot"></div></div>';
      $('atFQ').addEventListener('keydown', function (e) { if (e.key === 'Enter') window.__atApply(); });
      fetchLog();
    };
    if (!S.members.length) post('adminTeamList').then(function (r) { if (r.ok) S.members = r.members; go(); }); else go();
  }
  window.__atApply = function () { S.f.agent = $('atFAgent').value; S.f.action = $('atFAct').value; S.f.q = $('atFQ').value.trim(); renderLog(true); };
  function logRow(i, withAgent) {
    var ag = S.members.filter(function (m) { return m.email === i.actor; })[0];
    return '<tr class="at-click' + (i.ok ? '' : ' at-bad') + '" onclick="__atEntry(\'' + esc(i.key) + '\')"><td class="at-nw">' + dt(i.ts) + '</td>' +
      (withAgent ? '<td class="at-nw">' + esc(ag ? ag.name : i.actor.split('@')[0]) + '</td>' : '') +
      '<td class="at-nw">' + esc(label(i.action)) + (i.ok ? '' : ' ' + pill('Denied / failed', 'bad')) + '</td><td>' + esc(i.target || '—') + '</td><td class="at-sum">' + esc(i.summary || '') + '</td><td class="at-num">' + (i.money ? usd(i.money) : '') + '</td><td class="ap-mute">›</td></tr>';
  }
  function fetchLog() {
    var d = rangeDates();
    post('adminAuditLog', { agent: S.f.agent, action: S.f.action, q: S.f.q, from: d.from, to: d.to, limit: 100, offset: S.logOffset }).then(function (r) {
      if (!r.ok) { $('atLogRows').innerHTML = '<tr><td colspan="7"><div class="ap-empty">' + esc(r.error || 'Failed') + '</div></td></tr>'; return; }
      if (r.labels) LABELS = r.labels;
      S.log = S.log.concat(r.items); S.logMore = r.more; S.logOffset += r.items.length;
      $('atLogRows').innerHTML = S.log.length ? S.log.map(function (i) { return logRow(i, true); }).join('') : '<tr><td colspan="7"><div class="ap-empty">No activity for these filters</div></td></tr>';
      $('atLogFoot').innerHTML = (S.log.length + ' records shown') + (S.logMore ? ' <button class="ap-btn sm" onclick="__atMore()">Load more</button>' : '');
    });
  }
  window.__atMore = function () { fetchLog(); };
  window.__atExportLog = function () {
    var d = rangeDates(), all = [], off = 0;
    toast('Preparing export…');
    (function next() {
      post('adminAuditLog', { agent: S.f.agent, action: S.f.action, q: S.f.q, from: d.from, to: d.to, limit: 200, offset: off }).then(function (r) {
        if (!r.ok) { toast(r.error || 'Failed', true); return; }
        all = all.concat(r.items); off += r.items.length;
        if (r.more && all.length < 5000) next();
        else downloadCsv('activity-log-' + dayStr(Date.now()) + '.csv', [['Time (UTC)', 'Admin', 'Action', 'Client', 'Details', 'Amount USD', 'Result']].concat(all.map(function (i) { return [new Date(i.ts).toISOString(), i.actor, label(i.action), i.target, i.summary, i.money || '', i.ok ? 'OK' : 'Denied/failed']; })));
      });
    })();
  };
  window.__atEntry = function (key) {
    post('adminAuditEntry', { key: key }).then(function (r) {
      if (!r.ok) { toast(r.error || 'Not found', true); return; }
      var e = r.entry;
      var ch = (e.changes || []).filter(function (c) { return !/#$/.test(c.f); }).map(function (c) {
        return '<tr><td class="ap-mono">' + esc(c.f) + '</td><td class="at-from">' + esc(c.from == null ? '—' : c.from) + '</td><td class="at-arrow">→</td><td class="at-to">' + esc(c.to == null ? '—' : c.to) + '</td></tr>';
      }).join('');
      var req = Object.keys(e.req || {}).map(function (k) { return '<div><small>' + esc(k) + '</small><b>' + esc(Array.isArray(e.req[k]) ? e.req[k].join(', ') : e.req[k]) + '</b></div>'; }).join('');
      modal('<div class="at-mh"><h3>' + esc(label(e.action)) + '</h3><button class="at-x" onclick="__atClose()">×</button></div><div class="at-form">' +
        '<div class="at-kv"><div><small>Time</small><b>' + dtFull(e.ts) + '</b></div><div><small>Admin</small><b>' + esc(e.actorName || e.actor) + '</b><em>' + esc(e.actor) + '</em></div><div><small>Client</small><b>' + esc(e.target || '—') + '</b></div><div><small>IP address</small><b class="ap-mono">' + esc(e.ip || '—') + '</b></div><div><small>Result</small><b>' + (e.ok ? 'Done' : 'Denied / failed') + '</b></div>' + (e.money ? '<div><small>Amount</small><b>' + usd(e.money) + '</b></div>' : '') + '</div>' +
        '<div class="at-sumbox">' + esc(e.summary || '') + '</div>' +
        (ch ? '<div class="at-ptitle">What changed</div><table class="at-diff"><tbody>' + ch + '</tbody></table>' : '') +
        (req ? '<div class="at-ptitle">Request details</div><div class="at-kv">' + req + '</div>' : '') + '</div><div class="at-mf"><button class="ap-btn" onclick="__atClose()">Close</button></div>', 'wide');
    });
  };

  /* ---- reports ---- */
  function renderReports() {
    var body = $('atBody'); if (!body) return;
    body.innerHTML = '<div class="at-filters">' + rangeBar('reports') + '<button class="ap-btn sm" onclick="__atExportRep()">Export CSV</button><button class="ap-btn sm" onclick="__atPrint()">Print / PDF</button></div><div id="atRep"><div class="ap-empty">Loading…</div></div>';
    var d = rangeDates();
    post('adminAgentReport', { agent: S.repAgent || undefined, from: d.from, to: d.to }).then(function (r) {
      if (!r.ok) { $('atRep').innerHTML = '<div class="ap-empty">' + esc(r.error || 'Failed') + '</div>'; return; }
      S.rep = r; if (r.labels) LABELS = r.labels;
      S.repAgent ? drawAgent(r) : drawOverview(r);
    });
  }
  window.__atReport = function (email) { S.tab = 'reports'; S.repAgent = email; renderTeam(); };
  window.__atOverview = function () { S.repAgent = ''; renderReports(); };
  function stat(t, v, s) { return '<div class="at-stat"><small>' + t + '</small><b>' + v + '</b>' + (s ? '<em>' + s + '</em>' : '') + '</div>'; }
  function bars(map, days) {
    var keys = []; var from = new Date((S.rep.from || dayStr(Date.now() - 29 * 86400000)) + 'T00:00:00Z').getTime(), to = new Date((S.rep.to || dayStr(Date.now())) + 'T00:00:00Z').getTime();
    for (var t = from; t <= to && keys.length < 120; t += 86400000) keys.push(dayStr(t));
    var max = Math.max.apply(null, keys.map(function (k) { return map[k] || 0; }).concat([1]));
    return '<div class="at-bars">' + keys.map(function (k) { var v = map[k] || 0; return '<i title="' + k + ': ' + v + '" style="height:' + Math.max(2, Math.round(v / max * 100)) + '%"' + (v ? '' : ' class="z"') + '></i>'; }).join('') + '</div>';
  }
  function drawOverview(r) {
    var tot = r.rows.reduce(function (a, x) { a.actions += x.actions; a.money += x.money; a.logins += x.logins; a.denied += x.denied; a.views += x.views; return a; }, { actions: 0, money: 0, logins: 0, denied: 0, views: 0 });
    var staff = r.rows.filter(function (x) { return x.level === 'staff'; });
    var rows = r.rows.map(function (x) {
      return '<tr class="at-click" onclick="__atReport(\'' + esc(x.agent) + '\')"><td><div class="at-who">' + av(x.name, x.agent) + '<div><b>' + esc(x.name) + '</b><small>' + esc(x.agent) + '</small></div></div></td><td>' + (x.level === 'owner' ? pill('Owner', 'vio') : pill(x.disabled ? 'Disabled' : 'Admin', x.disabled ? 'bad' : 'cyan')) + '</td>' +
        '<td class="at-num">' + x.actions + '</td><td class="at-num">' + x.clients + '</td><td class="at-num">' + (x.money ? usd(x.money) : '—') + '</td><td class="at-num">' + x.logins + '</td><td class="at-num">' + (x.denied ? '<span class="at-badtxt">' + x.denied + '</span>' : '0') + '</td><td>' + bars(x.byDay) + '</td><td>' + (x.last ? ago(x.last) : '—') + '</td></tr>';
    }).join('');
    $('atRep').innerHTML = '<div class="at-stats">' + stat('Actions', tot.actions, 'by all admins') + stat('Admins active', r.rows.filter(function (x) { return x.actions || x.logins; }).length, 'of ' + r.rows.length) + stat('Money moved', usd(tot.money), 'balances, deposits, withdrawals') + stat('Sign-ins', tot.logins) + stat('Denied attempts', tot.denied, 'missing permissions') + '</div>' +
      '<div class="ap-card"><div class="ap-card-h"><div><h3>Per admin</h3><small>' + esc(r.from) + ' → ' + esc(r.to) + (r.truncated ? ' · partial (very large period)' : '') + ' · click a row for the full report</small></div></div><div class="at-scroll"><table class="at-table"><thead><tr><th>Admin</th><th>Role</th><th class="at-num">Actions</th><th class="at-num">Clients touched</th><th class="at-num">Money moved</th><th class="at-num">Sign-ins</th><th class="at-num">Denied</th><th>Activity</th><th>Last active</th></tr></thead><tbody>' + (rows || '<tr><td colspan="9"><div class="ap-empty">No admin activity in this period</div></td></tr>') + '</tbody></table></div></div>';
  }
  function drawAgent(r) {
    var x = r.rows.filter(function (a) { return a.agent === S.repAgent; })[0];
    if (!x) { $('atRep').innerHTML = '<div class="ap-empty">No data</div>'; return; }
    var acts = Object.keys(x.byAction).sort(function (a, b) { return x.byAction[b] - x.byAction[a]; });
    var max = Math.max.apply(null, acts.map(function (a) { return x.byAction[a]; }).concat([1]));
    var hmax = Math.max.apply(null, x.byHour.concat([1]));
    $('atRep').innerHTML = '<button class="at-link back" onclick="__atOverview()">← All admins</button>' +
      '<div class="at-agent">' + av(x.name, x.agent) + '<div><h3>' + esc(x.name) + '</h3><small>' + esc(x.agent) + ' · ' + (x.level === 'owner' ? 'Owner' : 'Admin') + (x.disabled ? ' · Disabled' : '') + '</small></div></div>' +
      '<div class="at-stats">' + stat('Actions', x.actions) + stat('Clients touched', x.clients) + stat('Money moved', usd(x.money)) + stat('Documents opened', x.views) + stat('Sign-ins', x.logins, x.failedLogins ? x.failedLogins + ' failed' : '') + stat('Denied attempts', x.denied) + '</div>' +
      '<div class="at-two"><div class="ap-card"><div class="ap-card-h"><h3>What they did</h3></div><div class="at-pad">' + (acts.map(function (a) { return '<div class="at-hb"><span>' + esc(label(a)) + '</span><div><i style="width:' + Math.round(x.byAction[a] / max * 100) + '%"></i></div><b>' + x.byAction[a] + '</b></div>'; }).join('') || '<div class="ap-mute">Nothing yet</div>') + '</div></div>' +
      '<div class="ap-card"><div class="ap-card-h"><h3>When they work</h3><small>by hour (UTC)</small></div><div class="at-pad"><div class="at-hours">' + x.byHour.map(function (v, h) { return '<i title="' + h + ':00 — ' + v + '" style="opacity:' + (v ? (0.25 + 0.75 * v / hmax) : 0.08) + '"></i>'; }).join('') + '</div><div class="at-hl"><span>00</span><span>06</span><span>12</span><span>18</span><span>23</span></div>' + bars(x.byDay) + '<div class="at-hl"><span>' + esc(r.from) + '</span><span>' + esc(r.to) + '</span></div></div></div></div>' +
      '<div class="ap-card"><div class="ap-card-h"><h3>Recent actions</h3><small>click a row to see exactly what changed</small></div><div class="at-scroll"><table class="at-table at-log"><thead><tr><th>Time</th><th>Action</th><th>Client</th><th>Details</th><th class="at-num">Amount</th><th></th></tr></thead><tbody>' + (r.recent.map(function (i) { return logRow(i, false); }).join('') || '<tr><td colspan="6"><div class="ap-empty">No actions</div></td></tr>') + '</tbody></table></div></div>';
  }
  window.__atExportRep = function () {
    var r = S.rep; if (!r) return;
    if (S.repAgent) {
      downloadCsv('report-' + S.repAgent + '-' + r.to + '.csv', [['Time (UTC)', 'Action', 'Client', 'Details', 'Amount USD', 'Result']].concat(r.recent.map(function (i) { return [new Date(i.ts).toISOString(), label(i.action), i.target, i.summary, i.money || '', i.ok ? 'OK' : 'Denied/failed']; })));
    } else {
      downloadCsv('agents-report-' + r.from + '_' + r.to + '.csv', [['Admin', 'E-mail', 'Role', 'Actions', 'Clients touched', 'Money moved USD', 'Sign-ins', 'Failed sign-ins', 'Denied attempts', 'Profiles opened', 'Last active']].concat(r.rows.map(function (x) { return [x.name, x.agent, x.level, x.actions, x.clients, x.money, x.logins, x.failedLogins, x.denied, x.views, x.last ? new Date(x.last).toISOString() : '']; })));
    }
  };
  window.__atPrint = function () {
    var rep = $('atRep'); if (!rep) return;
    var w = window.open('', '_blank'); if (!w) { toast('Allow pop-ups to print', true); return; }
    w.document.write('<!doctype html><title>Admin report</title><style>body{font:13px system-ui,sans-serif;color:#111;margin:28px}h1{font-size:20px;margin:0 0 4px}table{border-collapse:collapse;width:100%;margin:12px 0}th,td{border-bottom:1px solid #ddd;padding:6px 8px;text-align:left;font-size:12px}th{background:#f4f4f4}.at-stats{display:flex;gap:12px;flex-wrap:wrap;margin:12px 0}.at-stat{border:1px solid #ddd;border-radius:8px;padding:8px 12px}.at-stat small{display:block;color:#666}.at-stat b{font-size:16px}.at-bars,.at-hours,.at-hl,button,.ap-av{display:none}.at-num{text-align:right}</style><h1>NordicCrypto — admin activity report</h1><div>' + esc(S.rep.from) + ' → ' + esc(S.rep.to) + ' · generated ' + dtFull(Date.now()) + '</div>' + rep.innerHTML + '<script>setTimeout(function(){print()},300)<\/script>');
    w.document.close();
  };

  /* ================= STAFF: MY ACTIVITY + forced password change ================= */
  function renderMine(reset) {
    var box = $('at_myActivity'); if (!box) return;
    box.innerHTML = '<div class="at-head"><div><h2>My activity</h2><p>Everything you do in the admin panel is recorded. This is your own history.</p></div><button class="ap-btn" onclick="__atPwd()">Change my password</button></div>' +
      '<div class="at-filters">' + rangeBar('mine') + '</div><div class="ap-card"><div class="at-scroll"><table class="at-table at-log"><thead><tr><th>Time</th><th>Action</th><th>Client</th><th>Details</th><th class="at-num">Amount</th><th></th></tr></thead><tbody id="atMine"><tr><td colspan="6"><div class="ap-empty">Loading…</div></td></tr></tbody></table></div></div>';
    var d = rangeDates();
    post('adminMyActivity', { limit: 200, from: d.from, to: d.to }).then(function (r) {
      if (r.labels) LABELS = r.labels;
      $('atMine').innerHTML = r.ok && r.items.length ? r.items.map(function (i) {
        return '<tr' + (i.ok ? '' : ' class="at-bad"') + '><td class="at-nw">' + dt(i.ts) + '</td><td class="at-nw">' + esc(label(i.action)) + (i.ok ? '' : ' ' + pill('Denied', 'bad')) + '</td><td>' + esc(i.target || '—') + '</td><td class="at-sum">' + esc(i.summary || '') + '</td><td class="at-num">' + (i.money ? usd(i.money) : '') + '</td><td></td></tr>';
      }).join('') : '<tr><td colspan="6"><div class="ap-empty">No activity in this period</div></td></tr>';
    });
  }
  window.__atPwd = function (force) {
    var mk = modal('<div class="at-mh"><h3>' + (force ? 'Set your own password' : 'Change password') + '</h3>' + (force ? '' : '<button class="at-x" onclick="__atClose()">×</button>') + '</div><div class="at-form">' + (force ? '<p class="at-note" style="margin:0">You signed in with a temporary password. Please choose your own before continuing.</p>' : '') +
      '<label>Current password<input id="atOld" type="password" autocomplete="current-password"></label><label>New password (min. 10 characters)<input id="atNew" type="password" autocomplete="new-password"></label><label>Repeat new password<input id="atNew2" type="password" autocomplete="new-password"></label><div id="atErr" class="at-err"></div></div>' +
      '<div class="at-mf">' + (force ? '' : '<button class="ap-btn" onclick="__atClose()">Cancel</button>') + '<button class="ap-btn pri" id="atSave">Save password</button></div>');
    if (force) mk.setAttribute('data-sticky', '1');
    $('atSave').onclick = function () {
      var o = $('atOld').value, n = $('atNew').value, n2 = $('atNew2').value, er = $('atErr');
      if (n.length < 10) { er.textContent = 'Use at least 10 characters'; return; }
      if (n !== n2) { er.textContent = 'Passwords do not match'; return; }
      post('changePassword', { oldPassword: o, newPassword: n }).then(function (r) {
        if (!r.ok) { er.textContent = r.error || 'Failed'; return; }
        closeModal(); toast('Password changed. Please sign in again.');
        setTimeout(function () { try { localStorage.removeItem('session_token'); } catch (e) {} location.reload(); }, 1200);
      });
    };
  };
  function forcePassword() { window.__atPwd(true); }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
