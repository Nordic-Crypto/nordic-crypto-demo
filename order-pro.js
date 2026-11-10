/* NordicCrypto order-pro.js v1
   1) physical card order: full-screen celebration (card flies in, check pops, tracking ID) -> then the live tracking page
   2) clients without a card get an instant "Create virtual card" (Visa / Mastercard) with the same celebration
   Nothing here touches money; it uses the existing createVirtualCard / saveToServer / addNotification functions. */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function S() { return window.st || {}; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function reduced() { try { return matchMedia('(prefers-reduced-motion:reduce)').matches; } catch (e) { return false; } }
  function lsGet(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }
  function toast(m, w) { try { if (typeof window.toast === 'function') window.toast(m, w); } catch (e) {} }

  var CSS = '.op-ov{position:fixed;inset:0;z-index:99990;display:flex;align-items:center;justify-content:center;padding:20px;background:radial-gradient(ellipse at 50% 30%,rgba(120,100,255,.22),transparent 60%),rgba(6,8,14,.92);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);opacity:0;transition:opacity .35s}.op-ov.on{opacity:1}' +
    '.op-box{width:min(440px,100%);text-align:center;color:#fff;position:relative}' +
    '.op-card{position:relative;width:min(340px,86vw);aspect-ratio:1.586;margin:0 auto 28px;border-radius:20px;padding:20px 22px;text-align:left;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden;background:linear-gradient(135deg,#3a4152,#1b1f2b 55%,#4a5168);box-shadow:0 30px 70px rgba(0,0,0,.55),0 0 0 1px rgba(255,255,255,.12) inset;transform:translateY(120px) rotateX(40deg) rotateZ(-8deg) scale(.6);opacity:0}' +
    '.op-ov.on .op-card{animation:opFly 1.1s cubic-bezier(.2,.9,.25,1.05) .1s forwards}' +
    '.op-card.virt{background:linear-gradient(135deg,#5b3df0,#1b1f2b 60%,#00c2a8)}' +
    '.op-card:after{content:"";position:absolute;top:-30%;bottom:-30%;width:40%;left:-60%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.35),transparent);transform:skewX(-20deg)}' +
    '.op-ov.on .op-card:after{animation:opShine 1.4s ease .9s forwards}' +
    '.op-card b{font-size:.78rem;letter-spacing:.28em}.op-card .n{font:600 1.05rem/1 ui-monospace,Menlo,monospace;letter-spacing:.14em;opacity:.92}.op-card .r{display:flex;justify-content:space-between;font-size:.72rem;letter-spacing:.1em;opacity:.8;text-transform:uppercase}' +
    '.op-chip{width:42px;height:30px;border-radius:7px;background:linear-gradient(135deg,#f3d27a,#b8892f);margin-bottom:6px}' +
    '.op-ck{width:64px;height:64px;margin:0 auto 14px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,#c8ff4d,#5cffb1);color:#0b0f05;transform:scale(0);box-shadow:0 0 0 0 rgba(200,255,77,.5)}' +
    '.op-ov.on .op-ck{animation:opPop .6s cubic-bezier(.2,1.4,.4,1) 1.15s forwards,opRing 1.6s ease-out 1.6s 2}.op-ck svg{width:32px;height:32px}.op-ck path{stroke-dasharray:30;stroke-dashoffset:30}.op-ov.on .op-ck path{animation:opDraw .5s ease 1.5s forwards}' +
    '.op-t{font-size:1.7rem;font-weight:800;letter-spacing:-.02em;margin-bottom:6px;opacity:0;transform:translateY(10px)}.op-s{font-size:.95rem;color:#aab3c5;line-height:1.5;margin-bottom:16px;opacity:0;transform:translateY(10px)}' +
    '.op-id{display:inline-flex;align-items:center;gap:10px;padding:10px 14px;border-radius:14px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14);margin-bottom:18px;opacity:0;transform:translateY(10px)}.op-id small{color:#8e98ad;font-size:.7rem;text-transform:uppercase;letter-spacing:.08em}.op-id code{font:700 .95rem ui-monospace,Menlo,monospace;color:#c8ff4d}.op-id button{background:none;border:0;color:#aab3c5;cursor:pointer;font-size:.78rem;text-decoration:underline;padding:0}' +
    '.op-steps{display:flex;justify-content:center;gap:6px;align-items:center;margin:0 auto 20px;font-size:.72rem;color:#8e98ad;opacity:0}.op-steps i{width:26px;height:3px;border-radius:2px;background:rgba(255,255,255,.15)}.op-steps i.a{background:#c8ff4d}.op-steps b{color:#c8ff4d;font-weight:700}' +
    '.op-go{display:block;width:100%;padding:15px;border:0;border-radius:14px;font:800 .98rem inherit;cursor:pointer;background:#c8ff4d;color:#0b0f05;box-shadow:0 10px 30px rgba(200,255,77,.28);opacity:0;transform:translateY(10px)}.op-x{margin-top:12px;background:none;border:0;color:#8e98ad;font-size:.82rem;cursor:pointer}' +
    '.op-ov.on .op-t{animation:opUp .5s ease 1.5s forwards}.op-ov.on .op-s{animation:opUp .5s ease 1.65s forwards}.op-ov.on .op-id{animation:opUp .5s ease 1.8s forwards}.op-ov.on .op-steps{animation:opUp .5s ease 1.9s forwards}.op-ov.on .op-go{animation:opUp .5s ease 2s forwards}' +
    '.op-cf{position:absolute;left:50%;top:38%;width:8px;height:14px;border-radius:2px;opacity:0;pointer-events:none}.op-ov.on .op-cf{animation:opCf 1.9s cubic-bezier(.15,.8,.3,1) 1.2s forwards}' +
    '.op-pick{display:flex;gap:10px;justify-content:center;margin:0 0 18px}.op-pick button{flex:1;padding:12px;border-radius:14px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.05);color:#fff;font-weight:700;cursor:pointer}.op-pick button.on{border-color:#c8ff4d;background:rgba(200,255,77,.12);color:#c8ff4d}' +
    '@keyframes opFly{to{transform:none;opacity:1}}@keyframes opShine{to{left:140%}}@keyframes opPop{to{transform:scale(1)}}@keyframes opRing{0%{box-shadow:0 0 0 0 rgba(200,255,77,.5)}100%{box-shadow:0 0 0 30px rgba(200,255,77,0)}}@keyframes opDraw{to{stroke-dashoffset:0}}@keyframes opUp{to{opacity:1;transform:none}}' +
    '@keyframes opCf{0%{opacity:1;transform:translate(0,0) rotate(0)}100%{opacity:0;transform:translate(var(--x),var(--y)) rotate(var(--r))}}' +
    '@media(prefers-reduced-motion:reduce){.op-card,.op-ck,.op-t,.op-s,.op-id,.op-steps,.op-go{animation:none!important;opacity:1!important;transform:none!important}.op-ck path{stroke-dashoffset:0!important}.op-cf{display:none}}' +
    '#orderForm.hidden{display:none!important}#orderTrack:not(.hidden){animation:opTrackIn .5s ease both}@keyframes opTrackIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}' +
    '#stepsWrap .step.active{animation:opPulse 2s ease-in-out infinite}@keyframes opPulse{50%{filter:brightness(1.25)}}';
  function addCss() { if ($('opCss')) return; var s = document.createElement('style'); s.id = 'opCss'; s.textContent = CSS; document.head.appendChild(s); }

  function confetti() {
    if (reduced()) return ''; var h = '', cols = ['#c8ff4d', '#5cffb1', '#a78bfa', '#ffcd00', '#ffffff', '#38bdf8'];
    for (var i = 0; i < 30; i++) { var a = Math.random() * Math.PI * 2, d = 140 + Math.random() * 190; h += '<i class="op-cf" style="background:' + cols[i % cols.length] + ';--x:' + Math.round(Math.cos(a) * d) + 'px;--y:' + Math.round(Math.sin(a) * d - 60) + 'px;--r:' + Math.round(Math.random() * 720 - 360) + 'deg;animation-delay:' + (1.2 + Math.random() * .25).toFixed(2) + 's"></i>'; }
    return h;
  }
  function show(o) {
    addCss(); var old = document.querySelector('.op-ov'); if (old) old.remove();
    var ov = document.createElement('div'); ov.className = 'op-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
    ov.innerHTML = '<div class="op-box">' + confetti() +
      '<div class="op-card' + (o.virt ? ' virt' : '') + '"><div><div class="op-chip"></div><b>NORDIC CRYPTO</b></div><div class="n">' + esc(o.num || '••••  ••••  ••••  ••••') + '</div><div class="r"><span>' + esc(o.name || '') + '</span><span>' + esc(o.kind) + '</span></div></div>' +
      '<div class="op-ck"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>' +
      '<div class="op-t">' + esc(o.title) + '</div><div class="op-s">' + esc(o.sub) + '</div>' +
      (o.id ? '<div class="op-id"><small>Tracking ID</small><code>' + esc(o.id) + '</code><button type="button" data-cp>Copy</button></div>' : '') +
      (o.steps ? '<div class="op-steps"><b>Processing</b><i class="a"></i><i></i><i></i><span>Shipped</span><i></i><span>Delivered</span></div>' : '<div class="op-steps"></div>') +
      '<button type="button" class="op-go">' + esc(o.cta) + '</button><button type="button" class="op-x">Close</button></div>';
    document.body.appendChild(ov); requestAnimationFrame(function () { requestAnimationFrame(function () { ov.classList.add('on'); }); });
    function close(go) { ov.classList.remove('on'); setTimeout(function () { ov.remove(); }, 350); if (go && o.after) o.after(); }
    ov.addEventListener('click', function (e) {
      if (e.target.closest('[data-cp]')) { try { navigator.clipboard.writeText(o.id); toast('Tracking ID copied'); } catch (x) {} return; }
      if (e.target.closest('.op-go')) close(true); else if (e.target.closest('.op-x') || e.target === ov) close(false);
    });
    ov.tabIndex = -1; try { ov.focus(); } catch (e) {}
    document.addEventListener('keydown', function k(e) { if (e.key === 'Escape') { document.removeEventListener('keydown', k); close(false); } });
  }

  /* make sure the server really has the change; if not, save again (up to 3 times), otherwise tell the client */
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  window.ncEnsureSaved = function (ok) {
    var tries = 0, base = (typeof WORKER_LOGIN_URL !== 'undefined') ? WORKER_LOGIN_URL : '', tok = '';
    try { tok = (typeof getSessionToken === 'function') ? getSessionToken() : lsGet('session_token'); } catch (e) {}
    if (!base || !tok) return Promise.resolve(true);
    function go() {
      return Promise.resolve(window.__ncSavePromise).then(function () { return wait(400); }).then(function () {
        return fetch(base + '?action=getUserState', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: tok }) });
      }).then(function (r) { return r.json(); }).then(function (d) {
        if (!d || d.ok === false || ok(d)) return true;
        if (++tries < 3) { if (typeof window.saveToServer === 'function') window.saveToServer(); return wait(1200).then(go); }
        toast('We could not save this change. Please refresh the page and try again.', true); return false;
      });
    }
    return go().catch(function () { return true; });
  };

  /* ── 1. physical card order ── */
  window.ncOrderFx = function (order) {
    if (!order) return;
    show({ kind: order.type && /gold/i.test(order.type) ? 'GOLD' : 'METAL', name: String(order.name || '').toUpperCase(), title: 'Order placed', sub: 'Your card is being prepared and will be shipped to ' + (order.dest || 'your address') + '. You can follow every step here.', id: order.id, steps: true, cta: 'Track my order', after: function () { try { document.getElementById('order').scrollIntoView({ behavior: 'smooth' }); } catch (e) {} } });
  };

  /* ── 2. instant virtual card for clients without one ── */
  function hasCard() { var c = S().card; return !!(c && c.num); }
  function fullName() { var n = (lsGet('user_name') || '').trim(); if (!n || n === 'User') { var i = S().user && S().user.name; n = i || ''; } return n.toUpperCase() || 'CARD HOLDER'; }
  function pick() {
    addCss(); var type = 'Visa';
    var ov = document.createElement('div'); ov.className = 'op-ov';
    ov.innerHTML = '<div class="op-box"><div class="op-card virt" style="opacity:1;transform:none;animation:none"><div><div class="op-chip"></div><b>NORDIC CRYPTO</b></div><div class="n">••••  ••••  ••••  ••••</div><div class="r"><span>' + esc(fullName()) + '</span><span id="opT">VISA</span></div></div>' +
      '<div class="op-t" style="opacity:1;transform:none">Create your virtual card</div><div class="op-s" style="opacity:1;transform:none">Ready in a second. Use it online, add it to your wallet, freeze it any time.</div>' +
      '<div class="op-pick"><button type="button" class="on" data-t="Visa">Visa</button><button type="button" data-t="Mastercard">Mastercard</button></div>' +
      '<button type="button" class="op-go" style="opacity:1;transform:none">Create card</button><button type="button" class="op-x">Not now</button></div>';
    document.body.appendChild(ov); requestAnimationFrame(function () { ov.classList.add('on'); });
    ov.addEventListener('click', function (e) {
      var t = e.target.closest('[data-t]'); if (t) { type = t.getAttribute('data-t'); ov.querySelectorAll('[data-t]').forEach(function (b) { b.classList.toggle('on', b === t); }); ov.querySelector('#opT').textContent = type.toUpperCase(); return; }
      if (e.target.closest('.op-x') || e.target === ov) { ov.remove(); return; }
      if (e.target.closest('.op-go')) { ov.remove(); issue(type); }
    });
  }
  function issue(type) {
    if (hasCard()) return;
    try {
      var cur = S().currency || 'USD'; if (['USD', 'EUR', 'SEK', 'NOK', 'DKK', 'GBP'].indexOf(cur) < 0) cur = 'USD';
      window.createVirtualCard(fullName(), type, cur);
      var v = S().verification, c = v && v.personalInfo && v.personalInfo.country; if (c && S().card && /^[A-Za-z]{2}$/.test(c)) S().card.country = c.toUpperCase();
      if (typeof window.saveToServer === 'function') window.saveToServer();
      if (typeof window.addNotification === 'function') window.addNotification('Your virtual ' + (type === 'Visa' ? 'Visa card' : type) + ' is ready', '💳');
      window.ncEnsureSaved(function (d) { return !!(d.card && d.card.num); });
    } catch (e) { toast('Could not create the card. Please try again.', true); return; }
    var n = S().card.num || '', masked = '••••  ••••  ••••  ' + n.slice(-4);
    show({ virt: true, kind: type.toUpperCase(), name: S().card.name, num: masked, title: 'Your card is ready', sub: 'Your virtual ' + (type === 'Visa' ? 'Visa card' : type) + ' is active. Open your dashboard to see the details, freeze it or set limits.', cta: 'See my card', after: function () { try { if (typeof window.renderCard === 'function') window.renderCard(); var m = document.querySelector('.mi[data-p="dash"]'); if (m) m.click(); } catch (e) {} } });
    try { if (typeof window.renderCard === 'function') window.renderCard(); } catch (e) {}
  }
  window.ncIssueCard = pick;
  document.addEventListener('click', function (e) {
    if (hasCard() || !e.target.closest) return;
    var b = e.target.closest('#cpNoCard button, #bdCardRest [data-a="nav"][data-v="order"]');
    if (b) { e.preventDefault(); e.stopPropagation(); pick(); }
  }, true);
})();
