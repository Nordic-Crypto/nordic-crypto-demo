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
  var TXT = { en: ['Maintenance in progress', 'We are improving NordicCrypto. Your funds are safe. We will be back shortly.', 'Back in'], sv: ['Underhåll pågår', 'Vi förbättrar NordicCrypto. Dina pengar är säkra. Vi är snart tillbaka.', 'Tillbaka om'], da: ['Vedligeholdelse i gang', 'Vi forbedrer NordicCrypto. Dine penge er i sikkerhed. Vi er snart tilbage.', 'Tilbage om'], fi: ['Huolto käynnissä', 'Parannamme NordicCryptoa. Varasi ovat turvassa. Palaamme pian.', 'Takaisin'], es: ['Mantenimiento en curso', 'Estamos mejorando NordicCrypto. Tus fondos están a salvo. Volvemos enseguida.', 'Volvemos en'], no: ['Vedlikehold pågår', 'Vi forbedrer NordicCrypto. Pengene dine er trygge. Vi er snart tilbake.', 'Tilbake om'], fr: ['Maintenance en cours', 'Nous améliorons NordicCrypto. Vos fonds sont en sécurité. Nous revenons bientôt.', 'Retour dans'], de: ['Wartungsarbeiten', 'Wir verbessern NordicCrypto. Ihre Gelder sind sicher. Wir sind gleich zurück.', 'Zurück in'] };
  var tick = null;
  function lang() { var l = ls('nc_lang') || ls('lang') || 'en'; return TXT[l] ? l : 'en'; }
  function showClient(m) {
    var o = $('ncMaintScreen');
    if (!o) {
      o = document.createElement('div'); o.id = 'ncMaintScreen';
      o.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:#0a0b08;color:#fff;display:flex;align-items:center;justify-content:center;padding:24px;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;text-align:center';
      document.body.appendChild(o); document.documentElement.style.overflow = 'hidden';
    }
    var t = TXT[lang()];
    o.innerHTML = '<div style="max-width:440px"><div style="width:58px;height:58px;margin:0 auto 22px;border-radius:16px;background:#c6ff3d;color:#0a0b08;font:900 30px/58px Arial">N</div>' +
      '<h1 style="margin:0 0 12px;font-size:26px;letter-spacing:-.02em">' + esc(t[0]) + '</h1><p style="margin:0 0 22px;color:#9aa3af;line-height:1.6;font-size:15px">' + esc(m.message && m.message.length < 240 && lang() === 'en' ? m.message : t[1]) + '</p>' +
      (m.until ? '<div style="display:inline-block;padding:12px 22px;border-radius:14px;background:#14161a;border:1px solid #23262c"><span style="color:#9aa3af;font-size:13px">' + esc(t[2]) + '</span> <b id="ncMaintCd" style="font:700 20px ui-monospace,Menlo,Consolas,monospace;color:#c6ff3d;margin-left:6px"></b></div>' : '') + '</div>';
    clearInterval(tick);
    function upd() { var c = $('ncMaintCd'); if (c && m.until) { var ms = m.until - Date.now(); c.textContent = left(ms); if (ms <= 0) { clearInterval(tick); poll(); } } }
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
