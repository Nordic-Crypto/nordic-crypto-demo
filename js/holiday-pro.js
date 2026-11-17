/* Holiday theme v1 — light snow, garland, greeting and New-Year countdown for clients, staff and the agent desk.
   Built to stay out of the way: one tiny canvas, ~30 fps cap, pauses in background tabs, adapts or switches itself off on slow devices,
   respects "reduce motion", and the user can turn it off with one click. Owner controls it in Admin → System. */
(function () {
  'use strict';
  if (window.__holPro) return; window.__holPro = 1;
  var BASE = window.WORKER_LOGIN_URL || window.WORKER_URL || 'https://nordic-deposit-checker.otis-790.workers.dev';
  var CFG = { mode: 'on', snow: true, garland: true, greeting: '', clients: true, staff: true };
  var LS = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { } } };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  function tok() { return typeof window.getSessionToken === 'function' ? window.getSessionToken() : LS.get('session_token'); }
  function post(a, b) { return fetch(BASE + '?action=' + a, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ token: tok() }, b || {})) }).then(function (r) { return r.json(); }).catch(function () { return { ok: false }; }); }

  /* ---------- when is it on ---------- */
  function inSeason(d) { var m = d.getMonth(), day = d.getDate(); return m === 11 || (m === 0 && day <= 6); }
  function active() { if (CFG.mode === 'off') return false; return CFG.mode === 'on' || inSeason(new Date()); }
  function isLanding() { return !!$('header.hero'); }
  function isStaffView() { return !!($('#agd') || ($('#adminPanel') && $('#adminPanel').getClientRects().length)); }
  function allowedHere() { return isStaffView() ? CFG.staff !== false : CFG.clients !== false; }
  function userOff() { return LS.get('nc_hol_off') === '1'; }
  function daysToNY() { var n = new Date(), y = n.getMonth() === 0 && n.getDate() <= 1 ? n.getFullYear() : n.getFullYear() + 1; var t = new Date(y, 0, 1); return Math.max(0, Math.ceil((t - n) / 864e5)); }
  function reduced() { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }

  /* ---------- styles ---------- */
  function css() {
    if ($('#holCss')) return; var s = document.createElement('style'); s.id = 'holCss';
    s.textContent =
      '#holSnow{position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:100045}' +
      '#holGar{position:fixed;left:0;right:0;top:0;height:3px;pointer-events:none;z-index:100046;background:linear-gradient(90deg,#ff5a5f,#ffd166,#6ee7a8,#6aa9ff,#ff5a5f);background-size:300% 100%;animation:holRb 14s linear infinite;opacity:.9}' +
      '@keyframes holRb{to{background-position:300% 0}}' +
            '@keyframes holTw{0%,100%{opacity:1}50%{opacity:.35}}' +
      '#holLand{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:0;color:#eaf3ff}' +
      'html[data-theme="light"] #holLand{color:#fff}' +
      '#holLand .ha{position:absolute;inset:0}#holLand .ha i{position:absolute;width:60vw;height:60vw;max-width:820px;max-height:820px;border-radius:50%;opacity:.5;will-change:transform}' +
      '#holLand .ha i:nth-child(1){left:-12%;top:-30%;background:radial-gradient(circle,rgba(255,90,95,.22),transparent 62%);animation:holA1 22s ease-in-out infinite alternate}' +
      '#holLand .ha i:nth-child(2){right:-10%;top:-26%;background:radial-gradient(circle,rgba(110,231,168,.22),transparent 62%);animation:holA2 26s ease-in-out infinite alternate}' +
      '#holLand .ha i:nth-child(3){left:30%;top:-40%;background:radial-gradient(circle,rgba(255,209,102,.16),transparent 62%);animation:holA1 30s ease-in-out infinite alternate-reverse}' +
      '@keyframes holA1{to{transform:translate3d(8vw,6vh,0) scale(1.15)}}@keyframes holA2{to{transform:translate3d(-9vw,8vh,0) scale(1.1)}}' +
      '#holLand .hb{position:absolute;top:0;width:0;height:var(--l);transform-origin:50% 0;animation:holSw 5.5s ease-in-out infinite;animation-delay:var(--d)}' +
      '#holLand .hl{position:absolute;left:-.5px;top:0;width:1px;height:100%;background:rgba(160,170,190,.55)}' +
      '#holLand .hc{position:absolute;left:-5px;bottom:calc(var(--s) - 2px);width:10px;height:7px;border-radius:2px;background:linear-gradient(#e6c565,#a98424)}' +
      '#holLand .hb span{position:absolute;left:calc(var(--s) / -2);top:100%;margin-top:-2px;width:var(--s);height:var(--s);border-radius:50%;box-shadow:0 10px 24px rgba(0,0,0,.35),inset 0 -6px 12px rgba(0,0,0,.18)}' +
      '@keyframes holSw{0%,100%{transform:rotate(3.5deg)}50%{transform:rotate(-3.5deg)}}' +
      '#holLand .hd{position:absolute;left:0;right:0;bottom:0;width:100%;height:46px;opacity:.9}' +
      '#holTree{position:relative;padding:56px 0 20px}#holTree .ht{display:grid;grid-template-columns:1fr 1fr;gap:30px;align-items:center}' +
      '#holTree h2{margin:6px 0 10px;font-size:clamp(26px,4vw,40px);letter-spacing:-.02em}#holTree p{margin:0;max-width:440px;opacity:.75;line-height:1.55}#holTree small.k{font-weight:700;letter-spacing:.12em;text-transform:uppercase;font-size:12px;opacity:.7}' +
      '#holTree .tr{position:relative;width:min(100%,340px);aspect-ratio:300/360;margin:0 auto}#holTree .tr svg{position:absolute;inset:0;width:100%;height:100%;filter:drop-shadow(0 18px 30px rgba(0,0,0,.35))}' +
      '#holTree .bz{position:absolute;width:19%;aspect-ratio:1;margin:-9.5% 0 0 -9.5%;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;font:700 clamp(9px,2.4vw,12px)/1.1 system-ui,sans-serif;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.5);box-shadow:0 8px 18px rgba(0,0,0,.35),inset 0 -6px 10px rgba(0,0,0,.2);animation:holBz 4s ease-in-out infinite;animation-delay:var(--d)}' +
      '#holTree .bz b{font-size:.78em;font-weight:600;opacity:.95;font-variant-numeric:tabular-nums}#holTree .bz i{font-style:normal;font-size:.7em;opacity:.9}' +
      '@keyframes holBz{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}' +
      '@media (max-width:820px){#holTree .ht{grid-template-columns:1fr;text-align:center}#holTree p{margin:0 auto}}' +
      'html.hol .sh2 h2{text-shadow:0 0 28px rgba(150,200,255,.22)}.hz-plan{display:inline-flex;align-items:center;gap:6px;margin-bottom:10px;padding:5px 11px;border-radius:99px;font:700 12px/1 inherit;color:#fff;background:linear-gradient(135deg,rgba(63,120,200,.9),rgba(40,160,150,.9))}' +
      '#holPill{display:flex;width:max-content;max-width:100%;align-items:center;gap:9px;margin:0 0 16px;padding:7px 14px 7px 10px;border-radius:99px;font:600 13px/1 inherit;color:#fff;background:linear-gradient(135deg,rgba(214,38,44,.9),rgba(22,145,90,.9));box-shadow:0 8px 26px rgba(214,38,44,.28);position:relative;z-index:2}' +
      '#holPill .hp2{padding-left:9px;border-left:1px solid rgba(255,255,255,.35);font-weight:500;opacity:.92}' +
      '.hero .hcap{position:absolute;left:-2%;right:-2%;top:-20px;height:34px;z-index:5;pointer-events:none;filter:drop-shadow(0 3px 4px rgba(0,0,0,.25))}.hero .hcap svg{width:100%;height:100%;display:block}' +
      '.hero .wrap.grid{z-index:1}' +
      '@media (max-width:900px){#holLand .hb:nth-of-type(n+4){display:none}#holLand .hb{left:calc(55% + (var(--s) * 2))!important}#holLand .ha i{opacity:.35}}' +
      '@media (prefers-reduced-motion:reduce){#holLand *,#holGar{animation:none!important}}' +
      '#holChip{position:fixed;left:14px;bottom:14px;z-index:100047;display:flex;align-items:center;gap:8px;padding:7px 12px;border-radius:99px;font:600 12px/1 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#e9eef6;background:rgba(17,24,35,.82);border:1px solid rgba(255,255,255,.12);backdrop-filter:blur(8px);cursor:pointer;opacity:.85;transition:opacity .2s}' +
      'html.hol-land #holChip{bottom:70px}@media (max-width:900px){#holChip{left:auto;right:14px;bottom:calc(150px + env(safe-area-inset-bottom));width:44px;height:44px;padding:0;justify-content:center;font-size:0;gap:0;opacity:.92!important}#holChip i{font-size:20px}html.hol-land #holChip{left:14px;right:auto;bottom:calc(92px + env(safe-area-inset-bottom))}}#holChip:hover{opacity:1}#holChip i{font-style:normal}' +
      'html[data-theme="light"] #holChip{color:#0f172a;background:rgba(255,255,255,.9);border-color:rgba(15,23,42,.12)}' +
      '.hol-count{display:inline-flex;align-items:center;gap:6px;padding:6px 11px;border-radius:99px;font:600 12px/1 inherit;color:#c8ff4d;background:rgba(200,255,77,.1);border:1px solid rgba(200,255,77,.25);white-space:nowrap}' +
      'html[data-theme="light"] .hol-count{color:#2f6a00;background:rgba(80,140,0,.1);border-color:rgba(80,140,0,.3)}' +
      '#holToast{position:fixed;left:50%;top:34px;transform:translate(-50%,-14px);z-index:100100;max-width:min(92vw,440px);padding:12px 18px;border-radius:16px;font:600 14px/1.35 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#0f1a05;background:linear-gradient(135deg,#d6ff6e,#9be34a);box-shadow:0 12px 40px rgba(0,0,0,.35);opacity:0;transition:opacity .35s,transform .35s;text-align:center}' +
      '#holToast.on{opacity:1;transform:translate(-50%,0)}#holToast.bt{top:auto;bottom:28px;transform:translate(-50%,14px)}#holToast.bt.on{transform:translate(-50%,0)}' +
      '.hol-card{border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:16px 18px;margin:0 0 18px;background:rgba(255,255,255,.03)}' +
      'html[data-theme="light"] .hol-card{border-color:rgba(15,23,42,.12);background:#fff}' +
      '.hol-card h3{margin:0 0 4px;font-size:15px}.hol-card p{margin:0 0 12px;font-size:12px;opacity:.7}' +
      '.hol-row{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:8px 0}.hol-row label{display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer}' +
      '.hol-seg{display:inline-flex;border:1px solid rgba(128,128,128,.3);border-radius:10px;overflow:hidden}.hol-seg button{all:unset;cursor:pointer;padding:7px 14px;font-size:12px;font-weight:600}.hol-seg button.on{background:#c8ff4d;color:#101808}' +
      '.hol-card select{padding:7px 9px;border-radius:9px;border:1px solid rgba(128,128,128,.35);background:transparent;color:inherit;font:inherit;font-size:13px}.hol-card select option{color:#111}.hol-card input[type=text]{width:100%;max-width:420px;padding:8px 10px;border-radius:9px;border:1px solid rgba(128,128,128,.35);background:transparent;color:inherit;font:inherit;font-size:13px}' +
      'html:not([data-theme="light"]).hol-winter #adminPanel{--ap-bg:#070e1a;--ap-s1:#0c1627;--ap-s2:#102038;--ap-s3:#162b4a;--ap-line:#1a2e4d;--ap-line2:#26426b;--ap-acc:#5ab4ff;--ap-acc2:#a8e6ff}' +
      'html:not([data-theme="light"]).hol-winter #agd{--bg:#070e1a;--p1:#0d1829;--p2:#122240;--ln:rgba(140,190,255,.14);--ac:#8fd3ff;--acx:#06182b;--me:#16304f;--them:#12233a}' +
      'html[data-theme="light"].hol-winter #agd{--bg:#eaf2fb;--p2:#f1f7fd;--ac:#1f6fb8;--me:#d9ebfb}' +
      '.hol-save{margin-top:8px;border:0;border-radius:10px;padding:8px 16px;font-weight:700;font-size:13px;background:#c8ff4d;color:#101808;cursor:pointer}';
    document.head.appendChild(s);
  }

  /* ---------- snow (adaptive) ---------- */
  var px = -999, py = -999, cv, cx, flakes = [], raf = 0, last = 0, W = 0, H = 0, sprites = [], slow = 0, frames = 0, acc = 0, lightTheme = false, themeAt = 0, dpr = 1;
  function sprite(r, a, col) { var c = document.createElement('canvas'), n = Math.ceil(r * 2 + 2); c.width = c.height = n * dpr; var g = c.getContext('2d'); g.scale(dpr, dpr); var gr = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, r); gr.addColorStop(0, 'rgba(' + col + ',' + a + ')'); gr.addColorStop(1, 'rgba(' + col + ',0)'); g.fillStyle = gr; g.beginPath(); g.arc(n / 2, n / 2, r, 0, 6.2832); g.fill(); c._n = n; return c; }
  function buildSprites() { var col = lightTheme ? '120,160,215' : '255,255,255'; sprites = [sprite(2.4, lightTheme ? .95 : .9, col), sprite(3.4, lightTheme ? .9 : .85, col), sprite(5, lightTheme ? .8 : .7, col)]; }
  function resize() { dpr = Math.min(window.devicePixelRatio || 1, 1.5); W = window.innerWidth; H = window.innerHeight; if (cv) { cv.width = W * dpr; cv.height = H * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0); } }
  function seedFlakes(n) { flakes = []; for (var i = 0; i < n; i++) flakes.push({ x: Math.random() * W, y: Math.random() * H, v: 14 + Math.random() * 26, s: Math.random() * 3 | 0, p: Math.random() * 6.28, w: .4 + Math.random() * .8 }); }
  window.addEventListener('pointermove', function (e) { if (e.pointerType === 'touch' && !e.isPrimary) return; px = e.clientX; py = e.clientY; }, { passive: true });
  window.addEventListener('pointerleave', function () { px = py = -999; }); document.addEventListener('mouseleave', function () { px = py = -999; });
  function startSnow() {
    if (cv || reduced() || !CFG.snow) return; cv = document.createElement('canvas'); cv.id = 'holSnow'; cv.setAttribute('aria-hidden', 'true'); document.body.appendChild(cv); cx = cv.getContext('2d');
    resize(); lightTheme = document.documentElement.getAttribute('data-theme') === 'light'; buildSprites();
    var n = W < 700 ? 30 : W < 1200 ? 46 : 64; seedFlakes(n); last = 0; slow = 0; frames = 0; acc = 0; raf = requestAnimationFrame(loop);
  }
  function stopSnow() { if (raf) cancelAnimationFrame(raf); raf = 0; if (cv) { cv.remove(); cv = null; } }
  function loop(t) {
    raf = requestAnimationFrame(loop); if (document.hidden) { last = 0; return; }
    if (!last) { last = t; return; } var dt = t - last; if (dt < 30) return; last = t; if (dt > 250) dt = 250;
    if (t - themeAt > 1500) { themeAt = t; var lt = document.documentElement.getAttribute('data-theme') === 'light'; if (lt !== lightTheme) { lightTheme = lt; buildSprites(); } }
    frames++; acc += dt;                                                           // self-protection: if the device cannot keep ~20 fps, thin the flakes, then stop
    if (frames === 40) { var avg = acc / frames; frames = 0; acc = 0; if (avg > 48) { slow++; if (slow >= 2) { stopSnow(); LS.set('nc_hol_auto_off', '1'); return; } flakes.length = Math.ceil(flakes.length / 2); } else if (slow) slow = 0; }
    var s = dt / 1000; cx.clearRect(0, 0, W, H);
    for (var i = 0; i < flakes.length; i++) {
      var f = flakes[i]; f.y += f.v * s; f.p += s * f.w; f.x += Math.sin(f.p) * 14 * s; if (px > -900) { var ddx = f.x - px, ddy = f.y - py, dd = ddx * ddx + ddy * ddy; if (dd < 9600) { var k = (1 - dd / 9600) * 140 * s, dl = Math.sqrt(dd) || 1; f.x += ddx / dl * k; f.y += ddy / dl * k; } } if (f.y > H + 8) { f.y = -8; f.x = Math.random() * W; } if (f.x < -8) f.x = W + 8; else if (f.x > W + 8) f.x = -8;
      var sp = sprites[f.s]; cx.drawImage(sp, f.x - sp._n / 2, f.y - sp._n / 2, sp._n, sp._n);
    }
  }
  document.addEventListener('visibilitychange', function () { last = 0; });

  /* ---------- top ribbon (3px, never covers anything) ---------- */
  function startGarland() {
    if ($('#holGar') || !CFG.garland) return; var d = document.createElement('div'); d.id = 'holGar'; d.setAttribute('aria-hidden', 'true'); document.body.appendChild(d);
  }

  /* ---------- landing page: aurora, hanging baubles, snow-capped phone, snow drift, season pill ---------- */
  function landing() {
    var hero = $('header.hero'); if (!hero || $('#holLand')) return; css();
    var d = document.createElement('div'); d.id = 'holLand'; d.setAttribute('aria-hidden', 'true');
    var bauble = function (x, len, size, c1, c2, delay) { return '<div class="hb" style="left:' + x + '%;--l:' + len + 'px;--s:' + size + 'px;--d:' + delay + 's"><i class="hl"></i><b class="hc"></b><span style="background:radial-gradient(circle at 32% 28%,#fff 0,' + c1 + ' 22%,' + c2 + ' 70%,rgba(0,0,0,.35) 100%)"></span></div>'; };
    d.innerHTML = '<div class="ha"><i></i><i></i><i></i></div>' +
      bauble(58, 70, 34, '#ff8a8e', '#d4262c', 0) + bauble(66, 130, 26, '#ffe29a', '#d99a1c', -1.4) + bauble(74, 52, 30, '#8fe9b5', '#16915a', -.7) + bauble(83, 112, 36, '#9cc4ff', '#2a62c9', -2.1) + bauble(91, 64, 24, '#ffb3d1', '#c2255f', -1.1) +
      '<svg class="hd" viewBox="0 0 1440 60" preserveAspectRatio="none"><path d="M0 60V38c60-16 110-10 170 0s120 14 190-2 130-18 200-4 140 22 210 8 130-22 200-8 150 20 220 6 130-14 190-2 120 8 160 2v22z" fill="currentColor"/></svg>';
    hero.insertBefore(d, hero.firstChild);
    var eb = hero.querySelector('.eyebrow'), n = daysToNY();
    if (eb && !$('#holPill')) { var pl = document.createElement('div'); pl.id = 'holPill'; pl.innerHTML = '<span class="hp1">🎄</span><b>Season’s greetings</b><span class="hp2">' + (n > 0 && n < 60 ? n + (n === 1 ? ' day' : ' days') + ' to ' + (new Date().getFullYear() + 1) : 'Happy New Year') + '</span>'; eb.parentNode.insertBefore(pl, eb); }
    var ph = hero.querySelector('.phone'); if (ph && !ph.querySelector('.hcap')) { var cap = document.createElement('div'); cap.className = 'hcap'; cap.innerHTML = '<svg viewBox="0 0 300 46" preserveAspectRatio="none"><path d="M0 46C6 30 24 22 40 24c8-14 30-18 44-6 12-12 36-10 46 4 12-8 32-6 40 8 10-10 32-8 42 6 14-6 30 0 36 10 14-4 28 4 32 14z" fill="#fff"/><path d="M20 46c4-8 12-12 20-10M120 46c2-6 10-10 16-8M210 46c4-6 12-8 18-4" stroke="#cfe3f7" stroke-width="3" fill="none" stroke-linecap="round"/></svg>'; ph.appendChild(cap); }
  }
  /* ---------- landing: tree of live rates ---------- */
  var treeT = 0;
  function readTicker() { var out = [], seen = {}; [].forEach.call(document.querySelectorAll('#tick > .mi'), function (d) { var sy = d.querySelector('b'), pr = d.querySelector('span.num'), ch = d.querySelector('i'); if (!sy || !pr) return; var k = sy.textContent.trim(); if (seen[k]) return; seen[k] = 1; var pt = pr.textContent.trim().replace(/\.\d+$/, ''); out.push({ s: k, p: pt, c: ch ? ch.textContent.trim() : '', up: ch ? ch.classList.contains('up') : true }); }); return out; }
  function tree() {
    var host = document.querySelector('#features'); if (!host || $('#holTree')) return; css();
    var sec = document.createElement('section'); sec.id = 'holTree'; sec.setAttribute('aria-label', 'Holiday tree with live crypto prices');
    var pos = [[50, 29, '#ff8a8e,#d4262c', 0], [34, 47, '#ffe29a,#d99a1c', -1], [66, 49, '#8fe9b5,#16915a', -2], [24, 70, '#9cc4ff,#2a62c9', -1.5], [50, 66, '#ffb3d1,#c2255f', -.5]];
    sec.innerHTML = '<div class="wrap ht"><div><small class="k">Season special</small><h2>The market tree</h2><p>Live prices, hanging on the holiday tree. A bit of fun while you look around — rates update on their own.</p></div><div class="tr"><svg viewBox="0 0 300 360" aria-hidden="true"><defs><linearGradient id="htg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c9a62"/><stop offset="1" stop-color="#0c5c3b"/></linearGradient></defs><path d="M150 18 L214 112 H86Z" fill="url(#htg)"/><path d="M150 70 L240 190 H60Z" fill="url(#htg)"/><path d="M150 130 L268 280 H32Z" fill="url(#htg)"/><rect x="132" y="280" width="36" height="46" rx="4" fill="#6b3f1d"/><path d="M150 4l5.6 11.6 12.7 1.8-9.2 9 2.2 12.6L150 33l-11.3 6 2.2-12.6-9.2-9 12.7-1.8z" fill="#ffd166"/></svg>' +
      pos.map(function (p, i) { var c = p[2].split(','); return '<div class="bz" data-i="' + i + '" style="left:' + p[0] + '%;top:' + p[1] + '%;--d:' + p[3] + 's;background:radial-gradient(circle at 32% 28%,#fff 0,' + c[0] + ' 24%,' + c[1] + ' 78%)"><span>—</span><b></b></div>'; }).join('') + '</div></div>';
    host.parentNode.insertBefore(sec, host);
    function upd() { var d = readTicker(); [].forEach.call(sec.querySelectorAll('.bz'), function (b, i) { var x = d[i]; if (!x) return; b.firstChild.textContent = x.s; b.querySelector('b').textContent = x.p; b.title = x.s + ' ' + x.p + ' ' + x.c; }); }
    upd(); setTimeout(upd, 1500); setTimeout(upd, 4000); treeT = setInterval(function () { if (!document.hidden && document.getElementById('holTree')) upd(); }, 5000);
  }
  function untree() { var t = $('#holTree'); if (t) t.remove(); clearInterval(treeT); var pl = $('#holPlan'); if (pl) pl.remove(); }
  function plan() { var h = document.querySelector('#calc .sh2'); if (!h || $('#holPlan')) return; var s = document.createElement('div'); s.id = 'holPlan'; s.className = 'hz-plan'; s.textContent = '❄ Plan for ' + (new Date().getFullYear() + (new Date().getMonth() === 0 && new Date().getDate() <= 6 ? 0 : 1)); h.insertBefore(s, h.firstChild); }

  function unland() { untree(); var l = $('#holLand'); if (l) l.remove(); var p = $('#holPill'); if (p) p.remove(); var c = $('.hcap'); if (c) c.remove(); }

  /* ---------- greeting, countdown chip ---------- */
  function greet() {
    if (isStaffView()) return; var key = 'nc_hol_greet', today = new Date().toDateString(); if (LS.get(key) === today) return;
    var nm = (LS.get('user_name') || '').split(' ')[0], n = daysToNY();
    var msg = CFG.greeting || ((new Date().getMonth() === 0 ? 'Happy New Year' : 'Happy holidays') + (nm ? ', ' + nm : '') + '! 🎄' + (n > 0 && n < 40 ? ' New Year in ' + n + (n === 1 ? ' day.' : ' days.') : ''));
    var t = document.createElement('div'); t.id = 'holToast'; t.textContent = msg; document.body.appendChild(t); LS.set(key, today);
    setTimeout(function () { t.classList.add('on'); }, 400); setTimeout(function () { t.classList.remove('on'); }, 5200); setTimeout(function () { t.remove(); }, 5800);
  }
  function chip() {
    var c = $('#holChip'); if (!c) { c = document.createElement('button'); c.id = 'holChip'; c.type = 'button'; c.title = 'Turn the holiday effects on or off'; document.body.appendChild(c); c.onclick = function () { try { if (window.__holFx && window.__holFx.open && window.__holFx.open()) return; } catch (e) { } LS.set('nc_hol_off', userOff() ? '' : '1'); apply(); }; }
    var hub = !!(window.__holFx && window.__holFx.open && !isStaffView() && !isLanding() && $('#mainApp') && $('#mainApp').getClientRects().length);
    c.innerHTML = hub ? '<i>🎁</i> Holiday' : userOff() ? '<i>❄</i> Holiday mode off' : '<i>❄</i> Snow on';
    if (!userOff()) { clearTimeout(c._h); c._h = setTimeout(function () { if (c && !userOff()) c.style.opacity = '.28'; }, 6000); c.style.opacity = ''; c.style.pointerEvents = ''; }
  }
  function countdown() {
    var host = $('#agd .agd-top') || $('#agd header') || null; var n = daysToNY();
    var old = $('#holCount'); if (!host || !active() || userOff() || n <= 0 || n > 60) { if (old) old.remove(); return; }
    if (old) return; var s = document.createElement('span'); s.id = 'holCount'; s.className = 'hol-count'; s.textContent = '🎄 ' + n + (n === 1 ? ' day' : ' days') + ' to New Year';
    var me = host.querySelector('#agdMe'); host.insertBefore(s, (me && me.closest('div,button')) || host.lastElementChild);
  }

  /* ---------- apply ---------- */
  function apply() {
    var on = active() && allowedHere() && !userOff();
    document.documentElement.classList.toggle('hol', !!on); document.documentElement.classList.toggle('hol-land', isLanding());
    if (!(active() && allowedHere())) { unland(); stopSnow(); var g = $('#holGar'); if (g) g.remove(); var c = $('#holChip'); if (c) c.remove(); var k = $('#holCount'); if (k) k.remove(); return; }
    css(); chip();
    if (userOff()) { unland(); stopSnow(); var g2 = $('#holGar'); if (g2) g2.remove(); countdown(); return; }
    if (LS.get('nc_hol_auto_off') !== '1') startSnow(); startGarland(); if (isLanding()) { landing(); tree(); plan(); } else greet(); countdown();
  }

  /* ---------- owner card (Admin → System) ---------- */
  var ownerBusy = 0;
  function ownerCard() {
    var nav = $('#adminPanel .admin-sidebar .admin-nav-item[data-tab="team"]'); if (!nav) return;
    var sec = $('#adminPanel [data-section="system"]'); if (!sec || !sec.getClientRects().length || $('#holAdmin') || ownerBusy) return; css(); ownerBusy = 1;
    post('holidayConfig').then(function (r) { ownerBusy = 0; if (r && r.ok && r.config && !$('#holAdmin')) buildOwner(sec, Object.assign({}, CFG, r.config)); });
  }
  function buildOwner(sec, cur) {
    var c = document.createElement('div'); c.id = 'holAdmin'; c.className = 'hol-card'; var q = function (v) { return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); };
    function opt(k, l) { return '<label><input type="checkbox" data-k="' + k + '"' + (cur[k] !== false && (k !== 'winter' && k !== 'ar' || cur[k] === true) ? ' checked' : '') + '> ' + l + '</label>'; }
    function hrs(id, v) { var o = ''; for (var h = 0; h < 24; h++) o += '<option value="' + h + '"' + (h === Number(v) ? ' selected' : '') + '>' + String(h).padStart(2, '0') + ':00</option>'; return '<select id="' + id + '">' + o + '</select>'; }
    var tzs = ['Europe/Stockholm', 'Europe/Warsaw', 'Europe/London', 'Europe/Berlin', 'Europe/Helsinki', 'Europe/Madrid', 'America/New_York', 'Asia/Dubai'], tzo = tzs.map(function (z) { return '<option' + (z === cur.tz ? ' selected' : '') + '>' + z + '</option>'; }).join('');
    c.innerHTML = '<h3>🎄 Holiday theme</h3><p>Snow, a top ribbon, the Holiday menu for clients and the countdown. Light on the device and switched off automatically on slow ones.</p>' +
      '<div class="hol-row"><div class="hol-seg" id="holMode"><button type="button" data-m="auto">Auto (Dec 1 – Jan 6)</button><button type="button" data-m="on">Always on</button><button type="button" data-m="off">Off</button></div></div>' +
      '<div class="hol-row">' + opt('snow', 'Snow') + opt('garland', 'Top ribbon') + opt('clients', 'Show to clients') + opt('staff', 'Show in admin &amp; agent desk') + opt('winter', 'Winter colours in admin &amp; agent desk') + '</div>' +
      '<div class="hol-row"><input type="text" id="holGreet" maxlength="90" placeholder="Custom greeting for clients (optional)" value="' + q(cur.greeting) + '"></div>' +
      '<div class="hol-row"><input type="text" id="holTeam" maxlength="160" placeholder="Message to your team (shown once a day to agents and staff)" value="' + q(cur.teamMsg) + '"></div>' +
      '<h3 style="margin-top:16px">💬 Out-of-hours auto-reply</h3><p>When a client writes during the quiet hours, one short automatic answer is sent (at most once every 8 hours per client). It is marked “Auto-reply” for agents and never counts as an answer.</p>' +
      '<div class="hol-row">' + opt('ar', 'Enable auto-reply') + '</div><div class="hol-row"><input type="text" id="holArT" maxlength="300" placeholder="e.g. Thanks for your message! We are offline right now and will reply first thing in the morning." value="' + q(cur.arText) + '"></div>' +
      '<div class="hol-row"><label>From ' + hrs('holArF', cur.arFrom === 0 && !cur.arText ? 20 : cur.arFrom) + '</label><label>to ' + hrs('holArTo', cur.arTo === 0 && !cur.arText ? 8 : cur.arTo) + '</label><label><select id="holTz">' + tzo + '</select></label></div>' +
      '<button class="hol-save" type="button">Save</button>';
    sec.insertBefore(c, sec.firstChild);
    var segs = c.querySelectorAll('#holMode button'); function mark() { [].forEach.call(segs, function (b) { b.classList.toggle('on', b.getAttribute('data-m') === cur.mode); }); } mark();
    [].forEach.call(segs, function (b) { b.onclick = function () { cur.mode = b.getAttribute('data-m'); mark(); }; });
    c.querySelector('.hol-save').onclick = function () {
      [].forEach.call(c.querySelectorAll('input[data-k]'), function (i) { cur[i.getAttribute('data-k')] = i.checked; }); cur.greeting = c.querySelector('#holGreet').value; cur.teamMsg = c.querySelector('#holTeam').value; cur.arText = c.querySelector('#holArT').value; cur.arFrom = +c.querySelector('#holArF').value; cur.arTo = +c.querySelector('#holArTo').value; cur.tz = c.querySelector('#holTz').value;
      var b = c.querySelector('.hol-save'); if (cur.ar && !String(cur.arText).trim()) { b.textContent = 'Write the auto-reply text first'; setTimeout(function () { b.textContent = 'Save'; }, 2200); return; }
      post('setHoliday', { config: cur }).then(function (r) { if (r && r.ok) { CFG = r.config; LS.set('nc_hol_cfg', JSON.stringify({ t: Date.now(), c: CFG })); LS.set('nc_hol_auto_off', ''); apply(); b.textContent = 'Saved ✓'; } else b.textContent = 'Could not save'; setTimeout(function () { b.textContent = 'Save'; }, 1800); });
    };
  }

  /* ---------- winter palette + team message (staff views) ---------- */
  function staffExtras() {
    var on = isStaffView() && active() && allowedHere() && !userOff() && CFG.winter === true; document.documentElement.classList.toggle('hol-winter', !!on);
    if (isStaffView() && active() && allowedHere() && !userOff() && CFG.teamMsg) { var k = 'nc_hol_team_' + (CFG.teamMsg.length) + '_' + new Date().toDateString(); if (LS.get(k) !== '1' && !$('#holToast')) { LS.set(k, '1'); var t = document.createElement('div'); t.id = 'holToast'; t.className = 'bt'; t.textContent = '🎄 ' + CFG.teamMsg; document.body.appendChild(t); setTimeout(function () { t.classList.add('on'); }, 400); setTimeout(function () { t.classList.remove('on'); }, 7000); setTimeout(function () { t.remove(); }, 7600); } }
  }

  window.__holApi = { apply: function () { apply(); }, active: function () { return active() && allowedHere(); }, daysToNY: daysToNY };

  /* ---------- boot ---------- */
  function boot() {
    try { var c = JSON.parse(LS.get('nc_hol_cfg') || 'null'); if (c && c.c) CFG = c.c; } catch (e) { }
    apply();
    var fresh; try { fresh = JSON.parse(LS.get('nc_hol_cfg') || 'null'); } catch (e) { }
    if (!fresh || Date.now() - fresh.t > 10 * 60 * 1000) fetch(BASE + '?action=holidayConfig', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }).then(function (r) { return r.json(); }).then(function (r) { if (r && r.ok && r.config) { CFG = r.config; LS.set('nc_hol_cfg', JSON.stringify({ t: Date.now(), c: CFG })); apply(); } }).catch(function () { });
    setInterval(function () { var ch = $('#holChip'); if (ch && window.__holFx && !userOff() ) { var hb = !isStaffView() && !isLanding() && $('#mainApp') && $('#mainApp').getClientRects().length; var want = hb ? '<i>🎁</i> Holiday' : null; if (want && ch.innerHTML !== want) ch.innerHTML = want; } ownerCard(); staffExtras(); if (active() && allowedHere() && !userOff()) countdown(); if (!$('#holGar') && active() && allowedHere() && !userOff() && CFG.garland) startGarland(); }, 1500);
  }
  if (document.body) boot(); else document.addEventListener('DOMContentLoaded', boot);
})();
