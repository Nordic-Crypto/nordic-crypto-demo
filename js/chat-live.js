/* chat-live.js v1 — the admin "Live chats" list updates by itself.
   One request instead of one per client, refreshed every few seconds while the tab is open,
   a Refresh button, "updated … ago", and the agent who handles each client. No more F5. */
(function () {
  'use strict';
  if (window.__chatLive) return; window.__chatLive = 1;
  var BASE = window.WORKER_LOGIN_URL || window.WORKER_URL || 'https://nordic-deposit-checker.otis-790.workers.dev';
  var busy = false, lastOk = 0, sig = '', total = -1, bar = null;
  function $(s) { return document.querySelector(s); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function tok() { return typeof window.getSessionToken === 'function' ? window.getSessionToken() : localStorage.getItem('session_token'); }
  function ft(ts) { if (!ts) return ''; var d = new Date(ts), n = new Date(); return d.toDateString() === n.toDateString() ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString([], { day: '2-digit', month: 'short' }); }
  function visible(el) { return !!(el && el.getClientRects().length); }
  function ago() { if (!lastOk) return ''; var s = Math.round((Date.now() - lastOk) / 1000); return s < 5 ? 'Updated just now' : s < 60 ? 'Updated ' + s + ' s ago' : 'Updated ' + Math.round(s / 60) + ' min ago'; }

  function toolbar(box) {
    if (bar && bar.parentNode) return;
    bar = document.createElement('div'); bar.id = 'clBar';
    bar.style.cssText = 'display:flex;align-items:center;gap:12px;margin:0 0 10px;font-size:12.5px;color:#8b95a5';
    bar.innerHTML = '<span id="clAgo"></span><span style="margin-left:auto">Updates automatically</span>';
    box.parentNode.insertBefore(bar, box);
  }
  function load(force) {
    if (busy) return Promise.resolve(); var box = document.getElementById('adminChatsList'); if (!box) return Promise.resolve();
    busy = true;
    return fetch(BASE + '?action=agentInbox', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: tok() }) }).then(function (r) { return r.json(); }).then(function (d) {
      busy = false;
      if (!d || !d.ok) { if (!box.__ncLoaded) box.innerHTML = '<div class="admin-empty">' + esc((d && d.error) || 'Could not load chats') + '</div>'; return; }
      lastOk = Date.now(); var items = d.items || [], t = items.reduce(function (n, x) { return n + (x.unread || 0); }, 0);
      var nav = document.getElementById('navChatsCount'); if (nav) { nav.textContent = String(t); nav.style.display = t ? '' : 'none'; }
      total = t;
      var s2 = items.map(function (x) { return x.email + x.unread + x.lastAt + x.agent; }).join('|');
      if (s2 === sig && box.__ncLoaded && !force) return; sig = s2;
      box.innerHTML = items.map(function (c) {
        return '<div data-chat-email="' + esc(c.email) + '" style="padding:14px 16px;border-bottom:1px solid rgba(255,255,255,0.06);cursor:pointer;display:flex;justify-content:space-between;gap:12px;">' +
          '<div style="min-width:0;"><div style="color:#e7edf5;font-weight:600;font-size:14px;">' + esc(c.name) + (c.unread ? ' <span style="background:#ff3b3b;color:#fff;font-size:10px;padding:2px 6px;border-radius:10px;">' + c.unread + '</span>' : '') +
          (c.agent ? ' <span style="background:rgba(200,255,77,.14);color:#d6ff5c;font-size:10.5px;padding:2px 8px;border-radius:10px;font-weight:700">' + esc(c.agent) + '</span>' : '') + '</div>' +
          '<div style="color:#8b95a5;font-size:12px;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + (c.lastFrom === 'agent' ? 'You: ' : '') + esc(c.lastText) + '</div></div><div style="color:#8b95a5;font-size:11px;flex:none;">' + esc(ft(c.lastAt)) + '</div></div>';
      }).join('') || '<div class="admin-empty">No chats yet</div>';
      box.__ncLoaded = true;
      if (!box.__ncClicks) { box.__ncClicks = true; box.addEventListener('click', function (e) { var row = e.target && e.target.closest ? e.target.closest('[data-chat-email]') : null; if (row && window.openAdminChat) window.openAdminChat(row.getAttribute('data-chat-email')); }); }
    }).catch(function () { busy = false; });
  }
  window.loadAdminChats = function () { var box = document.getElementById('adminChatsList'); if (box) toolbar(box); return load(true); };
  setInterval(function () {
    if (document.hidden || !tok()) return;
    var box = document.getElementById('adminChatsList'), nav = document.querySelector('#adminPanel .admin-nav-item[data-tab="chats"]');
    if (!nav || nav.classList.contains('at-locked') || document.getElementById('agd')) return;                                 // not an admin with chat access, or this is the agent desk
    if (visible(box)) { toolbar(box); load(false); var a = document.getElementById('clAgo'); if (a) a.textContent = ago(); }
  }, 4000);
  setInterval(function () {                                                              // keep the sidebar badge fresh even when the tab is not open
    if (document.hidden || !tok() || document.getElementById('agd')) return;
    var nav = document.querySelector('#adminPanel .admin-nav-item[data-tab="chats"]'), box = document.getElementById('adminChatsList');
    if (nav && nav.style.display !== 'none' && !nav.classList.contains('at-locked') && !visible(box) && visible(document.getElementById('adminPanel'))) load(false);
  }, 15000);
  setInterval(function () { var a = document.getElementById('clAgo'); if (a) a.textContent = ago(); }, 1000);
})();
