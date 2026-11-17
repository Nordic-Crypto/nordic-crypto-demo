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
  /* country-aware dates: visitor's own clock + country from time zone (fallback: browser language) */
  var TZC = { 'Europe/Copenhagen': 'DK', 'Europe/Stockholm': 'SE', 'Europe/Oslo': 'NO', 'Europe/Helsinki': 'FI', 'Atlantic/Reykjavik': 'IS', 'Europe/Berlin': 'DE', 'Europe/Busingen': 'DE', 'Europe/Vienna': 'AT', 'Europe/Zurich': 'CH', 'Europe/Warsaw': 'PL', 'Europe/Prague': 'CZ', 'Europe/Bratislava': 'SK', 'Europe/Budapest': 'HU', 'Europe/Vilnius': 'LT', 'Europe/Riga': 'LV', 'Europe/Tallinn': 'EE', 'Europe/Minsk': 'BY', 'Europe/Belgrade': 'RS', 'Europe/Podgorica': 'ME', 'Europe/Skopje': 'MK', 'Asia/Tbilisi': 'GE' };
  var EVE = /^(DK|SE|NO|FI|IS|DE|AT|CH|PL|CZ|SK|HU|LT|LV|EE)$/, ORTH = /^(RU|BY|RS|ME|MK|GE)$/;
  var _cc;
  function country() {
    if (_cc) return _cc; var c = '';
    try { c = (LS.get('nc_hol_cc') || '').toUpperCase(); } catch (e) { }
    if (!c) { try { var z = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; c = TZC[z] || ''; if (!c && /^(Europe\/(Moscow|Samara|Volgograd|Kaliningrad|Kirov|Astrakhan|Saratov|Ulyanovsk)|Asia\/(Yekaterinburg|Omsk|Novosibirsk|Barnaul|Tomsk|Novokuznetsk|Krasnoyarsk|Irkutsk|Chita|Yakutsk|Khandyga|Vladivostok|Ust-Nera|Magadan|Sakhalin|Srednekolymsk|Kamchatka|Anadyr))$/.test(z)) c = 'RU'; } catch (e) { } }
    if (!c) { var m = /-([A-Za-z]{2})\b/.exec(navigator.language || ''); c = m ? m[1].toUpperCase() : ''; }
    return (_cc = c || 'XX');
  }
  function style() { var c = country(); return ORTH.test(c) ? 'orth' : EVE.test(c) ? 'eve' : 'west'; }
  function dd(a, b) { return Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / 864e5); }
  function xmasDate(n) { n = n || new Date(); var s = style(); if (s === 'orth') return new Date(n.getMonth() === 0 ? n.getFullYear() : n.getFullYear() + 1, 0, 7); return new Date(n.getFullYear(), 11, s === 'eve' ? 24 : 25); }
  function inSeason(d) { var m = d.getMonth(), day = d.getDate(); return m === 11 || (m === 0 && day <= (style() === 'orth' ? 8 : 6)); }
  function daysToXmas() { var n = new Date(), k = dd(n, xmasDate(n)); return k > 0 ? k : 0; }
  function daysToNY() { var n = new Date(); if (n.getMonth() === 0 && n.getDate() === 1) return 0; return dd(n, new Date(n.getFullYear() + 1, 0, 1)); }
  function pl(k) { return k + (k === 1 ? ' day' : ' days'); }
  function pillTxt() {
    var n = new Date(), m = n.getMonth(), d = n.getDate(), s = style(), x = daysToXmas(), y = daysToNY(), xd = dd(n, xmasDate(n)), what = s === 'eve' ? 'Christmas Eve' : 'Christmas';
    var MC = 'Merry Christmas', HNY = 'Happy New Year', from = 'From all of us at Nordic Crypto';
    if (s === 'orth') {
      if (m === 0 && d === 1) return [HNY, 'Welcome to ' + n.getFullYear()];
      if (m === 0 && xd > 0) return [MC, pl(x) + ' to Christmas'];
      if (m === 0 && xd >= -1) return [MC, from];
      if (m === 0) return [HNY, 'Welcome to ' + n.getFullYear()];
      return [HNY, y > 0 && y < 60 ? pl(y) + ' to ' + (n.getFullYear() + 1) : 'Happy holidays'];
    }
    if (m === 0) return [HNY, 'Welcome to ' + n.getFullYear()];
    if (m === 11 && xd <= 0 && xd >= -2) return [MC, from];
    if (m === 11 && xd < -2) return [HNY, pl(y) + ' to ' + (n.getFullYear() + 1)];
    return [MC, x > 0 && x < 60 ? pl(x) + ' to ' + what : 'Happy holidays'];
  }
  function pillHtml() { var pt = pillTxt(); return '<span class="hp1">🎄</span><b>' + pt[0] + '</b><span class="hp2">' + pt[1] + '</span>'; }
  function active() { if (CFG.mode === 'off') return false; return CFG.mode === 'on' || inSeason(new Date()); }
  function isLanding() { return !!$('header.hero'); }
  function isStaffView() { return !!($('#agd') || ($('#adminPanel') && $('#adminPanel').getClientRects().length)); }
  function allowedHere() { return isStaffView() ? CFG.staff !== false : CFG.clients !== false; }
  function userOff() { return LS.get('nc_hol_off') === '1'; }
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
      '#holTree .tr{position:relative;width:min(100%,430px);aspect-ratio:300/390;margin:0 auto}#holTree .tr>svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}' +
      '#holTree .tr .gl{position:absolute;left:-12%;right:-12%;top:4%;bottom:-2%;background:radial-gradient(ellipse at 50% 45%,rgba(255,196,92,.20),rgba(255,170,60,.07) 45%,transparent 70%);filter:blur(6px);pointer-events:none}' +
      '#holTree .lt{animation:holTw 2.6s ease-in-out infinite;animation-delay:var(--t)}@keyframes holTw{0%,100%{opacity:1}50%{opacity:.35}}' +
      '#holTree .cd{animation:holCd 3.4s ease-in-out infinite;animation-delay:var(--t)}@keyframes holCd{0%,100%{opacity:1}50%{opacity:.62}}' +
      '#holTree .st{animation:holSt 3s ease-in-out infinite}@keyframes holSt{0%,100%{filter:drop-shadow(0 0 6px rgba(255,200,80,.9)) drop-shadow(0 0 18px rgba(255,170,40,.6))}50%{filter:drop-shadow(0 0 10px rgba(255,214,110,1)) drop-shadow(0 0 30px rgba(255,170,40,.85))}}' +
      '#holTree .bz{position:absolute;width:21%;aspect-ratio:1;margin:-10.5% 0 0 -10.5%;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;font:800 clamp(10px,2.9vw,13.5px)/1.12 system-ui,sans-serif;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.7);' +
        'background:radial-gradient(circle at 34% 28%,#3a3f47 0,#16191e 55%,#07080a 100%);border:2.5px solid transparent;background-clip:padding-box;box-shadow:0 0 0 2.5px #c9973f,0 0 0 4px rgba(255,214,140,.35),0 12px 26px rgba(0,0,0,.6),0 0 26px rgba(255,180,60,.25),inset 0 -8px 14px rgba(0,0,0,.5),inset 0 2px 2px rgba(255,255,255,.18);animation:holBz 4s ease-in-out infinite;animation-delay:var(--d);transform-origin:50% -40%}' +
      '#holTree .bz em{display:block;width:36%;aspect-ratio:1;margin-bottom:3px;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,.55),0 0 12px rgba(255,255,255,.08)}#holTree .bz em svg{display:block;width:100%;height:100%}' +
      '#holTree .bz b{font-size:.98em;font-weight:800;white-space:nowrap;letter-spacing:-.02em;font-variant-numeric:tabular-nums}#holTree .bz span{white-space:nowrap;font-size:.62em;letter-spacing:.14em;text-transform:uppercase;opacity:.8;margin-top:1px}' +
      '#holTree .bz u{text-decoration:none;margin-top:3px;padding:1px 6px;border-radius:99px;font-size:.6em;font-weight:800;background:rgba(0,0,0,.45)}#holTree .bz u.up{color:#5dff9c}#holTree .bz u.dn{color:#ff7a84}' +
      '#holTree .bz::before{content:"";position:absolute;bottom:100%;left:50%;width:1px;height:var(--h,26px);background:linear-gradient(rgba(255,215,140,.15),rgba(255,215,140,.85));margin-bottom:4px}' +
      '#holTree .bz::after{content:"";position:absolute;top:-9px;left:50%;width:16%;height:8px;margin-left:-8%;border-radius:3px 3px 1px 1px;background:linear-gradient(#ffe9a8,#b8862a);box-shadow:0 1px 2px rgba(0,0,0,.5)}' +
      '#holTree .bz i.sh{position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle at 30% 18%,rgba(255,255,255,.35) 0,rgba(255,255,255,0) 22%);pointer-events:none}' +
      '@keyframes holBz{0%,100%{transform:rotate(-2deg)}50%{transform:rotate(2deg)}}' +
      '@media (prefers-reduced-motion:reduce){#holTree .lt,#holTree .cd,#holTree .st,#holTree .bz{animation:none}}' +
      '@media (max-width:820px){#holTree .ht{grid-template-columns:1fr;text-align:center}#holTree p{margin:0 auto}}' +
      'html.hol .sh2 h2{text-shadow:0 0 28px rgba(150,200,255,.22)}.hz-plan{display:inline-flex;align-items:center;gap:6px;margin-bottom:10px;padding:5px 11px;border-radius:99px;font:700 12px/1 inherit;color:#fff;background:linear-gradient(135deg,rgba(63,120,200,.9),rgba(40,160,150,.9))}' +
      '#holPill{display:flex;width:max-content;max-width:100%;align-items:center;gap:9px;margin:0 0 16px;padding:7px 14px 7px 10px;border-radius:99px;font:600 13px/1 inherit;color:#fff;background:linear-gradient(135deg,rgba(214,38,44,.9),rgba(22,145,90,.9));box-shadow:0 8px 26px rgba(214,38,44,.28);position:relative;z-index:2}' +
      '#holPill .hp2{padding-left:9px;border-left:1px solid rgba(255,255,255,.35);font-weight:500;opacity:.92}' +
      '.hero .hcap{position:absolute;left:15%;right:15%;top:-14px;height:24px;z-index:5;pointer-events:none;filter:drop-shadow(0 2px 3px rgba(0,0,0,.3))}.hero .hcap svg{width:100%;height:100%;display:block}' +
      '.hero .wrap.grid{z-index:1}' +
      '@media (max-width:900px){#holLand .hb:nth-of-type(-n+4){display:none}#holLand .hb{--l:30px!important;--s:24px!important}#holLand .ha i{opacity:.35}}' +
      '@media (prefers-reduced-motion:reduce){#holLand *,#holGar{animation:none!important}}' +
      '#holChip{position:fixed;left:14px;bottom:14px;z-index:100047;display:flex;align-items:center;gap:8px;padding:7px 12px;border-radius:99px;font:600 12px/1 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#e9eef6;background:rgba(17,24,35,.82);border:1px solid rgba(255,255,255,.12);backdrop-filter:blur(8px);cursor:pointer;opacity:.85;transition:opacity .2s}' +
      'html.hol-land #holChip{bottom:70px}@media (max-width:900px){#holChip{left:auto;right:14px;bottom:calc(150px + env(safe-area-inset-bottom));width:44px;height:44px;padding:0;justify-content:center;font-size:0;gap:0;opacity:.92!important}#holChip i{font-size:20px}html.hol-land #holChip{left:14px;right:auto;bottom:calc(92px + env(safe-area-inset-bottom))}}#holChip:hover{opacity:1}#holChip i{font-style:normal}' +
      'html[data-theme="light"] #holChip{color:#0f172a;background:rgba(255,255,255,.9);border-color:rgba(15,23,42,.12)}' +
      '.hol-count{display:inline-flex;align-items:center;gap:6px;padding:6px 11px;border-radius:99px;font:600 12px/1 inherit;color:#62e8c2;background:rgba(98,232,194,.1);border:1px solid rgba(98,232,194,.25);white-space:nowrap}' +
      'html[data-theme="light"] .hol-count{color:#086a4b;background:rgba(11,138,98,.1);border-color:rgba(11,138,98,.3)}' +
      '#holToast{position:fixed;left:50%;top:34px;transform:translate(-50%,-14px);z-index:100100;max-width:min(92vw,440px);padding:12px 18px;border-radius:16px;font:600 14px/1.35 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#0f1a05;background:linear-gradient(135deg,#9bf5dc,#45cfa8);box-shadow:0 12px 40px rgba(0,0,0,.35);opacity:0;transition:opacity .35s,transform .35s;text-align:center}' +
      '#holToast.on{opacity:1;transform:translate(-50%,0)}#holToast.bt{top:auto;bottom:28px;transform:translate(-50%,14px)}#holToast.bt.on{transform:translate(-50%,0)}' +
      '.hol-card{border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:16px 18px;margin:0 0 18px;background:rgba(255,255,255,.03)}' +
      'html[data-theme="light"] .hol-card{border-color:rgba(15,23,42,.12);background:#fff}' +
      '.hol-card h3{margin:0 0 4px;font-size:15px}.hol-card p{margin:0 0 12px;font-size:12px;opacity:.7}' +
      '.hol-row{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:8px 0}.hol-row label{display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer}' +
      '.hol-seg{display:inline-flex;border:1px solid rgba(128,128,128,.3);border-radius:10px;overflow:hidden}.hol-seg button{all:unset;cursor:pointer;padding:7px 14px;font-size:12px;font-weight:600}.hol-seg button.on{background:#62e8c2;color:#101808}' +
      '.hol-card select{padding:7px 9px;border-radius:9px;border:1px solid rgba(128,128,128,.35);background:transparent;color:inherit;font:inherit;font-size:13px}.hol-card select option{color:#111}.hol-card input[type=text]{width:100%;max-width:420px;padding:8px 10px;border-radius:9px;border:1px solid rgba(128,128,128,.35);background:transparent;color:inherit;font:inherit;font-size:13px}' +
      'html:not([data-theme="light"]).hol-winter #adminPanel{--ap-bg:#070e1a;--ap-s1:#0c1627;--ap-s2:#102038;--ap-s3:#162b4a;--ap-line:#1a2e4d;--ap-line2:#26426b;--ap-acc:#5ab4ff;--ap-acc2:#a8e6ff}' +
      'html:not([data-theme="light"]).hol-winter #agd{--bg:#070e1a;--p1:#0d1829;--p2:#122240;--ln:rgba(140,190,255,.14);--ac:#8fd3ff;--acx:#06182b;--me:#16304f;--them:#12233a}' +
      'html[data-theme="light"].hol-winter #agd{--bg:#eaf2fb;--p2:#f1f7fd;--ac:#1f6fb8;--me:#d9ebfb}' +
      '.hol-save{margin-top:8px;border:0;border-radius:10px;padding:8px 16px;font-weight:700;font-size:13px;background:#62e8c2;color:#101808;cursor:pointer}';
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
    if (cv || !CFG.snow) return; cv = document.createElement('canvas'); cv.id = 'holSnow'; cv.setAttribute('aria-hidden', 'true'); document.body.appendChild(cv); cx = cv.getContext('2d');
    resize(); lightTheme = document.documentElement.getAttribute('data-theme') === 'light'; buildSprites();
    var n = W < 700 ? 30 : W < 1200 ? 46 : 64; seedFlakes(n); last = 0; slow = 0; frames = 0; acc = 0;
    if (reduced()) { staticSnow = true; drawStatic(); return; }                              // system asks for less motion: a calm, still snowfall instead of nothing
    staticSnow = false; raf = requestAnimationFrame(loop);
  }
  var staticSnow = false, slowOff = false;
  function drawStatic() { if (!cv) return; cx.clearRect(0, 0, W, H); for (var i = 0; i < flakes.length; i++) { var f = flakes[i], sp = sprites[f.s]; cx.drawImage(sp, f.x - sp._n / 2, f.y - sp._n / 2, sp._n, sp._n); } }
  window.addEventListener('resize', function () { if (cv && staticSnow) { resize(); seedFlakes(flakes.length); drawStatic(); } }, { passive: true });
  function stopSnow() { if (raf) cancelAnimationFrame(raf); raf = 0; if (cv) { cv.remove(); cv = null; } }
  function loop(t) {
    raf = requestAnimationFrame(loop); if (document.hidden) { last = 0; return; }
    if (!last) { last = t; return; } var dt = t - last; if (dt < 30) return; last = t; if (dt > 250) dt = 250;
    if (t - themeAt > 1500) { themeAt = t; var lt = document.documentElement.getAttribute('data-theme') === 'light'; if (lt !== lightTheme) { lightTheme = lt; buildSprites(); } }
    frames++; acc += dt;                                                           // self-protection: if the device cannot keep ~20 fps, thin the flakes, then stop
    if (frames === 40) { var avg = acc / frames; frames = 0; acc = 0; if (avg > 70) { slow++; if (slow >= 3) { stopSnow(); slowOff = true; return; } flakes.length = Math.ceil(flakes.length / 2); } else if (slow) slow = 0; }
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
      bauble(46, 74, 30, '#ff8a8e', '#d4262c', 0) + bauble(51, 118, 24, '#ffe29a', '#d99a1c', -1.4) + bauble(56, 58, 28, '#8fe9b5', '#16915a', -.7) + bauble(88, 92, 34, '#9cc4ff', '#2a62c9', -2.1) + bauble(94, 60, 26, '#ffb3d1', '#c2255f', -1.1) +
      '<svg class="hd" viewBox="0 0 1440 60" preserveAspectRatio="none"><path d="M0 60V38c60-16 110-10 170 0s120 14 190-2 130-18 200-4 140 22 210 8 130-22 200-8 150 20 220 6 130-14 190-2 120 8 160 2v22z" fill="currentColor"/></svg>';
    hero.insertBefore(d, hero.firstChild);
    var eb = hero.querySelector('.eyebrow'), n = daysToNY();
    if (eb && !$('#holPill')) { var pl = document.createElement('div'); pl.id = 'holPill'; pl._t = pillHtml(); pl.innerHTML = pillHtml(); eb.parentNode.insertBefore(pl, eb); }
    var ph = hero.querySelector('.phone'); if (ph && !ph.querySelector('.hcap')) { var cap = document.createElement('div'); cap.className = 'hcap'; cap.innerHTML = '<svg viewBox="0 0 220 30" preserveAspectRatio="none"><defs><linearGradient id="hcg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#d7e6f7"/></linearGradient></defs><path d="M0 30C2 24 8 20 16 20c4-9 15-12 24-7 6-9 20-11 29-3 7-7 20-7 28 0 8-8 24-7 31 2 9-6 22-4 28 5 8-4 18-1 22 6 8 0 14 4 22 8z" fill="url(#hcg)"/><path d="M70 30c0 5-3 6-3 10s3 4 3 0 3-5 0-10zM150 30c0 4-2 5-2 8s3 3 3 0-1-4-1-8z" fill="#e4effb"/></svg>'; ph.appendChild(cap); }
  }
  /* ---------- landing: tree of live rates ---------- */
  var treeT = 0;
  function readTicker() { var out = [], seen = {}; [].forEach.call(document.querySelectorAll('#tick > .mi'), function (d) { var sy = d.querySelector('b'), pr = d.querySelector('span.num'), ch = d.querySelector('i'); if (!sy || !pr) return; var k = sy.textContent.trim(); if (seen[k]) return; seen[k] = 1; var pt = pr.textContent.trim().replace(/\.\d+$/, ''); out.push({ s: k, p: pt, c: ch ? ch.textContent.trim() : '', up: ch ? ch.classList.contains('up') : true }); }); 
    if (!out.length && window.__ncP) { [['BTC','bitcoin'],['ETH','ethereum'],['SOL','solana'],['BNB','binancecoin'],['USDT','tether']].forEach(function (L) { var q = window.__ncP[L[1]]; if (q) out.push({ s: L[0], p: '$' + Math.round(q.usd).toLocaleString('en-US'), c: (q.c >= 0 ? '+' : '') + q.c.toFixed(1) + '%', up: q.c >= 0 }); }); }
    return out; }
  /* candlestick tree: dark fir, glowing green/red candles, warm string lights, ₿ star and gifts (all vector, no images) */
  function treeSvg() {
    var seed = 7; function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    var o = [], top = 34, base = 318, cx = 150, half = function (y) { var t = (y - top) / (base - top); var tier = t < .36 ? t / .36 * .55 : t < .68 ? .3 + (t - .36) / .32 * .62 : .55 + (t - .68) / .32 * .45; return 14 + tier * 128; };
    o.push('<svg viewBox="0 0 300 390" aria-hidden="true"><defs>' +
      '<linearGradient id="hfg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#13402b"/><stop offset="1" stop-color="#071d13"/></linearGradient>' +
      '<pattern id="hnd" width="7" height="6" patternUnits="userSpaceOnUse"><path d="M0 6 3.5 0 7 6" fill="none" stroke="#1d5a3a" stroke-width=".7" opacity=".55"/></pattern>' +
      '<linearGradient id="hst" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3c4"/><stop offset=".5" stop-color="#ffc44d"/><stop offset="1" stop-color="#d48a12"/></linearGradient>' +
      '<linearGradient id="hgb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#22252b"/><stop offset="1" stop-color="#0a0b0e"/></linearGradient>' +
      '<linearGradient id="hrb" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#a87a2c"/><stop offset=".5" stop-color="#ffe2a0"/><stop offset="1" stop-color="#a87a2c"/></linearGradient>' +
      '<filter id="hgw" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
      '</defs>');
    // fir silhouette, three tiers
    var tiers = [[34, 128, 66], [92, 218, 104], [168, 318, 142]];
    var tp = [];
    tiers.forEach(function (t) { var p = 'M' + cx + ' ' + t[0] + ' Q' + (cx + t[2] * .55) + ' ' + (t[1] - 28) + ' ' + (cx + t[2]) + ' ' + t[1] + ' Q' + cx + ' ' + (t[1] + 12) + ' ' + (cx - t[2]) + ' ' + t[1] + ' Q' + (cx - t[2] * .55) + ' ' + (t[1] - 28) + ' ' + cx + ' ' + t[0] + 'Z'; tp.push(p); o.push('<path d="' + p + '" fill="url(#hfg)"/><path d="' + p + '" fill="url(#hnd)"/>'); });
    o.push('<defs><clipPath id="htc">' + tp.map(function (p) { return '<path d="' + p + '"/>'; }).join('') + '</clipPath></defs>');
    // candles
    var cnd = [];
    for (var y = 48; y < 312; y += 10.5) {
      var hw = half(y) - 6, n = Math.max(1, Math.floor(hw * 2 / 11));
      for (var k = 0; k < n; k++) {
        if (rnd() < .4) continue;
        var x = cx - hw + (k + .5) * (hw * 2 / n) + (rnd() - .5) * 3, h = 6 + rnd() * 11, up = rnd() > .45, w = 4;
        var col = up ? '#36ff8a' : '#ff3d4f';
        cnd.push('<g class="cd" style="--t:' + (rnd() * 3.4).toFixed(2) + 's"><line x1="' + x.toFixed(1) + '" y1="' + (y - h / 2 - 2.5).toFixed(1) + '" x2="' + x.toFixed(1) + '" y2="' + (y + h / 2 + 2.5).toFixed(1) + '" stroke="' + col + '" stroke-width=".7"/><rect x="' + (x - w / 2).toFixed(1) + '" y="' + (y - h / 2).toFixed(1) + '" width="' + w + '" height="' + h.toFixed(1) + '" rx=".6" fill="' + col + '"/></g>');
      }
    }
    o.push('<g clip-path="url(#htc)"><g filter="url(#hgw)" opacity=".92">' + cnd.join('') + '</g></g>');
    // string lights: sagging garlands, bulbs sampled along each curve
    var gar = [[70, 104, 112, 12], [118, 176, 166, 16], [168, 128, 232, 14], [214, 196, 282, 18], [258, 118, 304, 16]], lt = [];
    gar.forEach(function (g, gi) {
      var y0 = g[0], hw0 = half(y0) - 2, y1 = g[2], hw1 = half(y1) - 2, x0 = gi % 2 ? cx + hw0 : cx - hw0, x1 = gi % 2 ? cx - hw1 : cx + hw1, mx = (x0 + x1) / 2, my = (y0 + y1) / 2 + g[3];
      o.push('<path d="M' + x0.toFixed(1) + ' ' + y0 + ' Q' + mx.toFixed(1) + ' ' + my.toFixed(1) + ' ' + x1.toFixed(1) + ' ' + y1 + '" fill="none" stroke="rgba(255,214,140,.35)" stroke-width=".6"/>');
      for (var q = 0; q <= 1.0001; q += 1 / 22) { var bx = (1 - q) * (1 - q) * x0 + 2 * (1 - q) * q * mx + q * q * x1, by = (1 - q) * (1 - q) * y0 + 2 * (1 - q) * q * my + q * q * y1; lt.push('<circle class="lt" style="--t:' + (rnd() * 2.6).toFixed(2) + 's" cx="' + bx.toFixed(1) + '" cy="' + by.toFixed(1) + '" r="1.8" fill="#ffd98a"/>'); }
    });
    o.push('<g filter="url(#hgw)">' + lt.join('') + '</g>');
    // small gold baubles
    [[120, 250], [190, 150], [214, 286], [96, 300], [168, 210]].forEach(function (b) { o.push('<circle cx="' + b[0] + '" cy="' + b[1] + '" r="5.2" fill="url(#hst)" opacity=".95"/><circle cx="' + (b[0] - 1.6) + '" cy="' + (b[1] - 1.8) + '" r="1.4" fill="#fff" opacity=".7"/>'); });
    // ₿ star
    o.push('<g class="st"><circle cx="150" cy="22" r="17" fill="rgba(255,190,70,.18)"/><text x="150" y="33" text-anchor="middle" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="31" fill="url(#hst)">₿</text></g>');
    // gifts
    var gifts = [[84, 318, 50, 40], [132, 326, 46, 34], [174, 314, 52, 44], [222, 330, 34, 26], [60, 340, 30, 22]];
    gifts.forEach(function (g) { var x = g[0], y = g[1], w = g[2], h = g[3]; o.push('<g><rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="2" fill="url(#hgb)" stroke="rgba(255,214,140,.25)" stroke-width=".6"/><rect x="' + (x + w / 2 - 2.5) + '" y="' + y + '" width="5" height="' + h + '" fill="url(#hrb)"/><rect x="' + x + '" y="' + (y + h * .38) + '" width="' + w + '" height="4.5" fill="url(#hrb)"/><path d="M' + (x + w / 2) + ' ' + y + ' c-8 -9 -15 -2 -7 1 M' + (x + w / 2) + ' ' + y + ' c8 -9 15 -2 7 1" fill="none" stroke="#f3cf7e" stroke-width="2.2" stroke-linecap="round"/></g>'); });
    o.push('</svg>');
    return o.join('');
  }
  function tree() {
    var host = document.querySelector('#features'); if (!host || $('#holTree')) return; css();
    var sec = document.createElement('section'); sec.id = 'holTree'; sec.setAttribute('aria-label', 'Holiday tree with live crypto prices');
    var pos = [[50, 31, 0, 30], [68, 45, -1.2, 24], [31, 52, -2.1, 34], [27, 73, -1.5, 22], [71, 70, -.6, 30]];
    sec.innerHTML = '<div class="wrap ht"><div><small class="k">Christmas special</small><h2>The market tree</h2><p>Live prices, hanging on the Christmas tree. A bit of fun while you look around — rates update on their own.</p></div><div class="tr"><i class="gl"></i>' + treeSvg() +
      pos.map(function (p, i) { return '<div class="bz" data-i="' + i + '" style="left:' + p[0] + '%;top:' + p[1] + '%;--d:' + p[2] + 's;--h:' + p[3] + 'px"><i class="sh"></i><em>•</em><b></b><span>—</span><u></u></div>'; }).join('') + '</div></div>';
    host.parentNode.insertBefore(sec, host);
    /* coin badges drawn as vectors (crisp at any size); unknown coins get a neat letter badge */
    var IC = {
      BTC: '<svg viewBox="0 0 32 32"><defs><linearGradient id="hiB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb84d"/><stop offset="1" stop-color="#f08a00"/></linearGradient></defs><circle cx="16" cy="16" r="16" fill="url(#hiB)"/><path fill="#fff" d="M21.6 14.1c.3-2-1.2-3-3.3-3.8l.7-2.7-1.6-.4-.7 2.6-1.3-.3.7-2.6-1.6-.4-.7 2.7-1-.3-2.2-.5-.4 1.7s1.2.3 1.2.3c.7.2.8.6.8 1l-.8 3.1c0 .1.1.1.1.1h-.1l-1.1 4.4c-.1.2-.3.5-.8.4 0 0-1.2-.3-1.2-.3l-.8 1.8 2.1.5 1.2.3-.7 2.7 1.6.4.7-2.7 1.3.3-.7 2.7 1.6.4.7-2.7c2.8.5 4.9.3 5.8-2.2.7-2-.1-3.2-1.5-3.9 1-.2 1.8-.9 2-2.4zm-3.7 5.2c-.5 2-3.9.9-5 .6l.9-3.5c1.1.3 4.6.8 4.1 2.9zm.5-5.2c-.5 1.8-3.3.9-4.2.7l.8-3.2c.9.2 3.9.6 3.4 2.5z"/></svg>',
      ETH: '<svg viewBox="0 0 32 32"><defs><linearGradient id="hiE" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8a9bff"/><stop offset="1" stop-color="#4b5bd6"/></linearGradient></defs><circle cx="16" cy="16" r="16" fill="url(#hiE)"/><g fill="#fff"><path fill-opacity=".6" d="M16.5 4v8.9l7.5 3.3z"/><path d="M16.5 4 9 16.2l7.5-3.3z"/><path fill-opacity=".6" d="M16.5 22v6L24 17.6z"/><path d="M16.5 28v-6L9 17.6z"/><path fill-opacity=".25" d="m16.5 20.6 7.5-4.4-7.5-3.3z"/><path fill-opacity=".6" d="m9 16.2 7.5 4.4v-7.7z"/></g></svg>',
      SOL: '<svg viewBox="0 0 32 32"><defs><linearGradient id="hiS" x1="8" y1="24" x2="24" y2="8" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#9945ff"/><stop offset=".55" stop-color="#5a8dee"/><stop offset="1" stop-color="#14f195"/></linearGradient></defs><circle cx="16" cy="16" r="16" fill="#0b0b14"/><circle cx="16" cy="16" r="15.3" fill="none" stroke="#5a8dee" stroke-opacity=".55" stroke-width="1.2"/><g fill="url(#hiS)"><path d="M10.4 19.9a.6.6 0 0 1 .4-.2h13.4c.3 0 .4.3.2.5l-2.6 2.6a.6.6 0 0 1-.4.2H8c-.3 0-.4-.3-.2-.5z"/><path d="M10.4 9.6a.6.6 0 0 1 .4-.2h13.4c.3 0 .4.3.2.5l-2.6 2.6a.6.6 0 0 1-.4.2H8c-.3 0-.4-.3-.2-.5z"/><path d="M21.8 14.7a.6.6 0 0 0-.4-.2H8c-.3 0-.4.3-.2.5l2.6 2.6c.1.1.3.2.4.2h13.4c.3 0 .4-.3.2-.5z"/></g></svg>',
      BNB: '<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#f3ba2f"/><g fill="#fff"><path d="m12.1 14.1 3.9-3.9 3.9 3.9 2.3-2.3L16 5.6l-6.2 6.2z"/><path d="m5.6 16 2.3-2.3 2.3 2.3-2.3 2.3z"/><path d="m12.1 17.9 3.9 3.9 3.9-3.9 2.3 2.3-6.2 6.2-6.2-6.2z"/><path d="m21.8 16 2.3-2.3 2.3 2.3-2.3 2.3z"/><path d="m18.4 16-2.4-2.4-1.8 1.8-.2.2-.4.4 2.4 2.4z"/></g></svg>',
      USDT: '<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#26a17b"/><path fill="#fff" d="M17.9 17.4v0c-.1 0-.7.1-1.9.1-1 0-1.7 0-1.9-.1v0c-3.7-.2-6.5-.8-6.5-1.6s2.8-1.4 6.5-1.6v2.5c.2 0 .9.1 1.9.1 1.2 0 1.8-.1 1.9-.1v-2.5c3.7.2 6.5.8 6.5 1.6s-2.8 1.4-6.5 1.6zm0-3.4v-2.3h5.2V8.3H8.9v3.4h5.2V14c-4.2.2-7.4 1-7.4 2s3.2 1.8 7.4 2v7.2h3.8V18c4.2-.2 7.3-1 7.3-2s-3.1-1.8-7.3-2z"/></svg>',
      USDC: '<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#2775ca"/><path fill="#fff" d="M20.1 18.1c0-2.1-1.3-2.9-3.8-3.2-1.8-.2-2.2-.7-2.2-1.6s.6-1.4 1.8-1.4c1.1 0 1.7.4 2 1.3 0 .1.2.2.3.2h1c.2 0 .3-.1.3-.3-.3-1.3-1.3-2.3-2.7-2.5V9.2c0-.2-.1-.3-.3-.3h-.9c-.2 0-.3.1-.3.3v1.4c-1.8.3-2.9 1.4-2.9 2.9 0 2 1.2 2.8 3.7 3.1 1.7.3 2.3.7 2.3 1.7s-.9 1.6-2 1.6c-1.6 0-2.1-.7-2.3-1.5 0-.2-.2-.3-.3-.3h-1.1c-.2 0-.3.1-.3.3.3 1.5 1.2 2.5 3.1 2.8v1.4c0 .2.1.3.3.3h.9c.2 0 .3-.1.3-.3v-1.4c1.9-.3 3.1-1.5 3.1-3.1z"/><path fill="#fff" d="M12.9 24.4c-4.6-1.6-7-6.8-5.3-11.4.9-2.5 2.8-4.4 5.3-5.3.2-.1.3-.3.3-.5v-.9c0-.2-.1-.3-.3-.3h-.1c-5.5 1.7-8.5 7.6-6.8 13.1 1 3.2 3.5 5.7 6.8 6.8.2.1.4 0 .4-.2v-.9c0-.2-.1-.3-.3-.4zm6.2-18.4c-.2-.1-.4 0-.4.2v.9c0 .2.1.4.3.5 4.6 1.6 7 6.8 5.3 11.4-.9 2.5-2.8 4.4-5.3 5.3-.2.1-.3.3-.3.5v.9c0 .2.1.3.3.3h.1c5.5-1.7 8.5-7.6 6.8-13.1-1-3.3-3.5-5.8-6.8-6.9z"/></svg>'
    };
    function icon(sym) { return IC[sym] || '<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#c9973f"/><text x="16" y="21.5" text-anchor="middle" font-family="Arial,sans-serif" font-weight="800" font-size="15" fill="#fff">' + String(sym || '?').charAt(0) + '</text></svg>'; }
    function upd() { var d = readTicker(); [].forEach.call(sec.querySelectorAll('.bz'), function (b, i) { var x = d[i]; if (!x) return; var em = b.querySelector('em'); if (em.getAttribute('data-s') !== x.s) { em.innerHTML = icon(x.s); em.setAttribute('data-s', x.s); } b.querySelector('span').textContent = x.s; b.querySelector('b').textContent = x.p; var u = b.querySelector('u'); u.textContent = (x.up ? '▲ ' : '▼ ') + x.c.replace(/^[+\-▲▼\s]+/, ''); u.className = x.up ? 'up' : 'dn'; b.title = x.s + ' ' + x.p + ' ' + x.c; }); }
    upd(); setTimeout(upd, 1500); setTimeout(upd, 4000); treeT = setInterval(function () { if (!document.hidden && document.getElementById('holTree')) upd(); }, 5000);
  }
  function untree() { var t = $('#holTree'); if (t) t.remove(); clearInterval(treeT); var pl = $('#holPlan'); if (pl) pl.remove(); }
  function plan() { var h = document.querySelector('#calc .sh2'); if (!h || $('#holPlan')) return; var s = document.createElement('div'); s.id = 'holPlan'; s.className = 'hz-plan'; s.textContent = '❄ Plan for ' + (new Date().getFullYear() + (new Date().getMonth() === 0 && new Date().getDate() <= 6 ? 0 : 1)); h.insertBefore(s, h.firstChild); }

  function unland() { untree(); var l = $('#holLand'); if (l) l.remove(); var p = $('#holPill'); if (p) p.remove(); var c = $('.hcap'); if (c) c.remove(); }

  /* ---------- greeting, countdown chip ---------- */
  function greet() {
    if (isStaffView()) return; var key = 'nc_hol_greet', today = new Date().toDateString(); if (LS.get(key) === today) return;
    var nm = (LS.get('user_name') || '').split(' ')[0], n = daysToNY();
    var msg = CFG.greeting || (function () { var pt = pillTxt(); return pt[0] + (nm ? ', ' + nm : '') + '! 🎄' + (/\d/.test(pt[1]) ? ' ' + pt[1].charAt(0).toUpperCase() + pt[1].slice(1) + '.' : ''); })();
    var t = document.createElement('div'); t.id = 'holToast'; t.textContent = msg; document.body.appendChild(t); LS.set(key, today);
    setTimeout(function () { t.classList.add('on'); }, 400); setTimeout(function () { t.classList.remove('on'); }, 5200); setTimeout(function () { t.remove(); }, 5800);
  }
  function chip() {
    var c = $('#holChip'); if (!c) { c = document.createElement('button'); c.id = 'holChip'; c.type = 'button'; c.title = 'Turn the holiday effects on or off'; document.body.appendChild(c); c.onclick = function () { try { if (window.__holFx && window.__holFx.open && window.__holFx.open()) return; } catch (e) { } LS.set('nc_hol_off', userOff() ? '' : '1'); apply(); }; }
    var hub = !!(window.__holFx && window.__holFx.open && !isStaffView() && !isLanding() && $('#mainApp') && $('#mainApp').getClientRects().length);
    if (hub) { c.remove(); return; }
    c.innerHTML = userOff() ? '<i>❄</i> Holiday mode off' : '<i>❄</i> Snow on';
    if (!userOff()) { clearTimeout(c._h); c._h = setTimeout(function () { if (c && !userOff()) c.style.opacity = '.28'; }, 6000); c.style.opacity = ''; c.style.pointerEvents = ''; }
  }
  function countdown() {
    var host = $('#agd .agd-top') || $('#agd header') || null; var n = daysToNY();
    var pt = pillTxt(), txt = /\d/.test(pt[1]) ? '🎄 ' + pt[1] : '';
    var old = $('#holCount'); if (!host || !active() || userOff() || !txt) { if (old) old.remove(); return; }
    if (old) { if (old.textContent !== txt) old.textContent = txt; return; } var s = document.createElement('span'); s.id = 'holCount'; s.className = 'hol-count'; s.textContent = txt;
    var me = host.querySelector('#agdMe'); host.insertBefore(s, (me && me.closest('div,button')) || host.lastElementChild);
  }

  /* ---------- apply ---------- */
  function apply() {
    var on = active() && allowedHere() && !userOff();
    document.documentElement.classList.toggle('hol', !!on); document.documentElement.classList.toggle('hol-land', isLanding());
    if (!(active() && allowedHere())) { unland(); stopSnow(); var g = $('#holGar'); if (g) g.remove(); var c = $('#holChip'); if (c) c.remove(); var k = $('#holCount'); if (k) k.remove(); return; }
    css(); chip();
    if (userOff()) { unland(); stopSnow(); var g2 = $('#holGar'); if (g2) g2.remove(); countdown(); return; }
    if (!slowOff) startSnow(); startGarland(); if (isLanding()) { landing(); tree(); plan(); } else greet(); countdown();
  }

  /* ---------- owner card (Admin → System) ---------- */
  var ownerBusy = 0;
  function ownerCard() {
    var nav = $('#adminPanel .admin-sidebar .admin-nav-item[data-tab="team"]'); if (!nav) return;
    var sec = $('#adminPanel [data-section="system"]'); if (!sec || !sec.getClientRects().length || $('#holAdmin') || ownerBusy) return; css(); ownerBusy = 1;
    post('holidayConfig').then(function (r) { ownerBusy = 0; if (r && r.ok && r.config && !$('#holAdmin')) buildOwner(sec, Object.assign({}, CFG, r.config), !('ar' in r.config)); });
  }
  function buildOwner(sec, cur, outdated) {
    var c = document.createElement('div'); c.id = 'holAdmin'; c.className = 'hol-card'; var q = function (v) { return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); };
    function opt(k, l) { return '<label><input type="checkbox" data-k="' + k + '"' + (cur[k] !== false && (k !== 'winter' && k !== 'ar' || cur[k] === true) ? ' checked' : '') + '> ' + l + '</label>'; }
    function hrs(id, v) { var o = ''; for (var h = 0; h < 24; h++) o += '<option value="' + h + '"' + (h === Number(v) ? ' selected' : '') + '>' + String(h).padStart(2, '0') + ':00</option>'; return '<select id="' + id + '">' + o + '</select>'; }
    var tzs = ['Europe/Stockholm', 'Europe/Warsaw', 'Europe/London', 'Europe/Berlin', 'Europe/Helsinki', 'Europe/Madrid', 'America/New_York', 'Asia/Dubai'], tzo = tzs.map(function (z) { return '<option' + (z === cur.tz ? ' selected' : '') + '>' + z + '</option>'; }).join('');
    c.innerHTML = (outdated ? '<div style="margin:0 0 12px;padding:10px 12px;border-radius:10px;background:rgba(255,90,95,.15);border:1px solid rgba(255,90,95,.45);font-size:12.5px;line-height:1.45"><b>⚠ Your Cloudflare Worker is not the latest version.</b> Team message, winter colours and the auto-reply cannot be saved until you deploy the newest <code>worker.js</code>. Everything else works.</div>' : '') + '<h3>🎄 Holiday theme</h3><p>Snow, a top ribbon, the Holiday menu for clients and the countdown. Light on the device and switched off automatically on slow ones.</p>' +
      '<div class="hol-row"><div class="hol-seg" id="holMode"><button type="button" data-m="auto">Auto (Dec 1 – Jan 6)</button><button type="button" data-m="on">Always on</button><button type="button" data-m="off">Off</button></div></div>' +
      '<div class="hol-row">' + opt('snow', 'Snow') + opt('garland', 'Top ribbon') + opt('clients', 'Show to clients') + opt('staff', 'Show in admin &amp; agent desk') + opt('winter', 'Winter colours in admin &amp; agent desk') + '</div>' +
      '<div class="hol-row"><input type="text" id="holGreet" maxlength="90" placeholder="Custom greeting for clients (optional)" value="' + q(cur.greeting) + '"></div>' +
      '<div class="hol-row"><input type="text" id="holTeam" maxlength="160" placeholder="Message to your team (shown once a day to agents and staff)" value="' + q(cur.teamMsg) + '"></div>' +
      '<h3 style="margin-top:16px">💬 Out-of-hours auto-reply</h3><p>When a client writes during the quiet hours, one short automatic answer is sent (at most once every 8 hours per client). It is marked “Auto-reply” for agents and never counts as an answer.</p>' +
      '<div class="hol-row">' + opt('ar', 'Enable auto-reply') + '</div><div class="hol-row"><input type="text" id="holArT" maxlength="300" placeholder="e.g. Thanks for your message! We are offline right now and will reply first thing in the morning." value="' + q(cur.arText) + '"></div>' +
      '<div class="hol-row"><label>From ' + hrs('holArF', cur.arFrom === 0 && !cur.arText ? 20 : cur.arFrom) + '</label><label>to ' + hrs('holArTo', cur.arTo === 0 && !cur.arText ? 8 : cur.arTo) + '</label><label><select id="holTz">' + tzo + '</select></label></div>' +
      '<div class="hol-row" id="holStat" style="font-size:12px;opacity:.75"></div><button class="hol-save" type="button">Save</button>';
    sec.insertBefore(c, sec.firstChild);
    (function st() { var e = c.querySelector('#holStat'); if (!e || !document.body.contains(c)) return; e.textContent = 'Status on this device: holiday script v7 ✓ · extras (menu, calendar, cards) ' + (window.__holFx && window.__holFx.open ? '✓' : '✗ not loaded: upload js/holiday-fx.js') + ' · snow ' + (cv ? (staticSnow ? 'still (reduced motion is on in your system)' : 'running') : (slowOff ? 'paused (slow device)' : 'off')) + ' · mode ' + (active() ? 'active' : 'inactive'); setTimeout(st, 2000); })();
    var segs = c.querySelectorAll('#holMode button'); function mark() { [].forEach.call(segs, function (b) { b.classList.toggle('on', b.getAttribute('data-m') === cur.mode); }); } mark();
    [].forEach.call(segs, function (b) { b.onclick = function () { cur.mode = b.getAttribute('data-m'); mark(); }; });
    c.querySelector('.hol-save').onclick = function () {
      [].forEach.call(c.querySelectorAll('input[data-k]'), function (i) { cur[i.getAttribute('data-k')] = i.checked; }); cur.greeting = c.querySelector('#holGreet').value; cur.teamMsg = c.querySelector('#holTeam').value; cur.arText = c.querySelector('#holArT').value; cur.arFrom = +c.querySelector('#holArF').value; cur.arTo = +c.querySelector('#holArTo').value; cur.tz = c.querySelector('#holTz').value;
      var b = c.querySelector('.hol-save'); if (cur.ar && !String(cur.arText).trim()) { b.textContent = 'Write the auto-reply text first'; setTimeout(function () { b.textContent = 'Save'; }, 2200); return; }
      post('setHoliday', { config: cur }).then(function (r) { if (r && r.ok && r.config && !('ar' in r.config) && (cur.ar || cur.winter || cur.teamMsg)) { CFG = r.config; b.textContent = 'Not saved: deploy the latest worker.js'; }
        else if (r && r.ok) { CFG = r.config; LS.set('nc_hol_cfg', JSON.stringify({ t: Date.now(), c: CFG })); slowOff = false; apply(); b.textContent = 'Saved ✓'; } else b.textContent = 'Could not save'; setTimeout(function () { b.textContent = 'Save'; }, 1800); });
    };
  }

  /* ---------- winter palette + team message (staff views) ---------- */
  function staffExtras() {
    var on = isStaffView() && active() && allowedHere() && !userOff() && CFG.winter === true; document.documentElement.classList.toggle('hol-winter', !!on);
    if (isStaffView() && active() && allowedHere() && !userOff() && CFG.teamMsg) { var k = 'nc_hol_team_' + (CFG.teamMsg.length) + '_' + new Date().toDateString(); if (LS.get(k) !== '1' && !$('#holToast')) { LS.set(k, '1'); var t = document.createElement('div'); t.id = 'holToast'; t.className = 'bt'; t.textContent = '🎄 ' + CFG.teamMsg; document.body.appendChild(t); setTimeout(function () { t.classList.add('on'); }, 400); setTimeout(function () { t.classList.remove('on'); }, 7000); setTimeout(function () { t.remove(); }, 7600); } }
  }

  window.__holApi = { apply: function () { apply(); }, active: function () { return active() && allowedHere(); }, daysToNY: daysToNY, country: country, pill: pillTxt };

  /* ---------- boot ---------- */
  function boot() {
    try { var c = JSON.parse(LS.get('nc_hol_cfg') || 'null'); if (c && c.c) CFG = c.c; } catch (e) { }
    apply();
    var fresh; try { fresh = JSON.parse(LS.get('nc_hol_cfg') || 'null'); } catch (e) { }
    if (!fresh || Date.now() - fresh.t > 10 * 60 * 1000) fetch(BASE + '?action=holidayConfig', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }).then(function (r) { return r.json(); }).then(function (r) { if (r && r.ok && r.config) { CFG = r.config; LS.set('nc_hol_cfg', JSON.stringify({ t: Date.now(), c: CFG })); apply(); } }).catch(function () { });
    setInterval(function () { var ch = $('#holChip'); if (ch && window.__holFx && !userOff() ) { var hb = !isStaffView() && !isLanding() && $('#mainApp') && $('#mainApp').getClientRects().length; var want = hb ? '<i>🎁</i> Holiday' : null; if (want) ch.remove(); } ownerCard(); staffExtras(); if (active() && allowedHere() && !userOff()) countdown(); var hp = $('#holPill'); if (hp) { var nh = pillHtml(); if (hp._t !== nh) { hp._t = nh; hp.innerHTML = nh; } } if (!$('#holGar') && active() && allowedHere() && !userOff() && CFG.garland) startGarland(); }, 1500);
  }
  if (document.body) boot(); else document.addEventListener('DOMContentLoaded', boot);
})();
