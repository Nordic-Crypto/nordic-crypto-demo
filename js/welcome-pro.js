/* NordicCrypto welcome-pro.js v1
   1) saved look (accent colour, compact mode) is applied on every page load
   2) pending-verification screen refreshes itself (silent check every 15 s, only while the tab is visible)
   3) first-run welcome: account type reveal -> "make it yours" (theme / accent / density) -> short tour -> confetti
   4) admin: approve dialog shows what the client asked for at sign-up */
(function () {
  'use strict';
  var W = 'https://nordic-deposit-checker.otis-790.workers.dev';
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} return null; }
  function tok() { return ls('session_token') || ''; }
  function reduced() { try { return matchMedia('(prefers-reduced-motion:reduce)').matches; } catch (e) { return false; } }
  function call(action, body) { return fetch(W + '?action=' + action, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ token: tok() }, body || {})) }).then(function (r) { return r.json(); }); }

  /* ───────── 1. saved look ───────── */
  var ACC = { cyan: ['#00E5FF', '#8B5CF6', 'Aurora'], lime: ['#C8FF4D', '#5CFFB1', 'Lime'], violet: ['#A78BFA', '#F472B6', 'Orchid'], amber: ['#FBBF24', '#FB7185', 'Sunset'] };
  function prefs() { try { return JSON.parse(ls('nc_prefs') || '{}') || {}; } catch (e) { return {}; } }
  function savePrefs(p) { ls('nc_prefs', JSON.stringify(p)); }
  function applyPrefs(p) {
    p = p || prefs(); var r = document.documentElement, a = ACC[p.accent];
    if (a) { r.style.setProperty('--pri', a[0]); r.style.setProperty('--pri2', a[1]); } else { r.style.removeProperty('--pri'); r.style.removeProperty('--pri2'); }
    r.classList.toggle('nc-dense', !!p.dense);
  }
  applyPrefs();

  /* ───────── 2. pending screen refreshes itself ───────── */
  var pollT = 0;
  function pendingTick() {
    var p = $('pendingScreen'); if (!p || !p.classList.contains('on') || document.hidden || !tok()) return;
    if (!p.querySelector('.nw-auto')) {
      var host = p.querySelector('.vmain') || p, n = document.createElement('div'); n.className = 'nw-auto';
      n.innerHTML = '<i></i>This page updates by itself. You can leave it open or come back later.'; host.appendChild(n);
    }
    var now = Date.now(); if (now - pollT < 14000) return; pollT = now;
    call('getUserState').then(function (d) {
      var s = d && d.verification && d.verification.status;
      if (s === 'approved' || s === 'rejected') { var b = $('btnCheckKycStatus'); if (b) b.click(); }
    }).catch(function () {});
  }
  setInterval(pendingTick, 4000);

  /* ───────── 3. first-run welcome ───────── */
  var shown = false;
  function me() { return (ls('user_email') || '').toLowerCase(); }
  function stNow() { try { return (typeof st !== 'undefined' && st) || null; } catch (e) { return null; } }
  function ready() {
    if (shown || ls('user_role') === 'admin' || !tok() || !me() || ls('nc_welcome_' + me()) === '1') return false;
    var s = stNow(); if (!s || !s.user || !s.user.verified) return false;
    var m = $('mainApp'); if (!m || getComputedStyle(m).display === 'none') return false;
    var bad = ['onboard', 'pendingScreen', 'verifyScreen', 'rejectedScreen'].some(function (id) { var e = $(id); return e && (e.classList.contains('on') || (e.style.display && e.style.display !== 'none' && getComputedStyle(e).display !== 'none')); });
    return !bad;
  }
  var armed = 0, watch = setInterval(function () {
    if (!ready()) { armed = 0; return; }
    if (!armed) { armed = Date.now(); return; }          // must stay "ready" for one more tick (avoids flashes during screen transitions)
    if (Date.now() - armed > 900) { clearInterval(watch); open(); }
  }, 1200);
  setTimeout(function () { clearInterval(watch); }, 20 * 60 * 1000);

  var STYLE =
    '.nw{position:fixed;inset:0;z-index:100300;display:grid;place-items:center;padding:18px;background:rgba(5,8,14,.78);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);animation:nwIn .4s ease}' +
    '.nw-box{position:relative;width:min(560px,100%);max-height:94vh;overflow:auto;padding:30px 28px 24px;border-radius:30px;background:linear-gradient(180deg,#121a2b,#0c1220);border:1px solid rgba(255,255,255,.12);box-shadow:0 60px 120px -30px rgba(0,0,0,.85);color:#eef2f9;font-family:inherit}' +
    '.nw-box:before{content:"";position:absolute;inset:-40% -20% auto -20%;height:70%;background:radial-gradient(closest-side,var(--pri,#00E5FF),transparent);opacity:.16;filter:blur(30px);pointer-events:none;animation:nwGlow 7s ease-in-out infinite alternate}' +
    '.nw-in{position:relative}.nw-dots{display:flex;gap:6px;margin-bottom:22px}.nw-dots i{flex:1;height:4px;border-radius:4px;background:rgba(255,255,255,.1);overflow:hidden}.nw-dots i.on:after{content:"";display:block;height:100%;background:linear-gradient(90deg,var(--pri,#00E5FF),var(--pri2,#8B5CF6));animation:nwBar .5s ease both}' +
    '.nw h2{margin:0 0 8px;font-size:clamp(24px,5vw,31px);letter-spacing:-.03em;line-height:1.15}.nw p{margin:0;color:#9aa6bb;line-height:1.55;font-size:15px}' +
    '.nw-step{animation:nwStep .45s cubic-bezier(.2,.8,.2,1)}' +
    '.nw-badge{display:inline-flex;align-items:center;gap:12px;margin:20px 0 6px;padding:14px 18px;border-radius:18px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12)}.nw-badge b{display:block;font-size:18px}.nw-badge span{font-size:13px;color:#9aa6bb}.nw-ico{width:46px;height:46px;border-radius:15px;display:grid;place-items:center;font-size:22px;background:linear-gradient(135deg,var(--pri,#00E5FF),var(--pri2,#8B5CF6));color:#06101f}' +
    '.nw-lab{margin:20px 0 9px;font-size:12px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:#7f8ba0}' +
    '.nw-row{display:flex;gap:10px;flex-wrap:wrap}.nw-opt{flex:1;min-width:110px;padding:13px 14px;border-radius:15px;border:2px solid rgba(255,255,255,.1);background:rgba(255,255,255,.03);color:#eef2f9;font:inherit;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:9px;transition:border-color .2s,background .2s,transform .2s}.nw-opt:hover{transform:translateY(-2px)}.nw-opt.on{border-color:var(--pri,#00E5FF);background:rgba(255,255,255,.08)}' +
    '.nw-sw{width:20px;height:20px;border-radius:50%;flex:none;background-image:linear-gradient(135deg,var(--c1),var(--c2))}' +
    '.nw-feat{display:flex;gap:16px;align-items:flex-start;margin-top:22px;padding:20px;border-radius:22px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1)}.nw-feat .nw-ico{flex:none;width:54px;height:54px;font-size:26px}.nw-feat b{display:block;font-size:18px;margin-bottom:5px}.nw-feat span{color:#9aa6bb;font-size:14.5px;line-height:1.55}' +
    '.nw-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:26px}.nw-skip{background:none;border:0;color:#7f8ba0;font:inherit;font-size:14px;cursor:pointer;padding:10px 4px}.nw-skip:hover{color:#fff}' +
    '.nw-btn{min-height:50px;padding:0 26px;border:0;border-radius:15px;font:inherit;font-weight:800;font-size:16px;color:#06101f;cursor:pointer;background:linear-gradient(90deg,var(--pri,#00E5FF),var(--pri2,#8B5CF6));box-shadow:0 14px 34px -14px var(--pri,#00E5FF);transition:transform .2s,box-shadow .2s}.nw-btn:hover{transform:translateY(-2px)}.nw-back{background:rgba(255,255,255,.06);color:#eef2f9;box-shadow:none;border:1px solid rgba(255,255,255,.12);margin-right:8px}' +
    '.nw-conf{position:fixed;inset:0;z-index:100400;pointer-events:none}' +
    '.nw-auto{display:flex;align-items:center;gap:10px;justify-content:center;margin-top:14px;font-size:13px;color:#8d99ae;text-align:center}.nw-auto i{width:8px;height:8px;border-radius:50%;background:#36e2a3;box-shadow:0 0 0 0 rgba(54,226,163,.6);animation:nwPulse 1.8s infinite;flex:none}' +
    'html.nc-dense .mi{padding:8px 12px}html.nc-dense .side{padding:14px 10px}' +
    '@keyframes nwIn{from{opacity:0}to{opacity:1}}@keyframes nwStep{from{opacity:0;transform:translateX(18px)}to{opacity:1;transform:none}}@keyframes nwBar{from{transform:translateX(-100%)}to{transform:none}}@keyframes nwGlow{to{transform:translate(8%,10%) scale(1.15)}}@keyframes nwPulse{70%{box-shadow:0 0 0 9px rgba(54,226,163,0)}100%{box-shadow:0 0 0 0 rgba(54,226,163,0)}}' +
    '@media(prefers-reduced-motion:reduce){.nw,.nw-step,.nw-box:before,.nw-dots i.on:after,.nw-auto i{animation:none!important}}' +
    '@media(max-width:480px){.nw-box{padding:24px 18px 18px;border-radius:24px}.nw-foot{flex-wrap:wrap}.nw-btn{flex:1}}';
  var sty = document.createElement('style'); sty.textContent = STYLE; (document.head || document.documentElement).appendChild(sty);

  var TOUR = {
    banking: [['💳', 'Your cards', 'Order a virtual card in seconds, set limits, freeze it any time and pick a design you like.'], ['🏦', 'IBAN & transfers', 'Receive money to your own IBAN and send bank transfers from the same account.'], ['🪙', 'Crypto, built in', 'Top up with crypto, exchange it and spend it. Rates are live and fees are shown before you confirm.'], ['🛡️', 'Stay in control', 'Turn on two-factor sign-in and see every signed-in device in Settings → Security.']],
    exchange: [['📈', 'Trade', 'Open the trading terminal, watch live prices and place orders from one screen.'], ['💼', 'Your wallets', 'Deposit and withdraw crypto, with every balance and movement in one clear view.'], ['⚡', 'Fast and transparent', 'Fees and rates are shown before you confirm, and your history is always one tap away.'], ['🛡️', 'Stay in control', 'Turn on two-factor sign-in and see every signed-in device in Settings → Security.']]
  };
  var box, step = 0, type = 'banking', prev = {};
  function confetti() {
    if (reduced()) return;
    var c = document.createElement('canvas'); c.className = 'nw-conf'; c.width = innerWidth; c.height = innerHeight; document.body.appendChild(c);
    var x = c.getContext('2d'), cols = [(ACC[prefs().accent] || ACC.cyan)[0], (ACC[prefs().accent] || ACC.cyan)[1], '#ffffff', '#36e2a3', '#fbbf24'], P = [];
    for (var i = 0; i < 90; i++) P.push({ x: innerWidth / 2 + (Math.random() - .5) * 120, y: innerHeight * .62, vx: (Math.random() - .5) * 13, vy: -Math.random() * 14 - 5, s: Math.random() * 7 + 4, c: cols[i % cols.length], r: Math.random() * 6, vr: (Math.random() - .5) * .4 });
    var t0 = performance.now();
    (function f(n) { var k = n - t0; x.clearRect(0, 0, c.width, c.height); P.forEach(function (p) { p.vy += .38; p.x += p.vx; p.y += p.vy; p.r += p.vr; x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.globalAlpha = Math.max(0, 1 - k / 2200); x.fillStyle = p.c; x.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * .6); x.restore(); }); if (k < 2300) requestAnimationFrame(f); else c.remove(); })(t0);
  }
  function finish() { ls('nc_welcome_' + me(), '1'); var w = document.querySelector('.nw'); if (w) { w.style.transition = 'opacity .3s'; w.style.opacity = '0'; setTimeout(function () { w.remove(); }, 300); } confetti(); }
  function first() { var n = (ls('user_name') || '').trim().split(/\s+/)[0]; return n || ''; }
  function render() {
    var total = 2 + TOUR[type].length, h = '<div class="nw-dots">';
    for (var i = 0; i < total; i++) h += '<i class="' + (i <= step ? 'on' : '') + '"></i>'; h += '</div><div class="nw-step" key="' + step + '">';
    if (step === 0) {
      var s = stNow() || {}, u = s.user || {}, wish = u.wishType, ex = type === 'exchange', diff = wish && wish !== type;
      h += '<h2>Welcome' + (first() ? ', ' + esc(first()) : '') + ' 👋</h2><p>Your account is verified and ready. Here is what we have set up for you.</p>' +
        '<div class="nw-badge"><div class="nw-ico">' + (ex ? '🪙' : '💼') + '</div><div><b>' + (ex ? 'Exchange account' : 'Banking account') + '</b><span>' + (ex ? 'Crypto wallets, trading and transfers' : 'Cards, IBAN, transfers and crypto') + '</span></div></div>' +
        (diff ? '<p style="font-size:13.5px;margin-top:8px">Our team chose the account type that fits your profile best. You can always ask support about changing it.</p>' : '');
    } else if (step === 1) {
      var p = prefs(), th = (window.NCTheme && NCTheme.get()) || 'dark';
      h += '<h2>Make it yours</h2><p>Pick a look. You can change it later in the top bar and Settings.</p>' +
        '<div class="nw-lab">Theme</div><div class="nw-row"><button class="nw-opt' + (th === 'dark' ? ' on' : '') + '" data-th="dark">🌙 Dark</button><button class="nw-opt' + (th === 'light' ? ' on' : '') + '" data-th="light">☀️ Light</button></div>' +
        '<div class="nw-lab">Accent</div><div class="nw-row">' + Object.keys(ACC).map(function (k) { var a = ACC[k]; return '<button class="nw-opt' + ((p.accent || 'cyan') === k ? ' on' : '') + '" data-ac="' + k + '"><span class="nw-sw" style="--c1:' + a[0] + ';--c2:' + a[1] + '"></span>' + a[2] + '</button>'; }).join('') + '</div>' +
        '<div class="nw-lab">Density</div><div class="nw-row"><button class="nw-opt' + (!p.dense ? ' on' : '') + '" data-de="0">Comfortable</button><button class="nw-opt' + (p.dense ? ' on' : '') + '" data-de="1">Compact</button></div>';
    } else {
      var f = TOUR[type][step - 2];
      h += '<div class="nw-lab" style="margin-top:0">Quick tour · ' + (step - 1) + ' of ' + TOUR[type].length + '</div><h2>' + esc(f[1]) + '</h2><div class="nw-feat"><div class="nw-ico">' + f[0] + '</div><div><span>' + esc(f[2]) + '</span></div></div>';
    }
    h += '</div><div class="nw-foot"><button class="nw-skip" data-skip>' + (step === total - 1 ? '' : 'Skip') + '</button><div>' + (step > 0 ? '<button class="nw-btn nw-back" data-back>Back</button>' : '') + '<button class="nw-btn" data-next>' + (step === total - 1 ? 'Open my account' : step === 0 ? 'Let’s go' : 'Next') + '</button></div></div>';
    box.querySelector('.nw-in').innerHTML = h;
  }
  function open() {
    if (shown) return; shown = true;
    var s = stNow() || {}; type = (s.user && s.user.accountType) === 'exchange' ? 'exchange' : 'banking'; step = 0; prev = prefs();
    var w = document.createElement('div'); w.className = 'nw'; w.setAttribute('role', 'dialog'); w.setAttribute('aria-modal', 'true');
    w.innerHTML = '<div class="nw-box"><div class="nw-in"></div></div>'; document.body.appendChild(w); box = w.firstChild; render();
    w.addEventListener('click', function (e) {
      var t = e.target.closest('button'); if (!t) return;
      var total = 2 + TOUR[type].length;
      if (t.hasAttribute('data-next')) { if (step >= total - 1) return finish(); step++; render(); }
      else if (t.hasAttribute('data-back')) { step--; render(); }
      else if (t.hasAttribute('data-skip')) { finish(); }
      else if (t.dataset.th) { if (window.NCTheme) NCTheme.set(t.dataset.th); render(); }
      else if (t.dataset.ac) { var p = prefs(); p.accent = t.dataset.ac === 'cyan' ? '' : t.dataset.ac; savePrefs(p); applyPrefs(p); render(); }
      else if (t.dataset.de) { var q = prefs(); q.dense = t.dataset.de === '1'; savePrefs(q); applyPrefs(q); render(); }
    });
    document.addEventListener('keydown', function esc2(e) { if (e.key === 'Escape' && document.querySelector('.nw')) { finish(); document.removeEventListener('keydown', esc2); } });
  }
  window.NCWelcome = { open: function () { shown = false; open(); }, prefs: prefs, apply: applyPrefs };

  /* ───────── 4. admin: approve dialog shows the client's wish ───────── */
  if (ls('user_role') === 'admin') {
    var cache = null, cachedAt = 0;
    function wishes() { if (cache && Date.now() - cachedAt < 20000) return Promise.resolve(cache); return call('listVerifications').then(function (d) { cache = {}; ((d && d.verifications) || d || []).forEach && ((d && d.verifications) || d || []).forEach(function (v) { if (v && v.email) cache[v.email] = v.wish || null; }); cachedAt = Date.now(); return cache; }).catch(function () { return {}; }); }
    new MutationObserver(function () {
      var m = $('kycApproveModal'); if (!m || m.getAttribute('data-nw')) return; m.setAttribute('data-nw', '1');
      var ok = $('kycApproveOk'), mm = ok && (ok.getAttribute('onclick') || '').match(/'([^']+@[^']+)'|"([^"]+@[^"]+)"/), em = mm && (mm[1] || mm[2]); if (!em) return;
      wishes().then(function (c) {
        var w = c[em]; if (w !== 'banking' && w !== 'exchange') return;
        var b = $(w === 'banking' ? 'kycTypeBanking' : 'kycTypeExchange'); if (!b) return;
        var tag = document.createElement('div'); tag.style.cssText = 'margin-top:8px;font-size:10px;font-weight:700;letter-spacing:.06em;color:#fbbf24'; tag.textContent = '★ CLIENT’S CHOICE'; b.appendChild(tag);
      });
    }).observe(document.body, { childList: true });
  }
})();
