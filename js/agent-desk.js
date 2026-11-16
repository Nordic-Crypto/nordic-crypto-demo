/* agent-desk.js v1 — the workspace for chat-only agents.
   An agent signs in on the normal admin login and lands here instead of the admin panel:
   inbox of the clients the owner assigned · conversation · read-only client card.
   Everything is enforced on the server too; this file only draws the screen. */
(function () {
  'use strict';
  if (window.__agDesk) return; window.__agDesk = 1;
  var BASE = window.WORKER_LOGIN_URL || window.WORKER_URL || 'https://nordic-deposit-checker.otis-790.workers.dev';
  var ME = null, mounted = false, list = [], cur = '', msgs = [], card = null, filter = 'all', q = '', lastSig = '', typingT = 0, sound = true, imgCache = {}, mobileView = 'list', sent = 0;
  function $(s, r) { return (r || document).querySelector(s); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function tok() { return typeof window.getSessionToken === 'function' ? window.getSessionToken() : localStorage.getItem('session_token'); }
  function api(a, b) { return fetch(BASE + '?action=' + a, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ token: tok() }, b || {})) }).then(function (r) { return r.json(); }).catch(function () { return { ok: false, error: 'Connection problem' }; }); }
  function ini(n) { var p = String(n || '?').trim().split(/\s+/); return ((p[0] || '?')[0] + (p[1] ? p[1][0] : '')).toUpperCase(); }
  function hue(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360; return h; }
  function av(n, e, big) { return '<span class="agd-av' + (big ? ' big' : '') + '" style="--h:' + hue(e || n) + '">' + esc(ini(n)) + '</span>'; }
  function ago(ts) { if (!ts) return ''; var d = (Date.now() - ts) / 1000; if (d < 45) return 'now'; if (d < 3600) return Math.floor(d / 60) + ' min'; if (d < 86400) return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); if (d < 604800) return new Date(ts).toLocaleDateString([], { weekday: 'short' }); return new Date(ts).toLocaleDateString([], { day: '2-digit', month: 'short' }); }
  function dayLabel(ts) { var d = new Date(ts), t = new Date(), y = new Date(Date.now() - 864e5); return d.toDateString() === t.toDateString() ? 'Today' : d.toDateString() === y.toDateString() ? 'Yesterday' : d.toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' }); }
  function money(usd, c) { var r = { USD: 1, EUR: c && c.eurR || 0.92, SEK: c && c.sekR || 10.45 }, cur = (c && c.currency) || 'USD', rate = r[cur] || 1, sym = { USD: '$', EUR: '€', SEK: 'kr ' }[cur] || '$'; return sym + (Number(usd || 0) * rate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function coin(n) { return (Number(n) || 0).toFixed(6).replace(/0+$/, '').replace(/\.$/, '') || '0'; }

  function css() {
    if ($('#agdCss')) return; var s = document.createElement('style'); s.id = 'agdCss';
    s.textContent =
      'body:has(#agd) #adminPanel{display:none!important}' +
      '#agd{--bg:#0a0e14;--p1:#111823;--p2:#161f2d;--ln:rgba(255,255,255,.08);--tx:#e9eef6;--mu:#8b97aa;--ac:#c8ff4d;--acx:#10180a;--ok:#34d399;--wr:#ffb454;--me:#1d2b17;--them:#18212f;position:fixed;inset:0;z-index:100040;display:flex;flex-direction:column;background:var(--bg);color:var(--tx);font:14px/1.45 Inter,system-ui,-apple-system,Segoe UI,sans-serif}' +
      'html[data-theme="light"] #agd{--bg:#eef1ea;--p1:#fff;--p2:#f6f8f2;--ln:rgba(15,23,42,.1);--tx:#0f172a;--mu:#5b6577;--ac:#4b8200;--acx:#fff;--ok:#0f9f6e;--wr:#b86a00;--me:#e4f3cf;--them:#eef1f6}' +
      '#agd *{box-sizing:border-box}#agd button{font:inherit;color:inherit}' +
      '.agd-top{flex:none;display:flex;align-items:center;gap:14px;height:56px;padding:0 18px;background:var(--p1);border-bottom:1px solid var(--ln)}' +
      '.agd-brand{display:flex;align-items:center;gap:10px;font-weight:800;letter-spacing:.01em}.agd-brand i{width:30px;height:30px;border-radius:9px;background:var(--ac);color:var(--acx);display:grid;place-items:center;font-style:normal;font-weight:900}' +
      '.agd-brand small{display:block;font-weight:600;color:var(--mu);font-size:11px;letter-spacing:.06em;text-transform:uppercase}' +
      '.agd-sp{flex:1}.agd-chip{display:flex;align-items:center;gap:8px;height:36px;padding:0 12px;border-radius:11px;border:1px solid var(--ln);background:var(--p2);font-size:13px;font-weight:600;cursor:pointer}.agd-chip:hover{border-color:var(--ac)}' +
      '.agd-live{width:8px;height:8px;border-radius:50%;background:var(--ok);box-shadow:0 0 0 3px rgba(52,211,153,.2)}.agd-live.off{background:var(--wr);box-shadow:0 0 0 3px rgba(255,180,84,.2)}' +
      '.agd-main{flex:1;min-height:0;display:grid;grid-template-columns:340px minmax(0,1fr) 330px}' +
      '.agd-col{min-height:0;display:flex;flex-direction:column;background:var(--p1)}.agd-col+.agd-col{border-left:1px solid var(--ln)}.agd-mid{background:var(--bg)}' +
      '.agd-h{flex:none;padding:16px 16px 10px}.agd-h h2{margin:0 0 10px;font-size:17px}' +
      '.agd-rf{width:34px;height:34px;border-radius:10px;border:1px solid var(--ln);background:var(--p2);cursor:pointer;font-size:17px;line-height:1}.agd-rf:hover{border-color:var(--ac)}.agd-rf.sp{animation:agdSp .7s linear infinite}@keyframes agdSp{to{transform:rotate(360deg)}}.agd-up{color:var(--mu);font-size:11.5px;font-weight:500;margin-left:auto}' +
      '.agd-s{width:100%;height:40px;padding:0 12px 0 36px;border-radius:12px;border:1px solid var(--ln);background:var(--p2) url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%238b97aa%27 stroke-width=%272%27 stroke-linecap=%27round%27%3E%3Ccircle cx=%2711%27 cy=%2711%27 r=%277%27/%3E%3Cpath d=%27M21 21l-4-4%27/%3E%3C/svg%3E") 11px center/16px no-repeat;color:var(--tx);font:inherit;outline:0}.agd-s:focus{border-color:var(--ac)}' +
      '.agd-tabs{display:flex;gap:6px;margin-top:10px}.agd-tab{flex:1;height:32px;border-radius:9px;border:1px solid var(--ln);background:transparent;color:var(--mu);font-size:12.5px;font-weight:700;cursor:pointer}.agd-tab.on{background:var(--ac);border-color:var(--ac);color:var(--acx)}.agd-tab em{font-style:normal;opacity:.75;margin-left:4px}' +
      '.agd-list{flex:1;overflow:auto;padding:4px 8px 12px}' +
      '.agd-it{display:flex;gap:11px;width:100%;padding:11px 10px;margin:0 0 2px;border:0;border-radius:13px;background:transparent;text-align:left;cursor:pointer;align-items:center}.agd-it:hover{background:var(--p2)}.agd-it.on{background:var(--p2);box-shadow:inset 3px 0 0 var(--ac)}' +
      '.agd-av{flex:none;width:40px;height:40px;border-radius:50%;display:grid;place-items:center;font-weight:800;font-size:14px;color:#fff;background:hsl(var(--h),48%,42%)}.agd-av.big{width:64px;height:64px;font-size:22px}' +
      '.agd-it .b{min-width:0;flex:1}.agd-it .t{display:flex;justify-content:space-between;gap:8px;font-weight:700}.agd-it .t span:last-child{font-weight:500;font-size:11.5px;color:var(--mu);flex:none}.agd-it .n{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '.agd-it .l{display:flex;align-items:center;gap:8px;color:var(--mu);font-size:12.5px;margin-top:1px}.agd-it .l span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1}.agd-it.un .l{color:var(--tx);font-weight:600}' +
      '.agd-bd{flex:none;min-width:20px;height:20px;padding:0 6px;border-radius:99px;background:var(--ac);color:var(--acx);font-size:11.5px;font-weight:800;display:grid;place-items:center}' +
      '.agd-empty{margin:40px 20px;text-align:center;color:var(--mu)}.agd-empty b{display:block;color:var(--tx);font-size:15px;margin-bottom:4px}' +
      '.agd-ch{flex:none;display:flex;align-items:center;gap:12px;padding:12px 18px;background:var(--p1);border-bottom:1px solid var(--ln)}.agd-ch .n{font-weight:800;font-size:15px}.agd-ch .e{color:var(--mu);font-size:12.5px}.agd-back,.agd-info{display:none;width:36px;height:36px;border-radius:10px;border:1px solid var(--ln);background:var(--p2);cursor:pointer}' +
      '.agd-msgs{flex:1;overflow:auto;padding:18px 22px;display:flex;flex-direction:column;gap:3px}' +
      '.agd-day{align-self:center;margin:12px 0 8px;padding:3px 12px;border-radius:99px;background:var(--p1);border:1px solid var(--ln);color:var(--mu);font-size:11.5px;font-weight:700}' +
      '.agd-m{max-width:min(560px,78%);padding:9px 13px;border-radius:16px;background:var(--them);word-wrap:break-word;overflow-wrap:anywhere;white-space:pre-wrap;animation:agdIn .18s ease}.agd-m.me{align-self:flex-end;background:var(--me);border-bottom-right-radius:5px}.agd-m:not(.me){border-bottom-left-radius:5px}' +
      '@keyframes agdIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}' +
      '.agd-m small{display:block;margin-top:3px;font-size:10.5px;color:var(--mu);text-align:right;white-space:normal}.agd-m img{display:block;max-width:100%;max-height:260px;border-radius:10px;cursor:zoom-in}.agd-m .ph{color:var(--mu)}' +
      '.agd-typing{align-self:flex-start;color:var(--mu);font-size:12.5px;padding:2px 6px}' +
      '.agd-qr{flex:none;display:flex;gap:6px;padding:8px 18px 0;overflow:auto;background:var(--bg)}.agd-qr button{flex:none;height:30px;padding:0 12px;border-radius:99px;border:1px solid var(--ln);background:var(--p1);color:var(--mu);font-size:12.5px;font-weight:600;cursor:pointer;white-space:nowrap}.agd-qr button:hover{border-color:var(--ac);color:var(--tx)}' +
      '.agd-cmp{flex:none;display:flex;gap:10px;align-items:flex-end;padding:12px 18px 16px;background:var(--bg)}.agd-cmp textarea{flex:1;min-height:46px;max-height:140px;resize:none;padding:12px 14px;border-radius:14px;border:1px solid var(--ln);background:var(--p1);color:var(--tx);font:inherit;outline:0}.agd-cmp textarea:focus{border-color:var(--ac)}' +
      '.agd-go{flex:none;height:46px;padding:0 20px;border:0;border-radius:14px;background:var(--ac);color:var(--acx)!important;font-weight:800;cursor:pointer}.agd-go:disabled{opacity:.45;cursor:default}.agd-ph{flex:none;width:46px;height:46px;border-radius:14px;border:1px solid var(--ln);background:var(--p1);cursor:pointer;font-size:18px}' +
      '.agd-ct{flex:1;overflow:auto;padding:20px 18px}.agd-ct .hd{text-align:center;margin-bottom:16px}.agd-ct .hd h3{margin:10px 0 2px;font-size:17px}.agd-em{display:inline-flex;align-items:center;gap:6px;color:var(--mu);font-size:12.5px;background:none;border:0;cursor:pointer;padding:2px 6px;border-radius:7px}.agd-em:hover{color:var(--tx);background:var(--p2)}' +
      '.agd-tags{display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin-top:10px}.agd-tag{padding:3px 10px;border-radius:99px;background:var(--p2);border:1px solid var(--ln);font-size:11.5px;font-weight:700}.agd-tag.ok{color:var(--ok);border-color:rgba(52,211,153,.35)}.agd-tag.wr{color:var(--wr);border-color:rgba(255,180,84,.35)}' +
      '.agd-bal{margin:14px 0;padding:16px;border-radius:16px;background:linear-gradient(135deg,rgba(200,255,77,.12),var(--p2));border:1px solid var(--ln)}html[data-theme="light"] .agd-bal{background:linear-gradient(135deg,rgba(120,180,0,.14),#fff)}.agd-bal small{color:var(--mu);font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase}.agd-bal b{display:block;font-size:26px;margin:2px 0 12px;letter-spacing:-.01em}' +
      '.agd-bar{display:flex;height:8px;border-radius:9px;overflow:hidden;background:var(--ln);margin-bottom:12px}.agd-bar i{display:block;height:100%}.agd-r{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:5px 0;font-size:13px}.agd-r span{display:flex;align-items:center;gap:8px;color:var(--mu)}.agd-r span::before{content:"";width:9px;height:9px;border-radius:3px;background:var(--c,var(--mu))}.agd-r b{font-size:13px;text-align:right}.agd-r small{display:block;color:var(--mu);font-weight:500;font-size:11.5px}' +
      '.agd-kv{border:1px solid var(--ln);border-radius:14px;background:var(--p2);padding:4px 14px}.agd-kv div{display:flex;justify-content:space-between;gap:12px;padding:9px 0;font-size:13px}.agd-kv div+div{border-top:1px solid var(--ln)}.agd-kv span{color:var(--mu)}.agd-kv b{text-align:right;word-break:break-word}' +
      '.agd-note{margin-top:14px;color:var(--mu);font-size:12px;text-align:center}.agd-sk{height:14px;border-radius:7px;background:linear-gradient(90deg,var(--p2),var(--ln),var(--p2));background-size:200% 100%;animation:agdSk 1.2s linear infinite;margin:10px 0}@keyframes agdSk{to{background-position:-200% 0}}' +
      '.agd-toast{position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:100060;padding:10px 16px;border-radius:12px;background:var(--p1);color:var(--tx);border:1px solid var(--ac);box-shadow:0 10px 30px rgba(0,0,0,.4);font-size:13px}' +
      '@media(max-width:1180px){.agd-main{grid-template-columns:310px minmax(0,1fr)}.agd-main>.agd-col:last-child{position:absolute;right:0;top:56px;bottom:0;width:min(360px,100%);z-index:3;transform:translateX(100%);transition:transform .22s;box-shadow:-20px 0 50px rgba(0,0,0,.4)}#agd.cardopen .agd-main>.agd-col:last-child{transform:none}.agd-info{display:grid;place-items:center}}' +
      '@media(max-width:760px){.agd-main{grid-template-columns:minmax(0,1fr)}.agd-col{min-width:0}.agd-main>.agd-col:nth-child(1){display:flex}.agd-main>.agd-mid{display:none}#agd.chat .agd-main>.agd-col:nth-child(1){display:none}#agd.chat .agd-main>.agd-mid{display:flex}.agd-back{display:grid;place-items:center}.agd-msgs{padding:14px 12px}.agd-m{max-width:88%}.agd-top{padding:0 12px}.agd-brand small,.agd-chip .tx{display:none}.agd-cmp{padding:10px 12px 14px}}' +
      '@media(prefers-reduced-motion:reduce){#agd *{animation:none!important;transition:none!important}}';
    document.head.appendChild(s);
  }

  function shell() {
    var d = document.createElement('div'); d.id = 'agd'; d.setAttribute('role', 'application'); d.setAttribute('aria-label', 'Agent desk');
    d.innerHTML =
      '<div class="agd-top"><div class="agd-brand"><i>N</i><div>Nordic Crypto<small>Agent desk</small></div></div><div class="agd-sp"></div>' +
      '<button class="agd-chip" id="agdSnd" type="button" title="Sound for new messages"><span class="tx">Sound</span><span id="agdSndI">🔔</span></button>' +
      '<div class="agd-chip" style="cursor:default" title="Connection"><span class="agd-live" id="agdLive"></span><span class="tx" id="agdMe"></span></div>' +
      '<button class="agd-chip" id="agdOut" type="button">Sign out</button></div>' +
      '<div class="agd-main"><section class="agd-col"><div class="agd-h"><h2 style="display:flex;align-items:center;gap:10px">Your conversations<span class="agd-sp"></span><button class="agd-rf" id="agdRf" type="button" title="Refresh" aria-label="Refresh">⟳</button></h2><input class="agd-s" id="agdQ" type="search" placeholder="Search by name or e-mail" aria-label="Search" autocomplete="off"><div class="agd-tabs" id="agdTabs"></div></div><div class="agd-list" id="agdList"></div></section>' +
      '<section class="agd-col agd-mid" id="agdMid"></section>' +
      '<aside class="agd-col" id="agdCard"></aside></div>';
    document.body.appendChild(d);
    $('#agdRf').onclick = function () { var b = this; b.classList.add('sp'); Promise.all([loadInbox(), pull(true)]).then(function () { setTimeout(function () { b.classList.remove('sp'); }, 400); }); };
    $('#agdQ').addEventListener('input', function () { q = this.value.trim().toLowerCase(); drawList(); });
    $('#agdSnd').onclick = function () { sound = !sound; $('#agdSndI').textContent = sound ? '🔔' : '🔕'; try { localStorage.setItem('agd_sound', sound ? '1' : '0'); } catch (e) { } };
    $('#agdOut').onclick = function () { api('logout').then(function () { window.__atLogout ? window.__atLogout() : location.replace('index.html'); }); };
    try { sound = localStorage.getItem('agd_sound') !== '0'; $('#agdSndI').textContent = sound ? '🔔' : '🔕'; } catch (e) { }
    $('#agdMe').textContent = ME.name;
    drawMid(); drawCard();
  }

  /* ---------- inbox ---------- */
  var knownUnread = null;
  function beep() { if (!sound) return; try { var A = window.AudioContext || window.webkitAudioContext, c = new A(), o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.value = 880; g.gain.setValueAtTime(.0001, c.currentTime); g.gain.exponentialRampToValueAtTime(.12, c.currentTime + .02); g.gain.exponentialRampToValueAtTime(.0001, c.currentTime + .35); o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + .4); } catch (e) { } }
  function loadInbox() {
    return api('agentInbox').then(function (r) {
      var live = $('#agdLive'); if (live) live.classList.toggle('off', !(r && r.ok));
      if (!r || !r.ok) { if (r && /session|authenticated|expired|disabled/i.test(String(r.error || ''))) window.__atLogout && window.__atLogout(); return; }
      list = r.items || [];
      var tot = list.reduce(function (n, x) { return n + (x.unread || 0); }, 0);
      if (knownUnread !== null && tot > knownUnread) beep(); knownUnread = tot;
      document.title = (tot ? '(' + tot + ') ' : '') + 'Agent desk';
      drawList();
    });
  }
  function drawList() {
    var box = $('#agdList'); if (!box) return;
    var un = list.filter(function (x) { return x.unread > 0; }).length, nr = list.filter(function (x) { return x.lastFrom === 'client'; }).length;
    $('#agdTabs').innerHTML = [['all', 'All', list.length], ['unread', 'Unread', un], ['reply', 'Needs reply', nr]].map(function (t) { return '<button type="button" class="agd-tab' + (filter === t[0] ? ' on' : '') + '" data-f="' + t[0] + '">' + t[1] + '<em>' + t[2] + '</em></button>'; }).join('');
    $('#agdTabs').querySelectorAll('button').forEach(function (b) { b.onclick = function () { filter = b.getAttribute('data-f'); drawList(); }; });
    var rows = list.filter(function (x) { return (filter === 'all' || (filter === 'unread' && x.unread > 0) || (filter === 'reply' && x.lastFrom === 'client')) && (!q || (x.name + ' ' + x.email).toLowerCase().indexOf(q) > -1); });
    if (!list.length) { box.innerHTML = '<div class="agd-empty"><b>No clients assigned yet</b>The owner will add the clients you talk to. This list fills in on its own.</div>'; return; }
    if (!rows.length) { box.innerHTML = '<div class="agd-empty"><b>Nothing here</b>' + (q ? 'No one matches “' + esc(q) + '”.' : filter === 'unread' ? 'You have read everything.' : 'All answered. Nice work.') + '</div>'; return; }
    box.innerHTML = rows.map(function (x) {
      return '<button type="button" class="agd-it' + (x.email === cur ? ' on' : '') + (x.unread ? ' un' : '') + '" data-e="' + esc(x.email) + '">' + av(x.name, x.email) + '<div class="b"><div class="t"><span class="n">' + esc(x.name) + '</span><span>' + esc(ago(x.lastAt)) + '</span></div><div class="l"><span>' + (x.lastFrom === 'agent' ? 'You: ' : '') + esc(x.lastText || 'No messages yet. Say hello.') + '</span>' + (x.unread ? '<i class="agd-bd">' + x.unread + '</i>' : '') + '</div></div></button>';
    }).join('');
    box.querySelectorAll('.agd-it').forEach(function (b) { b.onclick = function () { openChat(b.getAttribute('data-e')); }; });
  }

  /* ---------- conversation ---------- */
  var QR = ['Hello! How can I help you today?', 'One moment please, I am checking this for you.', 'Thank you for your patience.', 'Could you send me a screenshot of what you see?', 'Is there anything else I can help you with?'];
  function drawMid() {
    var mid = $('#agdMid'); if (!mid) return;
    if (!cur) { mid.innerHTML = '<div class="agd-empty" style="margin:auto"><b>Choose a conversation</b>Pick a client on the left to read the chat and see their details.</div>'; return; }
    var c = list.filter(function (x) { return x.email === cur; })[0] || { name: cur, email: cur };
    mid.innerHTML = '<div class="agd-ch"><button class="agd-back" id="agdBack" type="button" aria-label="Back">‹</button>' + av(c.name, c.email) + '<div style="min-width:0;flex:1"><div class="n">' + esc(c.name) + '</div><div class="e">' + esc(c.email) + '</div></div><button class="agd-info" id="agdInfo" type="button" aria-label="Client details">ⓘ</button></div>' +
      '<div class="agd-msgs" id="agdMsgs" aria-live="polite"></div><div class="agd-qr" id="agdQr">' + QR.map(function (t, i) { return '<button type="button" data-i="' + i + '">' + esc(t.length > 30 ? t.slice(0, 28) + '…' : t) + '</button>'; }).join('') + '</div>' +
      '<div class="agd-cmp"><input type="file" id="agdFile" accept="image/jpeg,image/png,image/webp" hidden><button class="agd-ph" id="agdPh" type="button" title="Send a photo" aria-label="Send a photo">📎</button><textarea id="agdTx" rows="1" placeholder="Write a message…  (Enter to send, Shift+Enter for a new line)" maxlength="4000"></textarea><button class="agd-go" id="agdGo" type="button">Send</button></div>';
    $('#agdBack').onclick = function () { $('#agd').classList.remove('chat'); cur = ''; drawList(); drawMid(); drawCard(); };
    $('#agdInfo').onclick = function () { $('#agd').classList.toggle('cardopen'); };
    var tx = $('#agdTx'); tx.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
    tx.addEventListener('input', function () { tx.style.height = 'auto'; tx.style.height = Math.min(140, tx.scrollHeight) + 'px'; if (!typingT) { api('setTyping', { email: cur, typing: true }); typingT = setTimeout(function () { typingT = 0; api('setTyping', { email: cur, typing: false }); }, 2500); } });
    $('#agdGo').onclick = send;
    $('#agdQr').querySelectorAll('button').forEach(function (b) { b.onclick = function () { tx.value = QR[+b.getAttribute('data-i')]; tx.focus(); }; });
    $('#agdPh').onclick = function () { $('#agdFile').click(); };
    $('#agdFile').onchange = function () { var f = this.files && this.files[0]; this.value = ''; if (!f) return; if (f.size > 2e6) { toast('Photo is too large (max 2 MB)'); return; } var fr = new FileReader(); fr.onload = function () { api('sendChatImage', { email: cur, dataUrl: fr.result, clientMsgId: 'a' + Date.now() }).then(function (r) { if (!r.ok) toast(r.error || 'Could not send the photo'); else pull(true); }); }; fr.readAsDataURL(f); };
  }
  function imgHtml(m) {
    var k = m.img; if (imgCache[k]) return '<img src="' + imgCache[k] + '" alt="Photo" data-full="1">';
    api('getChatImage', { email: cur, key: k }).then(function (r) { if (r && r.ok && r.dataUrl) { imgCache[k] = r.dataUrl; lastSig = ''; renderMsgs(true); } });
    return '<span class="ph">Loading photo…</span>';
  }
  function renderMsgs(keep) {
    var box = $('#agdMsgs'); if (!box) return;
    var near = box.scrollHeight - box.scrollTop - box.clientHeight < 120, h = '', day = '';
    msgs.forEach(function (m) {
      var dl = dayLabel(m.ts); if (dl !== day) { day = dl; h += '<div class="agd-day">' + esc(dl) + '</div>'; }
      var me = m.from === 'admin';
      h += '<div class="agd-m' + (me ? ' me' : '') + '">' + (m.img ? imgHtml(m) + (m.text && m.text.indexOf('Photo') < 0 ? '<div>' + esc(m.text) + '</div>' : '') : esc(m.text)) + '<small>' + new Date(m.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + (me ? (m.read ? ' · Seen' : '') : '') + '</small></div>';
    });
    if (typingNow) h += '<div class="agd-typing">typing…</div>';
    if (!msgs.length) h = '<div class="agd-empty" style="margin:auto"><b>No messages yet</b>Send the first message to start the conversation.</div>';
    box.innerHTML = h;
    box.querySelectorAll('img[data-full]').forEach(function (i) { i.onclick = function () { var w = window.open(); if (w) { w.document.write('<img src="' + i.src + '" style="max-width:100%">'); } }; });
    if (near || !keep) box.scrollTop = box.scrollHeight;
  }
  var typingNow = false;
  function pull(force) {
    if (!cur) return Promise.resolve();
    var who = cur;
    return api('getChat', { email: who }).then(function (r) {
      if (who !== cur) return;
      if (!r || !r.ok) {
        if (r && r.needPerm === 'assign') { cur = ''; msgs = []; card = null; $('#agd').classList.remove('chat', 'cardopen'); drawMid(); drawCard(); toast('This client is no longer on your list.'); loadInbox(); return; }
        if (r && r.error && !/Connection/.test(r.error)) toast(r.error); return;
      }
      var ch = r.chat || [], t = r.typing || {}, tn = !!(t.client && Date.now() - (t.clientTs || 0) < 6000);
      var sig = ch.length + ':' + (ch.length ? ch[ch.length - 1].id + (ch[ch.length - 1].read ? 1 : 0) : '') + ':' + tn;
      if (sig === lastSig && !force) return;
      var grew = ch.length > msgs.length; msgs = ch; typingNow = tn; lastSig = sig; renderMsgs(!grew);
      if (ch.some(function (m) { return m.from === 'client' && !m.read; })) api('markChatRead', { email: who }).then(loadInbox);
    });
  }
  function send() {
    var tx = $('#agdTx'), go = $('#agdGo'); if (!tx || !cur) return; var t = tx.value.trim(); if (!t) return;
    go.disabled = true; var id = 'a' + Date.now() + Math.random().toString(36).slice(2, 7);
    api('sendChatMessage', { email: cur, text: t, clientMsgId: id }).then(function (r) {
      go.disabled = false;
      if (!r.ok && r.needPerm === 'assign') { toast('This client is no longer on your list. Your message was not sent.'); loadInbox(); pull(true); return; }
      if (!r.ok) { toast(r.error || 'Could not send. Try again.'); return; }
      tx.value = ''; tx.style.height = 'auto'; sent++; pull(true); loadInbox(); tx.focus();
    });
  }
  function toast(m) { var t = document.createElement('div'); t.className = 'agd-toast'; t.textContent = m; document.body.appendChild(t); setTimeout(function () { t.remove(); }, 3200); }

  function openChat(email) {
    cur = email; msgs = []; lastSig = ''; card = null; typingNow = false; $('#agd').classList.add('chat'); $('#agd').classList.remove('cardopen');
    drawList(); drawMid(); drawCard(); renderMsgs(false); pull(true);
    api('agentClientCard', { email: email }).then(function (r) { if (email !== cur) return; card = r && r.ok ? r.client : { error: (r && r.error) || 'Could not load the details' }; drawCard(); });
    setTimeout(function () { var t = $('#agdTx'); if (t && window.innerWidth > 760) t.focus(); }, 60);
  }

  /* ---------- client card ---------- */
  function drawCard() {
    var box = $('#agdCard'); if (!box) return;
    if (!cur) { box.innerHTML = '<div class="agd-empty" style="margin:auto"><b>Client details</b>Open a conversation to see who you are talking to.</div>'; return; }
    if (!card) { box.innerHTML = '<div class="agd-ct"><div class="agd-sk" style="width:64px;height:64px;border-radius:50%;margin:0 auto"></div><div class="agd-sk" style="width:60%;margin:14px auto"></div><div class="agd-sk" style="height:120px;border-radius:16px"></div><div class="agd-sk" style="height:160px;border-radius:14px"></div></div>'; return; }
    if (card.error) { box.innerHTML = '<div class="agd-empty" style="margin:auto"><b>Not available</b>' + esc(card.error) + '</div>'; return; }
    var c = card, tot = c.totalUsd || 0, pc = function (v) { return tot > 0 ? Math.max(0, v / tot * 100) : 0; };
    var kyc = String(c.kyc || '').toLowerCase(), kt = c.verified || /approved|verified/.test(kyc) ? '<span class="agd-tag ok">✓ Verified</span>' : /pending|review/.test(kyc) ? '<span class="agd-tag wr">Verification pending</span>' : '<span class="agd-tag wr">Not verified</span>';
    box.innerHTML = '<div class="agd-ct"><div class="hd">' + av(c.name, c.email, 1) + '<h3>' + esc(c.name) + '</h3><button class="agd-em" id="agdCp" type="button" title="Copy e-mail">' + esc(c.email) + ' ⧉</button><div class="agd-tags">' + (c.accountType ? '<span class="agd-tag">' + esc(c.accountType === 'exchange' ? 'Exchange' : c.accountType === 'banking' ? 'Banking' : c.accountType) + '</span>' : '') + kt + (c.cardStatus ? '<span class="agd-tag' + (/frozen/i.test(c.cardStatus) ? ' wr' : '') + '">Card ' + esc(c.cardStatus) + '</span>' : '') + '</div></div>' +
      '<div class="agd-bal"><small>Total balance</small><b>' + esc(money(tot, c)) + '</b><div class="agd-bar"><i style="width:' + pc(c.cashUsd) + '%;background:#6aa9ff"></i><i style="width:' + pc(c.btcUsd) + '%;background:#ffb454"></i><i style="width:' + pc(c.ethUsd) + '%;background:#a78bfa"></i></div>' +
      '<div class="agd-r" style="--c:#6aa9ff"><span>Cash</span><b>' + esc(money(c.cashUsd, c)) + '</b></div>' +
      '<div class="agd-r" style="--c:#ffb454"><span>Bitcoin</span><b>' + esc(coin(c.btc)) + ' BTC<small>≈ ' + esc(money(c.btcUsd, c)) + '</small></b></div>' +
      '<div class="agd-r" style="--c:#a78bfa"><span>Ethereum</span><b>' + esc(coin(c.eth)) + ' ETH<small>≈ ' + esc(money(c.ethUsd, c)) + '</small></b></div></div>' +
      '<div class="agd-kv"><div><span>Country</span><b>' + esc(c.country || 'Not provided') + '</b></div><div><span>Account</span><b>' + esc(c.accountNo || '—') + '</b></div><div><span>Currency</span><b>' + esc(c.currency || 'USD') + '</b></div><div><span>Client since</span><b>' + (c.joinedAt ? esc(new Date(c.joinedAt).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })) : '—') + '</b></div><div><span>Transactions</span><b>' + esc(c.txCount) + '</b></div></div>' +
      '<div class="agd-note">Read-only. You can chat with this client, but not change their account.</div></div>';
    $('#agdCp').onclick = function () { try { navigator.clipboard.writeText(c.email); toast('E-mail copied'); } catch (e) { } };
  }

  /* ---------- boot ---------- */
  function mount(me) {
    if (mounted) return; mounted = true; ME = me; try { localStorage.setItem('nc_agent', '1'); } catch (e) { } css(); shell(); loadInbox();
    setInterval(function () { if (!document.hidden) { loadInbox(); pull(false); } }, 3000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) { loadInbox(); pull(true); } });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { var d = $('#agd'); if (d && d.classList.contains('cardopen')) d.classList.remove('cardopen'); } });
    var panel = document.getElementById('adminPanel'); if (panel) panel.style.setProperty('display', 'none', 'important');
    window.__atGate = function () { };                                                    // the admin panel is not used here: no "access required" pop-ups from its background polls
    var OK = /^(adminMe|adminMyActivity|logout|login|changePassword|session|staffRequestAccess|agentInbox|agentClientCard|getChat|sendChatMessage|markChatRead|setTyping|sendChatImage|getChatImage)$/, _f = window.fetch;
    window.fetch = function (u, o) {                                                       // legacy admin pollers would only be refused by the server: do not even send them
      try { var m = typeof u === 'string' && u.indexOf(BASE) === 0 && /[?&]action=([A-Za-z_]+)/.exec(u); if (m && !OK.test(m[1])) return Promise.resolve(new Response(JSON.stringify({ ok: false, error: 'Not available for agents' }), { status: 200, headers: { 'Content-Type': 'application/json' } })); } catch (e) { }
      return _f.apply(this, arguments);
    };
    document.documentElement.style.overflow = 'hidden';
  }
  function unmountDesk() { var d = $('#agd'); if (d) d.remove(); mounted = false; document.documentElement.classList.remove('agd-pre'); var pre = $('#agdPre'); if (pre) pre.remove(); var pn = document.getElementById('adminPanel'); if (pn) pn.style.removeProperty('display'); document.documentElement.style.overflow = ''; try { localStorage.setItem('nc_agent', ''); } catch (e) { } }
  var asked = '', tries = 0;
  (function early() {                                                  // we already know this sign-in is an agent: open the desk at once, confirm with the server after
    try { if (localStorage.getItem('nc_agent') !== '1' || localStorage.getItem('user_role') !== 'admin' || !tok()) return; } catch (e) { return; }
    var go = function () { if (mounted) return; mount({ name: (localStorage.getItem('user_name') || 'Agent') }); api('adminMe').then(function (r) { if (r && r.ok && r.me) { if (!r.me.agent) unmountDesk(); else { ME = r.me; var n = $('#agdMe'); if (n) n.textContent = r.me.name; document.documentElement.classList.remove('agd-pre'); var pre = $('#agdPre'); if (pre) pre.remove(); } } else { document.documentElement.classList.remove('agd-pre'); var pr = $('#agdPre'); if (pr) pr.remove(); } }); };
    if (document.body) go(); else document.addEventListener('DOMContentLoaded', go);
  })();
  function check() {
    var t = tok(); if (!t || mounted) return;
    var p = document.getElementById('adminPanel'); if (!p || !p.getClientRects().length) return;
    if (asked === t) return; asked = t;
    api('adminMe').then(function (r) { if (r && r.ok && r.me && r.me.agent) mount(r.me); });
  }
  setInterval(function () { if (!mounted && ++tries < 600) check(); }, 700);
})();
