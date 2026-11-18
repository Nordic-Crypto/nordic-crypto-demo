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
      '#agd{--bg:#0a0e14;--p1:#111823;--p2:#161f2d;--ln:rgba(255,255,255,.08);--tx:#e9eef6;--mu:#8b97aa;--ac:#62e8c2;--acx:#10180a;--ok:#34d399;--wr:#ffb454;--me:#1d2b17;--them:#18212f;position:fixed;inset:0;z-index:100040;display:flex;flex-direction:column;background:var(--bg);color:var(--tx);font:14px/1.45 Inter,system-ui,-apple-system,Segoe UI,sans-serif}' +
      'html[data-theme="light"] #agd{--bg:#eef1ea;--p1:#fff;--p2:#f6f8f2;--ln:rgba(15,23,42,.1);--tx:#0f172a;--mu:#5b6577;--ac:#0b8460;--acx:#fff;--ok:#0f9f6e;--wr:#b86a00;--me:#d9f2e9;--them:#eef1f6}' +
      '#agd *{box-sizing:border-box}:where(#agd) button{font:inherit;color:inherit}' +
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
      '.agd-bal{margin:14px 0;padding:16px;border-radius:16px;background:linear-gradient(135deg,rgba(98,232,194,.12),var(--p2));border:1px solid var(--ln)}html[data-theme="light"] .agd-bal{background:linear-gradient(135deg,rgba(40,190,150,.14),#fff)}.agd-bal small{color:var(--mu);font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase}.agd-bal b{display:block;font-size:26px;margin:2px 0 12px;letter-spacing:-.01em}' +
      '.agd-bar{display:flex;height:8px;border-radius:9px;overflow:hidden;background:var(--ln);margin-bottom:12px}.agd-bar i{display:block;height:100%}.agd-r{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:5px 0;font-size:13px}.agd-r span{display:flex;align-items:center;gap:8px;color:var(--mu)}.agd-r span::before{content:"";width:9px;height:9px;border-radius:3px;background:var(--c,var(--mu))}.agd-r b{font-size:13px;text-align:right}.agd-r small{display:block;color:var(--mu);font-weight:500;font-size:11.5px}' +
      '.agd-sec{border:1px solid var(--ln);border-radius:14px;background:var(--p2);padding:12px 14px;margin-top:12px}.agd-sec h4{margin:0 0 6px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--mu)}.agd-pr{display:flex;flex-wrap:wrap;align-items:center;gap:6px 8px;padding:7px 0;font-size:12px;border-top:1px solid var(--ln)}.agd-pr:first-of-type{border-top:0}.agd-pr span{flex:1 0 100%;color:var(--mu);font-size:11px}.agd-pr code{flex:1;min-width:0;overflow-wrap:anywhere;font:12px ui-monospace,Menlo,monospace}.agd-pr em{color:var(--mu)}.agd-mini{border:1px solid var(--ln);background:transparent;border-radius:8px;padding:3px 9px;font-size:11px;cursor:pointer}.agd-mini:hover{border-color:var(--ac)}.agd-hint{color:var(--mu);font-size:11px;display:block;margin-top:6px}.agd-op{display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-top:1px solid var(--ln);font-size:12px}.agd-op:first-of-type{border-top:0}.agd-op small{display:block;color:var(--mu);font-size:11px}.agd-op .r{text-align:right}.agd-st{display:inline-block;margin-top:3px;padding:2px 8px;border-radius:99px;font-size:10px;font-weight:600;background:rgba(255,180,84,.16);color:#ffb454}.agd-st.completed{background:rgba(120,220,120,.16);color:#6fdc8c}.agd-st.rejected{background:rgba(255,100,100,.16);color:#ff7b7b}.agd-st.hold{background:rgba(167,139,250,.18);color:#a78bfa}html[data-theme="light"] .agd-st{filter:saturate(1.2) brightness(.7)}' +
      '.agd-pop{position:absolute;left:18px;bottom:calc(100% - 6px);z-index:5;display:flex;flex-wrap:wrap;gap:2px;max-width:min(320px,calc(100% - 36px));padding:8px;border:1px solid var(--ln);border-radius:14px;background:var(--p1);box-shadow:0 16px 40px rgba(0,0,0,.35)}.agd-pop[hidden]{display:none}.agd-pop button{all:unset;cursor:pointer;padding:6px 8px;border-radius:8px;font-size:18px;line-height:1}.agd-pop button:hover{background:var(--p2)}.agd-qp{flex-direction:column;max-width:min(520px,calc(100% - 36px))}.agd-qp button{font-size:13px;line-height:1.3;padding:8px 10px;color:var(--tx)}.agd-jump{position:absolute;right:22px;bottom:84px;z-index:4;border:1px solid var(--ln);border-radius:99px;padding:7px 14px;font-size:12px;font-weight:700;cursor:pointer;color:var(--acx);background:var(--ac);box-shadow:0 8px 22px rgba(0,0,0,.35)}.agd-jump[hidden]{display:none}#agdMid{position:relative}html.hol .agd-ch .n::after{content:\' 🎄\'}' +
      '.agd-home{flex:1;overflow:auto;padding:26px 28px 30px;display:flex;flex-direction:column;gap:18px;animation:agdIn .3s ease}.agd-hero{position:relative;display:flex;align-items:center;gap:22px;padding:24px;border-radius:24px;border:1px solid var(--ln);background:var(--p1);overflow:hidden}.agd-orb{position:absolute;inset:0;pointer-events:none}.agd-orb i{position:absolute;width:260px;height:260px;border-radius:50%;opacity:.55;will-change:transform}.agd-orb i:nth-child(1){left:-60px;top:-110px;background:radial-gradient(circle,rgba(98,232,194,.28),transparent 65%);animation:agdO1 14s ease-in-out infinite alternate}.agd-orb i:nth-child(2){right:-40px;top:-90px;background:radial-gradient(circle,rgba(106,169,255,.3),transparent 65%);animation:agdO2 18s ease-in-out infinite alternate}.agd-orb i:nth-child(3){left:35%;bottom:-150px;background:radial-gradient(circle,rgba(255,90,95,.2),transparent 65%);animation:agdO1 22s ease-in-out infinite alternate-reverse}@keyframes agdO1{to{transform:translate3d(60px,30px,0) scale(1.15)}}@keyframes agdO2{to{transform:translate3d(-70px,40px,0) scale(1.1)}}.agd-ill{position:relative;flex:none;width:170px;height:auto}.agd-ill .b1{animation:agdFl 5s ease-in-out infinite}.agd-ill .b2{animation:agdFl 6s ease-in-out -2s infinite}@keyframes agdFl{50%{transform:translateY(-6px)}}.agd-ht{position:relative;min-width:0}.agd-ht small{display:block;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--mu);font-weight:700}.agd-ht h2{margin:6px 0 6px;font-size:clamp(24px,3.2vw,34px);letter-spacing:-.02em}.agd-ht p{margin:0;color:var(--mu);font-size:14.5px}.agd-sx{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.agd-sx div{padding:14px 16px;border-radius:16px;border:1px solid var(--ln);background:var(--p1)}.agd-sx b{display:block;font-size:26px;color:var(--tx);letter-spacing:-.02em;font-variant-numeric:tabular-nums}.agd-sx span{font-size:12px;color:var(--mu)}.agd-sx .hot{border-color:rgba(255,180,84,.5);background:rgba(255,180,84,.08)}.agd-home h3{margin:0 0 8px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--mu)}.agd-nx{display:flex;flex-direction:column;gap:6px}.agd-keys{border:1px solid var(--ln);border-radius:16px;background:var(--p1);padding:14px 16px}.agd-keys div{display:flex;align-items:center;gap:6px;padding:6px 0;font-size:13px;color:var(--mu)}.agd-keys div span{margin-left:8px}.agd-keys kbd{font:600 11.5px ui-monospace,Menlo,monospace;padding:3px 7px;border-radius:7px;border:1px solid var(--ln);background:var(--p2);color:var(--tx)}@media(max-width:900px){.agd-hero{flex-direction:column;text-align:center}.agd-ill{width:140px}.agd-sx{grid-template-columns:repeat(2,minmax(0,1fr))}.agd-home{padding:16px}}@media(prefers-reduced-motion:reduce){.agd-orb i,.agd-ill .b1,.agd-ill .b2{animation:none}}' +
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
  function beep() { if (!sound) return; if (window.NCSound) { window.NCSound.notify(); return; } try { var A = window.AudioContext || window.webkitAudioContext, c = new A(), o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.value = 880; g.gain.setValueAtTime(.0001, c.currentTime); g.gain.exponentialRampToValueAtTime(.12, c.currentTime + .02); g.gain.exponentialRampToValueAtTime(.0001, c.currentTime + .35); o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + .4); } catch (e) { } }
  function loadInbox() {
    return api('agentInbox').then(function (r) {
      var live = $('#agdLive'); if (live) live.classList.toggle('off', !(r && r.ok));
      if (!r || !r.ok) { if (r && /session|authenticated|expired|disabled/i.test(String(r.error || ''))) window.__atLogout && window.__atLogout(); return; }
      list = r.items || [];
      var tot = list.reduce(function (n, x) { return n + (x.unread || 0); }, 0);
      if (knownUnread !== null && tot > knownUnread) beep(); knownUnread = tot;
      document.title = (tot ? '(' + tot + ') ' : '') + 'Agent desk';
      drawList(); if (!cur) drawHome();
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

  /* ---------- home (nothing opened): greeting, today's numbers, who waits longest, shortcuts ---------- */
  var homeSig = '';
  function closeChat() { var d = $('#agd'); if (!d || !cur) return; d.classList.remove('chat', 'cardopen'); cur = ''; msgs = []; card = null; lastSig = ''; drawList(); drawMid(); drawCard(); }
  function drawHome() {
    var mid = $('#agdMid'); if (!mid || cur) return;
    var t0 = new Date(); t0.setHours(0, 0, 0, 0); var un = 0, wait = [], done = 0;
    list.forEach(function (x) { un += x.unread || 0; if (x.lastFrom === 'client') wait.push(x); else if (x.lastFrom === 'agent' && x.lastAt >= t0.getTime()) done++; });
    wait.sort(function (a, b) { return (a.lastAt || 0) - (b.lastAt || 0); });
    var ny = window.__holApi && window.__holApi.active && window.__holApi.active() ? window.__holApi.daysToNY() : 0;
    var sig = [list.length, un, wait.length, done, wait.slice(0, 3).map(function (x) { return x.email + x.lastAt; }).join(','), ny, ME && ME.name].join('|'); if (sig === homeSig && mid.querySelector('.agd-home')) return; homeSig = sig;
    var h = new Date().getHours(), g = h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening', nm = String((ME && ME.name) || '').split(' ')[0];
    var sub = !list.length ? 'The owner will add your clients soon. This page fills in on its own.' : wait.length ? (wait.length === 1 ? '1 client is waiting for your reply.' : wait.length + ' clients are waiting for your reply.') : 'Everyone has an answer. Nice work.';
    mid.innerHTML = '<div class="agd-home"><div class="agd-hero"><div class="agd-orb"><i></i><i></i><i></i></div>' +
      '<svg class="agd-ill" viewBox="0 0 200 140" aria-hidden="true"><defs><linearGradient id="agdG1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#62e8c2"/><stop offset="1" stop-color="#6ee7a8"/></linearGradient><linearGradient id="agdG2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6aa9ff"/><stop offset="1" stop-color="#a78bfa"/></linearGradient></defs><g class="b1"><rect x="14" y="14" width="112" height="64" rx="18" fill="url(#agdG2)"/><path d="M40 78l-6 18 22-14z" fill="#8a8cf0"/><circle cx="50" cy="46" r="5" fill="#fff" opacity=".9"/><circle cx="70" cy="46" r="5" fill="#fff" opacity=".7"/><circle cx="90" cy="46" r="5" fill="#fff" opacity=".5"/></g><g class="b2"><rect x="78" y="62" width="108" height="58" rx="18" fill="url(#agdG1)"/><path d="M160 120l8 16-22-12z" fill="#45cfa8"/><rect x="96" y="82" width="62" height="7" rx="3.5" fill="#10180a" opacity=".55"/><rect x="96" y="97" width="42" height="7" rx="3.5" fill="#10180a" opacity=".35"/></g></svg>' +
      '<div class="agd-ht"><small>' + esc(new Date().toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })) + (ny > 0 && ny < 60 ? ' · 🎄 ' + ny + (ny === 1 ? ' day' : ' days') + ' to New Year' : '') + '</small><h2>' + g + (nm ? ', ' + esc(nm) : '') + '</h2><p>' + esc(sub) + '</p></div></div>' +
      '<div class="agd-sx"><div><b>' + list.length + '</b><span>Your clients</span></div><div class="' + (un ? 'hot' : '') + '"><b>' + un + '</b><span>Unread messages</span></div><div class="' + (wait.length ? 'hot' : '') + '"><b>' + wait.length + '</b><span>Waiting for reply</span></div><div><b>' + done + '</b><span>Answered today</span></div></div>' +
      (wait.length ? '<div class="agd-nx"><h3>Waiting longest</h3>' + wait.slice(0, 3).map(function (x) { return '<button type="button" class="agd-it" data-e="' + esc(x.email) + '">' + av(x.name, x.email) + '<div class="b"><div class="t"><span class="n">' + esc(x.name) + '</span><span>' + esc(ago(x.lastAt)) + '</span></div><div class="l"><span>' + esc(x.lastText || '') + '</span></div></div></button>'; }).join('') + '</div>' : '') +
      '<div class="agd-keys"><h3>Shortcuts</h3><div><kbd>Esc</kbd><span>Close the conversation</span></div><div><kbd>Alt</kbd>+<kbd>↑</kbd><kbd>↓</kbd><span>Previous / next client</span></div><div><kbd>/</kbd><span>Quick replies (start a message with it)</span></div><div><kbd>Enter</kbd><span>Send · Shift+Enter for a new line</span></div></div></div>';
    mid.querySelectorAll('.agd-nx .agd-it').forEach(function (b) { b.onclick = function () { openChat(b.getAttribute('data-e')); }; });
  }
  document.addEventListener('keydown', function (e) {                    // Esc: leave the conversation (the draft is kept) and go back to the home view
    if (e.key !== 'Escape' || e.__agdH || !$('#agd')) return;
    if (document.querySelector('.agd-pop:not([hidden]),.agd-lb,.agd-modal')) return;
    var d = $('#agd'); if (d.classList.contains('cardopen')) { d.classList.remove('cardopen'); return; }
    if (cur) { e.preventDefault(); closeChat(); }
  });

  /* ---------- conversation ---------- */
  var QR = ['Hello! How can I help you today?', 'One moment please, I am checking this for you.', 'Thank you for your patience.', 'Could you send me a screenshot of what you see?', 'Is there anything else I can help you with?'];
  function drawMid() {
    var mid = $('#agdMid'); if (!mid) return;
    if (!cur) { drawHome(); return; }
    homeSig = '';
    var c = list.filter(function (x) { return x.email === cur; })[0] || { name: cur, email: cur };
    mid.innerHTML = '<div class="agd-ch"><button class="agd-back" id="agdBack" type="button" aria-label="Back">‹</button>' + av(c.name, c.email) + '<div style="min-width:0;flex:1"><div class="n">' + esc(c.name) + '</div><div class="e">' + esc(c.email) + '</div></div><button class="agd-info" id="agdInfo" type="button" aria-label="Client details">ⓘ</button></div>' +
      '<div class="agd-msgs" id="agdMsgs" aria-live="polite"></div><div class="agd-qr" id="agdQr">' + QR.map(function (t, i) { return '<button type="button" data-i="' + i + '">' + esc(t.length > 30 ? t.slice(0, 28) + '…' : t) + '</button>'; }).join('') + '</div>' +
      '<div class="agd-cmp"><input type="file" id="agdFile" accept="image/jpeg,image/png,image/webp" hidden><button class="agd-ph" id="agdPh" type="button" title="Send a photo" aria-label="Send a photo">📎</button><textarea id="agdTx" rows="1" placeholder="Write a message…  (Enter to send, Shift+Enter for a new line)" maxlength="4000"></textarea><button class="agd-go" id="agdGo" type="button">Send</button></div>';
    $('#agdBack').onclick = closeChat;
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
      h += '<div class="agd-m' + (me ? ' me' : '') + (!m.img && window.__hxIsEmo && window.__hxIsEmo(m.text) ? ' big' : '') + (m.auto ? ' auto' : '') + '">' + (m.auto ? '<small style="text-align:left;margin:0 0 3px">Auto-reply</small>' : '') + (m.img ? imgHtml(m) + (m.text && m.text.indexOf('Photo') < 0 ? '<div>' + esc(m.text) + '</div>' : '') : esc(m.text)) + '<small>' + new Date(m.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + (me ? (m.read ? ' · Seen' : '') : '') + '</small></div>';
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
    api('agentClientCard', { email: email }).then(function (r) { if (email !== cur) return; card = r && r.ok ? Object.assign({}, r.client, { payments: r.payments || {}, ops: r.ops || [] }) : { error: (r && r.error) || 'Could not load the details' }; drawCard(); });
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
      payBlock(c) + opsBlock(c) +
      '<div class="agd-note">Read-only. You can chat with this client, but not change their account.</div></div>';
    $('#agdCp').onclick = function () { try { navigator.clipboard.writeText(c.email); toast('E-mail copied'); } catch (e) { } };
    [].forEach.call(box.querySelectorAll('[data-cp]'), function (b) { b.onclick = function () { try { navigator.clipboard.writeText(b.getAttribute('data-cp')); toast('Copied'); } catch (e) { } }; });
    [].forEach.call(box.querySelectorAll('[data-rev]'), function (b) {
      b.onclick = function () {
        if (b.getAttribute('data-on')) { b.previousElementSibling.textContent = b.getAttribute('data-mask'); b.textContent = 'Show'; b.removeAttribute('data-on'); return; }
        b.disabled = true; var em = cur;
        api('agentReveal', { email: em, what: b.getAttribute('data-rev') }).then(function (r) {
          b.disabled = false; if (em !== cur) return;
          if (r && r.ok && r.value) { b.setAttribute('data-mask', b.previousElementSibling.textContent); b.previousElementSibling.textContent = r.value; b.textContent = 'Hide'; b.setAttribute('data-on', '1'); setTimeout(function () { if (b.getAttribute('data-on')) b.click(); }, 20000); } else toast((r && r.error) || 'Not available');
        });
      };
    });
  }
  function short(a) { a = String(a || ''); return a.length > 22 ? a.slice(0, 10) + '…' + a.slice(-8) : a; }
  function payBlock(c) {
    var p = c.payments || {}, h = '';
    var row = function (l, v, ext) { return '<div class="agd-pr"><span>' + l + '</span>' + ext + '</div>'; };
    h += p.btc ? '<div class="agd-pr"><span>Bitcoin address</span><code title="' + esc(p.btc) + '">' + esc(short(p.btc)) + '</code><button type="button" class="agd-mini" data-cp="' + esc(p.btc) + '">Copy</button></div>' : '<div class="agd-pr"><span>Bitcoin address</span><em>Not connected</em></div>';
    h += p.eth ? '<div class="agd-pr"><span>Ethereum address</span><code title="' + esc(p.eth) + '">' + esc(short(p.eth)) + '</code><button type="button" class="agd-mini" data-cp="' + esc(p.eth) + '">Copy</button></div>' : '<div class="agd-pr"><span>Ethereum address</span><em>Not connected</em></div>';
    h += p.iban ? '<div class="agd-pr"><span>Bank account (IBAN)</span><code>' + esc(p.iban) + '</code><button type="button" class="agd-mini" data-rev="iban">Show</button></div>' : '<div class="agd-pr"><span>Bank account (IBAN)</span><em>Not connected</em></div>';
    (p.dests || []).forEach(function (d) { h += '<div class="agd-pr"><span>Payout · ' + esc(d.method) + (d.holder ? ' · ' + esc(d.holder) : '') + '</span><code>' + esc(d.masked) + '</code><button type="button" class="agd-mini" data-rev="' + esc(d.id) + '">Show</button></div>'; });
    return '<div class="agd-sec"><h4>Connected details</h4>' + h + '<small class="agd-hint">Full details are logged when shown.</small></div>';
  }
  var OPL = { withdrawal: 'Withdrawal', crypto_deposit: 'Crypto deposit', deposit: 'Deposit' }, STL = { pending: 'Awaiting confirmation', hold: 'On 24h hold', completed: 'Completed', rejected: 'Rejected' };
  function opsBlock(c) {
    var o = c.ops || []; if (!o.length) return '<div class="agd-sec"><h4>Recent activity</h4><div class="agd-hint">No deposits or withdrawals yet.</div></div>';
    return '<div class="agd-sec"><h4>Recent activity</h4>' + o.map(function (x) {
      var amt = x.kind === 'crypto_deposit' ? coin(x.amount) + ' ' + esc(x.cur) + (x.usd ? ' <small>≈ ' + esc(money(x.usd, c)) + '</small>' : '') : esc(money(x.amount, c));
      var meta = (x.method ? esc(x.method) + ' · ' : '') + (x.at ? esc(new Date(x.at).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })) : '') + (x.status === 'hold' && x.holdUntil ? ' · until ' + esc(new Date(x.holdUntil).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })) : '');
      return '<div class="agd-op"><div><b>' + OPL[x.kind] + '</b><small>' + meta + '</small></div><div class="r"><b>' + amt + '</b><span class="agd-st ' + x.status + '">' + STL[x.status] + '</span></div></div>';
    }).join('') + '</div>';
  }

  /* ---------- chat upgrades: drafts, emoji, "/" quick replies, jump-to-latest, paste/drop photos, Alt+↑/↓ ---------- */
  var drafts = {}, EMO = ['😊', '🙂', '👍', '🙏', '✅', '⏳', '🎄', '🎁', '🥂', '✨', '❄️', '🎉', '😉', '👋', '💬', '🔒', '💳', '₿', '📎', '👌', '🙌', '😅', '🤝', '❤️'];
  function myQR() { try { var a = JSON.parse(localStorage.getItem('agd_qr') || '[]'); return Array.isArray(a) ? a.filter(function (x) { return typeof x === 'string'; }).slice(0, 20) : []; } catch (e) { return []; } }
  function enhance() {
    var mid = $('#agdMid'), tx = $('#agdTx'), msgs = $('#agdMsgs'); if (!mid || !tx || !msgs || !cur) return; var who = cur;
    var grow = function () { tx.style.height = 'auto'; tx.style.height = Math.min(140, tx.scrollHeight) + 'px'; };
    tx.value = drafts[who] || ''; grow();
    var keep = function () { setTimeout(function () { drafts[who] = tx.value; }, 60); };
    tx.addEventListener('input', function () { drafts[who] = tx.value; }); tx.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) keep(); }); $('#agdGo').addEventListener('click', keep);
    var cmp = mid.querySelector('.agd-cmp'); cmp.style.position = 'relative';
    /* emoji */
    var eb = document.createElement('button'); eb.type = 'button'; eb.className = 'agd-ph'; eb.id = 'agdEmo'; eb.title = 'Emoji'; eb.setAttribute('aria-label', 'Emoji'); eb.textContent = '😊'; cmp.insertBefore(eb, tx);
    var pop = document.createElement('div'); pop.className = 'agd-pop'; pop.hidden = true; cmp.appendChild(pop);
    pop.innerHTML = EMO.map(function (e) { return '<button type="button">' + e + '</button>'; }).join('');
    eb.onclick = function () { pop.hidden = !pop.hidden; };
    pop.onclick = function (e) { var b = e.target.closest('button'); if (!b) return; var a = tx.selectionStart == null ? tx.value.length : tx.selectionStart; tx.value = tx.value.slice(0, a) + b.textContent + tx.value.slice(tx.selectionEnd == null ? a : tx.selectionEnd); drafts[who] = tx.value; tx.focus(); tx.selectionStart = tx.selectionEnd = a + b.textContent.length; pop.hidden = true; grow(); };
    /* "/" quick replies + save own */
    var qp = document.createElement('div'); qp.className = 'agd-pop agd-qp'; qp.hidden = true; cmp.appendChild(qp);
    var all = function () { return QR.concat(myQR()); };
    function showQ() {
      var v = tx.value; if (v.charAt(0) !== '/') { qp.hidden = true; return; } var f = v.slice(1).toLowerCase(), rows = all().filter(function (t) { return !f || t.toLowerCase().indexOf(f) > -1; }).slice(0, 6);
      if (!rows.length) { qp.hidden = true; return; } qp.innerHTML = rows.map(function (t, i) { return '<button type="button" data-t="' + esc(t) + '">' + esc(t) + '</button>'; }).join(''); qp.hidden = false;
    }
    tx.addEventListener('input', showQ);
    qp.onclick = function (e) { var b = e.target.closest('button'); if (!b) return; tx.value = b.getAttribute('data-t'); drafts[who] = tx.value; qp.hidden = true; tx.focus(); grow(); };
    tx.addEventListener('keydown', function (e) { if (e.key === 'Escape') { if (!qp.hidden || !pop.hidden) e.__agdH = 1; qp.hidden = true; pop.hidden = true; } else if (e.key === 'Tab' && !qp.hidden) { e.preventDefault(); var b = qp.querySelector('button'); if (b) b.click(); } });
    var sb = document.createElement('button'); sb.type = 'button'; sb.className = 'agd-ph'; sb.title = 'Save this text as your quick reply (type / to use it)'; sb.setAttribute('aria-label', 'Save as quick reply'); sb.textContent = '★'; cmp.insertBefore(sb, tx);
    sb.onclick = function () { var t = tx.value.trim(); if (!t || t.charAt(0) === '/') { toast('Write the reply first, then press ★ to save it'); return; } var a = myQR(); if (a.indexOf(t) < 0) a.unshift(t.slice(0, 400)); try { localStorage.setItem('agd_qr', JSON.stringify(a.slice(0, 20))); toast('Saved. Type / to use it'); } catch (e) { } };
    /* paste / drop photo */
    var sendFile = function (f) { var inp = $('#agdFile'); if (f && inp && inp.onchange) inp.onchange.call({ files: [f], value: '' }); };
    tx.addEventListener('paste', function (e) { var it = (e.clipboardData && e.clipboardData.files) || []; for (var i = 0; i < it.length; i++) if (/^image\//.test(it[i].type)) { e.preventDefault(); sendFile(it[i]); return; } });
    mid.addEventListener('dragover', function (e) { if (e.dataTransfer && [].indexOf.call(e.dataTransfer.types || [], 'Files') > -1) e.preventDefault(); });
    mid.addEventListener('drop', function (e) { var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (f && /^image\//.test(f.type)) { e.preventDefault(); sendFile(f); } });
    /* jump to latest */
    var jb = document.createElement('button'); jb.type = 'button'; jb.className = 'agd-jump'; jb.hidden = true; jb.textContent = '↓ Latest'; mid.appendChild(jb);
    jb.onclick = function () { msgs.scrollTo({ top: msgs.scrollHeight, behavior: 'smooth' }); };
    var tick = 0; msgs.addEventListener('scroll', function () { if (tick) return; tick = setTimeout(function () { tick = 0; jb.hidden = msgs.scrollHeight - msgs.scrollTop - msgs.clientHeight < 240; }, 80); }, { passive: true });
    document.addEventListener('click', function off(e) { if (!document.body.contains(pop)) { document.removeEventListener('click', off); return; } if (!e.target.closest('#agdEmo,.agd-pop')) { pop.hidden = true; qp.hidden = true; } });
  }
  var _dm = drawMid; drawMid = function () { _dm(); enhance(); };
  document.addEventListener('keydown', function (e) {                    // Alt + ↑ / ↓ : previous / next conversation
    if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') || !$('#agdList')) return; var its = [].slice.call(document.querySelectorAll('#agdList .agd-it')); if (!its.length) return;
    var i = its.findIndex(function (b) { return b.getAttribute('data-e') === cur; }); i = e.key === 'ArrowDown' ? Math.min(its.length - 1, i + 1) : Math.max(0, i < 0 ? 0 : i - 1); e.preventDefault(); openChat(its[i].getAttribute('data-e'));
  });

  /* ---------- boot ---------- */
  function mount(me) {
    if (mounted) return; mounted = true; ME = me; try { localStorage.setItem('nc_agent', '1'); } catch (e) { } css(); shell(); loadInbox();
    setInterval(function () { if (!document.hidden) { loadInbox(); pull(false); } }, 3000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) { loadInbox(); pull(true); } });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { var d = $('#agd'); if (d && d.classList.contains('cardopen')) d.classList.remove('cardopen'); } });
    var panel = document.getElementById('adminPanel'); if (panel) panel.style.setProperty('display', 'none', 'important');
    window.__atGate = function () { };                                                    // the admin panel is not used here: no "access required" pop-ups from its background polls
    var OK = /^(adminMe|adminMyActivity|logout|login|changePassword|session|staffRequestAccess|agentInbox|agentClientCard|agentReveal|holidayConfig|getChat|sendChatMessage|markChatRead|setTyping|sendChatImage|getChatImage)$/, _f = window.fetch;
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
