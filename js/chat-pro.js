/* ============================================================
   NORDIC CRYPTO — SUPPORT CENTER (chat-pro.js v1.0)
   A Home / Messages / Help hub that sits on top of the existing chat panel (#chatPanel).
   The conversation, ticket form, polling, read receipts and badge stay owned by chat-fix.js —
   this file only adds the hub layer, FAQ articles, topic shortcuts and a back button.
   Edit the FAQ array below to change the help articles.
   ============================================================ */
(function () {
  'use strict';
  if (window.__cpPro) return; window.__cpPro = true;

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function ic(p, s) { return '<svg viewBox="0 0 24 24" width="' + (s || 18) + '" height="' + (s || 18) + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>'; }
  var I = {
    home: '<path d="M3 11l9-8 9 8v9a2 2 0 01-2 2h-4v-6H9v6H5a2 2 0 01-2-2z"/>', msg: '<path d="M21 15a2 2 0 01-2 2H8l-5 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>', help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.2a2.6 2.6 0 015 .9c0 1.7-2.5 2.2-2.5 3.9M12 17.2h.01"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>', chev: '<path d="M9 6l6 6-6 6"/>', back: '<path d="M15 6l-6 6 6 6"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>', send: '<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/>',
    w: '<path d="M12 19V5m0 0l-5 5m5-5l5 5"/>', d: '<path d="M12 5v14m0 0l-5-5m5 5l5-5"/>', id: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="12" r="2.2"/><path d="M14 10h4M14 14h3"/>', card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/>', bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>', shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/>', up: '<path d="M7 11l5-5 5 5M12 6v13"/>', down: '<path d="M7 13l5 5 5-5M12 18V5"/>', headset: '<path d="M4 14v-2a8 8 0 0116 0v2"/><rect x="2" y="14" width="4" height="6" rx="1.5"/><rect x="18" y="14" width="4" height="6" rx="1.5"/><path d="M20 20a4 4 0 01-4 2h-3"/>'
  };

  function accent() {
    try {
      var e = document.querySelector('.mi.on'), col = null;
      if (e) { var m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(getComputedStyle(e).color); if (m) { var r = +m[1], g = +m[2], b = +m[3], mx = Math.max(r, g, b), mn = Math.min(r, g, b); if (mx > 110 && (mx - mn) / mx > 0.35) col = [r, g, b]; } }
      if (!col) { if (document.documentElement.style.getPropertyValue('--nc-acc')) return; col = [200, 255, 77]; }
      var lum = (0.299 * col[0] + 0.587 * col[1] + 0.114 * col[2]) / 255, rs = document.documentElement.style;
      rs.setProperty('--nc-acc', 'rgb(' + col.join(',') + ')'); rs.setProperty('--nc-ink', lum > 0.5 ? '#0b1405' : '#ffffff');
    } catch (x) {}
  }
  /* ---------- content (edit freely) ---------- */
  var TOPICS = [['deposit', 'Deposit issue', I.d], ['withdrawal', 'Withdrawal issue', I.w], ['kyc', 'KYC / Verification', I.id], ['card', 'Card issue', I.card], ['account', 'Account & security', I.lock]];
  var CATS = ['Money', 'Card', 'Trading', 'Account'];
  var FAQ = [
    { id: 'add', c: 'Money', q: 'How do I add money to my account?', kw: 'deposit top up fund bank transfer card',
      a: ['Tap “Add money” on your dashboard, choose a method and follow the steps.', 'Bank transfers use your personal IBAN from “Bank details”. Deposits usually appear after our team has confirmed them — use “Scan deposits” to check for new ones.'] },
    { id: 'iban', c: 'Money', q: 'Where can I find my IBAN?', kw: 'iban swift bic bank details account number',
      a: ['Your personal IBAN is issued by our team after your account is verified. You can find it under “Bank details” on your dashboard.', 'If it still says “being generated”, it usually takes a few minutes. Contact us if it takes longer.'] },
    { id: 'wd', c: 'Money', q: 'How do I withdraw money?', kw: 'withdraw cash out payout send iban crypto minimum',
      a: ['Tap “Withdraw”, choose IBAN or crypto, enter the amount and the recipient details, then confirm.', 'Every withdrawal is reviewed by our team before it is sent, so it first shows as “Under review”. The minimum for crypto withdrawals is $1.00.'] },
    { id: 'rev', c: 'Money', q: 'Why is my withdrawal under review?', kw: 'pending review compliance slow delay status',
      a: ['All withdrawals pass a compliance check before they are sent. You will get a notification as soon as yours has been processed.', 'If it takes longer than you expected, send us a message and include the date and amount.'] },
    { id: 'freeze', c: 'Card', q: 'How do I freeze or unfreeze my card?', kw: 'card freeze lock stolen lost block',
      a: ['Open your dashboard, find your card and tap “Freeze”. The card stops working immediately. Tap “Unfreeze” to turn it back on.', 'If your card is lost or stolen, freeze it first and then contact us.'] },
    { id: 'limits', c: 'Card', q: 'How do I change my card limits?', kw: 'card limits spending settings',
      a: ['On your dashboard, tap “Limits” under your card to see and adjust your spending limits. “Settings” has more card options.'] },
    { id: 'buy', c: 'Trading', q: 'How do I buy or sell crypto?', kw: 'exchange buy sell convert swap trade order market limit',
      a: ['Open “Exchange”, pick a coin, enter an amount and confirm. Market orders are filled at the live price at the moment of execution.', 'Limit, Stop-Loss, Take-Profit and OCO orders stay open until their price is reached, and you can cancel them any time.'] },
    { id: 'kyc', c: 'Account', q: 'How do I verify my identity?', kw: 'kyc verification identity id document passport approve',
      a: ['Follow the verification step in your account: upload a valid ID and complete the checks. When it is approved, all features unlock.', 'If something is rejected you will see why and can submit again.'] },
    { id: 'sec', c: 'Account', q: 'How do I keep my account secure?', kw: 'security password scam phishing 2fa safe',
      a: ['Use a strong, unique password and never share your codes. Our team will never ask for your password.', 'If you notice activity you do not recognise, freeze your card and message us right away.'] }
  ];

  var B = { view: 'home', prev: 'home', q: '', art: null, fab: false, vote: null, built: false, open: false, sig: '' };

  /* ---------- state helpers ---------- */
  function S() { return window.st || {}; }
  function hasTicket() { var s = S(); return !!(s.ticket && s.ticket.id); }
  function lastMsg() { var c = (S().chat || []).slice().sort(function (a, b) { return a.ts - b.ts; }); return c.length ? c[c.length - 1] : null; }
  function unread() {
    var s = S(), n = 0, em = String(lsGet('user_email') || '').trim().toLowerCase();
    if (s.__chatOwner && s.__chatOwner !== em) return 0;
    (s.chat || []).forEach(function (m) { if (m.from === 'admin' && !m.read) n++; }); return n;
  }
  function name() { var n = lsGet('user_name') || ''; if (!n || n === 'User') return ''; n = n.split(' ')[0]; return n.charAt(0).toUpperCase() + n.slice(1); }
  function panel() { return $('chatPanel'); }
  function isOpen() { var p = panel(); return !!p && p.style.display === 'flex'; }
  function ago(ts) { var d = Date.now() - ts; if (d < 6e4) return 'Now'; if (d < 36e5) return Math.floor(d / 6e4) + ' min'; if (d < 864e5) return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); return new Date(ts).toLocaleDateString([], { day: 'numeric', month: 'short' }); }

  /* ---------- build ---------- */
  function avatars() {
    return '<div class="cp-av"><span class="a1"><img src="assets/astrid.jpg" alt="" onerror="this.remove()"><b>E</b></span><span class="a2">' + ic(I.headset, 18) + '</span><span class="a3">' + ic(I.shield, 18) + '</span></div>';
  }
  function build() {
    var p = panel(); if (!p) return false; if ($('cpHub')) { B.built = true; return true; }
    var h = document.createElement('div'); h.id = 'cpHub'; h.className = 'cp-hub'; h.setAttribute('role', 'dialog'); h.setAttribute('aria-label', 'Support');
    h.innerHTML = '<div class="cp-scroll" id="cpScroll"></div><nav class="cp-tabs" id="cpTabs" role="tablist">' +
      tab('home', 'Home', I.home) + tab('messages', 'Messages', I.msg) + tab('help', 'Help', I.help) + '</nav>';
    p.appendChild(h);
    h.addEventListener('click', onClick); h.addEventListener('input', onInput);
    h.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.stopPropagation(); closeAll(); } });
    B.built = true; return true;
  }
  function tab(id, label, p) { return '<button type="button" role="tab" class="cp-tab" data-a="tab" data-v="' + id + '"><span class="cp-ti">' + ic(p, 22) + '<i class="cp-dot" id="cpDot_' + id + '"></i></span><span>' + label + '</span></button>'; }

  /* ---------- views ---------- */
  function topBar(extra) {
    return '<div class="cp-top"><div class="cp-logo"><span class="cp-n">N</span><b>Nordic Crypto</b></div>' + (extra || '') + '<button type="button" class="cp-x" data-a="close" aria-label="Close">' + ic(I.x, 18) + '</button></div>';
  }
  function results(q) {
    q = q.trim().toLowerCase(); if (!q) return FAQ.slice(0, 4);
    var words = q.split(/\s+/);
    return FAQ.filter(function (f) { var hay = (f.q + ' ' + f.kw + ' ' + f.a.join(' ')).toLowerCase(); return words.every(function (w) { return hay.indexOf(w) >= 0; }); });
  }
  function faqRows(list) {
    if (!list.length) return '<div class="cp-none">' + ic(I.search, 22) + '<b>No results</b><span>Try different words, or ask our team.</span><button type="button" class="cp-btn" data-a="ask">Ask a question</button></div>';
    return list.map(function (f) { return '<button type="button" class="cp-row" data-a="art" data-v="' + f.id + '"><span>' + esc(window.NCI18N ? window.NCI18N.t(f.q) : f.q) + '</span>' + ic(I.chev, 16) + '</button>'; }).join('');
  }
  function vHome() {
    var nm = name(), un = unread();
    return '<div class="cp-hero">' + topBar(avatars()) + '<div class="cp-hi"><h2 class="cp-hi1">' + (nm ? 'Hi ' + esc(nm) + ' 👋' : 'Hi there 👋') + '</h2><h2 class="cp-hi2">How can we help?</h2></div></div>' +
      '<div class="cp-cards">' +
      '<div class="cp-card"><label class="cp-search">' + ic(I.search, 17) + '<input id="cpQ" type="search" placeholder="Search for help" autocomplete="off" spellcheck="false" value="' + esc(B.q) + '"></label><div class="cp-list" id="cpList">' + faqRows(results(B.q)) + '</div></div>' +
      (un > 0 ? '<button type="button" class="cp-card cp-unread" data-a="chat"><span class="cp-ub">' + ic(I.msg, 18) + '</span><span class="cp-ut"><b>You have a new reply</b><small>Tap to read it</small></span>' + ic(I.chev, 16) + '</button>' : '') +
      '<div class="cp-card"><div class="cp-ct">Create a ticket</div>' + TOPICS.slice(0, 4).map(function (t) { return '<button type="button" class="cp-row cp-rowi" data-a="topic" data-v="' + t[0] + '"><span class="cp-ri">' + ic(t[2], 16) + '</span><span>' + t[1] + '</span>' + ic(I.chev, 16) + '</button>'; }).join('') + '</div>' +
      '<button type="button" class="cp-card cp-ask" data-a="ask"><span class="cp-asl"><b>Ask a question</b><small>Our team replies within a few minutes</small></span><span class="cp-send">' + ic(I.send, 20) + '</span></button>' +
      '<div class="cp-status"><i></i><span>Team online</span><em>We usually reply within 2 minutes.</em></div></div>';
  }
  function vMessages() {
    var m = lastMsg(), un = unread(), body;
    if (hasTicket()) {
      var tp = S().ticket.topic || 'support';
      body = '<button type="button" class="cp-conv" data-a="chat"><span class="cp-cav"><img src="assets/astrid.jpg" alt="" onerror="this.remove()"><b>E</b></span><span class="cp-cb"><span class="cp-cr"><b>Elena Bergström</b><em>' + (m ? ago(m.ts) : '') + '</em></span><small class="cp-top2">' + esc(String(tp).charAt(0).toUpperCase() + String(tp).slice(1)) + ' • ' + esc(S().ticket.priority || 'normal') + '</small><span class="cp-pv' + (un ? ' u' : '') + '">' + (m ? (m.from === 'client' ? '<i>You: </i>' : '') + esc(String(m.text || '').replace(/\s+/g, ' ').slice(0, 80)) : 'Say hello 👋') + '</span></span>' + (un ? '<span class="cp-ubadge">' + (un > 9 ? '9+' : un) + '</span>' : '') + '</button>' +
        '<p class="cp-hint">You have one open conversation with our team. Reply there any time.</p>';
    } else {
      body = '<div class="cp-emp">' + '<span class="cp-eb">' + ic(I.msg, 30) + '</span><b>No messages yet</b><span>Ask us anything — a real person from our team will answer.</span><button type="button" class="cp-btn pri" data-a="ask">' + ic(I.send, 16) + ' Send us a message</button></div>';
    }
    return '<div class="cp-page">' + topBar() + '<h2 class="cp-h">Messages</h2>' + body + '</div>';
  }
  function vHelp() {
    var q = B.q.trim() ? results(B.q) : FAQ, out = '';
    if (B.q.trim()) out = '<div class="cp-card pad0">' + faqRows(q) + '</div>';
    else CATS.forEach(function (c) { var l = FAQ.filter(function (f) { return f.c === c; }); if (l.length) out += '<div class="cp-cat">' + c + '</div><div class="cp-card pad0">' + faqRows(l) + '</div>'; });
    return '<div class="cp-page">' + topBar() + '<h2 class="cp-h">Help center</h2><label class="cp-search big">' + ic(I.search, 17) + '<input id="cpQ" type="search" placeholder="Search for help" autocomplete="off" spellcheck="false" value="' + esc(B.q) + '"></label><div id="cpHelpList">' + out + '</div>' +
      '<button type="button" class="cp-card cp-ask slim" data-a="ask"><span class="cp-asl"><b>Still need help?</b><small>Talk to our team</small></span><span class="cp-send">' + ic(I.send, 18) + '</span></button></div>';
  }
  function vArticle() {
    var f = FAQ.filter(function (x) { return x.id === B.art; })[0]; if (!f) return vHelp();
    var T = function (s) { return window.NCI18N ? window.NCI18N.t(s) : s; };
    return '<div class="cp-page"><div class="cp-top art"><button type="button" class="cp-bk" data-a="back" aria-label="Back">' + ic(I.back, 20) + '</button><button type="button" class="cp-x" data-a="close" aria-label="Close">' + ic(I.x, 18) + '</button></div>' +
      '<span class="cp-pill">' + esc(f.c) + '</span><h2 class="cp-h art">' + esc(f.q) + '</h2>' + f.a.map(function (p) { return '<p class="cp-p">' + esc(p) + '</p>'; }).join('') +
      '<div class="cp-vote">' + (B.vote === 'up' ? '<span class="ok">' + ic(I.shield, 16) + ' <span>Thanks for your feedback!</span></span>' : B.vote === 'down' ? '<span>Sorry about that. Our team can help directly.</span><button type="button" class="cp-btn pri" data-a="ask">Ask a question</button>' : '<span>Was this helpful?</span><div><button type="button" class="cp-btn sm" data-a="vote" data-v="up">👍 Yes</button><button type="button" class="cp-btn sm" data-a="vote" data-v="down">👎 No</button></div>') + '</div></div>';
  }

  function render(force) {
    if (!B.built && !build()) return;
    var hub = $('cpHub'), sc = $('cpScroll'); if (!hub) return;
    var sg = [B.view, B.art, B.vote, B.q && B.view === 'help' ? B.q : '', unread(), hasTicket(), (lastMsg() || {}).ts, (lastMsg() || {}).read, name(), window.NCI18N && window.NCI18N.lang].join('|');
    if (!force && sg === B.sig) { dots(); return; } B.sig = sg;
    var top = sc.scrollTop, fn = { home: vHome, messages: vMessages, help: vHelp, article: vArticle }[B.view] || vHome;
    sc.innerHTML = fn(); sc.className = 'cp-scroll v-' + B.view;
    if (force || B.view !== B.lastV) sc.scrollTop = 0; else sc.scrollTop = top; B.lastV = B.view;
    [].forEach.call(hub.querySelectorAll('.cp-tab'), function (b) { var on = b.dataset.v === (B.view === 'article' ? 'help' : B.view); b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
    dots();
  }
  function dots() { var d = $('cpDot_messages'); if (d) d.className = 'cp-dot' + (unread() > 0 ? ' on' : ''); }

  /* ---------- actions ---------- */
  function showHub(view) { B.view = view || 'home'; var h = $('cpHub'); if (!h) return; h.style.display = 'flex'; document.documentElement.classList.remove('cp-in-chat'); render(true); }
  function hideHub() { var h = $('cpHub'); if (h) h.style.display = 'none'; document.documentElement.classList.add('cp-in-chat'); }
  function closeAll() { if (typeof window.toggleChat === 'function' && isOpen()) window.toggleChat(); }
  function setViews() {
    var f = $('chatTicketForm'), c = $('chatConversation'), t = hasTicket();
    if (f) f.style.display = t ? 'none' : 'flex'; if (c) c.style.display = t ? 'flex' : 'none';
    if (t) { try { if (typeof window.renderChatMessages === 'function') window.renderChatMessages(); } catch (e) {} try { if (typeof window.markChatRead === 'function') window.markChatRead(); } catch (e) {} var tp = $('chatTicketTopic'); if (tp && S().ticket) { var x = S().ticket.topic || 'support'; tp.textContent = x.charAt(0).toUpperCase() + x.slice(1) + ' • ' + (S().ticket.priority || 'normal'); } }
    else { var em = $('tkEmail'); if (em && !em.value) em.value = lsGet('user_email') || ''; }
    backBtns();
  }
  function toChat(topic) {
    hideHub(); setViews();
    if (!hasTicket() && topic) { var sel = $('tkTopic'); if (sel) { sel.value = topic; try { sel.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) {} } }
    var touch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    setTimeout(function () { if (touch) return; var el = hasTicket() ? $('chatInput') : $('tkDesc'); if (el) try { el.focus(); } catch (e) {} }, 120);
  }
  function backBtns() {
    var p = panel(); if (!p) return;
    [].forEach.call(p.querySelectorAll('.chat-header .chat-agent'), function (a) {
      if (a.querySelector('.cp-back')) return;
      var b = document.createElement('button'); b.type = 'button'; b.className = 'cp-back'; b.setAttribute('aria-label', 'Back'); b.innerHTML = ic(I.back, 20);
      b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); showHub(hasTicket() ? 'messages' : 'home'); });
      a.insertBefore(b, a.firstChild);
    });
  }
  function onClick(e) {
    var b = e.target.closest('[data-a]'); if (!b) return; var a = b.dataset.a, v = b.dataset.v;
    switch (a) {
      case 'close': closeAll(); break;
      case 'tab': B.prev = B.view; B.view = v; B.vote = null; if (v !== 'help') B.q = B.q; render(true); break;
      case 'art': B.prev = B.view; B.art = v; B.view = 'article'; B.vote = null; render(true); break;
      case 'back': B.view = B.prev && B.prev !== 'article' ? B.prev : 'help'; render(true); break;
      case 'vote': B.vote = v; render(true); break;
      case 'topic': toChat(v); break;
      case 'ask': toChat('other'); break;
      case 'chat': toChat(); break;
    }
  }
  var qT;
  function onInput(e) {
    if (!e.target || e.target.id !== 'cpQ') return; B.q = e.target.value; clearTimeout(qT);
    qT = setTimeout(function () {
      if (B.view === 'home') { var l = $('cpList'); if (l) l.innerHTML = faqRows(results(B.q)); }
      else if (B.view === 'help') { var h = $('cpHelpList'); if (h) { var q = B.q.trim() ? results(B.q) : null; var out = ''; if (q) out = '<div class="cp-card pad0">' + faqRows(q) + '</div>'; else CATS.forEach(function (c) { var l2 = FAQ.filter(function (f) { return f.c === c; }); if (l2.length) out += '<div class="cp-cat">' + c + '</div><div class="cp-card pad0">' + faqRows(l2) + '</div>'; }); h.innerHTML = out; } }
      if (window.NCI18N && window.NCI18N.refresh) try { window.NCI18N.refresh(); } catch (x) {}
    }, 120);
  }

  /* ---------- lifecycle ---------- */
  function onOpen() {
    if (!build()) return; backBtns();
    var tkt = hasTicket();
    if (!B.fab && tkt && unread() > 0) { hideHub(); setViews(); }           // opened by a notification → straight to the reply
    else { B.q = ''; showHub('home'); var a = document.activeElement; if (a && a.blur && panel() && panel().contains(a)) try { a.blur(); } catch (e) {} }
    B.fab = false;
  }
  function watch() {
    var p = panel(); if (!p) return false;
    var was = isOpen();
    var mo = new MutationObserver(function () { var now = isOpen(); if (now && !was) onOpen(); else if (!now && was) { B.open = false; document.documentElement.classList.remove('cp-in-chat'); } was = now; B.open = now; });
    mo.observe(p, { attributes: true, attributeFilter: ['style'] });
    if (was) onOpen();
    return true;
  }
  function init() {
    accent();
    if (!watch()) { setTimeout(init, 500); return; }
    build();
    setInterval(accent, 3000);
    document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('#chatToggle')) B.fab = true; }, true);
    setInterval(function () { if (isOpen() && $('cpHub') && $('cpHub').style.display !== 'none') { render(); backBtns(); } else dots(); }, 1500);
    window.addEventListener('nc-lang', function () { setTimeout(function () { render(true); }, 80); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && isOpen()) closeAll(); });
  }
  window.SupportCenter = { show: function (v) { if (!isOpen() && typeof window.toggleChat === 'function') window.toggleChat(); setTimeout(function () { showHub(v || 'home'); }, 60); } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
