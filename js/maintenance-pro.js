/* NC MAINTENANCE v1 — admin buttons (Quick Update / Maintenance / Weekend Off / End Update) + client-side maintenance screen with countdown.
   Replaces the missing maintenance-mode.js / admin-maintenance-buttons.js. Uses worker actions setMaintenance / getMaintenanceStatus. */
(function () {
  'use strict';
  if (window.__ncMaint) return; window.__ncMaint = true;
  var BASE = window.WORKER_LOGIN_URL || window.WORKER_URL || 'https://nordic-deposit-checker.otis-790.workers.dev';
  var STATE = { active: false };
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ls(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function token() { return typeof window.getSessionToken === 'function' ? window.getSessionToken() : ls('session_token'); }
  function isAdmin() { return ls('user_role') === 'admin'; }
  function toast(m) { try { if (typeof window.toast === 'function') window.toast(m); } catch (e) {} }
  function post(action, body) {
    return fetch(BASE + '?action=' + action, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ token: token() }, body || {})) })
      .then(function (r) { return r.json(); }).catch(function () { return { ok: false, error: 'Connection error' }; });
  }
  function status() { return fetch(BASE + '?action=getMaintenanceStatus', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (d) { return d && d.maintenance ? d.maintenance : { active: false }; }).catch(function () { return null; }); }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function left(ms) { var s = Math.max(0, Math.floor(ms / 1000)), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60); s = s % 60; return (d ? d + 'd ' : '') + (h || d ? pad(h) + ':' : '') + pad(m) + ':' + pad(s); }

  /* ---------- client screen ---------- */
  var TXT = {
    en: ['Scheduled maintenance', 'We’ll be right back', 'NordicCrypto is being upgraded with new features and security improvements.', 'Your funds are safe', 'No action needed', ['Days', 'Hours', 'Min', 'Sec'], 'Questions? Write to'],
    sv: ['Planerat underhåll', 'Vi är snart tillbaka', 'NordicCrypto uppgraderas med nya funktioner och förbättrad säkerhet.', 'Dina pengar är säkra', 'Inget behöver göras', ['Dagar', 'Tim', 'Min', 'Sek'], 'Frågor? Skriv till'],
    da: ['Planlagt vedligeholdelse', 'Vi er snart tilbage', 'NordicCrypto opgraderes med nye funktioner og bedre sikkerhed.', 'Dine penge er i sikkerhed', 'Ingen handling nødvendig', ['Dage', 'Timer', 'Min', 'Sek'], 'Spørgsmål? Skriv til'],
    fi: ['Suunniteltu huolto', 'Palaamme pian', 'NordicCryptoa päivitetään uusilla ominaisuuksilla ja paremmalla tietoturvalla.', 'Varasi ovat turvassa', 'Toimenpiteitä ei tarvita', ['Päivää', 'Tuntia', 'Min', 'Sek'], 'Kysyttävää? Kirjoita'],
    es: ['Mantenimiento programado', 'Volvemos enseguida', 'Estamos actualizando NordicCrypto con nuevas funciones y mejoras de seguridad.', 'Tus fondos están a salvo', 'No necesitas hacer nada', ['Días', 'Horas', 'Min', 'Seg'], '¿Preguntas? Escribe a'],
    no: ['Planlagt vedlikehold', 'Vi er snart tilbake', 'NordicCrypto oppgraderes med nye funksjoner og bedre sikkerhet.', 'Pengene dine er trygge', 'Ingen handling nødvendig', ['Dager', 'Timer', 'Min', 'Sek'], 'Spørsmål? Skriv til'],
    fr: ['Maintenance programmée', 'Nous revenons bientôt', 'NordicCrypto est mis à niveau avec de nouvelles fonctionnalités et une sécurité renforcée.', 'Vos fonds sont en sécurité', 'Aucune action requise', ['Jours', 'Heures', 'Min', 'Sec'], 'Des questions ? Écrivez à'],
    de: ['Geplante Wartung', 'Wir sind gleich zurück', 'NordicCrypto wird mit neuen Funktionen und verbesserter Sicherheit aktualisiert.', 'Ihre Gelder sind sicher', 'Keine Aktion erforderlich', ['Tage', 'Std', 'Min', 'Sek'], 'Fragen? Schreiben Sie an']
  };
  var DEFAULT_MSG = /^We are upgrading NordicCrypto with new features/;
  var tick = null;
  function lang() { var l = ls('nc_lang') || ls('lang') || 'en'; return TXT[l] ? l : 'en'; }
  function css() {
    if ($('ncMaintCss')) return; var s = document.createElement('style'); s.id = 'ncMaintCss';
    s.textContent = '#ncMaintScreen{position:fixed;inset:0;z-index:2147483000;overflow:auto;background:#06070a;color:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Helvetica,Arial,sans-serif;display:flex;align-items:center;justify-content:center;padding:24px}' +
      '#ncMaintScreen .bg{position:fixed;inset:0;pointer-events:none;background:radial-gradient(900px 520px at 50% -8%,rgba(198,255,61,.17),transparent 62%),radial-gradient(700px 480px at 85% 110%,rgba(71,220,255,.09),transparent 60%),radial-gradient(600px 420px at 8% 95%,rgba(139,92,246,.10),transparent 60%)}' +
      '#ncMaintScreen .grid{position:fixed;inset:0;pointer-events:none;opacity:.5;background-image:linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px);background-size:52px 52px;-webkit-mask-image:radial-gradient(ellipse at 50% 35%,#000 20%,transparent 72%);mask-image:radial-gradient(ellipse at 50% 35%,#000 20%,transparent 72%)}' +
      '#ncMaintScreen .card{position:relative;width:100%;max-width:520px;padding:38px 30px 28px;border-radius:28px;background:linear-gradient(180deg,rgba(255,255,255,.055),rgba(255,255,255,.02));border:1px solid rgba(255,255,255,.09);box-shadow:0 30px 80px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.06);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);text-align:center;animation:ncMIn .7s cubic-bezier(.2,.8,.2,1) both}' +
      '#ncMaintScreen .logo{position:relative;width:68px;height:68px;margin:0 auto 22px;border-radius:20px;background:#c6ff3d;color:#0a0b08;font:900 36px/68px Arial,sans-serif;box-shadow:0 10px 40px rgba(198,255,61,.35)}' +
      '#ncMaintScreen .logo:after{content:"";position:absolute;inset:-9px;border-radius:27px;border:2px solid rgba(198,255,61,.45);animation:ncMPulse 2.4s ease-out infinite}' +
      '#ncMaintScreen .badge{display:inline-flex;align-items:center;gap:8px;padding:7px 14px;border-radius:99px;background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.28);color:#fbbf24;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}' +
      '#ncMaintScreen .badge i{width:7px;height:7px;border-radius:50%;background:#fbbf24;animation:ncMBlink 1.4s ease-in-out infinite}' +
      '#ncMaintScreen h1{margin:18px 0 10px;font-size:clamp(28px,6.4vw,38px);line-height:1.1;letter-spacing:-.03em;font-weight:800}' +
      '#ncMaintScreen .sub{margin:0 auto;max-width:400px;color:#9aa3b2;font-size:15px;line-height:1.65}' +
      '#ncMaintScreen .note{margin:18px auto 0;max-width:420px;padding:12px 16px;border-radius:14px;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.08);color:#d7dbe3;font-size:14px;line-height:1.55}' +
      '#ncMaintScreen .cd{display:flex;justify-content:center;gap:10px;margin:28px 0 16px}' +
      '#ncMaintScreen .t{min-width:76px;padding:14px 6px 11px;border-radius:16px;background:rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.08)}' +
      '#ncMaintScreen .t b{display:block;font:800 34px/1 ui-monospace,"SF Mono",Menlo,Consolas,monospace;color:#c6ff3d;letter-spacing:-.02em;font-variant-numeric:tabular-nums}' +
      '#ncMaintScreen .t span{display:block;margin-top:8px;font-size:11px;color:#7d8696;letter-spacing:.1em;text-transform:uppercase}' +
      '#ncMaintScreen .bar{height:6px;border-radius:99px;background:rgba(255,255,255,.08);overflow:hidden;margin:0 6px}' +
      '#ncMaintScreen .bar i{display:block;height:100%;width:0;border-radius:99px;background:linear-gradient(90deg,#8fd400,#c6ff3d);box-shadow:0 0 18px rgba(198,255,61,.6);transition:width 1s linear}' +
      '#ncMaintScreen .chips{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:24px 0 0}' +
      '#ncMaintScreen .chips span{padding:8px 13px;border-radius:99px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);font-size:12.5px;color:#cbd2de}' +
      '#ncMaintScreen .foot{margin-top:22px;font-size:12.5px;color:#6f7888}#ncMaintScreen .foot a{color:#c6ff3d;text-decoration:none}' +
      '@keyframes ncMIn{from{opacity:0;transform:translateY(18px) scale(.985)}to{opacity:1;transform:none}}@keyframes ncMPulse{0%{transform:scale(.92);opacity:.9}100%{transform:scale(1.35);opacity:0}}@keyframes ncMBlink{50%{opacity:.25}}' +
      '@media(max-width:420px){#ncMaintScreen .card{padding:30px 18px 22px;border-radius:24px}#ncMaintScreen .cd{gap:7px}#ncMaintScreen .t{min-width:0;flex:1;padding:12px 2px 9px}#ncMaintScreen .t b{font-size:26px}}' +
      '@media(prefers-reduced-motion:reduce){#ncMaintScreen *{animation:none!important}}';
    document.head.appendChild(s);
  }
  function showClient(m) {
    css();
    var o = $('ncMaintScreen'), L = lang(), t = TXT[L], custom = m.message && !DEFAULT_MSG.test(m.message);
    if (!o) { o = document.createElement('div'); o.id = 'ncMaintScreen'; document.body.appendChild(o); document.documentElement.style.overflow = 'hidden'; }
    var key = L + '|' + (m.message || '') + '|' + (m.until || '');
    if (o.getAttribute('data-k') !== key) {
      o.setAttribute('data-k', key);
      o.innerHTML = '<div class="bg"></div><div class="grid"></div><div class="card"><div class="logo">N</div><div class="badge"><i></i>' + esc(t[0]) + '</div><h1>' + esc(t[1]) + '</h1><p class="sub">' + esc(t[2]) + '</p>' +
        (custom ? '<div class="note">' + esc(m.message) + '</div>' : '') +
        (m.until ? '<div class="cd"><div class="t" id="ncTd" style="display:none"><b>00</b><span>' + esc(t[5][0]) + '</span></div><div class="t" id="ncTh"><b>00</b><span>' + esc(t[5][1]) + '</span></div><div class="t" id="ncTm"><b>00</b><span>' + esc(t[5][2]) + '</span></div><div class="t" id="ncTs"><b>00</b><span>' + esc(t[5][3]) + '</span></div></div><div class="bar"><i id="ncTp"></i></div>' : '') +
        '<div class="chips"><span>🔒 ' + esc(t[3]) + '</span><span>✓ ' + esc(t[4]) + '</span></div><div class="foot">' + esc(t[6]) + ' <a href="mailto:support@nordiccrypto.net">support@nordiccrypto.net</a></div></div>';
    }
    clearInterval(tick);
    function set(id, v) { var e = $(id); if (e) e.firstChild.textContent = v; }
    function upd() {
      if (!m.until) return; var ms = m.until - Date.now(); if (ms < 0) ms = 0;
      var s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), mi = Math.floor(s % 3600 / 60), se = s % 60;
      var td = $('ncTd'); if (td) td.style.display = d > 0 ? '' : 'none';
      set('ncTd', pad(d)); set('ncTh', pad(h)); set('ncTm', pad(mi)); set('ncTs', pad(se));
      var p = $('ncTp'); if (p && m.started) p.style.width = Math.min(100, Math.max(2, (Date.now() - m.started) / (m.until - m.started) * 100)) + '%';
      if (ms <= 0) { clearInterval(tick); poll(); }
    }
    upd(); tick = setInterval(upd, 1000);
  }
  function hideClient() { var o = $('ncMaintScreen'); if (o) { o.remove(); document.documentElement.style.overflow = ''; } clearInterval(tick); }

  /* ---------- admin ---------- */
  function adminBanner() {
    var host = $('adminPushUpdate') && $('adminPushUpdate').parentNode; if (!host) return;
    var b = $('ncMaintState');
    if (!b) { b = document.createElement('div'); b.id = 'ncMaintState'; b.style.cssText = 'flex-basis:100%;margin:0 0 12px;padding:10px 14px;border-radius:12px;font-size:13px'; host.insertBefore(b, host.firstChild); host.style.flexWrap = 'wrap'; }
    if (STATE.active) { b.style.background = 'rgba(245,158,11,.14)'; b.style.color = '#fbbf24'; b.innerHTML = '🛠 Maintenance is <b>ON</b> — clients see the maintenance screen' + (STATE.until ? ' until <b>' + new Date(STATE.until).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) + '</b>' : '') + '. Admins are not blocked.'; }
    else { b.style.background = 'rgba(34,197,94,.10)'; b.style.color = '#4ade80'; b.innerHTML = '✓ Site is live for clients.'; }
  }
  var PRESETS = {
    adminPushUpdate: { title: 'Quick update', opts: [[5, '5 minutes', 60000], [10, '10 minutes', 60000], [15, '15 minutes', 60000]], def: 15 },
    adminMaintenance: { title: 'Maintenance', opts: [[1, '1 hour', 3600000], [2, '2 hours', 3600000], [3, '3 hours', 3600000], [6, '6 hours', 3600000]], def: 2 },
    adminWeekendOff: { title: 'Weekend off', opts: [[1, '1 day', 86400000], [2, '2 days', 86400000], [3, '3 days', 86400000], [7, '7 days', 86400000]], def: 2 }
  };
  function modal(id) {
    var P = PRESETS[id]; var old = $('ncMaintModal'); if (old) old.remove();
    var m = document.createElement('div'); m.id = 'ncMaintModal';
    m.style.cssText = 'position:fixed;inset:0;z-index:2147482000;background:rgba(0,0,0,.65);display:flex;align-items:center;justify-content:center;padding:16px';
    m.innerHTML = '<div style="width:100%;max-width:420px;background:#14161a;border:1px solid #2a2d33;border-radius:18px;padding:22px;color:#fff;font-family:inherit"><h3 style="margin:0 0 6px;font-size:18px">' + esc(P.title) + '</h3><p style="margin:0 0 14px;font-size:13px;color:#9aa3af">Clients will see a maintenance screen with a countdown. Admins can keep working.</p>' +
      '<label style="font-size:12px;color:#9aa3af">Duration</label><select id="ncMD" style="width:100%;margin:5px 0 12px;padding:10px;border-radius:10px;border:1px solid #2a2d33;background:#0a0b08;color:#fff;font-size:14px">' + P.opts.map(function (o) { return '<option value="' + (o[0] * o[2]) + '"' + (o[0] === P.def ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>' +
      '<label style="font-size:12px;color:#9aa3af">Message (optional, English)</label><textarea id="ncMM" rows="3" maxlength="200" style="width:100%;box-sizing:border-box;margin:5px 0 14px;padding:10px;border-radius:10px;border:1px solid #2a2d33;background:#0a0b08;color:#fff;font:14px inherit" placeholder="We are upgrading NordicCrypto with new features and security improvements."></textarea>' +
      '<div style="display:flex;gap:8px;justify-content:flex-end"><button id="ncMX" style="padding:10px 16px;border-radius:10px;border:1px solid #2a2d33;background:transparent;color:#fff;cursor:pointer">Cancel</button><button id="ncMG" style="padding:10px 18px;border-radius:10px;border:0;background:#c6ff3d;color:#0a0b08;font-weight:700;cursor:pointer">Start</button></div></div>';
    document.body.appendChild(m);
    $('ncMX').onclick = function () { m.remove(); };
    m.addEventListener('click', function (e) { if (e.target === m) m.remove(); });
    $('ncMG').onclick = function () {
      var btn = this; btn.disabled = true; btn.textContent = '…';
      post('setMaintenance', { active: true, duration: Number($('ncMD').value), message: $('ncMM').value.trim() || undefined, version: '6.1.0' }).then(function (r) {
        if (r && r.ok && r.maintenance) { STATE = r.maintenance; adminBanner(); toast('Maintenance started'); m.remove(); }
        else { btn.disabled = false; btn.textContent = 'Start'; toast((r && r.error) || 'Error'); }
      });
    };
  }
  function endNow() { post('setMaintenance', { active: false }).then(function (r) { if (r && r.ok) { STATE = { active: false }; adminBanner(); toast('Maintenance ended, site is live'); } else toast((r && r.error) || 'Error'); }); }
  function bindAdmin() {
    ['adminPushUpdate', 'adminMaintenance', 'adminWeekendOff', 'adminEndUpdate'].forEach(function (id) {
      var b = $(id); if (!b || b.__nm) return; b.__nm = 1;
      b.addEventListener('click', function (e) { e.preventDefault(); e.stopImmediatePropagation(); if (id === 'adminEndUpdate') endNow(); else modal(id); }, true);
    });
    status().then(function (m) { if (m) { STATE = m; adminBanner(); } });
  }

  /* ---------- polling ---------- */
  function poll() {
    status().then(function (m) {
      if (!m) return; STATE = m;
      if (isAdmin()) { adminBanner(); return; }
      if (m.active && (!m.until || m.until > Date.now())) showClient(m); else hideClient();
    });
  }
  function init() {
    poll(); setInterval(poll, 20000);
    if (isAdmin()) { var n = 0, t = setInterval(function () { bindAdmin(); if (++n > 40 || ($('adminPushUpdate') && $('adminPushUpdate').__nm)) clearInterval(t); }, 500); }
    document.addEventListener('click', function (e) { if (e.target && e.target.closest && e.target.closest('[data-tab="system"]')) setTimeout(bindAdmin, 50); }, true);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
