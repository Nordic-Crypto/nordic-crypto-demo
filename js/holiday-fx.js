/* Holiday extras v1 (client app): Holiday hub, Advent calendar, "Your year" stories, holiday card maker, New-Year fireworks,
   frosted card skin and soft sounds. Everything is built on demand and removed again, nothing runs in the background except one timer.
   Numbers in "Your year" come only from the client's own transactions; the calendar contains tips and wishes, never promises. */
(function () {
  'use strict';
  if (window.__holFx) return; window.__holFx = 1;
  var LS = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { } } };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var reduced = function () { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  function me() { return (LS.get('user_email') || '').toLowerCase(); }
  function nm() { return (LS.get('user_name') || '').trim(); }
  function money(v) { try { if (typeof fmtCurrency === 'function') return fmtCurrency(v); } catch (e) { } return '$' + (Number(v) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function state() { try { return (typeof st !== 'undefined' && st) || {}; } catch (e) { return {}; } }
  function hasClientApp() { var m = document.getElementById('mainApp'); return !!(m && m.getClientRects().length) && LS.get('user_role') !== 'admin'; }

  /* ---------- sound (off by default) ---------- */
  var AC = null;
  function soundOn() { return LS.get('nc_hol_snd') === '1'; }
  function tone(freqs, dur, vol) {
    if (!soundOn()) return; try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume();
      freqs.forEach(function (f, i) { var o = AC.createOscillator(), g = AC.createGain(), t = AC.currentTime + i * .09; o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol || .08, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + dur); o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + dur + .05); });
    } catch (e) { }
  }
  var chime = function () { tone([880, 1318.5, 1760], .9, .07); }, pop = function () { tone([660, 990], .35, .05); };

  /* ---------- styles ---------- */
  function css() {
    if ($('#hxCss')) return; var s = document.createElement('style'); s.id = 'hxCss';
    s.textContent = [
      '.hx{--bg:#0d121b;--p:#141c29;--p2:#1a2434;--ln:rgba(255,255,255,.1);--tx:#eef3fa;--mu:#93a0b5;--ac:#c8ff4d;--acx:#10180a;--r:#ff5a5f;--g:#6ee7a8;--y:#ffd166;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--tx);-webkit-tap-highlight-color:transparent}',
      'html[data-theme="light"] .hx{--bg:#f3f6f1;--p:#fff;--p2:#f1f4ee;--ln:rgba(15,23,42,.12);--tx:#0f172a;--mu:#5b6577;--ac:#4b8200;--acx:#fff}',
      '.hx *{box-sizing:border-box}.hx button{font:inherit;color:inherit}',
      '.hx-back{position:fixed;inset:0;z-index:100060;background:rgba(5,8,14,.62);display:flex;align-items:flex-end;justify-content:center;animation:hxF .2s ease;overscroll-behavior:contain}',
      '@media(min-width:640px){.hx-back{align-items:center}}',
      '@keyframes hxF{from{opacity:0}}@keyframes hxU{from{transform:translateY(30px);opacity:0}}@keyframes hxZ{from{transform:scale(.94);opacity:0}}',
      '.hx-sheet{width:min(100%,520px);max-height:min(92dvh,760px);overflow:auto;background:var(--bg);border:1px solid var(--ln);border-radius:26px 26px 0 0;padding:20px 18px calc(22px + env(safe-area-inset-bottom));box-shadow:0 -20px 80px rgba(0,0,0,.5);animation:hxU .28s cubic-bezier(.2,.8,.2,1);position:relative;overscroll-behavior:contain}',
      '@media(min-width:640px){.hx-sheet{border-radius:26px;animation-name:hxZ}}',
      '.hx-sheet:before{content:"";position:absolute;left:0;right:0;top:0;height:140px;pointer-events:none;border-radius:inherit;background:radial-gradient(60% 100% at 15% 0,rgba(255,90,95,.2),transparent),radial-gradient(60% 100% at 85% 0,rgba(110,231,168,.2),transparent)}',
      '.hx-h{position:relative;display:flex;align-items:center;gap:10px;margin-bottom:14px}.hx-h h2{margin:0;font-size:20px;letter-spacing:-.01em;flex:1}.hx-h small{display:block;font-size:12px;color:var(--mu);font-weight:500;margin-top:2px}',
      '.hx-x{all:unset;cursor:pointer;width:36px;height:36px;border-radius:50%;display:grid;place-items:center;background:var(--p2);font-size:18px;line-height:1;flex:none}.hx-x:hover{background:var(--ln)}.hx-x:focus-visible,.hx-tile:focus-visible,.hx-door:focus-visible,.hx-b:focus-visible{outline:2px solid var(--ac);outline-offset:2px}',
      '.hx-cd{position:relative;display:flex;gap:8px;margin:0 0 14px}.hx-cd div{flex:1;text-align:center;padding:10px 4px;border-radius:14px;background:var(--p);border:1px solid var(--ln)}.hx-cd b{display:block;font-size:22px;font-variant-numeric:tabular-nums;letter-spacing:-.02em}.hx-cd span{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--mu)}',
      '.hx-tiles{position:relative;display:grid;grid-template-columns:1fr 1fr;gap:10px}',
      '.hx-tile{all:unset;box-sizing:border-box;cursor:pointer;display:flex;flex-direction:column;gap:4px;padding:14px;border-radius:18px;background:var(--p);border:1px solid var(--ln);transition:transform .15s,border-color .15s;min-height:92px}.hx-tile:hover{transform:translateY(-2px);border-color:var(--ac)}.hx-tile i{font-style:normal;font-size:26px;line-height:1}.hx-tile b{font-size:14px}.hx-tile small{font-size:11.5px;color:var(--mu);line-height:1.3}',
      '.hx-sw{position:relative;margin-top:14px;border:1px solid var(--ln);border-radius:16px;background:var(--p);overflow:hidden}.hx-sw label{display:flex;align-items:center;gap:12px;padding:12px 14px;font-size:14px;cursor:pointer;border-top:1px solid var(--ln)}.hx-sw label:first-child{border-top:0}.hx-sw label span{flex:1}',
      '.hx-sw input{appearance:none;-webkit-appearance:none;width:42px;height:24px;border-radius:99px;background:var(--p2);border:1px solid var(--ln);position:relative;cursor:pointer;transition:background .2s;flex:none;margin:0}.hx-sw input:after{content:"";position:absolute;left:2px;top:2px;width:18px;height:18px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.4);transition:transform .2s}.hx-sw input:checked{background:var(--ac)}.hx-sw input:checked:after{transform:translateX(18px)}',
      '.hx-b{all:unset;box-sizing:border-box;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 18px;border-radius:14px;font-weight:700;font-size:14px;background:var(--ac);color:var(--acx);text-align:center}.hx-b.g{background:var(--p2);color:var(--tx);border:1px solid var(--ln)}.hx-b:hover{filter:brightness(1.06)}.hx-b[disabled]{opacity:.5;cursor:default}',
      '.hx-note{position:relative;margin:12px 2px 0;font-size:11.5px;color:var(--mu);line-height:1.45}',
      /* advent */
      '.hx-adv{position:relative;display:grid;grid-template-columns:repeat(7,1fr);gap:7px}',
      '.hx-door{all:unset;box-sizing:border-box;cursor:pointer;aspect-ratio:1;border-radius:12px;display:grid;place-items:center;font-weight:800;font-size:15px;position:relative;color:#fff;background:linear-gradient(145deg,#c93b40,#8d1f2b);box-shadow:inset 0 0 0 1px rgba(255,255,255,.18),0 4px 10px rgba(0,0,0,.25);transition:transform .15s}',
      '.hx-door:nth-child(3n+2){background:linear-gradient(145deg,#1f9a62,#0f6a45)}.hx-door:nth-child(3n){background:linear-gradient(145deg,#d6a21f,#9a6d0b)}',
      '.hx-door:hover:not(.lock){transform:translateY(-2px) rotate(-2deg)}.hx-door.today{outline:2px solid var(--ac);outline-offset:2px}.hx-door.open{background:var(--p2)!important;color:var(--mu);box-shadow:inset 0 0 0 1px var(--ln)}.hx-door.open:after{content:"✓";position:absolute;right:5px;top:3px;font-size:10px;color:var(--ac)}.hx-door.lock{opacity:.38;cursor:default;filter:saturate(.5)}',
      '.hx-gift{position:relative;text-align:center;padding:18px 10px 6px;animation:hxZ .3s}.hx-gift .n{display:inline-grid;place-items:center;width:72px;height:72px;border-radius:20px;font-size:30px;font-weight:800;color:#fff;background:linear-gradient(145deg,#c93b40,#8d1f2b);box-shadow:0 10px 30px rgba(201,59,64,.4);margin-bottom:12px}.hx-gift h3{margin:0 0 8px;font-size:19px}.hx-gift p{margin:0 auto 16px;max-width:360px;font-size:14.5px;line-height:1.55;color:var(--mu)}',
      /* card maker */
      '.hx-tpl{position:relative;display:flex;gap:8px;overflow-x:auto;padding:2px 2px 8px;scrollbar-width:none}.hx-tpl::-webkit-scrollbar{display:none}.hx-tpl button{all:unset;cursor:pointer;flex:none;width:62px;height:78px;border-radius:12px;border:2px solid transparent;box-shadow:0 4px 12px rgba(0,0,0,.3)}.hx-tpl button.on{border-color:var(--ac)}',
      '.hx-prev{position:relative;display:block;width:100%;max-width:236px;margin:6px auto 12px;border-radius:18px;box-shadow:0 14px 40px rgba(0,0,0,.4);aspect-ratio:4/5;background:var(--p2)}',
      '.hx-f{position:relative;display:flex;flex-direction:column;gap:6px;margin-bottom:10px}.hx-f label{font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:var(--mu);font-weight:700}.hx-f input,.hx-f select,.hx-f textarea{width:100%;font:inherit;font-size:16px;padding:11px 12px;border-radius:12px;border:1px solid var(--ln);background:var(--p);color:var(--tx);outline:none;resize:none}.hx-f input:focus,.hx-f select:focus,.hx-f textarea:focus{border-color:var(--ac)}',
      '.hx-row{position:relative;display:flex;gap:10px;flex-wrap:wrap}.hx-row>*{flex:1;min-width:130px}',
      /* stories */
      '.hx-st{position:fixed;inset:0;z-index:100070;display:flex;align-items:center;justify-content:center;background:#05080e;animation:hxF .25s;touch-action:pan-y;user-select:none;-webkit-user-select:none}',
      '.hx-sc{position:relative;width:min(100%,460px);height:min(100dvh,860px);overflow:hidden;color:#fff;display:flex;flex-direction:column}@media(min-width:520px){.hx-sc{height:min(94dvh,860px);border-radius:26px}}',
      '.hx-bars{position:absolute;left:14px;right:14px;top:calc(12px + env(safe-area-inset-top));display:flex;gap:5px;z-index:4}.hx-bars i{flex:1;height:3px;border-radius:3px;background:rgba(255,255,255,.28);overflow:hidden;position:relative}.hx-bars i:after{content:"";position:absolute;inset:0;background:#fff;transform:scaleX(var(--p,0));transform-origin:0 50%}',
      '.hx-sx{all:unset;position:absolute;right:12px;top:calc(26px + env(safe-area-inset-top));z-index:5;cursor:pointer;width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:rgba(0,0,0,.35);color:#fff;font-size:18px}',
      '.hx-slide{flex:1;display:flex;flex-direction:column;justify-content:center;padding:84px 28px 96px;gap:14px;animation:hxZ .4s cubic-bezier(.2,.8,.2,1);position:relative;z-index:2}',
      '.hx-slide small{font-size:12px;letter-spacing:.14em;text-transform:uppercase;opacity:.75;font-weight:700}.hx-slide h2{margin:0;font-size:clamp(30px,9vw,44px);line-height:1.05;letter-spacing:-.03em}.hx-slide .big{font-size:clamp(46px,15vw,76px);font-weight:800;letter-spacing:-.04em;line-height:1;font-variant-numeric:tabular-nums}.hx-slide p{margin:0;font-size:16px;line-height:1.5;opacity:.88}',
      '.hx-mon{display:flex;align-items:flex-end;gap:5px;height:110px;margin-top:6px}.hx-mon i{flex:1;border-radius:6px 6px 2px 2px;background:rgba(255,255,255,.3);min-height:4px;transform-origin:bottom;animation:hxG .8s cubic-bezier(.2,.8,.2,1) backwards}.hx-mon i.t{background:#fff}@keyframes hxG{from{transform:scaleY(0)}}',
      '.hx-ml{display:flex;gap:5px;font-size:10px;opacity:.7;margin-top:4px}.hx-ml span{flex:1;text-align:center}',
      '.hx-pill{display:inline-flex;align-self:flex-start;padding:7px 12px;border-radius:99px;background:rgba(255,255,255,.18);font-size:13px;font-weight:700;backdrop-filter:blur(6px)}',
      '.hx-tap{position:absolute;top:70px;bottom:90px;width:34%;z-index:3}.hx-tap.l{left:0}.hx-tap.r{right:0;width:66%}',
      '.hx-foot{position:absolute;left:20px;right:20px;bottom:calc(20px + env(safe-area-inset-bottom));z-index:5;display:flex;gap:10px}.hx-foot .hx-b{flex:1;background:rgba(255,255,255,.95);color:#10151f}.hx-foot .hx-b.g{background:rgba(255,255,255,.18);color:#fff;border:0}',
      /* fireworks */
      '.hx-fw{position:fixed;inset:0;width:100%;height:100%;z-index:100080;pointer-events:none}',
      '.hx-ny{position:fixed;left:50%;top:38%;transform:translate(-50%,-50%);z-index:100081;text-align:center;pointer-events:none;color:#fff;text-shadow:0 4px 30px rgba(0,0,0,.6);animation:hxZ .6s}.hx-ny b{display:block;font-size:clamp(34px,10vw,76px);letter-spacing:-.03em;line-height:1}.hx-ny span{display:block;margin-top:10px;font-size:clamp(14px,3.6vw,20px);opacity:.9}',
      /* card skin */
      'html.hol-skin .nc3-bank-card,html.hol-skin .pay.pay-large{position:relative;overflow:hidden}',
      'html.hol-skin .nc3-bank-card::before,html.hol-skin .pay.pay-large::before{content:"";position:absolute;inset:0;z-index:1;pointer-events:none;border-radius:inherit;background:radial-gradient(circle at 18% 22%,rgba(255,255,255,.7) 0 1.4px,transparent 2px) 0 0/54px 54px,radial-gradient(circle at 68% 62%,rgba(255,255,255,.5) 0 1px,transparent 1.6px) 0 0/37px 41px,radial-gradient(circle at 40% 80%,rgba(255,255,255,.45) 0 1.2px,transparent 1.8px) 0 0/63px 49px;opacity:.55}',
      'html.hol-skin .nc3-bank-card::after,html.hol-skin .pay.pay-large::after{content:"";position:absolute;top:-20%;bottom:-20%;left:-40%;width:35%;z-index:1;pointer-events:none;background:linear-gradient(100deg,transparent,rgba(255,255,255,.28),transparent);transform:translateX(0) skewX(-18deg);animation:hxShine 7s ease-in-out infinite}',
      '@keyframes hxShine{0%,55%{transform:translateX(0) skewX(-18deg)}100%{transform:translateX(480%) skewX(-18deg)}}',
      'html.hol-skin .nc3-bank-card,html.hol-skin .pay.pay-large{box-shadow:inset 0 0 0 1.5px rgba(255,214,120,.5),0 12px 40px rgba(0,0,0,.35)}',
      '@media(prefers-reduced-motion:reduce){.hx *,.hx-fw,html.hol-skin .nc3-bank-card::after,html.hol-skin .pay.pay-large::after{animation:none!important}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  /* ---------- helpers: modal ---------- */
  var openLayer = null, lastFocus = null;
  function layer(html, cls) {
    closeLayer(); css(); lastFocus = document.activeElement;
    var b = document.createElement('div'); b.className = 'hx hx-back'; b.setAttribute('role', 'dialog'); b.setAttribute('aria-modal', 'true');
    b.innerHTML = '<div class="hx-sheet ' + (cls || '') + '">' + html + '</div>'; document.body.appendChild(b); openLayer = b;
    b.addEventListener('mousedown', function (e) { if (e.target === b) closeLayer(); });
    document.documentElement.style.overflow = 'hidden';
    var x = b.querySelector('.hx-x'); if (x) { x.onclick = closeLayer; setTimeout(function () { try { x.focus({ preventScroll: true }); } catch (e) { } }, 60); }
    return b;
  }
  function closeLayer() { if (openLayer) { openLayer.remove(); openLayer = null; document.documentElement.style.overflow = ''; try { lastFocus && lastFocus.focus && lastFocus.focus({ preventScroll: true }); } catch (e) { } } if (cdT) { clearInterval(cdT); cdT = 0; } }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { if ($('.hx-st')) closeStory(); else closeLayer(); }
    if (e.key === 'Tab' && openLayer) {                                                  // keep focus inside the dialog
      var f = [].slice.call(openLayer.querySelectorAll('button,input,select,textarea,[tabindex]:not([tabindex="-1"])')).filter(function (n) { return !n.disabled && n.offsetParent !== null; }); if (!f.length) return;
      var a = document.activeElement, i = f.indexOf(a); if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && (i === f.length - 1)) { e.preventDefault(); f[0].focus(); }
    }
  });

  /* ---------- confetti (tiny, self-removing) ---------- */
  function confetti(x, y) {
    if (reduced()) return; var c = document.createElement('canvas'); c.className = 'hx-fw'; var dpr = 1, W = c.width = innerWidth, H = c.height = innerHeight; document.body.appendChild(c); var g = c.getContext('2d');
    var cols = ['#ff5a5f', '#ffd166', '#6ee7a8', '#6aa9ff', '#fff', '#c8ff4d'], P = [], n = 70; x = x == null ? W / 2 : x; y = y == null ? H * .55 : y;
    for (var i = 0; i < n; i++) { var a = Math.random() * 6.283, v = 4 + Math.random() * 9; P.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 5, s: 4 + Math.random() * 5, r: Math.random() * 6, vr: (Math.random() - .5) * .4, c: cols[i % cols.length] }); }
    var t0 = 0; (function f(t) { if (!t0) t0 = t; var k = t - t0; g.clearRect(0, 0, W, H); P.forEach(function (p) { p.vy += .32; p.vx *= .992; p.x += p.vx; p.y += p.vy; p.r += p.vr; g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.globalAlpha = Math.max(0, 1 - k / 2200); g.fillStyle = p.c; g.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * .6); g.restore(); }); if (k < 2300) requestAnimationFrame(f); else c.remove(); })(performance.now());
  }

  /* ---------- fireworks ---------- */
  function fireworks(ms, title, sub) {
    if ($('.hx-fw.fw')) return; css(); var c = document.createElement('canvas'); c.className = 'hx-fw fw'; var dpr = Math.min(devicePixelRatio || 1, 1.5), W = innerWidth, H = innerHeight; c.width = W * dpr; c.height = H * dpr; document.body.appendChild(c); var g = c.getContext('2d'); g.scale(dpr, dpr);
    var banner = null; if (title) { banner = document.createElement('div'); banner.className = 'hx hx-ny'; banner.innerHTML = '<b>' + esc(title) + '</b><span>' + esc(sub || '') + '</span>'; document.body.appendChild(banner); }
    var cols = [[255, 90, 95], [255, 209, 102], [110, 231, 168], [106, 169, 255], [255, 255, 255], [200, 255, 77]], P = [], R = [], t0 = 0, last = 0, next = 0, reducedM = reduced(); ms = ms || 7000;
    function burst(x, y) { var col = cols[Math.random() * cols.length | 0], n = 38 + (Math.random() * 18 | 0); for (var i = 0; i < n && P.length < 520; i++) { var a = i / n * 6.283 + Math.random() * .2, v = 1.2 + Math.random() * 3.4; P.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, l: 1, d: .008 + Math.random() * .008, c: col }); } if (!reducedM) pop(); }
    (function f(t) {
      if (!t0) { t0 = t; last = t; } var k = t - t0, dt = Math.min(40, t - last) / 16.7; last = t;
      g.globalCompositeOperation = 'destination-out'; g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'lighter';
      if (k < ms - 1500 && t > next) { next = t + 260 + Math.random() * 380; R.push({ x: W * (.15 + Math.random() * .7), y: H, ty: H * (.18 + Math.random() * .35), vy: -(7 + Math.random() * 3) }); }
      for (var i = R.length - 1; i >= 0; i--) { var r = R[i]; r.y += r.vy * dt; g.fillStyle = 'rgba(255,230,170,.9)'; g.fillRect(r.x - 1, r.y, 2, 8); if (r.y <= r.ty) { burst(r.x, r.y); R.splice(i, 1); } }
      for (var j = P.length - 1; j >= 0; j--) { var p = P[j]; p.vy += .035 * dt; p.vx *= .992; p.x += p.vx * dt; p.y += p.vy * dt; p.l -= p.d * dt; if (p.l <= 0) { P.splice(j, 1); continue; } g.fillStyle = 'rgba(' + p.c[0] + ',' + p.c[1] + ',' + p.c[2] + ',' + p.l + ')'; g.beginPath(); g.arc(p.x, p.y, 1.8 * p.l + .4, 0, 6.283); g.fill(); }
      if (k < ms || P.length) requestAnimationFrame(f); else { c.remove(); if (banner) banner.remove(); }
    })(performance.now());
    if (banner) setTimeout(function () { if (banner) banner.style.transition = 'opacity .8s', banner.style.opacity = '0'; }, Math.max(2000, ms - 1400));
  }
  function nyYear() { var n = new Date(); return n.getMonth() === 0 && n.getDate() <= 1 ? n.getFullYear() : n.getFullYear() + 1; }
  var nyT = 0;
  function scheduleNY() {
    clearTimeout(nyT); var n = new Date(), y = nyYear(), at = new Date(y, 0, 1, 0, 0, 0), d = at - n, key = 'nc_hol_ny_' + y;
    if (d > 0 && d < 40 * 3600e3) nyT = setTimeout(function () { if (LS.get(key) !== '1' && !userOff()) { LS.set(key, '1'); fireworks(9000, 'Happy New Year ' + y + '!', (nm().split(' ')[0] ? nm().split(' ')[0] + ', t' : 'T') + 'hank you for being with Nordic Crypto 🎆'); } }, d + 400);
    else if (d <= 0 && d > -600e3 && LS.get(key) !== '1' && !userOff()) { LS.set(key, '1'); setTimeout(function () { fireworks(8000, 'Happy New Year ' + y + '!', 'Wishing you a great start of the year 🎆'); }, 1200); }
  }
  function userOff() { return LS.get('nc_hol_off') === '1'; }

  /* ---------- Advent calendar ---------- */
  var ADV = [
    ['Welcome, December ❄', 'The first door is open. Keep your sign-in details to yourself: Nordic Crypto will never ask you for your password or a one-time code.'],
    ['Slow down before you send', 'Double-check the first and last characters of any crypto address before sending. A crypto transfer cannot be taken back.'],
    ['A small test first', 'Sending to a new address? Send a small amount first and make sure it arrives, then send the rest.'],
    ['Your recovery matters', 'Keep your account e-mail secure. It is the key to getting back into your account if you ever forget a password.'],
    ['Cosy-evening idea ☕', 'Take two minutes to look through your recent activity. Spotting something odd early is always easier.'],
    ['Phishing season 🎣', 'Holiday shopping brings fake delivery and “account problem” messages. When in doubt, open the app yourself instead of tapping a link.'],
    ['Light on, light off', 'Turn on the dark or light theme that is best for your eyes. You can switch any time from the sun icon at the top.'],
    ['Tip: use the search', 'Press / on a computer to search your transactions, cards and assets in one place.'],
    ['Keep your card safe', 'Never share the full card number, CVV or PIN in a chat. Our team will not need them.'],
    ['A moment of thanks 🙏', 'Thank you for trusting us with your money. We work every day to earn that.'],
    ['Check your currency', 'Travelling for the holidays? Pick the currency you spend in so balances look familiar.'],
    ['Strong password, simple way', 'A long phrase of four or five random words is stronger and easier to remember than a short, complicated password.'],
    ['Little wins ✨', 'Round-number goals are great, but regular small steps matter more. Consistency beats timing.'],
    ['Public Wi-Fi', 'Avoid managing money on open public Wi-Fi. Mobile data is safer in cafés, hotels and airports.'],
    ['Gift idea 🎁', 'The best gift is time. Put your phone away for an hour tonight and enjoy the people around you.'],
    ['Know your limits', 'Decide in advance how much you are comfortable moving in a day. A plan helps you avoid hurried decisions.'],
    ['Scam alert', 'Nobody legitimate will ask you to “move your funds to a safe account”. If someone does, stop and contact us in the chat.'],
    ['Update time 🔄', 'Keep your phone and browser up to date. Updates close security holes you never see.'],
    ['Warm drinks, cool head', 'Markets move. Making big decisions when stressed or tired rarely ends well; sleep on it.'],
    ['A note on support 💬', 'Our chat is there for you. Describe the problem, add a screenshot if it helps and we will take it from there.'],
    ['Shortest day', 'The year’s shortest day is behind us in the north. From here, every day is a little brighter.'],
    ['Check your details', 'Make sure your phone number and e-mail on your profile are current, so we can reach you when it matters.'],
    ['Kind words cost nothing', 'Message someone you have not spoken to for a while. It will mean more than you think.'],
    ['Christmas Eve 🎄', 'Wishing you a warm, calm evening with the people you love. We are grateful for you.'],
    ['Merry Christmas ✨', 'From all of us at Nordic Crypto: peace, health and a little magic today.'],
    ['Quiet day', 'Take it easy. Nothing in your account needs rushing today.'],
    ['Look back, look forward', 'Open “Your year” from the Holiday menu to see your own year in numbers.'],
    ['Plan something small', 'Pick one tiny, realistic financial habit for January. Small and kept beats big and forgotten.'],
    ['Backups', 'Write your important recovery details on paper and keep them somewhere safe. Not in a screenshot.'],
    ['Almost there', 'Tomorrow is the last day of the year. Thank you for being part of ours.'],
    ['Happy New Year! 🎆', 'May your year be calm where it should be, and exciting where it counts. See you in the new one!']
  ];
  function advToday() { var n = new Date(), m = n.getMonth(); if (m === 11) return Math.min(31, n.getDate()); if (m === 0 && n.getDate() <= 6) return 31; return 1; }
  function advKey() { return 'nc_adv_' + me(); }
  function advOpened() { try { var a = JSON.parse(LS.get(advKey()) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function advCount() { return advOpened().length; }
  function openAdvent() {
    var t = advToday(), done = advOpened(), real = new Date().getMonth() === 11 || (new Date().getMonth() === 0 && new Date().getDate() <= 6), h = '';
    for (var d = 1; d <= 31; d++) { var lock = d > t, op = done.indexOf(d) > -1; h += '<button type="button" class="hx-door' + (lock ? ' lock' : '') + (op ? ' open' : '') + (d === t && real ? ' today' : '') + '" data-d="' + d + '" ' + (lock ? 'aria-disabled="true" tabindex="-1"' : '') + ' aria-label="Door ' + d + (op ? ', opened' : lock ? ', locked' : '') + '">' + d + '</button>'; }
    var b = layer('<div class="hx-h"><div style="flex:1"><h2>🎁 Advent calendar</h2><small>' + done.length + ' of 31 opened</small></div><button class="hx-x" type="button" aria-label="Close">✕</button></div><div class="hx-adv">' + h + '</div><div class="hx-note">' + (real ? 'A new door opens every day. Tips, small thoughts and warm wishes, nothing to sign up for.' : 'Preview: the calendar opens for real on 1 December. Until then you can peek at door 1.') + '</div>');
    b.querySelector('.hx-adv').addEventListener('click', function (e) { var el = e.target.closest('.hx-door'); if (!el || el.classList.contains('lock')) return; openDoor(+el.getAttribute('data-d')); });
  }
  function openDoor(d) {
    var a = advOpened(); if (a.indexOf(d) < 0) { a.push(d); LS.set(advKey(), JSON.stringify(a)); }
    var c = ADV[d - 1] || ADV[0]; chime(); confetti();
    layer('<div class="hx-h"><div style="flex:1"></div><button class="hx-x" type="button" aria-label="Close">✕</button></div><div class="hx-gift"><div class="n">' + d + '</div><h3>' + esc(c[0]) + '</h3><p>' + esc(c[1]) + '</p><button class="hx-b" type="button" id="hxBack">Back to the calendar</button></div>');
    var bb = $('#hxBack'); if (bb) { bb.onclick = openAdvent; bb.focus(); }
  }

  /* ---------- "Your year" ---------- */
  function yearData() {
    var s = state(), now = new Date(), Y = now.getMonth() === 0 && now.getDate() <= 6 ? now.getFullYear() - 1 : now.getFullYear(), tx = (s.txs || []).filter(function (t) { var d = new Date(t.ts || t.date); return d.getFullYear() === Y; });
    var months = new Array(12).fill(0), inn = 0, out = 0, big = null, coins = {};
    tx.forEach(function (t) { var d = new Date(t.ts || t.date), a = Number(t.amt) || 0; months[d.getMonth()]++; if (a > 0) inn += a; else out += -a; if (!big || Math.abs(a) > Math.abs(big.amt)) big = { amt: a, desc: String(t.desc || '').slice(0, 60), d: d }; var sym = t.coin || (/\b(BTC|ETH|SOL|BNB|XRP|ADA|DOGE|USDT|LTC|TRX)\b/.exec(String(t.desc || '')) || [])[1]; if (sym) coins[sym] = (coins[sym] || 0) + 1; });
    var mi = months.indexOf(Math.max.apply(null, months)), top = Object.keys(coins).sort(function (a, b) { return coins[b] - coins[a]; })[0] || '';
    var total = Number(s.totalBalance); if (!isFinite(total)) { total = (Number(s.usd) || 0) + (Number(s.btc) || 0) * (Number(s.btcP) || 0) + (Number(s.eth) || 0) * (Number(s.ethP) || 0); }
    return { Y: Y, n: tx.length, months: months, mi: mi, inn: inn, out: out, big: big, top: top, topN: coins[top] || 0, total: total };
  }
  var MN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], MF = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var stT = 0, stI = 0, stS = [], stEnd = 0;
  function closeStory() { var s = $('.hx-st'); if (s) s.remove(); clearTimeout(stT); cancelAnimationFrame(stEnd); document.documentElement.style.overflow = ''; }
  function openYear() {
    closeLayer(); css(); var D = yearData(), first = nm().split(' ')[0], g = ['linear-gradient(160deg,#0b1d3a,#1b5b6e 60%,#0e7a5a)', 'linear-gradient(160deg,#3a0d16,#a3262f)', 'linear-gradient(160deg,#10243d,#2f4f8f)', 'linear-gradient(160deg,#102a20,#1f8a5b)', 'linear-gradient(160deg,#2a1b3a,#7a3ea1)', 'linear-gradient(160deg,#3a2a08,#b8861b)'];
    stS = [];
    if (D.n < 1) { stS.push({ bg: g[0], html: '<small>Your ' + D.Y + '</small><h2>Your story is just beginning ✨</h2><p>There is not enough activity in your account yet to make a summary. Come back after a few transactions, and your year will appear here.</p>' }); }
    else {
      var mx = Math.max.apply(null, D.months) || 1;
      stS.push({ bg: g[0], html: '<small>Your ' + D.Y + ' with Nordic Crypto</small><h2>' + (first ? esc(first) + ', here' : 'Here') + ' is your year ✨</h2><p>A quick look at how you used your account. Tap to continue.</p>' });
      stS.push({ bg: g[1], html: '<small>Activity</small><div class="big">' + D.n + '</div><h2>transaction' + (D.n === 1 ? '' : 's') + ' this year</h2><p>Your busiest month was <b>' + MF[D.mi] + '</b> with ' + D.months[D.mi] + '.</p><div class="hx-mon">' + D.months.map(function (v, i) { return '<i class="' + (i === D.mi ? 't' : '') + '" style="height:' + Math.max(4, v / mx * 100) + '%;animation-delay:' + (i * 40) + 'ms"></i>'; }).join('') + '</div><div class="hx-ml">' + MN.map(function (m) { return '<span>' + m[0] + '</span>'; }).join('') + '</div>' });
      stS.push({ bg: g[2], html: '<small>Money in and out</small><h2>In</h2><div class="big" style="font-size:clamp(34px,11vw,56px)">' + esc(money(D.inn)) + '</div><h2 style="margin-top:6px">Out</h2><div class="big" style="font-size:clamp(34px,11vw,56px)">' + esc(money(D.out)) + '</div><p>Totals of your completed card, bank and crypto transactions this year.</p>' });
      if (D.top) stS.push({ bg: g[3], html: '<small>Your favourite asset</small><div class="big">' + esc(D.top) + '</div><h2>appears in ' + D.topN + ' of your transactions</h2><p>The one you came back to most often.</p>' });
      if (D.big && D.big.amt) stS.push({ bg: g[4], html: '<small>Biggest move</small><div class="big" style="font-size:clamp(36px,12vw,60px)">' + esc(money(Math.abs(D.big.amt))) + '</div><h2>' + (D.big.amt > 0 ? 'came in' : 'went out') + ' on ' + D.big.d.getDate() + ' ' + MN[D.big.d.getMonth()] + '</h2><p>' + esc(D.big.desc) + '</p>' });
      stS.push({ bg: g[5], html: '<small>Today</small><div class="big" style="font-size:clamp(36px,12vw,60px)">' + esc(money(D.total)) + '</div><h2>your total balance</h2><p>Thank you for being with us in ' + D.Y + '. Here is to a great ' + (D.Y + 1) + '! 🎆</p>', last: 1 });
    }
    var o = document.createElement('div'); o.className = 'hx hx-st'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true'); o.setAttribute('aria-label', 'Your year');
    o.innerHTML = '<div class="hx-sc" id="hxSc"><div class="hx-bars">' + stS.map(function () { return '<i></i>'; }).join('') + '</div><button class="hx-sx" type="button" aria-label="Close">✕</button><div class="hx-tap l" data-t="p"></div><div class="hx-tap r" data-t="n"></div><div id="hxSl" style="display:contents"></div></div>';
    document.body.appendChild(o); document.documentElement.style.overflow = 'hidden'; stI = 0; showSlide(); var held = 0;
    o.querySelector('.hx-sx').onclick = closeStory;
    o.addEventListener('click', function (e) { var t = e.target.closest('[data-t]'); if (!t) return; var d = t.getAttribute('data-t'); if (d === 'n') nextSlide(); else if (stI > 0) { stI--; showSlide(); } });
    var x0 = null; o.addEventListener('pointerdown', function (e) { x0 = e.clientX; held = 1; pauseBar(true); }); o.addEventListener('pointerup', function (e) { held = 0; pauseBar(false); if (x0 != null) { var dx = e.clientX - x0; if (Math.abs(dx) > 60) { if (dx < 0) nextSlide(); else if (stI > 0) { stI--; showSlide(); } } } x0 = null; }); o.addEventListener('pointercancel', function () { held = 0; pauseBar(false); });
    document.addEventListener('keydown', function kd(e) { if (!$('.hx-st')) { document.removeEventListener('keydown', kd); return; } if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); nextSlide(); } else if (e.key === 'ArrowLeft' && stI > 0) { stI--; showSlide(); } });
    o.querySelector('.hx-sx').focus();
  }
  var bt0 = 0, bPause = 0, bAcc = 0, BAR = 6000;
  function pauseBar(p) { if (p) { bPause = performance.now(); } else if (bPause) { bt0 += performance.now() - bPause; bPause = 0; } }
  function nextSlide() { if (stI < stS.length - 1) { stI++; showSlide(); } else { closeStory(); } }
  function showSlide() {
    var sc = $('#hxSc'); if (!sc) return; var s = stS[stI]; sc.style.background = s.bg;
    var sl = $('#hxSl'); sl.innerHTML = '<div class="hx-slide">' + s.html + '</div>' + (s.last || stS.length === 1 ? '<div class="hx-foot"><button class="hx-b" type="button" id="hxShare">Save as image</button><button class="hx-b g" type="button" id="hxCl">Close</button></div>' : '');
    var bars = sc.querySelectorAll('.hx-bars i'); bars.forEach(function (b, i) { b.style.setProperty('--p', i < stI ? 1 : 0); });
    var sh = $('#hxShare'); if (sh) { sh.onclick = function () { var D = yearData(); drawShare({ tpl: 'aurora', head: 'My ' + D.Y, msg: D.n + ' transactions · busiest month ' + MF[D.mi] + (D.top ? ' · favourite asset ' + D.top : ''), sign: nm().split(' ')[0] || '' }, 'nordic-crypto-my-' + D.Y + '.png'); }; var cl = $('#hxCl'); if (cl) cl.onclick = closeStory; }
    cancelAnimationFrame(stEnd); bt0 = performance.now(); bPause = 0; var bar = bars[stI], idx = stI;
    (function f(t) { if (stI !== idx || !$('.hx-st')) return; if (bPause) { stEnd = requestAnimationFrame(f); return; } var p = Math.min(1, (performance.now() - bt0) / BAR); if (bar) bar.style.setProperty('--p', p); if (p >= 1) { if (idx < stS.length - 1) nextSlide(); return; } stEnd = requestAnimationFrame(f); })(0);
  }

  /* ---------- holiday card (canvas image) ---------- */
  var TPL = {
    aurora: { name: 'Aurora', a: '#0a1a33', b: '#145a6b', c: '#2fd39a', ink: '#ffffff', acc: '#c8ff4d' },
    ruby: { name: 'Ruby', a: '#3a0a14', b: '#a3262f', c: '#ff8a5a', ink: '#ffffff', acc: '#ffd166' },
    frost: { name: 'Frost', a: '#eaf4ff', b: '#bcd9f5', c: '#7fb2e8', ink: '#0f2a4a', acc: '#2f6fb8' },
    gold: { name: 'Gold', a: '#0b0b0f', b: '#2a2112', c: '#d6a21f', ink: '#fff6dc', acc: '#ffd166' }
  };
  function wrap(g, text, w) { var words = String(text).split(/\s+/), lines = [], cur = ''; words.forEach(function (x) { var t = cur ? cur + ' ' + x : x; if (g.measureText(t).width > w && cur) { lines.push(cur); cur = x; } else cur = t; }); if (cur) lines.push(cur); return lines; }
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function paint(cv, o, W, H) {
    var T = TPL[o.tpl] || TPL.aurora, g = cv.getContext('2d'), u = W / 1080; cv.width = W; cv.height = H;
    var bg = g.createLinearGradient(0, 0, W * .3, H); bg.addColorStop(0, T.a); bg.addColorStop(.6, T.b); bg.addColorStop(1, T.c); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    var glow = g.createRadialGradient(W * .5, H * .3, 0, W * .5, H * .3, W * .8); glow.addColorStop(0, 'rgba(255,255,255,.22)'); glow.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = glow; g.fillRect(0, 0, W, H);
    var seed = 7; function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
    for (var i = 0; i < 90; i++) { var r = (1 + rnd() * 3.4) * u; g.globalAlpha = .25 + rnd() * .6; g.fillStyle = o.tpl === 'frost' ? '#ffffff' : '#ffffff'; g.beginPath(); g.arc(rnd() * W, rnd() * H, r, 0, 6.283); g.fill(); } g.globalAlpha = 1;
    // tree
    var cx = W / 2, ty = H * .42, tw = 330 * u, layers = 4; g.save(); g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 40 * u; g.shadowOffsetY = 14 * u;
    for (var l = 0; l < layers; l++) { var top = ty - 210 * u + l * 120 * u, bw = tw * (.42 + l * .2), bh = 190 * u; g.fillStyle = l % 2 ? '#14804f' : '#0f6b43'; g.beginPath(); g.moveTo(cx, top); g.lineTo(cx + bw / 2, top + bh); g.lineTo(cx - bw / 2, top + bh); g.closePath(); g.fill(); }
    g.fillStyle = '#6b3f1d'; g.fillRect(cx - 24 * u, ty + 270 * u, 48 * u, 56 * u); g.restore();
    var bc = ['#ff5a5f', '#ffd166', '#6aa9ff', '#fff'], pts = [[-70, -40], [60, -10], [-30, 40], [-110, 90], [90, 100], [10, 150], [-60, 190], [120, 190], [-140, 200]];
    pts.forEach(function (p, i) { var px = cx + p[0] * u, py = ty + p[1] * u + 70 * u; var gr = g.createRadialGradient(px - 5 * u, py - 5 * u, 1, px, py, 18 * u); gr.addColorStop(0, '#fff'); gr.addColorStop(.35, bc[i % 4]); gr.addColorStop(1, 'rgba(0,0,0,.35)'); g.fillStyle = gr; g.beginPath(); g.arc(px, py, 16 * u, 0, 6.283); g.fill(); });
    g.fillStyle = '#ffd166'; g.beginPath(); for (var k = 0; k < 10; k++) { var rad = k % 2 ? 14 * u : 34 * u, ang = -1.5708 + k * .6283; g.lineTo(cx + Math.cos(ang) * rad, ty - 222 * u + Math.sin(ang) * rad); } g.closePath(); g.shadowColor = '#ffd166'; g.shadowBlur = 30 * u; g.fill(); g.shadowBlur = 0;
    // text
    g.textAlign = 'center'; g.fillStyle = T.ink; g.font = '800 ' + 96 * u + 'px Inter,system-ui,-apple-system,Segoe UI,Roboto,sans-serif';
    var hl = wrap(g, o.head || 'Happy holidays', W - 160 * u); hl.slice(0, 2).forEach(function (t, i) { g.fillText(t, cx, H * .68 + i * 104 * u); });
    var y0 = H * .68 + Math.min(2, hl.length) * 104 * u + 16 * u; g.font = '500 ' + 46 * u + 'px Inter,system-ui,-apple-system,Segoe UI,Roboto,sans-serif'; g.globalAlpha = .92;
    wrap(g, o.msg || '', W - 200 * u).slice(0, 4).forEach(function (t, i) { g.fillText(t, cx, y0 + i * 62 * u); }); g.globalAlpha = 1;
    if (o.sign) { g.font = '700 ' + 50 * u + 'px Inter,system-ui,-apple-system,Segoe UI,Roboto,sans-serif'; g.fillStyle = T.acc; g.fillText('— ' + o.sign, cx, H - 150 * u); }
    g.font = '600 ' + 30 * u + 'px Inter,system-ui,-apple-system,Segoe UI,Roboto,sans-serif'; g.fillStyle = T.ink; g.globalAlpha = .65; g.fillText('NORDIC CRYPTO', cx, H - 80 * u); g.globalAlpha = 1;
  }
  function drawShare(o, fname) {
    var cv = document.createElement('canvas'); paint(cv, o, 1080, 1350);
    cv.toBlob(function (blob) {
      if (!blob) { return; } var file; try { file = new File([blob], fname, { type: 'image/png' }); } catch (e) { file = null; }
      if (file && navigator.canShare && navigator.canShare({ files: [file] }) && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) { navigator.share({ files: [file], title: 'Nordic Crypto' }).catch(function () { }); return; }
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = fname; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500); chime();
    }, 'image/png');
  }
  function openCard() {
    var first = nm().split(' ')[0] || '', o = { tpl: 'aurora', head: 'Happy New Year!', msg: 'Wishing you health, calm and a great year ahead.', sign: first };
    var b = layer('<div class="hx-h"><div style="flex:1"><h2>💌 Holiday card</h2><small>Make a picture to send to someone you like</small></div><button class="hx-x" type="button" aria-label="Close">✕</button></div>' +
      '<canvas class="hx-prev" id="hxCv" role="img" aria-label="Card preview"></canvas><div class="hx-tpl" id="hxTp">' + Object.keys(TPL).map(function (k) { var T = TPL[k]; return '<button type="button" data-k="' + k + '" aria-label="' + T.name + '" class="' + (k === o.tpl ? 'on' : '') + '" style="background:linear-gradient(160deg,' + T.a + ',' + T.b + ' 60%,' + T.c + ')"></button>'; }).join('') + '</div>' +
      '<div class="hx-row"><div class="hx-f"><label for="hxH">Greeting</label><select id="hxH"><option>Happy New Year!</option><option>Merry Christmas!</option><option>Season’s greetings</option><option>Happy holidays</option></select></div><div class="hx-f"><label for="hxS">From</label><input id="hxS" maxlength="30" value="' + esc(first) + '" autocomplete="off"></div></div>' +
      '<div class="hx-f"><label for="hxM">Message</label><textarea id="hxM" rows="2" maxlength="110">' + esc(o.msg) + '</textarea></div><div class="hx-row"><button class="hx-b" type="button" id="hxDl">Save image</button><button class="hx-b g" type="button" id="hxBk">Back</button></div><div class="hx-note">The image is made on your device. Nothing is uploaded.</div>');
    var cv = $('#hxCv'), raf = 0; function draw() { cancelAnimationFrame(raf); raf = requestAnimationFrame(function () { var w = cv.clientWidth || 300, d = Math.min(devicePixelRatio || 1, 2); paint(cv, o, Math.round(w * d), Math.round(w * 1.25 * d)); }); }
    draw(); window.addEventListener('resize', draw, { passive: true });
    $('#hxTp').onclick = function (e) { var k = e.target.closest('button'); if (!k) return; o.tpl = k.getAttribute('data-k'); [].forEach.call(this.children, function (c) { c.classList.toggle('on', c === k); }); draw(); };
    $('#hxH').onchange = function () { o.head = this.value; draw(); }; o.head = $('#hxH').value; $('#hxS').oninput = function () { o.sign = this.value.trim(); draw(); }; $('#hxM').oninput = function () { o.msg = this.value; draw(); };
    $('#hxDl').onclick = function () { drawShare(o, 'nordic-crypto-card.png'); }; $('#hxBk').onclick = openHub; draw();
  }

  /* ---------- hub ---------- */
  var cdT = 0;
  function cdTxt() { var n = new Date(), t = new Date(nyYear(), 0, 1) - n, ok = t > 0; if (!ok) t = 0; var d = Math.floor(t / 864e5), h = Math.floor(t % 864e5 / 36e5), m = Math.floor(t % 36e5 / 6e4), s = Math.floor(t % 6e4 / 1e3); return [d, h, m, s]; }
  function openHub() {
    var real = new Date().getMonth() === 11 || (new Date().getMonth() === 0 && new Date().getDate() <= 6);
    var b = layer('<div class="hx-h"><div style="flex:1"><h2>🎄 Holiday</h2><small>' + (nm().split(' ')[0] ? 'Happy holidays, ' + esc(nm().split(' ')[0]) + '!' : 'Happy holidays!') + '</small></div><button class="hx-x" type="button" aria-label="Close">✕</button></div>' +
      '<div class="hx-cd" id="hxCd" aria-label="Time to New Year"></div>' +
      '<div class="hx-tiles"><button class="hx-tile" type="button" data-a="adv"><i>🎁</i><b>Advent calendar</b><small>' + advCount() + ' of 31 opened</small></button><button class="hx-tile" type="button" data-a="year"><i>📊</i><b>Your ' + yearData().Y + '</b><small>Your year in numbers</small></button><button class="hx-tile" type="button" data-a="card"><i>💌</i><b>Holiday card</b><small>Make and share a picture</small></button><button class="hx-tile" type="button" data-a="fw"><i>🎆</i><b>Fireworks</b><small>Watch a short show</small></button></div>' +
      '<div class="hx-sw"><label><span>Snow</span><input type="checkbox" id="hxSnow"' + (userOff() ? '' : ' checked') + '></label><label><span>Frosted card skin</span><input type="checkbox" id="hxSkin"' + (LS.get('nc_hol_skin') !== '0' ? ' checked' : '') + '></label><label><span>Soft sounds</span><input type="checkbox" id="hxSnd"' + (soundOn() ? ' checked' : '') + '></label></div>' +
      '<div class="hx-note">' + (real ? 'At midnight on New Year there is a surprise if the app is open.' : 'Everything here is just for fun. The calendar opens for real on 1 December.') + '</div>');
    function cd() { var c = cdTxt(), el = $('#hxCd'); if (!el) return; el.innerHTML = ['days', 'hours', 'min', 'sec'].map(function (l, i) { return '<div><b>' + (i ? String(c[i]).padStart(2, '0') : c[i]) + '</b><span>' + l + '</span></div>'; }).join(''); } cd(); cdT = setInterval(cd, 1000);
    b.querySelector('.hx-tiles').addEventListener('click', function (e) { var t = e.target.closest('.hx-tile'); if (!t) return; var a = t.getAttribute('data-a'); if (a === 'adv') openAdvent(); else if (a === 'year') openYear(); else if (a === 'card') openCard(); else if (a === 'fw') { closeLayer(); setTimeout(function () { fireworks(6500); }, 150); } });
    $('#hxSnow').onchange = function () { LS.set('nc_hol_off', this.checked ? '' : '1'); try { window.__holApi && window.__holApi.apply(); } catch (e) { } };
    $('#hxSkin').onchange = function () { LS.set('nc_hol_skin', this.checked ? '1' : '0'); skin(); };
    $('#hxSnd').onchange = function () { LS.set('nc_hol_snd', this.checked ? '1' : '0'); if (this.checked) chime(); };
  }
  function skin() { var on = !userOff() && !!window.__holApi && window.__holApi.active() && LS.get('nc_hol_skin') !== '0'; document.documentElement.classList.toggle('hol-skin', on); if (on) css(); }

  /* ---------- chat: emoji + holiday stickers, big-emoji bubbles, festive header ---------- */
  function isEmo(t) { try { return /^(?:\p{Extended_Pictographic}[️‍]*\s*){1,6}$/u.test(String(t).trim()); } catch (e) { return false; } }
  window.__hxIsEmo = isEmo;
  var CE = ['😊', '🙂', '😉', '😅', '🙏', '👍', '👌', '✅', '❤️', '🎉', '🤝', '👋'], ST = ['🎄', '🎁', '🥂', '🎆', '⛄', '❄️', '🦌', '🎅', '⭐', '🔔', '🍪', '🧣'];
  function chatCss() {
    if ($('#hxChatCss')) return; var s = document.createElement('style'); s.id = 'hxChatCss';
    s.textContent = '.chat-bubble.hx-big{font-size:42px!important;line-height:1.15!important;background:transparent!important;box-shadow:none!important;padding:2px 4px!important;border:0!important}' +
      '.agd-m.big{font-size:42px;line-height:1.15;background:transparent!important;padding:2px 6px}.agd-m.big small{font-size:10.5px}' +
      'html.hol .chat-header,html.hol .agd-ch{position:relative}html.hol .chat-header::after,html.hol .agd-ch::after{content:"";position:absolute;left:0;right:0;bottom:0;height:3px;background:linear-gradient(90deg,#ff5a5f,#ffd166,#6ee7a8,#6aa9ff,#ff5a5f);background-size:300% 100%;animation:hxRb 12s linear infinite;pointer-events:none}@keyframes hxRb{to{background-position:300% 0}}' +
      'html.hol .chat-agent-name::after{content:" 🎄"}html.hol #chatToggle{box-shadow:0 0 0 3px rgba(255,90,95,.35),0 0 0 6px rgba(110,231,168,.25),0 10px 30px rgba(0,0,0,.35)}' +
      '.chat-input-wrap{position:relative}.hx-ce{all:unset;box-sizing:border-box;cursor:pointer;flex:none;width:38px;height:38px;border-radius:50%;display:grid;place-items:center;font-size:19px;line-height:1;opacity:.85}.hx-ce:hover{opacity:1;background:rgba(128,128,128,.18)}.hx-ce:focus-visible{outline:2px solid #c8ff4d}' +
      '.hx-cp{position:absolute;left:8px;right:8px;bottom:calc(100% + 6px);z-index:20;padding:10px;border-radius:16px;background:#141c29;color:#eef3fa;border:1px solid rgba(255,255,255,.12);box-shadow:0 16px 40px rgba(0,0,0,.45);animation:hxZ .18s}html[data-theme="light"] .hx-cp{background:#fff;color:#0f172a;border-color:rgba(15,23,42,.12)}' +
      '.hx-cp small{display:block;margin:2px 4px 6px;font:700 10.5px/1 system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;opacity:.6}.hx-cp div{display:grid;grid-template-columns:repeat(6,1fr);gap:2px;margin-bottom:6px}.hx-cp div:last-child{margin-bottom:0}.hx-cp button{all:unset;cursor:pointer;text-align:center;padding:6px 0;border-radius:10px;font-size:22px;line-height:1.1}.hx-cp button:hover{background:rgba(128,128,128,.18)}.hx-cp div.st button{font-size:28px}@keyframes hxZ{from{transform:scale(.96);opacity:0}}';
    document.head.appendChild(s);
  }
  function chatTick() {
    if (!hasClientApp()) return; chatCss();
    var box = $('#chatMessages'); if (box && !box.__hx) { box.__hx = 1; var run = function () { [].forEach.call(box.querySelectorAll('.chat-bubble:not([data-hx])'), function (b) { b.setAttribute('data-hx', '1'); if (isEmo(b.textContent)) b.classList.add('hx-big'); }); }; new MutationObserver(run).observe(box, { childList: true }); run(); }
    var w = $('.chat-input-wrap'), inp = $('#chatInput'); if (!w || !inp || $('#hxCe')) return;
    var b = document.createElement('button'); b.type = 'button'; b.id = 'hxCe'; b.className = 'hx-ce'; b.setAttribute('aria-label', 'Emoji and stickers'); b.setAttribute('aria-expanded', 'false'); b.textContent = '😊'; w.insertBefore(b, inp);
    var pn = null; function close() { if (pn) { pn.remove(); pn = null; b.setAttribute('aria-expanded', 'false'); } }
    b.onclick = function (e) {
      e.stopPropagation(); if (pn) { close(); return; } pn = document.createElement('div'); pn.className = 'hx-cp'; pn.setAttribute('role', 'dialog'); pn.setAttribute('aria-label', 'Emoji and stickers');
      pn.innerHTML = '<small>Emoji</small><div>' + CE.map(function (e) { return '<button type="button" data-e="' + e + '">' + e + '</button>'; }).join('') + '</div><small>Stickers — sent at once</small><div class="st">' + ST.map(function (e) { return '<button type="button" data-s="' + e + '">' + e + '</button>'; }).join('') + '</div>';
      w.appendChild(pn); b.setAttribute('aria-expanded', 'true');
      pn.onclick = function (ev) { var t = ev.target.closest('button'); if (!t) return; var em = t.getAttribute('data-e'), sk = t.getAttribute('data-s'); if (em) { var a = inp.selectionStart == null ? inp.value.length : inp.selectionStart; inp.value = inp.value.slice(0, a) + em + inp.value.slice(inp.selectionEnd == null ? a : inp.selectionEnd); inp.focus(); try { inp.selectionStart = inp.selectionEnd = a + em.length; } catch (e) { } } else if (sk) { inp.value = sk; close(); try { if (typeof sendChatMsg === 'function') sendChatMsg(); } catch (e) { } pop(); } };
    };
    document.addEventListener('click', function (e) { if (pn && !e.target.closest('.hx-cp,#hxCe')) close(); }); document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && pn) close(); });
  }
  setInterval(function () { if (!document.hidden) chatTick(); }, 1500);

  window.__holFx = { open: function () { if (hasClientApp()) { openHub(); return true; } return false; }, skin: skin, fireworks: fireworks, year: openYear, advent: openAdvent, card: openCard, ny: scheduleNY };
  setInterval(function () { if (window.__holApi) { skin(); chatCss(); } }, 2500);
  if (document.readyState !== 'loading') scheduleNY(); else document.addEventListener('DOMContentLoaded', scheduleNY);
})();
