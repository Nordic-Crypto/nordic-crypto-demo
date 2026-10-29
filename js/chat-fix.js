/* ============================================================
   NORDIC CRYPTO — CHAT-FIX.JS v2.0.4
   ============================================================
   Load AFTER app.legacy.js, fixes.js and polling-hub.js.
   Replaces: toggleChat, startTicket, sendChatMsg, renderChatMessages,
   markChatRead, updateChatBadge, openAdminChat, sendAdminChatMsg,
   loadAdminChats.

   v2.0.3:
   - SCROLL GUARD (2 layers): any script that sets scrollTop / calls scrollTo
     to throw the list to the bottom while you read older messages is blocked.
   - Own close button (X) in the chat header; every foreign button/icon in the
     header is hidden, so the X can never be replaced or covered.
   - Chat is full screen on phones, page behind it does not scroll.
   - No autofocus on phones (it opened the keyboard and moved the list).
   ============================================================ */
(function () {
  'use strict';
  if (window.__ncChatV2) return;
  window.__ncChatV2 = true;

  var VERSION = '2.0.4';
  var POLL_OPEN = 1000, POLL_BURST = 600, POLL_HIDDEN_OPEN = 4000, POLL_CLOSED = 10000, POLL_BG = 30000;
  var BURST_MS = 30000, MAX_LEN = 4000, REQ_TIMEOUT = 12000, RECENT_MS = 60000;
  var NEAR_BOTTOM_PX = 90, JUMP_PX = 250;

  var S = {};                 // per-account store, never shared between accounts
  var lastCtx = null, loopTimer = null, lastTyping = 0, typingStop = null, markTimer = null, draftTimer = null;
  var userAway = false;       // true while the user has scrolled up to read older messages
  var touching = false;       // a finger is on the message list
  var pendingRender = false;  // a render was postponed because of touching
  var touchTimer = null;
  var lastTop = 0, lastInput = 0, allowUntil = 0, restoreUntil = 0, mouseDown = false;

  /* ---------- helpers ---------- */
  function $(id) { return document.getElementById(id); }
  function noop() {}
  function norm(e) { return String(e == null ? '' : e).trim().toLowerCase(); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  /* make https links clickable (text is escaped first, so this is safe) */
  function linkify(t) {
    return esc(t).replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])/g, function (u) {
      return '<a href="' + u + '" target="_blank" rel="noopener noreferrer" style="color:inherit;text-decoration:underline;word-break:break-all">' + u + '</a>';
    });
  }
  function lsGet(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { window.localStorage.setItem(k, v); } catch (e) {} }
  function lsDel(k) { try { window.localStorage.removeItem(k); } catch (e) {} }
  function jget(k) { try { return JSON.parse(lsGet(k) || 'null'); } catch (e) { return null; } }
  function toastMsg(msg, bad) {
    if (typeof window.toast === 'function') window.toast(msg, !!bad); else window.alert(msg);
  }
  function workerUrl() {
    if (typeof WORKER_URL !== 'undefined') return WORKER_URL;
    return window.WORKER_URL || window.WORKER_LOGIN_URL || '';
  }
  function token() {
    if (typeof window.getSessionToken === 'function') return window.getSessionToken();
    return lsGet('session_token');
  }
  function ownEmail() { return norm(lsGet('user_email')); }
  function ctxEmail() { return norm(window.adminViewingEmail || ownEmail()); }
  function roleNow() { return window.adminViewingEmail ? 'admin' : 'client'; }
  function otherRole() { return roleNow() === 'admin' ? 'client' : 'admin'; }
  function isOpen() { var p = $('chatPanel'); return !!p && p.style.display === 'flex'; }
  function visible() { return !document.hidden; }
  function isTouchDevice() { try { return !!(window.matchMedia && window.matchMedia('(pointer:coarse)').matches); } catch (e) { return false; } }
  function fmtTime(ts) {
    try { return new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; }
  }
  var nativeTop = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollTop');
  function getTop(box) { return nativeTop.get.call(box); }
  function rawSetTop(box, v) { nativeTop.set.call(box, v); }
  function distFromBottom(box) { return box.scrollHeight - getTop(box) - box.clientHeight; }

  /* scrolling that WE start is always allowed; anything else that jumps the list down is cancelled */
  function allowScroll() { allowUntil = Date.now() + 150; }
  function setBottom(box) {
    allowScroll();
    rawSetTop(box, box.scrollHeight);
    lastTop = getTop(box);
    userAway = false;
  }
  // a script (not us, not the user) wants to throw the list far down while the user reads older messages
  function blocksJump(box, v) {
    if (!userAway) return false;                     // our own code uses the raw setter, so no time window is needed here
    return (Number(v) - getTop(box)) > JUMP_PX;
  }
  function guardBox(box) {
    if (box.__ncGuard) return;
    box.__ncGuard = true;
    try {
      Object.defineProperty(box, 'scrollTop', {
        configurable: true,
        get: function () { return nativeTop.get.call(this); },
        set: function (v) { if (blocksJump(this, v)) return; nativeTop.set.call(this, v); }
      });
      var nativeScrollTo = box.scrollTo, nativeScroll = box.scroll;
      var wrap = function (orig) {
        return function (a, b) {
          var top = (a && typeof a === 'object') ? a.top : b;
          if (top !== undefined && blocksJump(box, top)) return;
          return orig.apply(box, arguments);
        };
      };
      if (nativeScrollTo) box.scrollTo = wrap(nativeScrollTo);
      if (nativeScroll) box.scroll = wrap(nativeScroll);
    } catch (e) {}
  }

  function post(action, body) {
    var url = workerUrl();
    if (!url) return Promise.reject(new Error('no worker url'));
    body = body || {};
    body.token = token();
    var ctl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var t = ctl ? setTimeout(function () { ctl.abort(); }, REQ_TIMEOUT) : 0;
    return fetch(url + '?action=' + action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctl ? ctl.signal : undefined
    }).then(function (r) { clearTimeout(t); return r.json(); }, function (e) { clearTimeout(t); throw e; });
  }

  /* ---------- per-account store ---------- */
  function C(email) {
    var c = S[email];
    if (!c) {
      c = S[email] = {
        serverChat: [], known: {}, readIds: {}, recent: [], synced: false,
        emptyStreak: 0, renderSig: '', inflight: false, lastPoll: 0, burstUntil: 0,
        ticket: jget('nc_chat_ticket:' + email), queue: Promise.resolve(), typingAdmin: false
      };
    }
    return c;
  }

  // window.st may be replaced by loadFromServer (e.g. admin opens another client).
  // We tag it with the account it belongs to and never mix chats of different accounts.
  function bindState(email) {
    var st = window.st;
    if (!st || !email) return null;
    if (st.__chatOwner === email) return st;
    if (st.__chatOwner === undefined) { st.__chatOwner = email; return st; }   // fresh state for this account
    var c = C(email);                                                          // state of another account: swap
    st.__chatOwner = email;
    st.chat = c.serverChat.slice();
    st.ticket = c.ticket || null;
    return st;
  }

  function setTicket(email, ticket) {
    var c = C(email);
    c.ticket = ticket || null;
    if (ticket) lsSet('nc_chat_ticket:' + email, JSON.stringify(ticket)); else lsDel('nc_chat_ticket:' + email);
    var st = bindState(email);
    if (st) st.ticket = c.ticket;
  }

  function parseTopic(text) {
    var m = /^\[([A-Z _-]+)\s*[\u2022\u00b7?|-]\s*([A-Z]+)\]/.exec(String(text || ''));
    if (!m) return { topic: 'support', priority: 'normal' };
    return { topic: m[1].trim().toLowerCase(), priority: m[2].toLowerCase() };
  }

  function hasConversation(email) {
    var st = bindState(email), c = C(email);
    return !!((st && st.chat && st.chat.length) || (c.ticket && c.ticket.id));
  }

  /* ---------- view: form or conversation (never asks again if a thread exists) ---------- */
  function topicLabel(email) {
    var t = C(email).ticket || {};
    var topic = String(t.topic || 'support'), pr = String(t.priority || 'normal');
    return topic.charAt(0).toUpperCase() + topic.slice(1) + ' \u2022 ' + pr;
  }

  function restoreFormDraft(email) {
    var d = jget('nc_chat_form:' + email) || {};
    var last = C(email).ticket || {};
    var f = {
      email: $('tkEmail'), topic: $('tkTopic'), priority: $('tkPriority'), desc: $('tkDesc')
    };
    if (f.email && !f.email.value) f.email.value = d.contact || last.email || lsGet('user_email') || '';
    if (f.topic && d.topic) f.topic.value = d.topic;
    if (f.priority && d.priority) f.priority.value = d.priority;
    if (f.desc && !f.desc.value && d.desc) f.desc.value = d.desc;
  }

  function ensureView() {
    var form = $('chatTicketForm'), conv = $('chatConversation');
    if (!form || !conv) return;
    var email = ctxEmail();
    var want = hasConversation(email) ? 'conv' : 'form';
    var isConv = conv.style.display === 'flex';
    if (want === 'conv') {
      if (!isConv || form.style.display !== 'none') {
        form.style.display = 'none';
        conv.style.display = 'flex';
        restoreInputDraft(email);
      }
      var tp = $('chatTicketTopic');
      if (tp) tp.textContent = topicLabel(email);
    } else if (isConv || form.style.display === 'none') {
      conv.style.display = 'none';
      form.style.display = 'flex';
      restoreFormDraft(email);
    }
  }

  function restoreInputDraft(email) {
    var i = $('chatInput');
    if (i && !i.value) i.value = lsGet('nc_chat_input:' + email) || '';
  }

  function saveDrafts() {
    var email = ctxEmail();
    if (!email) return;
    var i = $('chatInput');
    if (i) { if (i.value) lsSet('nc_chat_input:' + email, i.value); else lsDel('nc_chat_input:' + email); }
    var form = $('chatTicketForm');
    if (form && form.style.display !== 'none') {
      var f = { email: $('tkEmail'), topic: $('tkTopic'), priority: $('tkPriority'), desc: $('tkDesc') };
      if (f.email && f.topic && f.priority && f.desc) {
        lsSet('nc_chat_form:' + email, JSON.stringify({
          contact: f.email.value, topic: f.topic.value, priority: f.priority.value, desc: f.desc.value
        }));
      }
    }
  }
  function saveDraftsSoon() { clearTimeout(draftTimer); draftTimer = setTimeout(saveDrafts, 400); }

  /* ---------- context guard ---------- */
  function syncContext() {
    var e = ctxEmail();
    if (e !== lastCtx) {
      lastCtx = e;
      window._adminTyping = false;
      userAway = false;
      var c = e ? C(e) : null;
      if (c) c.renderSig = '';
      var b = $('chatMessages');
      if (b) b.innerHTML = '';
      if (e) bindState(e);
      if (isOpen()) { ensureView(); renderMessages(true, true); }
    }
    return e;
  }

  /* ---------- merge server data ---------- */
  function normMsg(m) {
    var o = {};
    for (var k in m) { if (Object.prototype.hasOwnProperty.call(m, k)) o[k] = m[k]; }
    o.ts = Number(o.ts) || 0;
    o.text = String(o.text == null ? '' : o.text);
    if (!o.id) o.id = 'srv_' + o.ts + '_' + o.from;
    return o;
  }
  function byTs(a, b) { return (a.ts - b.ts) || (String(a.id) < String(b.id) ? -1 : 1); }

  function applyServer(email, d) {
    var st = bindState(email), c = C(email);
    if (!st) return;
    var now = Date.now(), i, j, m;
    var serverChat = [];
    var raw = d.chat || [];
    for (i = 0; i < raw.length; i++) { if (raw[i] && typeof raw[i] === 'object') serverChat.push(normMsg(raw[i])); }
    var sTicket = (d.ticket && d.ticket.id) ? d.ticket : null;

    var pending = (st.chat || []).filter(function (x) { return x._owner === email && (x._sending || x._failed); });
    var byId = {}, echoed = {};
    for (i = 0; i < serverChat.length; i++) {
      byId[serverChat[i].id] = 1;
      if (serverChat[i].clientMsgId) echoed[serverChat[i].clientMsgId] = 1;
      if (c.readIds[serverChat[i].id] && serverChat[i].from === otherRole()) serverChat[i].read = true;
    }

    // keep messages we just sent until the server list contains them (KV can be stale for a moment)
    c.recent = c.recent.filter(function (r) { return now - r.at < RECENT_MS && !byId[r.msg.id] && !(r.msg.clientMsgId && echoed[r.msg.clientMsgId]); });
    var keep = c.recent.map(function (r) { return r.msg; });

    // an optimistic message that the server already echoed is no longer pending
    var used = {};
    pending = pending.filter(function (p) {
      if (p.clientMsgId && echoed[p.clientMsgId]) return false;
      for (j = 0; j < serverChat.length; j++) {
        m = serverChat[j];
        if (!used[m.id] && !m.clientMsgId && m.from === p.from && m.text === p.text && Math.abs(m.ts - p.ts) < 120000) { used[m.id] = 1; return false; }
      }
      return true;
    });

    // the chat was ended on the other side (admin wiped it): two empty answers in a row
    var empty = serverChat.length === 0 && !sTicket && !pending.length && !keep.length;
    c.emptyStreak = empty ? c.emptyStreak + 1 : 0;
    if (c.emptyStreak >= 2 && c.ticket) { setTicket(email, null); lsDel('nc_chat_input:' + email); }

    // new messages from the other side (not on the first sync, so no sound on page load)
    var fresh = [];
    for (i = 0; i < serverChat.length; i++) {
      m = serverChat[i];
      if (!c.known[m.id]) { c.known[m.id] = 1; if (c.synced && m.from === otherRole()) fresh.push(m); }
    }
    c.synced = true;

    c.serverChat = serverChat;
    st.chat = serverChat.concat(keep, pending).sort(byTs);
    if (sTicket) setTicket(email, sTicket);
    else if (!c.ticket && st.chat.length) {
      var first = st.chat[0], p = parseTopic(first.text);
      setTicket(email, { id: 'tk_' + (first.ts || now), email: lsGet('user_email') || email, topic: p.topic, priority: p.priority, createdAt: first.ts || now, status: 'open', inferred: true });
    }

    var typ = d.typing || {};
    var skew = d.now ? (now - Number(d.now)) : 0;
    window._adminTyping = roleNow() === 'client' && typ.admin === true && (now - skew - Number(typ.adminTs || 0)) < 6000;

    updateBadge();
    if (fresh.length) {
      if (typeof window.playChatSound === 'function') { try { window.playChatSound(); } catch (e1) {} }
      if (!(isOpen() && visible()) && typeof window.addNotification === 'function') {
        try { window.addNotification('New message from Elena', '\uD83D\uDCAC'); } catch (e2) {}
      }
    }
    if (isOpen()) {
      ensureView();
      renderMessages(false);
      if (visible() && (st.chat || []).some(function (x) { return x.from === otherRole() && !x.read; })) markReadSoon();
    }
  }

  /* ---------- polling ---------- */
  function poll(force) {
    var email = syncContext(), c;
    if (!email || !token()) return Promise.resolve();
    c = C(email);
    if (c.inflight) return Promise.resolve();
    c.inflight = true;
    c.lastPoll = Date.now();
    return post('getChat', { email: email }).then(function (d) {
      if (ctxEmail() !== email) return;                                   // user/context changed: drop the answer
      if (!d || !d.ok) return;
      if (d.email && norm(d.email) !== email) return;                     // answer is about another account: drop
      applyServer(email, d);
    }).catch(noop).then(function () { c.inflight = false; });
  }

  function nextDelay() {
    var email = ctxEmail(), c = email ? C(email) : null;
    if (isOpen() && visible()) return (c && Date.now() < c.burstUntil) ? POLL_BURST : POLL_OPEN;
    if (isOpen()) return POLL_HIDDEN_OPEN;
    return visible() ? POLL_CLOSED : POLL_BG;
  }
  function loop() {
    clearTimeout(loopTimer);
    poll().then(function () { loopTimer = setTimeout(loop, nextDelay()); });
  }
  function pollNow() { clearTimeout(loopTimer); loop(); }

  // polling-hub.js may call this; it is throttled so nothing runs twice
  window.__ncChatPoll = function () {
    var email = ctxEmail();
    if (!email) return Promise.resolve();
    if (Date.now() - C(email).lastPoll < nextDelay() - 150) return Promise.resolve();
    return poll();
  };

  /* ---------- rendering ---------- */
  function currentList(email) {
    var st = bindState(email);
    return st ? (st.chat || []).slice().sort(byTs) : [];
  }

  function statusHtml(m, mine, isLastMine) {
    if (!mine) return '';
    if (m._sending) return '<span class="chat-msg-status sending" title="Sending">\u23F3</span>';
    if (m._failed) {
      return '<span class="chat-msg-status failed" data-ncact="retry" data-mid="' + esc(m.clientMsgId) + '" title="' + esc(m._error || 'Not sent') + '">\u26A0 Not sent \u00B7 Retry</span> ' +
        '<span class="chat-msg-status failed" data-ncact="discard" data-mid="' + esc(m.clientMsgId) + '" title="Remove">\u2715</span>';
    }
    if (!isLastMine) return '';
    return m.read ? '<span class="chat-msg-status read" title="Read">\u2713\u2713</span>' : '<span class="chat-msg-status sent" title="Sent">\u2713</span>';
  }

  /* force    = rebuild even if nothing changed
     toBottom = scroll to the newest message (only on open, on send, on context change).
     Otherwise the list scrolls down only if the user was already at the bottom. */
  function renderMessages(force, toBottom) {
    var box = $('chatMessages');
    if (!box) return;
    var email = syncContext();
    if (!email) return;
    var c = C(email), list = currentList(email), mineRole = roleNow(), i, m;
    var sig = email + '|' + (window._adminTyping ? 'T' : '') + '|';
    for (i = 0; i < list.length; i++) {
      m = list[i];
      sig += (m.id || m.clientMsgId) + (m.read ? 'r' : '') + (m._sending ? 's' : '') + (m._failed ? 'f' : '') + ':' + m.text.length + ';';
    }
    if (!force && sig === c.renderSig) return;

    // finger on the screen: don't touch the DOM now, it would stop the scroll on phones
    if (touching && !toBottom) { pendingRender = true; return; }
    pendingRender = false;
    c.renderSig = sig;

    var prevTop = getTop(box);
    var atBottom = distFromBottom(box) < NEAR_BOTTOM_PX;
    var lastMine = -1;
    for (i = list.length - 1; i >= 0; i--) { if (list[i].from === mineRole) { lastMine = i; break; } }

    var html = '';
    if (!list.length) {
      html = '<div class="chat-welcome"><div class="chat-welcome-name">Elena Bergstr\u00F6m</div><div class="chat-welcome-text">Hi! How can I help you today?</div></div>';
    } else {
      var prevFrom = null, prevTs = 0;
      for (i = 0; i < list.length; i++) {
        m = list[i];
        var mine = m.from === mineRole;
        var same = prevFrom === m.from && (m.ts - prevTs) < 60000;
        var who = mine ? 'You' : (mineRole === 'admin' ? 'Client' : 'Elena');
        var meta = (same ? '' : who + ' \u2022 ' + fmtTime(m.ts));
        var stat = statusHtml(m, mine, i === lastMine);
        var metaInner = meta + (stat ? (meta ? ' ' : '') + stat : '');
        html += '<div class="chat-msg ' + (mine ? 'client' : 'admin') + (same ? ' same-author' : '') + '">' +
          '<div><div class="chat-bubble' + (m._failed ? ' failed' : '') + '">' + linkify(m.text) + (window.__ncImg ? window.__ncImg(m, window.adminViewingEmail ? ctxEmail() : '') : '') + '</div>' +
          (metaInner ? '<div class="chat-msg-meta">' + metaInner + '</div>' : '') + '</div></div>';
        prevFrom = m.from; prevTs = m.ts;
      }
    }
    if (window._adminTyping) {
      html += '<div class="chat-msg admin chat-typing"><div><div class="chat-bubble"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></div><div class="chat-msg-meta">Elena is typing...</div></div></div>';
    }
    allowScroll();                                                          // innerHTML below may move the scroll position
    box.innerHTML = html;
    if (window.__ncImgHydrate) window.__ncImgHydrate(box);

    var stick = toBottom || (!userAway && atBottom);
    if (stick) setBottom(box);
    else { allowScroll(); rawSetTop(box, prevTop); lastTop = getTop(box); }   // keep the place the user is reading
  }

  function flushPending() {
    if (pendingRender && !touching) renderMessages(false);
  }

  function bindMessageClicks() {
    var box = $('chatMessages');
    if (!box || box.__ncBound) return;
    box.__ncBound = true;
    box.setAttribute('aria-live', 'polite');
    box.addEventListener('click', function (ev) {
      var t = ev.target;
      var a = t && t.closest ? t.closest('[data-ncact]') : null;
      if (!a) return;
      var mid = a.getAttribute('data-mid');
      if (a.getAttribute('data-ncact') === 'retry') retryMessage(mid);
      else if (a.getAttribute('data-ncact') === 'discard') discardMessage(mid);
    });

    lastTop = getTop(box);
    guardBox(box);

    // SCROLL GUARD. A scroll that is not ours, not the user's, and throws the list far down
    // while the user is reading older messages is cancelled.
    box.addEventListener('scroll', function () {
      var now = Date.now(), top = getTop(box);
      if (now < restoreUntil) return;
      var userDriven = mouseDown || (now - lastInput < 250);
      var ours = now < allowUntil;
      if (!userDriven && !ours && userAway && (top - lastTop) > JUMP_PX) {
        restoreUntil = now + 120;
        rawSetTop(box, lastTop);
        return;
      }
      lastTop = top;
      userAway = distFromBottom(box) >= NEAR_BOTTOM_PX;
      if (!userAway) flushPending();
    }, { passive: true });

    // real user input (wheel / keyboard / scrollbar drag)
    var mark = function () { lastInput = Date.now(); };
    box.addEventListener('wheel', mark, { passive: true });
    box.addEventListener('keydown', mark, true);
    box.addEventListener('mousedown', function () { mouseDown = true; lastInput = Date.now(); }, true);

    // don't rebuild the list while a finger is on it (and a bit after, for momentum scroll)
    box.addEventListener('touchstart', function () { touching = true; clearTimeout(touchTimer); }, { passive: true });
    function touchDone() {
      clearTimeout(touchTimer);
      touchTimer = setTimeout(function () { touching = false; flushPending(); }, 600);
    }
    box.addEventListener('touchend', touchDone, { passive: true });
    box.addEventListener('touchcancel', touchDone, { passive: true });
  }
  document.addEventListener('mouseup', function () { mouseDown = false; }, true);

  /* ---------- close button: our own, in every chat header ---------- */
  var X_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  function ensureCloseBtn() {
    var p = $('chatPanel');
    if (!p) return;
    var heads = p.querySelectorAll('.chat-header'), i, j, has, h, b;
    for (i = 0; i < heads.length; i++) {
      h = heads[i]; has = false;
      for (j = 0; j < h.children.length; j++) { if (h.children[j].classList.contains('nc-x')) { has = true; break; } }
      if (has) continue;
      b = document.createElement('button');
      b.type = 'button';
      b.className = 'nc-x';
      b.setAttribute('aria-label', 'Close chat');
      b.innerHTML = X_SVG;
      b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); closeChat(); });
      h.appendChild(b);
    }
    var old = $('ncChatClose'); if (old && old.parentNode) old.parentNode.removeChild(old);   // from v2.0.2
  }
  function syncOpenClass() {
    try { document.documentElement.classList.toggle('nc-chat-open', isOpen()); } catch (e) {}
  }

  /* ---------- badge ---------- */
  function updateBadge() {
    var b = $('chatBadge');
    if (!b) return;
    var email = ctxEmail(), st = window.st, n = 0;
    if (st && st.__chatOwner === email) {
      var other = otherRole();
      (st.chat || []).forEach(function (m) { if (m.from === other && !m.read) n++; });
    }
    if (n > 0 && !(isOpen() && visible())) { b.textContent = n > 9 ? '9+' : String(n); b.style.display = 'flex'; }
    else b.style.display = 'none';
  }
  window.updateChatBadge = updateBadge;

  /* ---------- read receipts ---------- */
  function markReadNow() {
    var email = ctxEmail(), st = bindState(email);
    if (!email || !st || !token()) return Promise.resolve();
    var other = otherRole(), c = C(email), changed = false;
    (st.chat || []).forEach(function (m) {
      if (m.from === other && !m.read) { m.read = true; changed = true; c.readIds[m.id] = 1; }
    });
    updateBadge();
    if (!changed) return Promise.resolve();
    return post('markChatRead', { email: email, from: other }).catch(noop);
  }
  function markReadSoon() { clearTimeout(markTimer); markTimer = setTimeout(markReadNow, 400); }
  window.markChatRead = function () { markReadNow(); return Promise.resolve(); };

  /* ---------- sending ---------- */
  function fail(msg, text) {
    msg._sending = false; msg._failed = true; msg._error = text;
    if (ctxEmail() === msg._owner) renderMessages(true);
  }

  function replaceLocal(msg, real) {
    var email = msg._owner, c = C(email), st = window.st, i;
    var r = normMsg(real);
    if (!r.clientMsgId) r.clientMsgId = msg.clientMsgId;
    c.known[r.id] = 1;
    c.recent.push({ msg: r, at: Date.now() });
    if (st && st.__chatOwner === email && st.chat) {
      for (i = 0; i < st.chat.length; i++) {
        if (st.chat[i].clientMsgId === msg.clientMsgId) { st.chat[i] = r; break; }
      }
    }
    if (ctxEmail() === email) renderMessages(true);
  }

  function doSend(msg, ticket) {
    msg._sending = true; msg._failed = false;
    if (!token()) { fail(msg, 'Please sign in again'); return Promise.resolve(); }
    var body = { email: msg._owner, text: msg.text, from: msg.from, clientMsgId: msg.clientMsgId };
    if (ticket) body.ticket = ticket;
    return post('sendChatMessage', body).then(function (d) {
      if (d && d.ok && d.message) {
        replaceLocal(msg, d.message);
        if (d.ticket && d.ticket.id) setTicket(msg._owner, d.ticket);
        pollNow();
      } else fail(msg, (d && d.error) || 'Failed to send');
    }).catch(function () { fail(msg, 'Connection problem'); });
  }

  function transmit(msg, ticket) {
    var c = C(msg._owner);
    c.queue = c.queue.then(function () { return doSend(msg, ticket); });   // keeps the order of messages
  }

  function sendMessage(text, ticket) {
    text = String(text || '').trim();
    if (!text) return;
    var email = syncContext();
    var st = bindState(email);
    if (!email || !st) { toastMsg('Please sign in again', true); return; }
    if (text.length > MAX_LEN) { text = text.slice(0, MAX_LEN); toastMsg('Message shortened to ' + MAX_LEN + ' characters', true); }
    var cid = 'c_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    var msg = { id: 'local_' + cid, clientMsgId: cid, from: roleNow(), text: text, ts: Date.now(), read: false, _sending: true, _failed: false, _owner: email };
    if (!st.chat) st.chat = [];
    st.chat.push(msg);
    C(email).burstUntil = Date.now() + BURST_MS;
    userAway = false;
    renderMessages(true, true);                                            // own message: show it
    transmit(msg, ticket);
  }

  function findLocal(mid) {
    var st = window.st, i;
    if (!st || !st.chat) return null;
    for (i = 0; i < st.chat.length; i++) { if (st.chat[i].clientMsgId === mid && st.chat[i]._owner === ctxEmail()) return st.chat[i]; }
    return null;
  }
  function retryMessage(mid) {
    var m = findLocal(mid);
    if (!m) return;
    m._failed = false; m._sending = true;
    renderMessages(true);
    transmit(m, null);
  }
  function discardMessage(mid) {
    var st = window.st;
    if (!st || !st.chat) return;
    st.chat = st.chat.filter(function (m) { return m.clientMsgId !== mid; });
    renderMessages(true);
  }
  window.__ncRetryChatMsg = retryMessage;

  window.sendChatMsg = function () {
    var input = $('chatInput');
    if (!input) return Promise.resolve();
    var text = (input.value || '').trim();
    if (!text) return Promise.resolve();
    input.value = '';
    lsDel('nc_chat_input:' + ctxEmail());
    sendTyping(false, true);
    sendMessage(text, null);
    return Promise.resolve();
  };

  window.startTicket = function () {
    var emailEl = $('tkEmail'), topicEl = $('tkTopic'), prEl = $('tkPriority'), descEl = $('tkDesc');
    if (!emailEl || !topicEl || !prEl || !descEl) return Promise.resolve();
    var contact = (emailEl.value || '').trim(), topic = topicEl.value, priority = prEl.value, desc = (descEl.value || '').trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contact)) { toastMsg('Please enter a valid email', true); return Promise.resolve(); }
    if (desc.length < 5) { toastMsg('Please describe your issue', true); return Promise.resolve(); }
    var email = syncContext();
    if (!email || !token()) { toastMsg('Please sign in again', true); return Promise.resolve(); }

    // The contact email is only a detail of the ticket. The chat always belongs to the signed-in account.
    var ticket = { id: 'tk_' + Date.now(), email: contact, topic: topic, priority: priority, createdAt: Date.now(), status: 'open' };
    setTicket(email, ticket);
    lsSet('nc_chat_form:' + email, JSON.stringify({ contact: contact, topic: topic, priority: priority, desc: '' }));
    descEl.value = '';
    ensureView();
    sendMessage('[' + topic.toUpperCase() + ' \u2022 ' + priority.toUpperCase() + ']\n\n' + desc, ticket);
    if (!isTouchDevice()) setTimeout(function () { var i = $('chatInput'); if (i) i.focus(); }, 80);
    return Promise.resolve();
  };

  /* ---------- typing ---------- */
  function sendTyping(on, quiet) {
    var email = ctxEmail();
    if (!email || !token()) return;
    var now = Date.now();
    if (on && now - lastTyping < 2500) return;
    if (!on && !quiet && now - lastTyping > 6000) return;
    lastTyping = on ? now : 0;
    post('setTyping', { email: email, who: roleNow(), typing: !!on }).catch(noop);
  }

  /* ---------- open / close ---------- */
  function openChat() {
    var p = $('chatPanel');
    if (!p) return;
    p.style.display = 'flex';
    syncOpenClass();
    bindMessageClicks();
    ensureCloseBtn();
    syncContext();
    ensureView();
    userAway = false;
    renderMessages(true, true);
    updateBadge();
    markReadSoon();
    pollNow();
    if (!isTouchDevice()) {                       // on phones the keyboard would open and move the list
      setTimeout(function () {
        var i = $('chatInput'), conv = $('chatConversation');
        if (i && conv && conv.style.display === 'flex') i.focus();
      }, 100);
    }
  }
  function closeChat() {
    var p = $('chatPanel');
    if (!p) return;
    saveDrafts();
    p.style.display = 'none';
    syncOpenClass();
    window._adminTyping = false;
    sendTyping(false);
    updateBadge();
  }
  window.toggleChat = function () {
    if (isOpen()) closeChat(); else openChat();
    return Promise.resolve();
  };
  // other scripts (polling-hub.js, app.legacy.js) may call this often: rebuild, but never force-scroll
  window.renderChatMessages = function () { renderMessages(true); };

  /* ---------- ADMIN SIDE ---------- */
  var AC = { email: null, timer: null, sig: '', pending: [], server: [], typingClient: false, lastTyping: 0 };

  function acModal() { return $('adminChatModal'); }
  function acClose() {
    clearTimeout(AC.timer);
    AC.timer = null; AC.email = null; AC.pending = []; AC.server = []; AC.lastMark = 0;
    var m = acModal();
    if (m && m.parentNode) m.parentNode.removeChild(m);
    document.removeEventListener('keydown', acKey);
  }
  function acKey(e) { if (e.key === 'Escape') acClose(); }

  function acRender(force) {
    var box = $('adminChatMsgs');
    if (!box) return;
    var all = AC.server.concat(AC.pending).sort(byTs), i, m, sig = AC.email + '|' + (AC.typingClient ? 'T' : '');
    for (i = 0; i < all.length; i++) { m = all[i]; sig += (m.id || m.clientMsgId) + (m.read ? 'r' : '') + (m._sending ? 's' : '') + (m._failed ? 'f' : '') + ';'; }
    if (!force && sig === AC.sig) return;
    AC.sig = sig;
    var prevTop = box.scrollTop;
    var near = distFromBottom(box) < NEAR_BOTTOM_PX;
    var html = '';
    for (i = 0; i < all.length; i++) {
      m = all[i];
      var isAdmin = m.from === 'admin';
      html += '<div style="display:flex;margin-bottom:10px;' + (isAdmin ? 'justify-content:flex-end;' : '') + '">' +
        '<div style="max-width:72%;padding:10px 14px;border-radius:16px;font-size:13px;white-space:pre-wrap;overflow-wrap:anywhere;' +
        (isAdmin ? 'background:linear-gradient(135deg,#5f2ee5,#8b5cf6);color:#fff;' : 'background:rgba(255,255,255,0.06);color:#e7edf5;') +
        (m._failed ? 'outline:1px solid #ff5470;' : '') + (m._sending ? 'opacity:.7;' : '') + '">' + linkify(m.text) + (window.__ncImg ? window.__ncImg(m, AC.email) : '') +
        '<div style="font-size:10px;opacity:.6;margin-top:4px;text-align:right;">' + fmtTime(m.ts) +
        (m._failed ? ' \u00B7 <span data-acact="retry" data-mid="' + esc(m.clientMsgId) + '" style="cursor:pointer;text-decoration:underline;">retry</span>' : '') +
        (isAdmin && !m._sending && !m._failed ? (m.read ? ' \u2713\u2713' : ' \u2713') : '') +
        (m.id && !m._sending && !m._failed ? ' \u00B7 <span data-acact="del" data-id="' + esc(m.id) + '" title="Delete message" style="cursor:pointer;opacity:.9">\uD83D\uDDD1 Delete</span>' : '') + '</div></div></div>';
    }
    if (!all.length) html = '<div style="text-align:center;color:#8b95a5;padding:30px;">No messages</div>';
    if (AC.typingClient) html += '<div style="color:#8b95a5;font-size:12px;padding:4px 6px;">Client is typing...</div>';
    box.innerHTML = html;
    if (window.__ncImgHydrate) window.__ncImgHydrate(box);
    if (near) box.scrollTop = box.scrollHeight; else box.scrollTop = prevTop;
  }

  function acPoll() {
    var email = AC.email;
    if (!email || !acModal()) return Promise.resolve();
    return post('getChat', { email: email }).then(function (d) {
      if (AC.email !== email) return;                                      // another chat was opened meanwhile
      if (!d || !d.ok) return;
      if (d.email && norm(d.email) !== email) return;
      var server = (d.chat || []).map(normMsg), echoed = {}, i;
      for (i = 0; i < server.length; i++) { if (server[i].clientMsgId) echoed[server[i].clientMsgId] = 1; }
      AC.pending = AC.pending.filter(function (p) {
        if (p._failed) return true;
        if (echoed[p.clientMsgId]) return false;
        return !server.some(function (s) { return !s.clientMsgId && s.from === p.from && s.text === p.text && Math.abs(s.ts - p.ts) < 120000; });
      });
      var hadNew = server.some(function (s) { return s.from === 'client' && !s.read; });
      AC.server = server;
      var t = d.typing || {};
      var skew = d.now ? (Date.now() - Number(d.now)) : 0;
      AC.typingClient = t.client === true && (Date.now() - skew - Number(t.clientTs || 0)) < 6000;
      acRender(false);
      if (hadNew && visible() && Date.now() - (AC.lastMark || 0) > 5000) {
        AC.lastMark = Date.now();
        server.forEach(function (s) { if (s.from === 'client') s.read = true; });
        post('markChatRead', { email: email, from: 'client' }).catch(noop);
      }
    }).catch(noop);
  }
  function acLoop() {
    clearTimeout(AC.timer);
    if (!AC.email || !acModal()) return;
    acPoll().then(function () { AC.timer = setTimeout(acLoop, visible() ? 1200 : 5000); });
  }

  function acSend() {
    var input = $('adminChatInput'), email = AC.email;
    if (!input || !email) return;
    var text = (input.value || '').trim();
    if (!text) return;
    if (text.length > MAX_LEN) text = text.slice(0, MAX_LEN);
    input.value = '';
    var cid = 'a_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    var msg = { id: 'local_' + cid, clientMsgId: cid, from: 'admin', text: text, ts: Date.now(), read: false, _sending: true, _failed: false };
    AC.pending.push(msg);
    acRender(true);
    var box = $('adminChatMsgs');
    if (box) box.scrollTop = box.scrollHeight;                              // own message: show it
    acTransmit(msg, email);
  }
  function acTransmit(msg, email) {
    msg._sending = true; msg._failed = false;
    post('sendChatMessage', { email: email, text: msg.text, from: 'admin', clientMsgId: msg.clientMsgId }).then(function (d) {
      if (AC.email !== email) return;
      if (d && d.ok && d.message) {
        AC.pending = AC.pending.filter(function (p) { return p !== msg; });
        var r = normMsg(d.message); r.clientMsgId = r.clientMsgId || msg.clientMsgId;
        AC.server.push(r);
      } else { msg._sending = false; msg._failed = true; }
      acRender(true);
      clearTimeout(AC.timer); acLoop();
    }).catch(function () {
      if (AC.email !== email) return;
      msg._sending = false; msg._failed = true; acRender(true);
    });
  }

  window.openAdminChat = function (email) {
    email = norm(email);
    if (!email) return Promise.resolve();
    acClose();
    AC.email = email; AC.sig = '';
    var modal = document.createElement('div');
    modal.id = 'adminChatModal';
    modal.style.cssText = 'position:fixed;top:0;right:0;bottom:0;left:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:100200;padding:20px;';
    modal.innerHTML =
      '<div style="background:#0f1720;border:1px solid rgba(139,92,246,0.2);border-radius:20px;width:100%;max-width:520px;height:600px;max-height:100%;display:flex;flex-direction:column;overflow:hidden;">' +
      '<div style="padding:14px 18px;border-bottom:1px solid rgba(255,255,255,0.06);display:flex;justify-content:space-between;align-items:center;gap:10px;">' +
      '<div style="color:#e7edf5;font-weight:700;font-size:14px;overflow:hidden;text-overflow:ellipsis;">' + esc(email) + '</div>' +
      '<div style="display:flex;gap:8px;">' +
      '<button type="button" data-acact="end" style="background:rgba(255,80,80,0.15);border:none;color:#ff6b6b;padding:6px 10px;border-radius:8px;font-size:12px;cursor:pointer;">End chat</button>' +
      '<button type="button" data-acact="close" aria-label="Close" style="background:rgba(255,255,255,0.06);border:none;color:#e7edf5;width:30px;border-radius:8px;cursor:pointer;">\u2715</button>' +
      '</div></div>' +
      '<div id="adminChatMsgs" style="flex:1;overflow-y:auto;padding:16px;overscroll-behavior:contain;"><div style="text-align:center;color:#8b95a5;padding:30px;">Loading...</div></div>' +
      (window.NCQuick ? window.NCQuick.html() : '') +
      '<div style="padding:12px 14px;border-top:1px solid rgba(255,255,255,0.06);display:flex;gap:8px;">' +
      '<button type="button" data-acact="attach" title="Send a photo" style="width:42px;height:42px;border-radius:12px;border:none;background:rgba(255,255,255,0.08);color:#e7edf5;cursor:pointer;font-size:18px;">\uD83D\uDCCE</button><input id="adminChatFile" type="file" accept="image/*" style="display:none">' +
      '<input id="adminChatInput" placeholder="Reply..." autocomplete="off" style="flex:1;padding:11px 14px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;color:#e7edf5;font-size:13px;outline:none;">' +
      '<button type="button" data-acact="send" style="width:42px;height:42px;border-radius:12px;border:none;background:linear-gradient(135deg,#5f2ee5,#8b5cf6);color:#fff;cursor:pointer;">\u2192</button>' +
      '</div></div>';
    modal.addEventListener('click', function (e) {
      var t = e.target;
      if (t === modal) { acClose(); return; }
      var a = t && t.closest ? t.closest('[data-acact]') : null;
      if (!a) return;
      var act = a.getAttribute('data-acact');
      if (act === 'close') acClose();
      else if (act === 'send') acSend();
      else if (act === 'attach') { var fi = $('adminChatFile'); if (fi) fi.click(); }
      else if (act === 'end') { if (typeof window.endAdminChat === 'function') window.endAdminChat(email); }
      else if (act === 'del') {
        var did = a.getAttribute('data-id');
        if (!did || !window.confirm('Delete this message? It will disappear for the client too.')) return;
        AC.server = AC.server.filter(function (x) { return x.id !== did; });
        acRender(true);
        post('deleteChatMessage', { email: email, id: did }).then(function (d) {
          if (!d || !d.ok) { toastMsg((d && d.error) || 'Could not delete', true); acPoll(); }
          else toastMsg('Message deleted');
        }).catch(function () { toastMsg('Connection problem', true); acPoll(); });
      }
      else if (act === 'retry') {
        var mid = a.getAttribute('data-mid');
        AC.pending.forEach(function (p) { if (p.clientMsgId === mid) acTransmit(p, email); });
        acRender(true);
      }
    });
    if (window.NCQuick) window.NCQuick.bind(modal);
    modal.addEventListener('change', function (e) {
      if (e.target && e.target.id === 'adminChatFile') {
        var file = e.target.files && e.target.files[0]; e.target.value = '';
        if (window.NCChatExtra) window.NCChatExtra.sendImage(email, file, function () { acPoll(); });
      }
    });
    document.body.appendChild(modal);
    document.addEventListener('keydown', acKey);
    var input = $('adminChatInput');
    if (input) {
      input.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); acSend(); } });
      input.addEventListener('input', function () {
        var now = Date.now();
        if (now - AC.lastTyping > 2000 && AC.email) { AC.lastTyping = now; post('setTyping', { email: AC.email, who: 'admin', typing: true }).catch(noop); }
      });
      if (!isTouchDevice()) input.focus();
    }
    acLoop();
    return Promise.resolve();
  };
  window.sendAdminChatMsg = function () { acSend(); return Promise.resolve(); };

  // keep the legacy "End chat": it wipes the chat; we only stop our live loop afterwards
  var origEnd = window.endAdminChat;
  if (typeof origEnd === 'function' && !origEnd.__ncWrapped) {
    var wrappedEnd = function (email) {
      var r = origEnd.apply(this, arguments);
      return Promise.resolve(r).then(function () { if (!acModal()) { clearTimeout(AC.timer); AC.email = null; } });
    };
    wrappedEnd.__ncWrapped = true;
    window.endAdminChat = wrappedEnd;
  }

  // Chats list: all clients in parallel instead of one after another
  window.loadAdminChats = function () {
    var box = $('adminChatsList');
    if (!box) return Promise.resolve();
    if (!box.__ncLoaded) box.innerHTML = '<div class="admin-empty">Loading chats...</div>';
    return post('listUsers', {}).then(function (d) {
      if (!d || !d.ok || !d.users) { box.innerHTML = '<div class="admin-empty">Failed</div>'; return; }
      var users = d.users, out = [], idx = 0, workers = [], N = 8, k;
      function next() {
        if (idx >= users.length) return Promise.resolve();
        var u = users[idx++];
        return post('getChat', { email: u.email }).then(function (r) {
          var msgs = (r && r.ok && r.chat) || [];
          if (!msgs.length) return;
          var last = msgs[msgs.length - 1], unread = 0, q;
          for (q = 0; q < msgs.length; q++) { if (msgs[q].from === 'client' && !msgs[q].read) unread++; }
          out.push({ email: u.email, name: u.name || u.email, lastTs: Number(last.ts) || 0, lastText: String(last.text || ''), unread: unread });
        }).catch(noop).then(next);
      }
      for (k = 0; k < N; k++) workers.push(next());
      return Promise.all(workers).then(function () {
        out.sort(function (a, b) { return b.lastTs - a.lastTs; });
        var total = 0, html = '';
        out.forEach(function (c) {
          total += c.unread;
          html += '<div data-chat-email="' + esc(c.email) + '" style="padding:14px 16px;border-bottom:1px solid rgba(255,255,255,0.06);cursor:pointer;display:flex;justify-content:space-between;gap:12px;align-items:center;">' +
            '<div style="min-width:0;"><div style="color:#e7edf5;font-weight:600;font-size:14px;">' + esc(c.name) +
            (c.unread ? ' <span style="background:#ff3b3b;color:#fff;font-size:10px;padding:2px 6px;border-radius:10px;">' + c.unread + '</span>' : '') + '</div>' +
            '<div style="color:#8b95a5;font-size:12px;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(c.lastText) + '</div></div>' +
            '<div style="color:#8b95a5;font-size:11px;flex:none;">' + fmtTime(c.lastTs) + '</div></div>';
        });
        box.innerHTML = html || '<div class="admin-empty">No chats yet</div>';
        box.__ncLoaded = true;
        var nav = $('navChatsCount');
        if (nav) { nav.textContent = String(total); nav.style.display = total ? '' : 'none'; }
        if (!box.__ncClicks) {
          box.__ncClicks = true;
          box.addEventListener('click', function (e) {
            var row = e.target && e.target.closest ? e.target.closest('[data-chat-email]') : null;
            if (row) window.openAdminChat(row.getAttribute('data-chat-email'));
          });
        }
      });
    }).catch(function () { box.innerHTML = '<div class="admin-empty">Error</div>'; });
  };

  /* ---------- events and start ---------- */
  document.addEventListener('input', function (e) {
    var id = e.target && e.target.id;
    if (id === 'chatInput') {
      sendTyping(true);
      clearTimeout(typingStop);
      typingStop = setTimeout(function () { sendTyping(false, true); }, 2500);
      saveDraftsSoon();
    } else if (id === 'tkDesc' || id === 'tkEmail') saveDraftsSoon();
  }, true);
  document.addEventListener('change', function (e) {
    var id = e.target && e.target.id;
    if (id === 'tkTopic' || id === 'tkPriority') saveDraftsSoon();
  }, true);
  document.addEventListener('visibilitychange', function () { if (visible()) { pollNow(); if (isOpen()) markReadSoon(); } });
  window.addEventListener('focus', function () { pollNow(); });
  window.addEventListener('online', function () { pollNow(); });
  window.addEventListener('beforeunload', saveDrafts);

  // keyboard opened / window resized: if the user was at the bottom, stay at the bottom
  function onResize() {
    var b = $('chatMessages');
    if (b && isOpen() && !userAway) setBottom(b);
  }
  window.addEventListener('resize', onResize);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', onResize);

  function injectStyles() {
    if ($('ncChatStyles')) return;
    var style = document.createElement('style');
    style.id = 'ncChatStyles';
    style.textContent =
      '#chatMessages{overscroll-behavior:contain;-webkit-overflow-scrolling:touch;overflow-anchor:none}' +
      '.chat-msg-status{font-size:11px;opacity:.85;font-weight:700}' +
      '.chat-msg-status.sending,.chat-msg-status.sent{color:#94a3b8}' +
      '.chat-msg-status.read{color:#47dcff}' +
      '.chat-msg-status.failed{color:#ff5470;cursor:pointer}' +
      '.chat-msg-status.failed:hover{text-decoration:underline}' +
      '.chat-bubble.failed{background:rgba(255,84,112,.15);border:1px solid rgba(255,84,112,.4)}' +
      /* header: only the agent and OUR close button are shown, nothing foreign can cover or replace the X */
      '#chatPanel .chat-header>*:not(.chat-agent):not(.nc-x){display:none!important}' +
      '#chatPanel .chat-header{padding-right:16px!important;align-items:center!important;position:relative}' +
      '#chatPanel .chat-header .nc-x{display:flex!important;align-items:center;justify-content:center;width:40px!important;height:40px!important;min-width:40px!important;flex:none;' +
        'margin:0 0 0 auto!important;padding:0!important;border-radius:12px!important;border:1px solid rgba(255,255,255,.22)!important;background:rgba(255,255,255,.12)!important;' +
        'color:#fff!important;cursor:pointer;position:static!important;opacity:1!important;visibility:visible!important;font-size:0!important}' +
      '#chatPanel .chat-header .nc-x:hover{background:rgba(255,84,112,.28)!important;border-color:rgba(255,84,112,.55)!important}' +
      '#chatPanel .chat-header .nc-x svg{display:block;width:18px;height:18px;pointer-events:none}' +
      /* phones: the chat takes the whole screen, nothing of the page shows below it */
      '@media (max-width:640px){' +
        '#chatPanel{position:fixed!important;top:0!important;left:0!important;right:0!important;bottom:0!important;width:100%!important;max-width:none!important;' +
          'height:100vh!important;height:100dvh!important;max-height:none!important;margin:0!important;border-radius:0!important;z-index:100100!important;' +
          'padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px);box-sizing:border-box}' +
        'html.nc-chat-open,html.nc-chat-open body{overflow:hidden!important}' +
      '}';
    document.head.appendChild(style);
  }

  function start() {
    injectStyles();
    bindMessageClicks();
    ensureCloseBtn();
    syncOpenClass();
    syncContext();
    updateBadge();
    setTimeout(loop, 400);
    // the chat markup can be re-created by other scripts: re-attach everything (cheap and idempotent)
    setInterval(function () { bindMessageClicks(); ensureCloseBtn(); syncOpenClass(); }, 2000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();

  window.__ncChat = { version: VERSION, poll: poll, state: function () { return S; }, send: sendMessage, context: ctxEmail };
  if (window.console && console.log) console.log('%c[NordicCrypto] chat-fix.js v' + VERSION + ' loaded', 'color:#00e5ff;font-weight:bold');
})();
