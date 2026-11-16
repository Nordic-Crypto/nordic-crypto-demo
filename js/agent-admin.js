/* agent-admin.js v1 — owner tools for chat-only agents (Team & reports tab):
   create an agent, give each agent their own clients, switch an agent off. */
(function () {
  'use strict';
  if (window.__agAdmin) return; window.__agAdmin = 1;
  var BASE = window.WORKER_LOGIN_URL || window.WORKER_URL || 'https://nordic-deposit-checker.otis-790.workers.dev';
  function $(s, r) { return (r || document).querySelector(s); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function tok() { return typeof window.getSessionToken === 'function' ? window.getSessionToken() : localStorage.getItem('session_token'); }
  function api(a, b) { return fetch(BASE + '?action=' + a, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ token: tok() }, b || {})) }).then(function (r) { return r.json(); }).catch(function () { return { ok: false, error: 'Connection problem' }; }); }
  function toast(m) { try { if (typeof window.toast === 'function') return window.toast(m); } catch (e) { } var t = document.createElement('div'); t.style.cssText = 'position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:100090;padding:10px 16px;border-radius:12px;background:#121821;color:#e8edf5;border:1px solid #c8ff4d;font-size:13px'; t.textContent = m; document.body.appendChild(t); setTimeout(function () { t.remove(); }, 3000); }
  var agents = [], map = {}, clients = null, busy = false;

  function css() {
    if ($('#aaCss')) return; var s = document.createElement('style'); s.id = 'aaCss';
    s.textContent =
      '.aa-card{margin:0 0 22px;padding:20px;border-radius:18px;border:1px solid rgba(200,255,77,.22);background:linear-gradient(135deg,rgba(200,255,77,.06),rgba(255,255,255,.02))}.aa-h{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:4px}.aa-h h3{margin:0;font-size:17px}.aa-p{margin:0 0 14px;color:#8b95a5;font-size:13px}' +
      '.aa-btn{height:38px;padding:0 14px;border-radius:11px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);color:inherit;font:inherit;font-size:13px;font-weight:700;cursor:pointer}.aa-btn:hover{border-color:#c8ff4d}.aa-btn.pr{background:#c8ff4d;border-color:#c8ff4d;color:#10180a}.aa-btn.dg:hover{border-color:#ff6b7a;color:#ff8b97}.aa-btn[disabled]{opacity:.5;cursor:default}.aa-sp{flex:1}' +
      '.aa-row{display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding:13px 14px;margin:0 0 8px;border-radius:14px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03)}.aa-row b{display:block;font-size:14.5px}.aa-row small{color:#8b95a5;font-size:12.5px}.aa-row .w{min-width:200px;flex:1}.aa-cnt{padding:3px 11px;border-radius:99px;background:rgba(200,255,77,.14);color:#d6ff5c;font-size:12.5px;font-weight:700}.aa-off{padding:3px 10px;border-radius:99px;background:rgba(255,107,122,.14);color:#ff8b97;font-size:12px;font-weight:700}' +
      '.aa-mask{position:fixed;inset:0;z-index:100070;background:rgba(4,6,10,.66);backdrop-filter:blur(5px);display:flex;align-items:center;justify-content:center;padding:16px}.aa-box{width:min(560px,100%);max-height:88vh;display:flex;flex-direction:column;border-radius:20px;background:#121821;color:#e8edf5;border:1px solid rgba(255,255,255,.1);padding:22px;box-shadow:0 30px 80px rgba(0,0,0,.55)}.aa-box h3{margin:0 0 4px;font-size:18px}.aa-box>p{margin:0 0 14px;color:#8b95a5;font-size:13px}' +
      '.aa-in{width:100%;height:42px;padding:0 12px;margin:0 0 12px;border-radius:11px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);color:inherit;font:inherit;outline:0;box-sizing:border-box}.aa-in:focus{border-color:#c8ff4d}.aa-lb{display:block;margin:0 0 5px;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#8b95a5}' +
      '.aa-ls{flex:1;min-height:120px;overflow:auto;margin:0 -6px 14px;padding:0 6px}.aa-ci{display:flex;align-items:center;gap:12px;padding:10px 10px;border-radius:12px;cursor:pointer}.aa-ci:hover{background:rgba(255,255,255,.05)}.aa-ci input{width:18px;height:18px;accent-color:#c8ff4d;flex:none}.aa-ci b{display:block;font-size:14px}.aa-ci small{color:#8b95a5;font-size:12px}.aa-ci i{margin-left:auto;font-style:normal;font-size:11.5px;color:#ffb454;white-space:nowrap}' +
      '.aa-ft{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.aa-msg{color:#8b95a5;font-size:12.5px}.aa-ok{color:#34d399}' +
      'html[data-theme="light"] .aa-card{background:linear-gradient(135deg,rgba(120,180,0,.09),#fff);border-color:rgba(75,130,0,.3)}html[data-theme="light"] .aa-btn,html[data-theme="light"] .aa-row,html[data-theme="light"] .aa-in{background:#fff;border-color:rgba(15,23,42,.14)}html[data-theme="light"] .aa-btn.pr{background:#4b8200;color:#fff;border-color:#4b8200}html[data-theme="light"] .aa-box{background:#fff;color:#0f172a;border-color:rgba(15,23,42,.14)}html[data-theme="light"] .aa-cnt{background:rgba(75,130,0,.12);color:#2f5a00}';
    document.head.appendChild(s);
  }

  function load() {
    if (busy) return; busy = true;
    Promise.all([api('adminTeamList'), api('adminAgentAssignments')]).then(function (r) {
      busy = false; if (!r[0].ok) return;
      agents = (r[0].members || []).filter(function (m) { return m.agent && !m.deleted; }); map = (r[1] && r[1].map) || {}; draw();
    });
  }
  function count(e) { return Object.keys(map).filter(function (c) { return map[c] === e; }).length; }
  function draw() {
    var sec = $('#adminPanel [data-section="team"]'); if (!sec) return; var c = $('#aaCard');
    if (!c) { c = document.createElement('div'); c.id = 'aaCard'; c.className = 'aa-card'; sec.insertBefore(c, sec.firstChild); }
    c.innerHTML = '<div class="aa-h"><h3>Chat agents</h3><span class="aa-sp"></span><button class="aa-btn pr" id="aaNew" type="button">+ New agent</button></div><p class="aa-p">Agents see only the chat and only the clients you give them. They cannot open the admin panel, balances or documents.</p>' +
      (agents.length ? agents.map(function (a, i) { return '<div class="aa-row"><div class="w"><b>' + esc(a.name) + '</b><small>' + esc(a.email) + (a.lastLoginAt ? ' · last sign-in ' + esc(new Date(a.lastLoginAt).toLocaleDateString()) : ' · never signed in') + '</small></div>' + (a.disabled ? '<span class="aa-off">Disabled</span>' : '') + '<span class="aa-cnt">' + count(a.email) + ' clients</span><button class="aa-btn pr" data-a="open" data-i="' + i + '" type="button">Open</button><button class="aa-btn" data-a="assign" data-i="' + i + '" type="button">Assign clients</button><button class="aa-btn" data-a="toggle" data-i="' + i + '" type="button">' + (a.disabled ? 'Enable' : 'Disable') + '</button><button class="aa-btn dg" data-a="del" data-i="' + i + '" type="button">Remove</button></div>'; }).join('') : '<div class="aa-row"><div class="w"><small>No agents yet. Press “New agent” to add the first one.</small></div></div>');
    $('#aaNew').onclick = newAgent; queueLine(c);
    c.querySelectorAll('[data-a]').forEach(function (b) { b.onclick = function () { var a = agents[+b.getAttribute('data-i')], k = b.getAttribute('data-a'); if (k === 'open') overview(a); else if (k === 'assign') assign(a); else if (k === 'toggle') api('adminTeamUpdate', { email: a.email, disabled: !a.disabled }).then(function (r) { toast(r.ok ? (a.disabled ? 'Agent enabled' : 'Agent disabled') : r.error || 'Failed'); load(); }); else if (k === 'del' && confirm('Remove ' + a.name + '? Their clients are unassigned.')) api('adminTeamDelete', { email: a.email }).then(function (r) { if (r.ok) api('adminAgentAssign', { agent: a.email, clients: [] }); toast(r.ok ? 'Agent removed' : r.error || 'Failed'); load(); }); }; });
  }
  function modal(html) { var m = document.createElement('div'); m.className = 'aa-mask'; m.id = 'aaMask'; m.innerHTML = '<div class="aa-box" role="dialog">' + html + '</div>'; m.addEventListener('mousedown', function (e) { if (e.target === m) m.remove(); }); document.body.appendChild(m); return m; }
  function genPw() { var a = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789', o = '', r = crypto.getRandomValues(new Uint32Array(14)); for (var i = 0; i < 14; i++) o += a[r[i] % a.length]; return o + '#7'; }
  function newAgent() {
    var m = modal('<h3>New chat agent</h3><p>They sign in on the normal admin login page and land in the agent desk. They must set their own password at first sign-in.</p><label class="aa-lb" for="aaN">Name</label><input class="aa-in" id="aaN" maxlength="80" placeholder="e.g. Anna Berg"><label class="aa-lb" for="aaE">E-mail (their login)</label><input class="aa-in" id="aaE" type="email" maxlength="120" placeholder="anna@example.com"><label class="aa-lb" for="aaP">Temporary password</label><div style="display:flex;gap:8px"><input class="aa-in" id="aaP" maxlength="100" value="' + genPw() + '"><button class="aa-btn" id="aaG" type="button" style="flex:none">New</button></div><div class="aa-ft"><button class="aa-btn pr" id="aaS" type="button">Create agent</button><button class="aa-btn" id="aaC" type="button">Cancel</button><span class="aa-msg" id="aaM"></span></div>');
    $('#aaG').onclick = function () { $('#aaP').value = genPw(); }; $('#aaC').onclick = function () { m.remove(); };
    $('#aaS').onclick = function () {
      var n = $('#aaN').value.trim(), e = $('#aaE').value.trim(), p = $('#aaP').value; $('#aaM').textContent = 'Creating…';
      api('adminTeamCreate', { name: n, email: e, password: p, perms: ['chat'], agent: true, note: 'Chat agent' }).then(function (r) {
        if (!r.ok) { $('#aaM').textContent = r.error || 'Could not create'; return; }
        m.querySelector('.aa-box').innerHTML = '<h3>Agent created</h3><p>Send these details to ' + esc(n) + ' in a safe way. The password is shown only now.</p><label class="aa-lb">Login</label><input class="aa-in" readonly value="' + esc(e) + '"><label class="aa-lb">Temporary password</label><input class="aa-in" readonly value="' + esc(p) + '"><div class="aa-ft"><button class="aa-btn pr" id="aaCp" type="button">Copy both</button><button class="aa-btn" id="aaD" type="button">Done, assign clients</button></div>';
        $('#aaCp').onclick = function () { try { navigator.clipboard.writeText('Login: ' + e + '\nPassword: ' + p); toast('Copied'); } catch (x) { } };
        $('#aaD').onclick = function () { m.remove(); api('adminTeamList').then(function (t) { agents = (t.members || []).filter(function (x) { return x.agent; }); var a = agents.filter(function (x) { return x.email === e.toLowerCase(); })[0]; draw(); if (a) assign(a); }); };
      });
    };
  }
  function assign(a, after) {
    var sel = {}; Object.keys(map).forEach(function (c) { if (map[c] === a.email) sel[c] = 1; });
    var m = modal('<h3>Clients for ' + esc(a.name) + '</h3><p>Tick the clients this agent will talk to. A client belongs to one agent, so ticking one that has another agent moves them here.</p><input class="aa-in" id="aaQ" type="search" placeholder="Search clients by name or e-mail" style="margin-bottom:8px"><div class="aa-ls" id="aaL"><div class="aa-msg">Loading clients…</div></div><div class="aa-ft"><button class="aa-btn pr" id="aaS" type="button">Save</button><button class="aa-btn" id="aaC" type="button">Cancel</button><span class="aa-msg" id="aaM"></span></div>');
    $('#aaC').onclick = function () { m.remove(); if (after) after(); };
    function paint() {
      var qv = $('#aaQ').value.trim().toLowerCase(), box = $('#aaL'), nm = {}; agents.forEach(function (x) { nm[x.email] = x.name; });
      var rows = (clients || []).filter(function (u) { return !qv || (u.name + ' ' + u.email).toLowerCase().indexOf(qv) > -1; }).sort(function (x, y) { return (sel[y.email] ? 1 : 0) - (sel[x.email] ? 1 : 0) || String(x.name).localeCompare(String(y.name)); }).slice(0, 300);
      box.innerHTML = rows.length ? rows.map(function (u) { var oth = map[u.email] && map[u.email] !== a.email ? nm[map[u.email]] || 'another agent' : ''; return '<label class="aa-ci"><input type="checkbox" data-e="' + esc(u.email) + '"' + (sel[u.email] ? ' checked' : '') + '><span><b>' + esc(u.name || u.email) + '</b><small>' + esc(u.email) + '</small></span>' + (oth ? '<i>now with ' + esc(oth) + '</i>' : '') + '</label>'; }).join('') : '<div class="aa-msg">No clients match.</div>';
      box.querySelectorAll('input').forEach(function (i) { i.onchange = function () { if (i.checked) sel[i.getAttribute('data-e')] = 1; else delete sel[i.getAttribute('data-e')]; $('#aaM').textContent = Object.keys(sel).length + ' selected'; }; });
      $('#aaM').textContent = Object.keys(sel).length + ' selected';
    }
    $('#aaQ').oninput = paint;
    function ready() { paint(); }
    if (clients) ready(); else api('listUsers').then(function (r) { clients = (r.users || []).filter(function (u) { return u.role !== 'admin'; }); ready(); });
    $('#aaS').onclick = function () {
      $('#aaM').textContent = 'Saving…';
      api('adminAgentAssign', { agent: a.email, clients: Object.keys(sel) }).then(function (r) { if (!r.ok) { $('#aaM').textContent = r.error || 'Failed'; return; } m.remove(); toast('Saved: ' + r.count + ' clients'); load(); if (after) after(); });
    };
  }

  /* ---- unassigned chats waiting (clients who wrote but have no agent) ---- */
  var waiting = [];
  function queueLine(c) {
    var old = $('#aaQ0'); if (old) old.remove(); if (!waiting.length || !agents.length) return;
    var d = document.createElement('div'); d.id = 'aaQ0'; d.className = 'aa-row'; d.style.borderColor = 'rgba(255,180,84,.45)';
    d.innerHTML = '<div class="w"><b>' + waiting.length + ' client' + (waiting.length > 1 ? 's' : '') + ' wrote and ha' + (waiting.length > 1 ? 've' : 's') + ' no agent</b><small>Nobody but you sees these chats. Give them to an agent.</small></div><button class="aa-btn pr" type="button">Assign now</button>';
    d.querySelector('button').onclick = unassigned; var h = c.querySelector('.aa-p'); h.parentNode.insertBefore(d, h.nextSibling);
  }
  function loadWaiting() { api('agentInbox').then(function (r) { if (r && r.ok && r.all) { waiting = (r.items || []).filter(function (x) { return !x.agent && x.unread > 0; }); var c = $('#aaCard'); if (c) queueLine(c); } }); }
  function agentSelect(id, exclude) { return '<select class="aa-in" id="' + id + '" style="height:34px;margin:0;width:auto;padding:0 8px"><option value="">Choose agent…</option>' + agents.filter(function (a) { return !a.disabled && a.email !== exclude; }).map(function (a) { return '<option value="' + esc(a.email) + '">' + esc(a.name) + '</option>'; }).join('') + '</select>'; }
  function unassigned() {
    var m = modal('<h3>Chats without an agent</h3><p>These clients wrote to support, but no agent handles them yet.</p><div class="aa-ls" id="aaW"></div><div class="aa-ft"><button class="aa-btn" id="aaC" type="button">Close</button></div>');
    $('#aaC').onclick = function () { m.remove(); };
    function paint() { $('#aaW').innerHTML = waiting.length ? waiting.map(function (u, i) { return '<div class="aa-ci" style="cursor:default"><span><b>' + esc(u.name) + '</b><small>' + esc(u.lastText) + '</small></span><i style="margin-left:auto;display:flex;gap:6px;align-items:center;color:inherit">' + agentSelect('aaW' + i) + '<button class="aa-btn pr" data-i="' + i + '" type="button" style="height:34px">Give</button></i></div>'; }).join('') : '<div class="aa-msg">Everything is assigned.</div>';
      $('#aaW').querySelectorAll('button[data-i]').forEach(function (b) { b.onclick = function () { var i = +b.getAttribute('data-i'), to = $('#aaW' + i).value; if (!to) { toast('Choose an agent first'); return; } var list = Object.keys(map).filter(function (c) { return map[c] === to; }).concat([waiting[i].email]); b.disabled = true; api('adminAgentAssign', { agent: to, clients: list }).then(function (r) { if (r.ok) { map[waiting[i].email] = to; waiting.splice(i, 1); toast('Given to the agent'); paint(); draw(); } else { toast(r.error || 'Failed'); b.disabled = false; } }); }; }); }
    paint();
  }

  /* ---- one agent: who they handle, with remove / move / open ---- */
  var ovTimer = 0;
  function overview(a) {
    clearInterval(ovTimer);
    var m = modal('<h3>' + esc(a.name) + '</h3><p>' + esc(a.email) + '</p><div id="aaOv"><div class="aa-msg">Loading…</div></div>');
    var box = m.querySelector('.aa-box'); box.style.width = 'min(720px,100%)';
    var closeIt = function () { clearInterval(ovTimer); m.remove(); }; m.addEventListener('mousedown', function (e) { if (e.target === m) clearInterval(ovTimer); });
    var q = '';
    function stat(l, v, w) { return '<div style="flex:1;min-width:120px;padding:12px 14px;border-radius:13px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03)"><small style="color:#8b95a5;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase">' + l + '</small><div style="font-size:22px;font-weight:800;margin-top:2px;' + (w ? 'color:#ffb454' : '') + '">' + v + '</div></div>'; }
    function ft(ts) { if (!ts) return ''; var d = new Date(ts); return d.toDateString() === new Date().toDateString() ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString([], { day: '2-digit', month: 'short' }); }
    var last = null;
    function paint(r) {
      last = r || last; if (!last) return; var o = $('#aaOv'); if (!o) return; r = last; var st = r.stats;
      var rows = r.clients.filter(function (c) { return !q || (c.name + ' ' + c.email).toLowerCase().indexOf(q) > -1; });
      o.innerHTML = '<div style="display:flex;gap:10px;flex-wrap:wrap;margin:0 0 14px">' + stat('Clients', st.clients) + stat('Unread', st.unread, st.unread > 0) + stat('Waiting for reply', st.waiting, st.waiting > 0) + stat('Replies today', st.today) + stat('Last 7 days', st.week) + '</div>' +
        '<div style="color:#8b95a5;font-size:12.5px;margin:0 0 10px">' + (r.agent.disabled ? 'This agent is disabled and cannot sign in. ' : '') + (r.agent.lastLoginAt ? 'Last sign-in ' + esc(new Date(r.agent.lastLoginAt).toLocaleString()) : 'Has not signed in yet') + '. The numbers refresh by themselves.</div>' +
        '<div style="display:flex;gap:8px;margin:0 0 8px"><input class="aa-in" id="aaOq" type="search" placeholder="Search this agent’s clients" style="margin:0;flex:1" value="' + esc(q) + '"><button class="aa-btn pr" id="aaAdd" type="button">+ Add clients</button></div>' +
        '<div class="aa-ls" style="max-height:46vh">' + (rows.length ? rows.map(function (c, i) {
          return '<div class="aa-ci" style="cursor:default;flex-wrap:wrap"><span style="min-width:150px;flex:1"><b>' + esc(c.name) + (c.unread ? ' <span style="background:#ff3b3b;color:#fff;font-size:10px;padding:2px 6px;border-radius:10px">' + c.unread + '</span>' : '') + '</b><small>' + esc(c.email) + '</small><small style="display:block;margin-top:2px;max-width:340px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + (c.lastFrom === 'agent' ? 'Agent: ' : c.lastFrom === 'client' ? 'Client: ' : '') + esc(c.lastText || 'No messages yet') + '</small></span><small style="color:#8b95a5">' + esc(ft(c.lastAt)) + '</small>' +
            '<span style="display:flex;gap:6px;align-items:center;flex-wrap:wrap"><button class="aa-btn" data-k="chat" data-i="' + i + '" type="button" style="height:34px">Open chat</button>' + agentSelect('aaM' + i, a.email) + '<button class="aa-btn" data-k="move" data-i="' + i + '" type="button" style="height:34px">Move</button><button class="aa-btn dg" data-k="rm" data-i="' + i + '" type="button" style="height:34px">Remove</button></span></div>';
        }).join('') : '<div class="aa-msg" style="padding:14px 4px">' + (r.clients.length ? 'No one matches.' : 'No clients yet. Press “Add clients”.') + '</div>') + '</div>' +
        '<div class="aa-ft"><button class="aa-btn" id="aaX" type="button">Close</button><span class="aa-msg">“Remove” takes the client away from this agent right away. The chat history stays.</span></div>';
      var oq = $('#aaOq'); oq.oninput = function () { q = oq.value.trim().toLowerCase(); var p = oq.selectionStart; paint(); var n = $('#aaOq'); n.focus(); n.setSelectionRange(p, p); };
      $('#aaX').onclick = closeIt; $('#aaAdd').onclick = function () { clearInterval(ovTimer); m.remove(); assign(a, function () { overview(a); }); };
      o.querySelectorAll('button[data-k]').forEach(function (b) { b.onclick = function () {
        var c = rows[+b.getAttribute('data-i')], k = b.getAttribute('data-k'), mine = r.clients.map(function (x) { return x.email; });
        if (k === 'chat') { closeIt(); if (typeof window.openAdminChat === 'function') window.openAdminChat(c.email); else toast('Open Live chats to read this chat'); return; }
        if (k === 'rm') { if (!confirm('Remove ' + c.name + ' from ' + a.name + '?\nThe agent loses access to this client at once. The chat history stays.')) return; b.disabled = true; api('adminAgentAssign', { agent: a.email, clients: mine.filter(function (x) { return x !== c.email; }) }).then(function (x) { if (x.ok) { delete map[c.email]; toast(c.name + ' removed'); refresh(); load(); } else { toast(x.error || 'Failed'); b.disabled = false; } }); }
        if (k === 'move') { var to = $('#aaM' + b.getAttribute('data-i')).value; if (!to) { toast('Choose the agent to move to'); return; } b.disabled = true; var tl = Object.keys(map).filter(function (x) { return map[x] === to; }).concat([c.email]); api('adminAgentAssign', { agent: to, clients: tl }).then(function (x) { if (x.ok) { map[c.email] = to; toast(c.name + ' moved'); refresh(); load(); } else { toast(x.error || 'Failed'); b.disabled = false; } }); }
      }; });
    }
    function refresh() { return api('adminAgentOverview', { agent: a.email }).then(function (r) { if (r && r.ok) paint(r); else if ($('#aaOv') && !last) $('#aaOv').innerHTML = '<div class="aa-msg">' + esc((r && r.error) || 'Could not load') + '</div>'; }); }
    refresh(); ovTimer = setInterval(function () { if (!$('#aaOv')) { clearInterval(ovTimer); return; } if (document.activeElement && document.activeElement.id === 'aaOq') return; refresh(); }, 8000);
  }
  var done = 0;
  function tick() {
    var nav = $('#adminPanel .admin-sidebar .admin-nav-item[data-tab="team"]'); if (!nav) return;      // owner only
    var sec = $('#adminPanel [data-section="team"]'); if (!sec || !sec.getClientRects().length) return;
    css(); if (!$('#aaCard')) { if (agents.length || done) draw(); if (!done || Date.now() - done > 20000) { done = Date.now(); load(); loadWaiting(); } }
  }
  setInterval(tick, 1200);
})();
