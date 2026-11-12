/* admin-queue.js v1 — "Task queue": everything that waits for a decision in ONE list (withdrawals, deposits, verifications, access requests,
   withdrawals that still need a "credited" confirmation). Urgent items first. "Take" reserves a task so two people never do the same job.
   Needs worker actions listTasks / claimTask / releaseTask / markWithdrawalCredited. */
(function () {
  'use strict';
  if (window.__acQueue) return; window.__acQueue = 1;
  var BASE = window.WORKER_LOGIN_URL || window.WORKER_URL || 'https://nordic-deposit-checker.otis-790.workers.dev';
  var TAB = 'taskQueue', filt = 'all', data = [], me = '', isOwner = false, timer = null, booted = false;
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function token() { return typeof window.getSessionToken === 'function' ? window.getSessionToken() : localStorage.getItem('session_token'); }
  function post(action, body) {
    return fetch(BASE + '?action=' + action, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ token: token() }, body || {})) })
      .then(function (r) { return r.json(); }).catch(function () { return { ok: false, error: 'Connection error' }; });
  }
  function toast(m, w) { try { if (typeof window.toast === 'function') window.toast(m, w); } catch (e) { } }
  function ago(ts) { var s = Math.max(0, (Date.now() - ts) / 1000); if (s < 90) return 'just now'; if (s < 3600) return Math.round(s / 60) + ' min'; if (s < 86400) return Math.floor(s / 3600) + ' h ' + Math.round((s % 3600) / 60) + ' min'; return Math.floor(s / 86400) + ' d'; }
  var KIND = {
    withdrawal: ['Withdrawals', '#ff9f43', '<path d="M12 19V5M5 12l7-7 7 7"/>'],
    credit: ['Withdrawals', '#7cc4ff', '<path d="M5 12.5l4.5 4.5L19 7.5"/>'],
    deposit: ['Deposits', '#3ddc97', '<path d="M12 5v14M5 12l7 7 7-7"/>'],
    verification: ['Verifications', '#b3a8ff', '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>'],
    access: ['Access', '#c8ff4d', '<circle cx="8" cy="15" r="4"/><path d="M10.8 12.2L20 3M16 7l3 3"/>']
  };
  var CHIPS = [['all', 'All'], ['mine', 'Mine'], ['withdrawal', 'Withdrawals'], ['credit', 'To confirm'], ['deposit', 'Deposits'], ['verification', 'Verifications'], ['access', 'Access']];

  function css() {
    if ($('aqCss')) return; var s = document.createElement('style'); s.id = 'aqCss';
    s.textContent =
      '@keyframes aqIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}' +
      '#aqBox h2{margin:0 0 4px;font-size:22px}#aqBox .sub{color:#8b95a5;font-size:13px;margin-bottom:16px;max-width:760px}' +
      '#aqBox .stats{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px}#aqBox .stat{flex:1 1 130px;padding:12px 14px;border-radius:14px;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.03)}#aqBox .stat b{display:block;font-size:24px;line-height:1.1}#aqBox .stat span{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#8b95a5}' +
      '#aqBox .bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:14px}#aqBox .chip{padding:7px 13px;border-radius:99px;border:1px solid rgba(255,255,255,.14);background:transparent;color:inherit;font-size:13px;cursor:pointer;transition:.15s}#aqBox .chip:hover{border-color:rgba(200,255,77,.5)}#aqBox .chip.on{background:rgba(200,255,77,.13);border-color:#c8ff4d;color:#d6ff5c}' +
      '#aqBox .rf{margin-left:auto;font-size:12px;color:#8b95a5;display:flex;align-items:center;gap:8px}' +
      '#aqBox .q{position:relative;display:grid;grid-template-columns:auto 1fr auto;gap:14px;align-items:center;padding:14px 16px 14px 20px;border:1px solid rgba(255,255,255,.09);border-radius:16px;margin-bottom:10px;background:rgba(255,255,255,.03);animation:aqIn .3s ease both;overflow:hidden}' +
      '#aqBox .q:before{content:"";position:absolute;left:0;top:0;bottom:0;width:5px;background:var(--pc,#3b4252)}#aqBox .q.p2{--pc:#ff6b6b}#aqBox .q.p1{--pc:#ffb454}#aqBox .q.mine{border-color:rgba(200,255,77,.5);background:rgba(200,255,77,.05)}#aqBox .q.taken{opacity:.72}' +
      '#aqBox .ic{width:42px;height:42px;border-radius:13px;display:grid;place-items:center;background:color-mix(in srgb,var(--kc) 16%,transparent);color:var(--kc)}#aqBox .ic svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}' +
      '#aqBox .t{min-width:0}#aqBox .t b{display:block;font-size:14.5px}#aqBox .t .m{color:#8b95a5;font-size:12.5px;margin-top:2px;word-break:break-word}#aqBox .t .m u{text-decoration:none;color:#c9d3e1}' +
      '#aqBox .fl{display:flex;gap:6px;flex-wrap:wrap;margin-top:7px}#aqBox .pl{font-size:11px;font-weight:800;padding:3px 9px;border-radius:99px}#aqBox .pl.bad{background:rgba(255,107,107,.14);color:#ff8d8d}#aqBox .pl.warn{background:rgba(255,180,84,.14);color:#ffc16b}#aqBox .pl.tag{background:rgba(139,123,255,.16);color:#b8aeff}#aqBox .pl.who{background:rgba(200,255,77,.14);color:#d6ff5c}#aqBox .pl.age{background:rgba(255,255,255,.07);color:#aab4c5}' +
      '#aqBox .ac{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}#aqBox .ac .btn{padding:9px 14px;font-size:13px}' +
      '#aqBox .em0{padding:50px 10px;text-align:center;color:#8b95a5}#aqBox .em0 b{display:block;font-size:34px;margin-bottom:6px}' +
      '@media(max-width:700px){#aqBox .q{grid-template-columns:auto 1fr}#aqBox .ac{grid-column:1/-1;justify-content:stretch}#aqBox .ac .btn{flex:1}}' +
      'html[data-theme="light"] #aqBox .q,html[data-theme="light"] #aqBox .stat{background:#fff;border-color:rgba(15,23,42,.09)}html[data-theme="light"] #aqBox .q.mine{background:#f3fae2;border-color:rgba(63,114,0,.45)}html[data-theme="light"] #aqBox .t .m u{color:#1f2937}html[data-theme="light"] #aqBox .chip.on{background:rgba(63,114,0,.12);border-color:#3f7200;color:#2f5a00}html[data-theme="light"] #aqBox .pl.who{color:#2f5a00}html[data-theme="light"] #aqBox .pl.tag{color:#5b45e0}';
    document.head.appendChild(s);
  }
  function build(main) {
    var sec = document.createElement('div'); sec.className = 'admin-section'; sec.setAttribute('data-section', TAB);
    sec.innerHTML = '<div id="aqBox"><h2>📋 Task queue</h2><div class="sub">Everything that waits for a decision, most urgent first. Press <b>Take</b> so your colleagues know you are on it. A taken task frees itself after 6 hours.</div><div class="stats" id="aqStats"></div><div class="bar" id="aqBar"></div><div id="aqList"><div class="em0">Loading…</div></div></div>';
    main.appendChild(sec); sec.addEventListener('click', onClick);
  }
  function mineOf(t) { return t.claim && t.claim.by === me; }
  function draw() {
    var l = $('aqList'); if (!l) return;
    var rows = data.filter(function (t) { return filt === 'all' || (filt === 'mine' ? mineOf(t) : t.kind === filt); });
    var urgent = data.filter(function (t) { return t.prio >= 2; }).length, free = data.filter(function (t) { return !t.claim; }).length, mine = data.filter(mineOf).length;
    $('aqStats').innerHTML = '<div class="stat"><b>' + data.length + '</b><span>Open tasks</span></div><div class="stat"><b style="color:#ff8d8d">' + urgent + '</b><span>Urgent</span></div><div class="stat"><b>' + free + '</b><span>Not taken</span></div><div class="stat"><b style="color:#d6ff5c">' + mine + '</b><span>Mine</span></div>';
    $('aqBar').innerHTML = CHIPS.map(function (c) { var n = c[0] === 'all' ? data.length : c[0] === 'mine' ? mine : data.filter(function (t) { return t.kind === c[0]; }).length; return '<button class="chip' + (filt === c[0] ? ' on' : '') + '" data-f="' + c[0] + '">' + c[1] + ' · ' + n + '</button>'; }).join('') + '<span class="rf"><span id="aqUpd"></span><button class="btn b2" data-a="refresh" style="padding:7px 12px;font-size:12px">↻ Refresh</button></span>';
    l.innerHTML = rows.length ? rows.map(card).join('') : '<div class="em0"><b>✨</b>' + (filt === 'all' ? 'Nothing is waiting. Great work!' : 'Nothing in this list.') + '</div>';
    var n = $('aqUpd'); if (n) n.textContent = 'Updated ' + new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    var b = document.querySelector('#adminPanel .admin-nav-item[data-tab="' + TAB + '"] .admin-nav-badge'); if (b) { b.textContent = data.length; b.style.display = data.length ? '' : 'none'; }
  }
  function card(t) {
    var k = KIND[t.kind] || KIND.deposit, mineT = mineOf(t), other = t.claim && !mineT;
    var fl = (t.flags || []).map(function (f) { return '<span class="pl ' + esc(f[0]) + '">' + esc(f[1]) + '</span>'; }).join('') + (t.tags || []).map(function (g) { return '<span class="pl tag">' + esc(g) + '</span>'; }).join('') + '<span class="pl age">' + esc(ago(t.ts)) + (/just/.test(ago(t.ts)) ? '' : ' ago') + '</span>' + (t.claim ? '<span class="pl who">' + (mineT ? 'You are on it' : 'Taken by ' + esc(t.claim.name || t.claim.by)) + '</span>' : '');
    var btns = '';
    if (t.kind === 'credit') btns += '<button class="btn b1" data-a="credit" data-id="' + esc(t.id) + '">✓ Mark credited</button>';
    btns += '<button class="btn b2" data-a="open" data-id="' + esc(t.id) + '">Open</button>';
    if (!t.claim) btns += '<button class="btn ' + (t.kind === 'credit' ? 'b2' : 'b1') + '" data-a="take" data-id="' + esc(t.id) + '">Take</button>';
    else if (mineT) btns += '<button class="btn b2" data-a="release" data-id="' + esc(t.id) + '">Release</button>';
    else if (isOwner) btns += '<button class="btn b2" data-a="steal" data-id="' + esc(t.id) + '">Take over</button>';
    return '<div class="q p' + (t.prio || 0) + (mineT ? ' mine' : '') + (other ? ' taken' : '') + '" style="--kc:' + k[1] + '"><div class="ic"><svg viewBox="0 0 24 24">' + k[2] + '</svg></div><div class="t"><b>' + esc(t.title) + '</b><div class="m"><u>' + esc(t.name) + '</u> · ' + esc(t.email) + ' · ' + esc(t.sub || '') + '</div><div class="fl">' + fl + '</div></div><div class="ac">' + btns + '</div></div>';
  }
  function load(quiet) {
    return post('listTasks').then(function (r) {
      var l = $('aqList'); if (!l) return;
      if (!r || !r.ok) { if (!quiet) l.innerHTML = '<div class="em0">' + esc((r && r.error) || 'Could not load') + ((r && /unknown|not found/i.test(String(r.error))) ? '<br>Update the Cloudflare Worker with the newest worker.js.' : '') + '</div>'; return; }
      data = r.tasks || []; me = r.me || ''; isOwner = !!r.owner; draw();
    });
  }
  function find(id) { return data.filter(function (t) { return t.id === id; })[0]; }
  function onClick(e) {
    var c = e.target.closest('[data-f]'); if (c) { filt = c.getAttribute('data-f'); draw(); return; }
    var b = e.target.closest('[data-a]'); if (!b || b.disabled) return; var a = b.getAttribute('data-a'), id = b.getAttribute('data-id'), t = id ? find(id) : null;
    if (a === 'refresh') return load();
    if (a === 'open' && t) { if (typeof window.showAdminTab === 'function') window.showAdminTab(t.tab); return; }
    if (!t) return; b.disabled = true;
    if (a === 'take' || a === 'steal') return post('claimTask', { id: id, steal: a === 'steal' }).then(function (r) { if (!r.ok) toast(r.error || 'Failed', true); else toast('Task taken'); load(true); });
    if (a === 'release') return post('releaseTask', { id: id }).then(function (r) { if (!r.ok) toast(r.error || 'Failed', true); load(true); });
    if (a === 'credit') return post('markWithdrawalCredited', { email: t.email, id: t.ref }).then(function (r) { if (!r.ok) { toast(r.error || 'Failed', true); b.disabled = false; } else { toast('Marked as credited. The client was notified.'); post('releaseTask', { id: id }); load(true); } });
  }
  function boot() {
    if (booted) return; booted = true;
    post('adminMe').then(function (r) {
      if (!r || !r.ok || !r.me) return;
      var nav = document.querySelector('#adminPanel .admin-sidebar'), main = document.querySelector('#adminPanel .admin-content');
      if (!nav || !main || nav.querySelector('[data-tab="' + TAB + '"]')) return;
      css(); build(main);
      var d = document.createElement('div'); d.className = 'admin-nav-item'; d.setAttribute('data-tab', TAB); d.setAttribute('onclick', "showAdminTab('" + TAB + "')");
      d.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;flex:none"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg> Task queue <span class="admin-nav-badge warn" style="display:none">0</span>';
      var first = nav.querySelector('[data-tab="stats"]'); if (first && first.nextSibling) nav.insertBefore(d, first.nextSibling); else nav.appendChild(d);
      var orig = window.showAdminTab; window.showAdminTab = function (t) { if (orig) orig.apply(this, arguments); clearInterval(timer); if (t === TAB) { load(); timer = setInterval(function () { if (document.hidden) return; load(true); }, 30000); } };
      load(true); setInterval(function () { if (!document.hidden && !timer) load(true); }, 120000);
    });
  }
  function init() {
    var panel = $('adminPanel'); if (!panel) return;
    function check() { if (panel.classList.contains('on')) boot(); }
    new MutationObserver(check).observe(panel, { attributes: true, attributeFilter: ['class'] }); check();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
