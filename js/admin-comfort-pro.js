/* admin-comfort-pro.js v1 — small comforts for the admin panel:
   · "Your first day" checklist on the Dashboard (ticks itself when a section is opened)
   · "Needs attention" counter in the top bar (+ number in the browser tab title)
   · keyboard shortcuts: "g" then a letter jumps to a section, "/" finds a section, "?" shows the list
   · "Preview as…" (owner only): see the menu exactly as a chosen staff member sees it.
   Front-end only. It never changes permissions on the server. */
(function () {
  'use strict';
  if (window.__acComfort) return; window.__acComfort = 1;
  var BASE = window.WORKER_LOGIN_URL || window.WORKER_URL || 'https://nordic-deposit-checker.otis-790.workers.dev';
  var TAB_PERM = { stats: 'stats', clients: 'clients.view', verifications: 'kyc', chats: 'chat', emailChanges: 'clients.edit', withdrawals: 'withdrawals', deposits: 'deposits', deleted: 'clients.view', kycIncomplete: 'kyc', accessReq: 'kyc', taskQueue: '*' };
  var SV = null;                                   // staff preview: { name, email, perms }
  function $(s, r) { return (r || document).querySelector(s); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function token() { return typeof window.getSessionToken === 'function' ? window.getSessionToken() : localStorage.getItem('session_token'); }
  function post(action, body) {
    return fetch(BASE + '?action=' + action, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ token: token() }, body || {})) })
      .then(function (r) { return r.json(); }).catch(function () { return { ok: false }; });
  }
  function toast(m, w) { try { if (typeof window.toast === 'function') { window.toast(m, w); return; } } catch (e) { } }
  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
  function panel() { return document.getElementById('adminPanel'); }
  function panelOpen() { var p = panel(); return !!(p && p.getClientRects().length && getComputedStyle(p).visibility !== 'hidden'); }
  function navItem(t) { return $('#adminPanel .admin-sidebar .admin-nav-item[data-tab="' + t + '"]'); }
  function usable(t) { var n = navItem(t); return !!(n && n.style.display !== 'none' && !n.classList.contains('at-locked') && !n.classList.contains('acf-lock')); }
  function who() { var u = document.getElementById('adminUser'); return String((u && u.textContent) || 'admin').trim().toLowerCase(); }
  function go(t) { var n = navItem(t); if (n && n.style.display !== 'none') n.click(); else if (typeof window.showAdminTab === 'function') window.showAdminTab(t); }
  function badge(t) { var n = navItem(t), b = n && n.querySelector('.admin-nav-badge'); if (!b || b.style.display === 'none') return 0; var v = parseInt(b.textContent, 10); return isFinite(v) ? v : 0; }

  /* ---------- css ---------- */
  function css() {
    if ($('#acfCss')) return; var s = document.createElement('style'); s.id = 'acfCss';
    s.textContent =
      '.acf-card{position:relative;margin:0 0 20px;padding:18px 20px;border-radius:16px;border:1px solid rgba(200,255,77,.22);background:linear-gradient(135deg,rgba(200,255,77,.07),rgba(255,255,255,.02));animation:acfIn .35s ease}' +
      '@keyframes acfIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}' +
      '.acf-card h3{margin:0 0 2px;font-size:16px}.acf-card p{margin:0 0 12px;color:#8b95a5;font-size:13px}' +
      '.acf-x{position:absolute;top:10px;right:10px;width:28px;height:28px;border:0;border-radius:8px;background:transparent;color:#8b95a5;font-size:18px;cursor:pointer;line-height:1}.acf-x:hover{background:rgba(255,255,255,.08);color:inherit}' +
      '.acf-bar{height:6px;border-radius:9px;background:rgba(255,255,255,.08);overflow:hidden;margin:0 0 12px}.acf-bar i{display:block;height:100%;width:0;background:#c8ff4d;border-radius:9px;transition:width .4s}' +
      '.acf-steps{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:8px}' +
      '.acf-step{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);color:inherit;font:inherit;font-size:13.5px;text-align:left;cursor:pointer}' +
      '.acf-step:hover{border-color:#c8ff4d}.acf-step:focus-visible{outline:2px solid #c8ff4d;outline-offset:2px}' +
      '.acf-step .k{flex:none;width:20px;height:20px;border-radius:50%;border:2px solid #5b6577;display:flex;align-items:center;justify-content:center;font-size:12px;color:#0b0f14}' +
      '.acf-step.done .k{background:#c8ff4d;border-color:#c8ff4d}.acf-step.done .k::after{content:"✓"}.acf-step.done .l{opacity:.6;text-decoration:line-through}' +
      '.acf-step small{display:block;color:#8b95a5;font-size:11.5px}.acf-done{color:#c8ff4d;font-weight:700;font-size:13px;margin-top:10px}' +
      '.acf-attn{display:inline-flex;align-items:center;gap:8px;height:38px;padding:0 14px;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);color:inherit;font:inherit;font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap}' +
      '.acf-attn:hover{border-color:#c8ff4d}.acf-attn .n{min-width:20px;padding:1px 7px;border-radius:99px;background:#ff9f43;color:#1a1000;font-size:12px;text-align:center}' +
      '.acf-attn.ok{color:#8b95a5;font-weight:600}.acf-attn.ok .n{background:rgba(200,255,77,.2);color:#c8ff4d}' +
      '.acf-btn{display:inline-flex;align-items:center;gap:6px;height:38px;padding:0 12px;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);color:inherit;font:inherit;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap}.acf-btn:hover{border-color:#c8ff4d}' +
      '.acf-mask{position:fixed;inset:0;z-index:100000;background:rgba(5,8,12,.66);display:flex;align-items:center;justify-content:center;padding:16px}' +
      '.acf-box{width:min(520px,100%);max-height:86vh;overflow:auto;border-radius:18px;background:#121821;color:#e8edf5;border:1px solid rgba(255,255,255,.1);padding:22px;box-shadow:0 30px 80px rgba(0,0,0,.5)}' +
      '.acf-box h3{margin:0 0 4px;font-size:18px}.acf-box>p{margin:0 0 14px;color:#8b95a5;font-size:13px}' +
      '.acf-row{display:flex;align-items:center;gap:12px;width:100%;padding:11px 12px;margin:0 0 6px;border-radius:12px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);color:inherit;font:inherit;text-align:left;cursor:pointer}' +
      '.acf-row:hover{border-color:#c8ff4d}.acf-row b{display:block;font-size:14px}.acf-row small{color:#8b95a5;font-size:12px}' +
      '.acf-keys{display:grid;grid-template-columns:auto 1fr;gap:8px 14px;font-size:13.5px;align-items:center}.acf-keys kbd{display:inline-block;min-width:22px;padding:2px 8px;border-radius:7px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.06);font:600 12px ui-monospace,Menlo,monospace;text-align:center;margin-right:3px}' +
      '.acf-close{margin-top:12px;height:38px;padding:0 16px;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:transparent;color:inherit;font:inherit;cursor:pointer}' +
      '.acf-pv{position:sticky;top:-28px;z-index:20;margin:-28px -32px 18px;padding:10px 32px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;background:#c8ff4d;color:#10180a;font-size:13.5px;font-weight:600}' +
      '.acf-pv button{margin-left:auto;height:30px;padding:0 14px;border-radius:9px;border:0;background:#10180a;color:#c8ff4d;font:inherit;font-weight:700;cursor:pointer}' +
      '#adminPanel .admin-nav-item.acf-lock{opacity:.55}#adminPanel .admin-nav-item.acf-lock .anv-pin,#adminPanel .admin-nav-item.at-locked .anv-pin{display:none}#adminPanel .admin-nav-item .acf-lk{flex:none}#adminPanel .admin-nav-item .acf-lk{margin-left:auto;font-size:12px}' +
      '.acf-hint{position:fixed;left:18px;bottom:18px;z-index:99999;padding:10px 14px;border-radius:12px;background:#121821;color:#e8edf5;border:1px solid #c8ff4d;font-size:13px;box-shadow:0 10px 30px rgba(0,0,0,.4)}.acf-hint kbd{font:700 12px ui-monospace,monospace;color:#c8ff4d}' +
      'html[data-theme="light"] .acf-card{background:linear-gradient(135deg,rgba(120,180,0,.1),#fff);border-color:rgba(75,130,0,.3)}html[data-theme="light"] .acf-bar{background:rgba(15,23,42,.1)}html[data-theme="light"] .acf-bar i{background:#4b8200}' +
      'html[data-theme="light"] .acf-step,html[data-theme="light"] .acf-attn,html[data-theme="light"] .acf-btn{background:#fff;border-color:rgba(15,23,42,.14)}html[data-theme="light"] .acf-step.done .k{background:#4b8200;border-color:#4b8200;color:#fff}html[data-theme="light"] .acf-done,html[data-theme="light"] .acf-attn.ok .n{color:#2f5a00}' +
      'html[data-theme="light"] .acf-x:hover{background:rgba(15,23,42,.07)}html[data-theme="light"] .acf-box{background:#fff;color:#0f172a;border-color:rgba(15,23,42,.14)}html[data-theme="light"] .acf-row,html[data-theme="light"] .acf-keys kbd{background:#f6f8f2;border-color:rgba(15,23,42,.14)}' +
      'html[data-theme="light"] .acf-pv{background:#4b8200;color:#fff}html[data-theme="light"] .acf-pv button{background:#fff;color:#2f5a00}html[data-theme="light"] .acf-hint{background:#fff;color:#0f172a;border-color:#4b8200}html[data-theme="light"] .acf-hint kbd{color:#2f5a00}' +
      'html[data-theme="light"] .acf-attn,html[data-theme="light"] .acf-btn{color:#0f172a}html[data-theme="light"] .acf-attn.ok{color:#5b6577}' +
      '@media(max-width:900px){.acf-btn{display:none}.acf-pv{margin:-16px -16px 14px;padding:10px 16px;top:-16px}.acf-attn .t{display:none}.acf-hint{display:none}}' +
      '@media(prefers-reduced-motion:reduce){.acf-card{animation:none}.acf-bar i{transition:none}}';
    document.head.appendChild(s);
  }

  /* ---------- 1. first-day checklist ---------- */
  var STEPS = [
    ['taskQueue', 'Open the Task queue', 'Everything waiting for a decision, in one list'],
    ['verifications', 'Check a verification', 'Open one ID check and look at the details'],
    ['chats', 'Look at Live chats', 'Clients write here. Answer within a few minutes'],
    ['withdrawals', 'Review Withdrawals', 'Approve or reject payouts'],
    ['clients', 'Open a client profile', 'Add an internal note. The client never sees it']
  ];
  function clKey() { return 'nc_admin_first_' + who(); }
  function renderChecklist() {
    var sec = $('#adminPanel [data-section="stats"]'); if (!sec) return;
    var st = lsGet(clKey(), { done: {}, hide: false }), card = $('#acfCl');
    if (st.hide || SV) { if (card) card.remove(); return; }
    var list = STEPS.filter(function (s) { return usable(s[0]); }); if (!list.length) { if (card) card.remove(); return; }
    var n = list.filter(function (s) { return st.done[s[0]]; }).length, all = n === list.length;
    var sig = list.map(function (s) { return s[0] + (st.done[s[0]] ? 1 : 0); }).join();
    if (card && card.getAttribute('data-sig') === sig && card.parentNode === sec) return;
    if (!card) { card = document.createElement('div'); card.id = 'acfCl'; card.className = 'acf-card'; }
    card.setAttribute('data-sig', sig);
    card.innerHTML = '<button class="acf-x" type="button" aria-label="Hide this card" title="Hide">×</button><h3>Your first day</h3><p>' + (all ? 'You have seen every main section.' : 'A short tour of the places you will use most. Steps tick themselves when you open them.') + '</p>' +
      '<div class="acf-bar"><i style="width:' + Math.round(n / list.length * 100) + '%"></i></div><div class="acf-steps">' +
      list.map(function (s) { var d = st.done[s[0]]; return '<button type="button" class="acf-step' + (d ? ' done' : '') + '" data-t="' + s[0] + '"><span class="k"></span><span class="l">' + esc(s[1]) + '<small>' + esc(s[2]) + '</small></span></button>'; }).join('') + '</div>' +
      (all ? '<div class="acf-done">All done. You can hide this card.</div>' : '');
    card.querySelector('.acf-x').onclick = function () { st = lsGet(clKey(), { done: {}, hide: false }); st.hide = true; lsSet(clKey(), st); card.remove(); toast('Hidden. You can bring it back from the ? shortcuts window.'); };
    card.querySelectorAll('.acf-step').forEach(function (b) { b.onclick = function () { go(b.getAttribute('data-t')); }; });
    if (card.parentNode !== sec) sec.insertBefore(card, sec.firstChild);
  }
  function markVisited() {
    var a = $('#adminPanel .admin-sidebar .admin-nav-item.active'); if (!a || SV) return; var t = a.getAttribute('data-tab');
    if (!STEPS.some(function (s) { return s[0] === t; }) || !usable(t)) return;
    var st = lsGet(clKey(), { done: {}, hide: false }); if (st.done[t]) return; st.done[t] = 1; lsSet(clKey(), st);
  }

  /* ---------- 4. needs attention ---------- */
  var baseTitle = '';
  function attnCount() {
    var q = usable('taskQueue') ? badge('taskQueue') : 0, o = { taskQueue: q };
    ['chats', 'emailChanges'].forEach(function (t) { o[t] = usable(t) ? badge(t) : 0; });
    if (!q) ['withdrawals', 'deposits', 'verifications', 'accessReq'].forEach(function (t) { o[t] = usable(t) ? badge(t) : 0; });
    var sum = 0, parts = []; Object.keys(o).forEach(function (k) { if (o[k]) { sum += o[k]; var n = navItem(k); parts.push(o[k] + ' · ' + String((n && n.textContent) || k).replace(/[\d🔒]/g, '').replace(/\s+/g, ' ').trim()); } });
    return { n: sum, parts: parts, first: Object.keys(o).filter(function (k) { return o[k]; })[0] };
  }
  function renderAttn() {
    var top = $('#adminPanel .admin-top-actions'); if (!top) return;
    var b = $('#acfAttn'); if (!b) { b = document.createElement('button'); b.type = 'button'; b.id = 'acfAttn'; b.className = 'acf-attn'; b.onclick = function () { var c = attnCount(); go(c.first || 'taskQueue'); }; top.insertBefore(b, top.firstChild); }
    var c = attnCount();
    b.className = 'acf-attn' + (c.n ? '' : ' ok');
    b.innerHTML = c.n ? '<span class="n">' + (c.n > 99 ? '99+' : c.n) + '</span><span class="t">Need attention</span>' : '<span class="n">✓</span><span class="t">All clear</span>';
    b.title = c.n ? c.parts.join('\n') : 'Nothing is waiting for you';
    if (!baseTitle) baseTitle = document.title.replace(/^\(\d+\+?\)\s*/, '');
    if (panelOpen()) document.title = (c.n ? '(' + (c.n > 99 ? '99+' : c.n) + ') ' : '') + baseTitle;
  }

  /* ---------- 3. keyboard ---------- */
  var KEYS = [['d', 'stats', 'Dashboard'], ['q', 'taskQueue', 'Task queue'], ['c', 'clients', 'Clients'], ['v', 'verifications', 'Verifications'], ['w', 'withdrawals', 'Withdrawals'], ['p', 'deposits', 'Pending deposits'], ['l', 'chats', 'Live chats'], ['s', 'security', 'Security']];
  var gAt = 0, hintEl = null;
  function typing(e) { var t = e.target; return !!(t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))); }
  function hint(html, ms) { if (hintEl) hintEl.remove(); hintEl = document.createElement('div'); hintEl.className = 'acf-hint'; hintEl.innerHTML = html; document.body.appendChild(hintEl); var h = hintEl; setTimeout(function () { if (h.parentNode) h.remove(); }, ms || 1400); }
  function keysModal() {
    closeBox();
    var m = document.createElement('div'); m.className = 'acf-mask'; m.id = 'acfBox';
    m.innerHTML = '<div class="acf-box" role="dialog" aria-label="Keyboard shortcuts"><h3>Keyboard shortcuts</h3><p>Press <kbd>g</kbd> and then a letter, one after the other.</p><div class="acf-keys">' +
      KEYS.map(function (k) { return '<span><kbd>g</kbd><kbd>' + k[0] + '</kbd></span><span>' + k[2] + '</span>'; }).join('') +
      '<span><kbd>/</kbd></span><span>Find a section</span><span><kbd>?</kbd></span><span>This window</span><span><kbd>Esc</kbd></span><span>Close</span></div>' +
      '<button class="acf-close" type="button" data-a="close">Close</button> <button class="acf-close" type="button" data-a="tour">Show the “Your first day” card again</button></div>';
    m.addEventListener('mousedown', function (e) { if (e.target === m) closeBox(); });
    m.addEventListener('click', function (e) { var a = e.target.getAttribute && e.target.getAttribute('data-a'); if (a === 'close') closeBox(); if (a === 'tour') { lsSet(clKey(), { done: {}, hide: false }); closeBox(); go('stats'); renderChecklist(); } });
    document.body.appendChild(m); var c = m.querySelector('.acf-close'); if (c) c.focus();
  }
  function closeBox() { var m = $('#acfBox'); if (m) m.remove(); }
  document.addEventListener('keydown', function (e) {
    if (!panelOpen()) return;
    if (e.key === 'Escape' && $('#acfBox')) { closeBox(); return; }
    if (e.ctrlKey || e.metaKey || e.altKey || typing(e)) return;
    if (e.key === '?') { e.preventDefault(); keysModal(); return; }
    if (e.key === '/') { var q = $('#adminPanel .anv-q'); if (q && q.offsetParent) { e.preventDefault(); q.focus(); q.select(); } return; }
    var k = String(e.key || '').toLowerCase();
    if (gAt && Date.now() - gAt < 1200) {
      gAt = 0; var hit = KEYS.filter(function (x) { return x[0] === k; })[0];
      if (hit) { e.preventDefault(); if (navItem(hit[1])) { go(hit[1]); hint('Opened <kbd>' + esc(hit[2]) + '</kbd>', 900); } }
      return;
    }
    if (k === 'g' && !e.shiftKey) { gAt = Date.now(); hint('<kbd>g</kbd> then: ' + KEYS.map(function (x) { return '<kbd>' + x[0] + '</kbd> ' + esc(x[2]); }).join(' · '), 1300); }
  });

  /* ---------- 7. preview as staff ---------- */
  var members = null;
  function addPreviewBtn() {
    var top = $('#adminPanel .admin-top-actions'); if (!top || $('#acfPv')) return;
    if (!navItem('team')) return;                                  // only the owner has the Team section
    var b = document.createElement('button'); b.type = 'button'; b.id = 'acfPv'; b.className = 'acf-btn'; b.title = 'See the menu as one of your staff members sees it';
    b.innerHTML = '<span aria-hidden="true">👁</span><span class="t">Preview as…</span>'; b.onclick = pickMember;
    var a = $('#acfAttn'); top.insertBefore(b, a ? a.nextSibling : top.firstChild);
  }
  function pickMember() {
    if (SV) { stopPreview(); return; }
    closeBox();
    var m = document.createElement('div'); m.className = 'acf-mask'; m.id = 'acfBox';
    m.innerHTML = '<div class="acf-box" role="dialog" aria-label="Preview as staff"><h3>Preview as…</h3><p>You will see the menu exactly like this person sees it. Nothing changes for them, and you can leave any time.</p><div id="acfMem"><p>Loading…</p></div><button class="acf-close" type="button" data-a="close">Cancel</button></div>';
    m.addEventListener('mousedown', function (e) { if (e.target === m) closeBox(); });
    m.addEventListener('click', function (e) { if (e.target.getAttribute && e.target.getAttribute('data-a') === 'close') closeBox(); });
    document.body.appendChild(m);
    post('adminTeamList').then(function (r) {
      var box = $('#acfMem'); if (!box) return;
      if (!r || !r.ok) { box.innerHTML = '<p>Could not load the team. Try again.</p>'; return; }
      members = (r.members || []).filter(function (x) { return x.level === 'staff' && !x.disabled; });
      if (!members.length) { box.innerHTML = '<p>You have no staff members yet. Add one in Team &amp; reports.</p>'; return; }
      box.innerHTML = members.map(function (x, i) { return '<button type="button" class="acf-row" data-i="' + i + '"><span><b>' + esc(x.name) + '</b><small>' + esc(x.email) + ' · ' + (x.perms || []).length + ' permissions</small></span></button>'; }).join('');
      box.querySelectorAll('.acf-row').forEach(function (b) { b.onclick = function () { var x = members[+b.getAttribute('data-i')]; closeBox(); startPreview(x); }; });
    });
  }
  function applyPreview() {
    var nav = $('#adminPanel .admin-sidebar'); if (!nav) return;
    nav.querySelectorAll('.admin-nav-item[data-tab]').forEach(function (n) {
      var t = n.getAttribute('data-tab'); if (n.classList.contains('at-locked')) return;
      var need = TAB_PERM[t], allowed = need === '*' ? true : need ? SV.perms.indexOf(need) >= 0 : false;
      var hide = t === 'team' || t === 'myActivity' ? t === 'team' : !need, lock = !hide && !allowed;
      if (hide) { if (n.style.display !== 'none') { n.setAttribute('data-sv', '1'); n.style.display = 'none'; } return; }
      if (n.getAttribute('data-sv') === '1') { n.style.display = ''; n.removeAttribute('data-sv'); }
      var lk = n.querySelector('.acf-lk');
      if (lock && !lk) { n.classList.add('acf-lock'); lk = document.createElement('span'); lk.className = 'acf-lk'; lk.textContent = '🔒'; n.appendChild(lk); }
      if (!lock) { n.classList.remove('acf-lock'); if (lk) lk.remove(); }
    });
  }
  function clearPreview() {
    var nav = $('#adminPanel .admin-sidebar'); if (!nav) return;
    nav.querySelectorAll('.admin-nav-item[data-tab]').forEach(function (n) { n.classList.remove('acf-lock'); var lk = n.querySelector('.acf-lk'); if (lk) lk.remove(); if (n.getAttribute('data-sv') === '1') { n.style.display = ''; n.removeAttribute('data-sv'); } });
  }
  function banner() {
    var main = $('#adminPanel .admin-content'), b = $('#acfPvBar');
    if (!SV) { if (b) b.remove(); return; }
    if (!main) return;
    if (!b) { b = document.createElement('div'); b.id = 'acfPvBar'; b.className = 'acf-pv'; main.insertBefore(b, main.firstChild); }
    b.innerHTML = '<span>👁 Previewing as <b>' + esc(SV.name) + '</b>: locked sections show 🔒. Your own access is unchanged.</span><button type="button">Exit preview</button>';
    b.querySelector('button').onclick = stopPreview;
  }
  function startPreview(x) { SV = { name: x.name, email: x.email, perms: x.perms || [] }; applyPreview(); banner(); var pb = $('#acfPv'); if (pb) pb.querySelector('.t').textContent = 'Exit preview'; renderChecklist(); }
  function stopPreview() { SV = null; clearPreview(); banner(); var pb = $('#acfPv'); if (pb) pb.querySelector('.t').textContent = 'Preview as…'; renderChecklist(); }
  document.addEventListener('click', function (e) {                // a locked section during preview explains itself instead of opening
    if (!SV) return; var n = e.target.closest && e.target.closest('#adminPanel .admin-nav-item.acf-lock'); if (!n) return;
    e.stopPropagation(); e.preventDefault(); toast(SV.name + ' has no access to this section. They would see “Access required — ask the owner”.', 'warn');
  }, true);

  /* ---------- boot ---------- */
  function tick() {
    if (!panelOpen()) return; css(); renderAttn(); addPreviewBtn(); markVisited(); renderChecklist(); if (SV) { applyPreview(); banner(); }
  }
  setInterval(tick, 1500); setTimeout(tick, 600);
  document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('#adminPanel .admin-nav-item')) setTimeout(tick, 120); }, true);
})();
