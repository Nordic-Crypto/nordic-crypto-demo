/* admin-backup.js v1 — admin "Backups" tab (owner only): daily snapshots, download, restore everything or a single client */
(function () {
  'use strict';
  if (window.__ncAdminBk) return; window.__ncAdminBk = 1;
  var S = { list: [], cfg: { enabled: true, everyHours: 24 }, nextAt: null, busy: false, err: '', working: '' };
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


  function sz(n) { n = Number(n) || 0; return n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(1) + ' KB' : (n / 1048576).toFixed(1) + ' MB'; }
  function until(ts) { if (!ts) return '—'; var s = Math.floor((ts - Date.now()) / 1000); if (s <= 0) return 'any minute now'; if (s < 3600) return 'in ' + Math.ceil(s / 60) + ' min'; return 'in ' + Math.floor(s / 3600) + ' h ' + Math.floor(s % 3600 / 60) + ' min'; }
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


  function inject() {
    if ($('#nc-bk-css')) return;
    var st = document.createElement('style'); st.id = 'nc-bk-css'; st.textContent = CSS; document.head.appendChild(st);
  }
  function mount() {
    var side = $('.admin-sidebar'), main = $('.admin-content');
    if (!side || !main || $('[data-section="backups"]')) return !!$('[data-section="backups"]');
    inject();
    var nav = document.createElement('div'); nav.className = 'admin-nav-item'; nav.setAttribute('data-tab', 'backups');
    nav.innerHTML = '<span data-ap="1" style="background:none;-webkit-mask:none;mask:none;font-size:0"><svg class="ap-ico lg" viewBox="0 0 24 24"><ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6"/><path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/></svg></span> Backups';
    nav.onclick = function () { if (typeof showAdminTab === 'function') showAdminTab('backups'); load(); };
    var sys = side.querySelector('[data-tab="system"]'); side.insertBefore(nav, sys || null);
    var sec = document.createElement('div'); sec.className = 'admin-section'; sec.setAttribute('data-section', 'backups');
    sec.innerHTML = '<div class="sx" id="bkRoot"><div class="sx-e">Loading…</div></div>';
    main.appendChild(sec);
    sec.addEventListener('click', onClick); sec.addEventListener('change', onChange);
    return true;
  }
  function render() {
    var r = $('#bkRoot'); if (!r) return;
    var last = S.list[0], total = S.list.reduce(function (a, b) { return a + (b.size || 0); }, 0);
    var la = S.list.filter(function (b) { return b.kind === 'auto'; })[0];
    var h = '';
    if (S.err) h += '<div class="sx-card" style="border-color:rgba(255,82,82,.4);color:#ff8a8a">' + esc(S.err) + '</div>';
    h += '<div class="sx-stats">' +
      '<div class="sx-st g"><small>Last backup</small><b style="font-size:18px">' + (last ? ago(last.ts) : 'none yet') + '</b></div>' +
      '<div class="sx-st"><small>Next automatic</small><b style="font-size:18px">' + (S.cfg.enabled ? until(S.nextAt) : 'off') + '</b></div>' +
      '<div class="sx-st"><small>Copies kept</small><b>' + S.list.length + '</b></div>' +
      '<div class="sx-st"><small>Storage used</small><b style="font-size:20px">' + sz(total) + '</b></div></div>';
    h += '<div class="sx-card"><h3>💾 Backups <span><button class="sx-btn p" data-a="create"' + (S.working ? ' disabled' : '') + '>' + (S.working === 'create' ? 'Creating…' : '+ Back up now') + '</button> <button class="sx-btn s" data-a="refresh">🔄</button></span></h3>' +
      '<div class="sx-top" style="margin-bottom:0"><label style="display:flex;gap:8px;align-items:center;font-size:13px"><input type="checkbox" id="bkOn" ' + (S.cfg.enabled ? 'checked' : '') + '> Automatic backups</label>' +
      '<select class="sx-in" id="bkEvery" style="flex:0 0 auto;min-width:0"><option value="6">every 6 hours</option><option value="12">every 12 hours</option><option value="24">every 24 hours</option><option value="48">every 2 days</option></select></div>' +
      '<div style="color:#8b95a5;font-size:12px;margin-top:10px">Everything (clients, balances, operations, chats, settings, audit log) is saved as a compressed, checksummed file in private storage. The last 30 automatic and 30 manual copies are kept. Before every restore a safety copy of the current state is made first. Client documents (photos) are stored separately and are not touched.</div></div>';
    h += '<div class="sx-card"><h3>Saved copies</h3>';
    if (!S.list.length) h += '<div class="sx-e">No backups yet. Press “Back up now”.</div>';
    else {
      h += '<div class="sx-w"><table class="sx-tb"><tr><th>Created</th><th>Type</th><th>Records</th><th>Size</th><th>By</th><th></th></tr>';
      S.list.forEach(function (b) {
        h += '<tr><td title="' + esc(new Date(b.ts).toLocaleString()) + '">' + esc(dt(b.ts)) + ' <span style="color:#8b95a5">· ' + ago(b.ts) + '</span></td>' +
          '<td><span class="bk-kind ' + esc(b.kind) + '">' + (b.kind === 'pre' ? 'before restore' : esc(b.kind)) + '</span></td><td>' + (b.keys || 0) + '</td><td>' + sz(b.size) + '</td><td>' + esc(b.by) + '</td>' +
          '<td style="text-align:right;white-space:nowrap"><button class="sx-btn s p" data-a="restore" data-id="' + esc(b.id) + '">Restore…</button> <button class="sx-btn s" data-a="dl" data-id="' + esc(b.id) + '">⬇ Download</button> <button class="sx-btn s d" data-a="del" data-id="' + esc(b.id) + '">Delete</button></td></tr>';
      });
      h += '</table></div>';
    }
    h += '</div>';
    r.innerHTML = h;
    var ev = $('#bkEvery'); if (ev) ev.value = String(S.cfg.everyHours || 24);
  }
  function load() {
    if (S.busy) return; S.busy = true;
    api('bkList').then(function (d) {
      S.busy = false;
      if (!d || !d.ok) { S.err = (d && d.error) || 'Failed to load'; if (/owner|admin/i.test(S.err)) S.err = 'Only the owner account can open Backups.'; render(); return; }
      S.err = ''; S.list = d.backups || []; S.cfg = d.cfg || S.cfg; S.nextAt = d.nextAt; render();
    }).catch(function () { S.busy = false; S.err = 'Connection error'; render(); });
  }
  function modal(html) {
    var m = document.createElement('div'); m.className = 'sx-m'; m.innerHTML = '<div class="sx-md">' + html + '</div>';
    m.addEventListener('click', function (e) { if (e.target === m || e.target.getAttribute('data-x')) m.remove(); });
    document.body.appendChild(m); return m;
  }
  function download(id) {
    api('bkDownload', { id: id }).then(function (d) {
      if (!d || !d.ok) return alert((d && d.error) || 'Download failed');
      var bin = atob(d.b64), u8 = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([u8], { type: 'application/gzip' })); a.download = d.name; document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    });
  }
  function runRestore(m, id, mode, email) {
    var box = $('#bkRun', m); box.innerHTML = '<div style="font-size:13px" id="bkRunT">Making a safety copy of the current state…</div><div class="bk-prog"><i id="bkBar"></i></div>';
    function step(off) {
      api('bkRestore', { id: id, mode: mode, email: email, offset: off, confirm: 'RESTORE' }).then(function (d) {
        if (!d || !d.ok) { box.innerHTML = '<div style="color:#ff8a8a">' + esc((d && d.error) || 'Restore failed') + '</div><button class="sx-btn s" data-x="1">Close</button>'; return; }
        var pct = d.total ? Math.min(100, Math.round(d.next / d.total * 100)) : 100;
        $('#bkBar', m).style.width = pct + '%'; $('#bkRunT', m).textContent = 'Restoring… ' + d.next + ' / ' + d.total;
        if (d.done) { box.innerHTML = '<div style="color:#34d399;font-weight:700;margin-bottom:10px">✓ Restored ' + d.total + ' records.</div><div style="color:#8b95a5;font-size:12px;margin-bottom:12px">A safety copy of the state before the restore is saved under “before restore”.</div><button class="sx-btn p" id="bkReload">Done</button>'; $('#bkReload', m).onclick = function () { m.remove(); load(); }; return; }
        step(d.next);
      }).catch(function () { box.innerHTML = '<div style="color:#ff8a8a">Connection error. Run the restore again — it is safe to repeat.</div><button class="sx-btn s" data-x="1">Close</button>'; });
    }
    step(0);
  }
  function restore(id) {
    api('bkInspect', { id: id }).then(function (d) {
      if (!d || !d.ok) return alert((d && d.error) || 'Cannot open this backup');
      var b = d.backup, opts = d.users.map(function (u) { return '<option value="' + esc(u.email) + '">' + esc(u.email) + (u.name ? ' — ' + esc(u.name) : '') + (u.deleted ? ' (deleted)' : '') + '</option>'; }).join('');
      var h = '<h3 style="margin:0 0 4px;display:flex;justify-content:space-between">Restore from ' + esc(dt(b.ts)) + ' <button class="sx-btn s" data-x="1">Close</button></h3>' +
        '<div style="color:#8b95a5;font-size:12px;margin-bottom:14px">' + b.keys + ' records · ' + d.users.length + ' clients · ' + sz(b.size) + '</div>' +
        '<div class="sx-card" style="margin-bottom:12px"><h3 style="font-size:14px">Restore one client</h3><div style="color:#8b95a5;font-size:12px;margin-bottom:10px">Brings back this client’s account, balances, operations, chat and settings as they were. Other clients are not touched.</div>' +
        '<div class="sx-top" style="margin:0"><select class="sx-in" id="bkUser">' + (opts || '<option value="">No clients in this backup</option>') + '</select><button class="sx-btn p" id="bkGoUser"' + (opts ? '' : ' disabled') + '>Restore client</button></div></div>' +
        '<div class="sx-card" style="margin-bottom:12px;border-color:rgba(255,82,82,.35)"><h3 style="font-size:14px;color:#ff8a8a">Restore everything</h3><div style="color:#8b95a5;font-size:12px;margin-bottom:10px">Replaces <b>all</b> current data with this backup. Everything that happened after ' + esc(dt(b.ts)) + ' (new clients, deposits, withdrawals, messages) will be lost from the live system. Use this only after a serious failure.</div>' +
        '<div class="sx-top" style="margin:0"><input class="sx-in" id="bkConf" placeholder="Type RESTORE to confirm"><button class="sx-btn d" id="bkGoAll">Restore everything</button></div></div><div id="bkRun"></div>';
      var m = modal(h);
      $('#bkGoUser', m).onclick = function () { var em = $('#bkUser', m).value; if (!em) return; if (!confirm('Restore ' + em + ' to the state of ' + dt(b.ts) + '?')) return; lock(m); runRestore(m, id, 'user', em); };
      $('#bkGoAll', m).onclick = function () { if (($('#bkConf', m).value || '').trim() !== 'RESTORE') return alert('Type RESTORE in the field to confirm.'); if (!confirm('Last check: replace ALL current data with the backup from ' + dt(b.ts) + '?')) return; lock(m); runRestore(m, id, 'all', ''); };
    });
  }
  function lock(m) { Array.prototype.forEach.call(m.querySelectorAll('.sx-card'), function (c) { c.style.display = 'none'; }); }
  function onClick(e) {
    var b = e.target.closest('[data-a]'); if (!b) return; var a = b.getAttribute('data-a'), id = b.getAttribute('data-id');
    if (a === 'refresh') return load();
    if (a === 'create') { S.working = 'create'; render(); api('bkCreate').then(function (d) { S.working = ''; if (!d || !d.ok) S.err = (d && d.error) || 'Backup failed'; else S.err = ''; load(); render(); }).catch(function () { S.working = ''; S.err = 'Connection error'; render(); }); return; }
    if (a === 'dl') return download(id);
    if (a === 'restore') return restore(id);
    if (a === 'del') { if (confirm('Delete this backup permanently?')) api('bkDelete', { id: id }).then(function (d) { d && d.ok ? load() : alert((d && d.error) || 'Error'); }); }
  }
  function onChange(e) {
    if (e.target.id === 'bkOn' || e.target.id === 'bkEvery') {
      api('bkConfig', { enabled: $('#bkOn').checked, everyHours: Number($('#bkEvery').value) }).then(function (d) { if (d && d.ok) { S.cfg = d.cfg; load(); } else alert((d && d.error) || 'Error'); });
    }
  }
  var tries = 0;
  (function wait() { if (mount()) return; if (++tries < 120) setTimeout(wait, 500); })();
  var mo = new MutationObserver(function () { if (!$('[data-section="backups"]')) mount(); });
  document.addEventListener('DOMContentLoaded', function () { mo.observe(document.body, { childList: true, subtree: true }); });
  if (document.body) mo.observe(document.body, { childList: true, subtree: true });
})();
