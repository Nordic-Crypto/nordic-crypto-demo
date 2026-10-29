/* NC NEWS v1 — owner-only "Announcements": write an update, preview it, send a test to yourself, send to every client by e-mail. Needs worker 6.2 (sendAnnouncement / newsLog). */
(function () {
  'use strict';
  if (window.__newsLoaded) return; window.__newsLoaded = true;
  var BASE = window.WORKER_LOGIN_URL || window.WORKER_URL || 'https://nordic-deposit-checker.otis-790.workers.dev';
  var OLD = 'The Cloudflare Worker is not updated yet. Paste the newest worker.js into Cloudflare (Edit code) and press Deploy.', TAB = 'news', armed = false, armTimer = null;
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function token() { return typeof window.getSessionToken === 'function' ? window.getSessionToken() : localStorage.getItem('session_token'); }
  function post(action, body) {
    return fetch(BASE + '?action=' + action, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ token: token() }, body || {})) })
      .then(function (r) { return r.json(); }).catch(function () { return { ok: false, error: 'Connection error' }; });
  }
  var TPL = {
    feature: { subject: 'New in NordicCrypto: Rewards & daily bonus', title: 'Rewards are now live', body: 'We have added a new Rewards programme to your dashboard. The more you use your account, the more you unlock.\n\nOpen the Rewards bar on your dashboard to see your level and claim your daily bonus.', bullets: 'Daily bonus you can claim every day\nLevels that unlock extra benefits\nProgress shown right on your dashboard', cta: 'See my rewards' },
    mobile: { subject: 'A cleaner, faster NordicCrypto on your phone', title: 'Redesigned for mobile', body: 'We have rebuilt the mobile experience so everything fits and reads clearly, in your own language and currency format.', bullets: 'New bottom navigation\nAmounts formatted for your country\nBetter card view on small screens', cta: 'Open NordicCrypto' },
    security: { subject: 'Your security matters: new alerts are on', title: 'New security notifications', body: 'From now on we e-mail you when your password changes or when someone signs in from a new device, so you always stay in control.\n\nIf you ever see something you do not recognise, change your password and contact support.', bullets: 'Alerts for new device sign-ins\nPassword reset with a one-time code\nPush notifications for deposits and withdrawals', cta: 'Review my security' },
    maint: { subject: 'Scheduled maintenance completed', title: 'Everything is back to normal', body: 'Our short maintenance window is finished and all services are running again. Thank you for your patience.', bullets: '', cta: 'Open NordicCrypto' }
  };
  function css() {
    if ($('ncNewsCss')) return; var s = document.createElement('style'); s.id = 'ncNewsCss';
    s.textContent = '#ncNews{max-width:980px}#ncNews h2{margin:0 0 4px;font-size:22px}#ncNews .sub{color:#8b95a5;font-size:13px;margin-bottom:16px}' +
      '#ncNews .grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:18px}@media(max-width:900px){#ncNews .grid{grid-template-columns:1fr}}' +
      '#ncNews .box{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:16px}' +
      '#ncNews label{display:block;font-size:12px;color:#8b95a5;margin:12px 0 5px}#ncNews label:first-child{margin-top:0}' +
      '#ncNews input,#ncNews textarea,#ncNews select{width:100%;box-sizing:border-box;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.25);color:inherit;font-size:14px;font-family:inherit}' +
      '#ncNews textarea{min-height:110px;resize:vertical}#ncNews .row{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}' +
      '#ncNews .chips{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px}#ncNews .chip{padding:6px 11px;border-radius:99px;border:1px solid rgba(255,255,255,.14);background:transparent;color:inherit;font-size:12px;cursor:pointer}#ncNews .chip:hover{border-color:#c6ff3d;color:#c6ff3d}' +
      '#ncNews iframe{width:100%;height:560px;border:0;border-radius:12px;background:#eceef2}#ncNews .msg{margin-top:12px;font-size:13px;padding:10px 12px;border-radius:10px}' +
      '#ncNews .ok{background:rgba(34,197,94,.12);color:#4ade80}#ncNews .er{background:rgba(239,68,68,.12);color:#f87171}#ncNews .hist div{display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.06);font-size:13px}' +
      '#ncNews .stat{display:flex;gap:18px;margin:0 0 14px;font-size:13px;color:#8b95a5}#ncNews .stat b{color:#fff;font-size:18px;display:block}';
    document.head.appendChild(s);
  }
  function build(main) {
    var sec = document.createElement('div'); sec.className = 'admin-section'; sec.setAttribute('data-section', TAB);
    sec.innerHTML = '<div id="ncNews"><h2>📣 Announcements</h2><div class="sub">Send an update to every client by e-mail: new features, improvements, maintenance. Clients can unsubscribe from news (security and account e-mails are always sent).</div>' +
      '<div class="stat"><div><b id="nnClients">–</b>clients</div><div><b id="nnOff">–</b>unsubscribed</div></div>' +
      '<div class="chips"><span style="font-size:12px;color:#8b95a5;align-self:center">Start from:</span><button class="chip" data-t="feature">New feature</button><button class="chip" data-t="mobile">Mobile update</button><button class="chip" data-t="security">Security</button><button class="chip" data-t="maint">Maintenance done</button></div>' +
      '<div class="grid"><div class="box"><label>Subject (what they see in the inbox)</label><input id="nnSubject" maxlength="120">' +
      '<label>Heading inside the e-mail</label><input id="nnTitle" maxlength="120">' +
      '<label>Text (blank line = new paragraph)</label><textarea id="nnBody" maxlength="4000"></textarea>' +
      '<label>Highlights (one per line, optional, up to 8)</label><textarea id="nnBullets" style="min-height:80px"></textarea>' +
      '<label>Button text</label><input id="nnCta" maxlength="40" placeholder="Open NordicCrypto">' +
      '<label>Button link (optional, must be on nordiccrypto.net)</label><input id="nnUrl" placeholder="https://www.nordiccrypto.net/app.html">' +
      '<div class="row"><button class="btn b2" id="nnPrev">👁 Preview</button><button class="btn b2" id="nnTest">✉️ Send test to me</button><button class="btn b1" id="nnSend">🚀 Send to all clients</button></div>' +
      '<div id="nnMsg"></div></div>' +
      '<div><div class="box"><iframe id="nnFrame" title="Preview" srcdoc="<body style=\'font:14px sans-serif;color:#888;display:flex;height:100%;align-items:center;justify-content:center\'>Press Preview</body>"></iframe></div>' +
      '<div class="box hist" style="margin-top:14px"><div style="font-size:12px;color:#8b95a5;margin-bottom:6px">Last announcements</div><div id="nnHist"><div style="color:#8b95a5">Nothing sent yet</div></div></div></div></div></div>';
    main.appendChild(sec);
    sec.querySelectorAll('.chip').forEach(function (b) { b.onclick = function () { var t = TPL[b.getAttribute('data-t')]; $('nnSubject').value = t.subject; $('nnTitle').value = t.title; $('nnBody').value = t.body; $('nnBullets').value = t.bullets; $('nnCta').value = t.cta; preview(); }; });
    $('nnPrev').onclick = preview; $('nnTest').onclick = test; $('nnSend').onclick = send;
  }
  function data(mode) {
    return { mode: mode, subject: $('nnSubject').value, title: $('nnTitle').value, body: $('nnBody').value, bullets: $('nnBullets').value.split('\n'), ctaText: $('nnCta').value, ctaUrl: $('nnUrl').value.trim(), lang: 'en' };
  }
  function msg(t, ok) { $('nnMsg').innerHTML = t ? '<div class="msg ' + (ok ? 'ok' : 'er') + '">' + esc(t) + '</div>' : ''; }
  function preview() { msg(''); post('sendAnnouncement', data('preview')).then(function (r) { if (r && r.ok && r.html) $('nnFrame').srcdoc = r.html; else if (r && r.ok) msg(OLD); else msg((r && r.error) || 'Error'); }); }
  function test() { msg('Sending…', true); post('sendAnnouncement', data('test')).then(function (r) { if (r && r.ok && !r.sentTo) return msg(OLD); msg(r && r.ok ? 'Test sent to ' + r.sentTo + '. Check your inbox.' : ((r && r.error) || 'Error'), r && r.ok); }); }
  function disarm() { armed = false; clearTimeout(armTimer); var b = $('nnSend'); if (b) b.textContent = '🚀 Send to all clients'; }
  function send() {
    var b = $('nnSend');
    if (!armed) { armed = true; b.textContent = '⚠️ Click again to confirm sending'; armTimer = setTimeout(disarm, 6000); return; }
    disarm(); msg('Sending…', true);
    var d = data('send'); d.confirm = true;
    post('sendAnnouncement', d).then(function (r) {
      if (r && r.ok && r.sent == null) { msg(OLD); return; }
      if (r && r.ok) msg('Sent to ' + r.sent + ' clients.', true);
      else msg(((r && r.recipients) ? 'Sent ' + r.sent + ', failed ' + r.failed + '. ' : '') + ((r && r.error) || 'Error'));
      load();
    });
  }
  function load() {
    post('newsLog').then(function (r) {
      if (!r || !r.ok) return;
      if (r.clients == null) { msg(OLD); return; }
      $('nnClients').textContent = r.clients; $('nnOff').textContent = r.unsubscribed;
      $('nnHist').innerHTML = (r.log && r.log.length) ? r.log.map(function (x) { return '<div><span>' + esc(x.subject) + '</span><span style="color:#8b95a5;white-space:nowrap">' + esc(new Date(x.at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })) + ' · ' + x.sent + (x.failed ? ' / ' + x.failed + ' failed' : '') + '</span></div>'; }).join('') : '<div style="color:#8b95a5">Nothing sent yet</div>';
    });
  }
  function boot() {
    post('adminMe').then(function (r) {
      if (!r || !r.ok || !r.me || r.me.level !== 'owner') return;
      var nav = document.querySelector('#adminPanel .admin-sidebar'), main = document.querySelector('#adminPanel .admin-content');
      if (!nav || !main || nav.querySelector('[data-tab="' + TAB + '"]')) return;
      css(); build(main);
      var d = document.createElement('div'); d.className = 'admin-nav-item'; d.setAttribute('data-tab', TAB); d.setAttribute('onclick', "showAdminTab('" + TAB + "')");
      d.innerHTML = '<span class="at-ico at-ico-pulse">•</span> Announcements'; var sys = nav.querySelector('[data-tab="system"]'); if (sys) nav.insertBefore(d, sys); else nav.appendChild(d);
      var orig = window.showAdminTab; window.showAdminTab = function (t) { if (orig) orig.apply(this, arguments); if (t === TAB) load(); };
    });
  }
  function init() {
    var panel = $('adminPanel'); if (!panel) return; var seen = false;
    function check() { if (!panel.classList.contains('on') || seen) return; seen = true; boot(); }
    new MutationObserver(check).observe(panel, { attributes: true, attributeFilter: ['class'] }); check();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
