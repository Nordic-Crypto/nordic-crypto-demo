/* Holiday theme v1 — light snow, garland, greeting and New-Year countdown for clients, staff and the agent desk.
   Built to stay out of the way: one tiny canvas, ~30 fps cap, pauses in background tabs, adapts or switches itself off on slow devices,
   respects "reduce motion", and the user can turn it off with one click. Owner controls it in Admin → System. */
(function () {
  'use strict';
  if (window.__holPro) return; window.__holPro = 1;
  var BASE = window.WORKER_LOGIN_URL || window.WORKER_URL || 'https://nordic-deposit-checker.otis-790.workers.dev';
  var CFG = { mode: 'auto', snow: true, garland: true, greeting: '', clients: true, staff: true };
  var LS = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { } } };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  function tok() { return typeof window.getSessionToken === 'function' ? window.getSessionToken() : LS.get('session_token'); }
  function post(a, b) { return fetch(BASE + '?action=' + a, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ token: tok() }, b || {})) }).then(function (r) { return r.json(); }).catch(function () { return { ok: false }; }); }

  /* ---------- when is it on ---------- */
  function inSeason(d) { var m = d.getMonth(), day = d.getDate(); return m === 11 || (m === 0 && day <= 6); }
  function active() { if (CFG.mode === 'off') return false; return CFG.mode === 'on' || inSeason(new Date()); }
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
      '#holGar{position:fixed;left:0;right:0;top:0;height:20px;pointer-events:none;z-index:100046;overflow:hidden;opacity:.95}' +
      '#holGar svg{display:block;width:100%;height:20px}' +
      '#holGar .b{animation:holTw 2.4s ease-in-out infinite;transform-box:fill-box;transform-origin:center}#holGar .b.b1{animation-delay:.6s}#holGar .b.b2{animation-delay:1.2s}#holGar .b.b3{animation-delay:1.8s}' +
      '@keyframes holTw{0%,100%{opacity:1}50%{opacity:.35}}' +
      '#holChip{position:fixed;left:14px;bottom:14px;z-index:100047;display:flex;align-items:center;gap:8px;padding:7px 12px;border-radius:99px;font:600 12px/1 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#e9eef6;background:rgba(17,24,35,.82);border:1px solid rgba(255,255,255,.12);backdrop-filter:blur(8px);cursor:pointer;opacity:.85;transition:opacity .2s}' +
      '#holChip:hover{opacity:1}#holChip i{font-style:normal}' +
      'html[data-theme="light"] #holChip{color:#0f172a;background:rgba(255,255,255,.9);border-color:rgba(15,23,42,.12)}' +
      '.hol-count{display:inline-flex;align-items:center;gap:6px;padding:6px 11px;border-radius:99px;font:600 12px/1 inherit;color:#c8ff4d;background:rgba(200,255,77,.1);border:1px solid rgba(200,255,77,.25);white-space:nowrap}' +
      'html[data-theme="light"] .hol-count{color:#2f6a00;background:rgba(80,140,0,.1);border-color:rgba(80,140,0,.3)}' +
      '#holToast{position:fixed;left:50%;top:34px;transform:translate(-50%,-14px);z-index:100100;max-width:min(92vw,440px);padding:12px 18px;border-radius:16px;font:600 14px/1.35 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#0f1a05;background:linear-gradient(135deg,#d6ff6e,#9be34a);box-shadow:0 12px 40px rgba(0,0,0,.35);opacity:0;transition:opacity .35s,transform .35s;text-align:center}' +
      '#holToast.on{opacity:1;transform:translate(-50%,0)}' +
      '.hol-card{border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:16px 18px;margin:0 0 18px;background:rgba(255,255,255,.03)}' +
      'html[data-theme="light"] .hol-card{border-color:rgba(15,23,42,.12);background:#fff}' +
      '.hol-card h3{margin:0 0 4px;font-size:15px}.hol-card p{margin:0 0 12px;font-size:12px;opacity:.7}' +
      '.hol-row{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:8px 0}.hol-row label{display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer}' +
      '.hol-seg{display:inline-flex;border:1px solid rgba(128,128,128,.3);border-radius:10px;overflow:hidden}.hol-seg button{all:unset;cursor:pointer;padding:7px 14px;font-size:12px;font-weight:600}.hol-seg button.on{background:#c8ff4d;color:#101808}' +
      '.hol-card input[type=text]{width:100%;max-width:420px;padding:8px 10px;border-radius:9px;border:1px solid rgba(128,128,128,.35);background:transparent;color:inherit;font:inherit;font-size:13px}' +
      '.hol-save{margin-top:8px;border:0;border-radius:10px;padding:8px 16px;font-weight:700;font-size:13px;background:#c8ff4d;color:#101808;cursor:pointer}';
    document.head.appendChild(s);
  }

  /* ---------- snow (adaptive) ---------- */
  var cv, cx, flakes = [], raf = 0, last = 0, W = 0, H = 0, sprites = [], slow = 0, frames = 0, acc = 0, lightTheme = false, themeAt = 0, dpr = 1;
  function sprite(r, a, col) { var c = document.createElement('canvas'), n = Math.ceil(r * 2 + 2); c.width = c.height = n * dpr; var g = c.getContext('2d'); g.scale(dpr, dpr); var gr = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, r); gr.addColorStop(0, 'rgba(' + col + ',' + a + ')'); gr.addColorStop(1, 'rgba(' + col + ',0)'); g.fillStyle = gr; g.beginPath(); g.arc(n / 2, n / 2, r, 0, 6.2832); g.fill(); c._n = n; return c; }
  function buildSprites() { var col = lightTheme ? '120,160,215' : '255,255,255'; sprites = [sprite(2.4, lightTheme ? .95 : .9, col), sprite(3.4, lightTheme ? .9 : .85, col), sprite(5, lightTheme ? .8 : .7, col)]; }
  function resize() { dpr = Math.min(window.devicePixelRatio || 1, 1.5); W = window.innerWidth; H = window.innerHeight; if (cv) { cv.width = W * dpr; cv.height = H * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0); } }
  function seedFlakes(n) { flakes = []; for (var i = 0; i < n; i++) flakes.push({ x: Math.random() * W, y: Math.random() * H, v: 14 + Math.random() * 26, s: Math.random() * 3 | 0, p: Math.random() * 6.28, w: .4 + Math.random() * .8 }); }
  function startSnow() {
    if (cv || reduced() || !CFG.snow) return; cv = document.createElement('canvas'); cv.id = 'holSnow'; cv.setAttribute('aria-hidden', 'true'); document.body.appendChild(cv); cx = cv.getContext('2d');
    resize(); lightTheme = document.documentElement.getAttribute('data-theme') === 'light'; buildSprites();
    var n = W < 700 ? 22 : W < 1200 ? 34 : 46; seedFlakes(n); last = 0; slow = 0; frames = 0; acc = 0; raf = requestAnimationFrame(loop);
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
      var f = flakes[i]; f.y += f.v * s; f.p += s * f.w; f.x += Math.sin(f.p) * 14 * s; if (f.y > H + 8) { f.y = -8; f.x = Math.random() * W; } if (f.x < -8) f.x = W + 8; else if (f.x > W + 8) f.x = -8;
      var sp = sprites[f.s]; cx.drawImage(sp, f.x - sp._n / 2, f.y - sp._n / 2, sp._n, sp._n);
    }
  }
  document.addEventListener('visibilitychange', function () { last = 0; });

  /* ---------- garland ---------- */
  function startGarland() {
    if ($('#holGar') || !CFG.garland) return; var d = document.createElement('div'); d.id = 'holGar'; d.setAttribute('aria-hidden', 'true');
    var cols = ['#ff5a5f', '#ffd166', '#6ee7a8', '#6aa9ff'], b = '', w = 1600, step = 40;
    for (var x = 10, i = 0; x < w; x += step, i++) { var y = 7 + Math.sin(x / step * Math.PI) * 4; b += '<circle class="b b' + (i % 4) + '" cx="' + x + '" cy="' + (y + 6) + '" r="3.4" fill="' + cols[i % 4] + '"/>'; }
    var wire = 'M0 6 '; for (var x2 = 0; x2 <= w; x2 += step) wire += 'Q' + (x2 + step / 2) + ' ' + 16 + ' ' + (x2 + step) + ' 6 ';
    d.innerHTML = '<svg viewBox="0 0 ' + w + ' 20" preserveAspectRatio="xMidYMin slice"><path d="' + wire + '" fill="none" stroke="rgba(120,120,120,.55)" stroke-width="1"/>' + b + '</svg>';
    document.body.appendChild(d);
  }

  /* ---------- greeting, countdown chip ---------- */
  function greet() {
    if (isStaffView()) return; var key = 'nc_hol_greet', today = new Date().toDateString(); if (LS.get(key) === today) return;
    var nm = (LS.get('user_name') || '').split(' ')[0], n = daysToNY();
    var msg = CFG.greeting || ((new Date().getMonth() === 0 ? 'Happy New Year' : 'Happy holidays') + (nm ? ', ' + nm : '') + '! 🎄' + (n > 0 && n < 40 ? ' New Year in ' + n + (n === 1 ? ' day.' : ' days.') : ''));
    var t = document.createElement('div'); t.id = 'holToast'; t.textContent = msg; document.body.appendChild(t); LS.set(key, today);
    setTimeout(function () { t.classList.add('on'); }, 400); setTimeout(function () { t.classList.remove('on'); }, 5200); setTimeout(function () { t.remove(); }, 5800);
  }
  function chip() {
    var c = $('#holChip'); if (!c) { c = document.createElement('button'); c.id = 'holChip'; c.type = 'button'; c.title = 'Turn the holiday effects on or off'; document.body.appendChild(c); c.onclick = function () { LS.set('nc_hol_off', userOff() ? '' : '1'); apply(); }; }
    c.innerHTML = userOff() ? '<i>❄</i> Holiday mode off' : '<i>❄</i> Snow on';
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
    document.documentElement.classList.toggle('hol', !!on);
    if (!(active() && allowedHere())) { stopSnow(); var g = $('#holGar'); if (g) g.remove(); var c = $('#holChip'); if (c) c.remove(); var k = $('#holCount'); if (k) k.remove(); return; }
    css(); chip();
    if (userOff()) { stopSnow(); var g2 = $('#holGar'); if (g2) g2.remove(); countdown(); return; }
    if (LS.get('nc_hol_auto_off') !== '1') startSnow(); startGarland(); greet(); countdown();
  }

  /* ---------- owner card (Admin → System) ---------- */
  function ownerCard() {
    var nav = $('#adminPanel .admin-sidebar .admin-nav-item[data-tab="team"]'); if (!nav) return;
    var sec = $('#adminPanel [data-section="system"]'); if (!sec || !sec.getClientRects().length || $('#holAdmin')) return; css();
    var c = document.createElement('div'); c.id = 'holAdmin'; c.className = 'hol-card';
    var cur = Object.assign({}, CFG);
    function opt(k, l) { return '<label><input type="checkbox" data-k="' + k + '"' + (cur[k] !== false ? ' checked' : '') + '> ' + l + '</label>'; }
    c.innerHTML = '<h3>🎄 Holiday theme</h3><p>Soft snow, a garland and a New-Year countdown. Light on the device and switched off automatically on slow ones.</p>' +
      '<div class="hol-row"><div class="hol-seg" id="holMode"><button type="button" data-m="auto">Auto (Dec 1 – Jan 6)</button><button type="button" data-m="on">Always on</button><button type="button" data-m="off">Off</button></div></div>' +
      '<div class="hol-row">' + opt('snow', 'Snow') + opt('garland', 'Garland') + opt('clients', 'Show to clients') + opt('staff', 'Show in admin &amp; agent desk') + '</div>' +
      '<div class="hol-row"><input type="text" id="holGreet" maxlength="90" placeholder="Custom greeting for clients (optional)" value="' + (cur.greeting || '').replace(/"/g, '&quot;') + '"></div><button class="hol-save" type="button">Save</button>';
    sec.insertBefore(c, sec.firstChild);
    var segs = c.querySelectorAll('#holMode button'); function mark() { [].forEach.call(segs, function (b) { b.classList.toggle('on', b.getAttribute('data-m') === cur.mode); }); } mark();
    [].forEach.call(segs, function (b) { b.onclick = function () { cur.mode = b.getAttribute('data-m'); mark(); }; });
    c.querySelector('.hol-save').onclick = function () {
      [].forEach.call(c.querySelectorAll('input[data-k]'), function (i) { cur[i.getAttribute('data-k')] = i.checked; }); cur.greeting = c.querySelector('#holGreet').value;
      post('setHoliday', { config: cur }).then(function (r) { var b = c.querySelector('.hol-save'); if (r && r.ok) { CFG = r.config; LS.set('nc_hol_cfg', JSON.stringify({ t: Date.now(), c: CFG })); LS.set('nc_hol_auto_off', ''); apply(); b.textContent = 'Saved ✓'; } else b.textContent = 'Could not save'; setTimeout(function () { b.textContent = 'Save'; }, 1800); });
    };
  }

  /* ---------- boot ---------- */
  function boot() {
    try { var c = JSON.parse(LS.get('nc_hol_cfg') || 'null'); if (c && c.c) CFG = c.c; } catch (e) { }
    apply();
    var fresh; try { fresh = JSON.parse(LS.get('nc_hol_cfg') || 'null'); } catch (e) { }
    if (!fresh || Date.now() - fresh.t > 10 * 60 * 1000) fetch(BASE + '?action=holidayConfig', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }).then(function (r) { return r.json(); }).then(function (r) { if (r && r.ok && r.config) { CFG = r.config; LS.set('nc_hol_cfg', JSON.stringify({ t: Date.now(), c: CFG })); apply(); } }).catch(function () { });
    setInterval(function () { ownerCard(); if (active() && allowedHere() && !userOff()) countdown(); if (!$('#holGar') && active() && allowedHere() && !userOff() && CFG.garland) startGarland(); }, 1500);
  }
  if (document.body) boot(); else document.addEventListener('DOMContentLoaded', boot);
})();
