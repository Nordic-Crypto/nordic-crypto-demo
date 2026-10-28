/* NordicCrypto: admin two-factor sign-in (login code field + setup card in the System tab) */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function tok() { try { return localStorage.getItem('session_token') || ''; } catch (e) { return ''; } }
  function wurl() { return (typeof WORKER_LOGIN_URL !== 'undefined' && WORKER_LOGIN_URL) || (typeof WORKER_URL !== 'undefined' && WORKER_URL) || 'https://nordic-deposit-checker.otis-790.workers.dev'; }
  function api(action, body) {
    return fetch(wurl() + '?action=' + action, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ token: tok() }, body || {})) }).then(function (r) { return r.json(); });
  }
  function toast2(m, bad) { if (typeof toast === 'function') toast(m, bad); }

  /* ---------- login: 6-digit code field ---------- */
  function ensureCodeField() {
    var p = $('loginPassword') || $('fPass'); if (!p) return null;
    var el = $('loginTotp');
    if (!el) {
      var wrap = document.createElement('div'); wrap.id = 'loginTotpWrap'; wrap.style.cssText = 'display:none;margin-top:12px';
      wrap.innerHTML = '<input id="loginTotp" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="7" placeholder="6-digit code" style="width:100%;padding:14px 16px;border-radius:12px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.05);color:inherit;font-size:18px;letter-spacing:6px;text-align:center">';
      var anchor = p.closest('.fg, .form-group, .field, label') || p.parentNode; if (anchor === p.parentNode && anchor.querySelector('input') !== p) anchor = p; anchor.parentNode.insertBefore(wrap, anchor.nextSibling);
      el = $('loginTotp');
      el.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !$('mForm') && typeof doLogin === 'function') doLogin(); });
    }
    return el;
  }
  var _fetch = window.fetch;
  window.fetch = function (u, o) {
    var isLogin = typeof u === 'string' && u.indexOf('action=login') > -1 && o && typeof o.body === 'string';
    if (isLogin) {
      try { var c = $('loginTotp'); if (c && c.value) { var b = JSON.parse(o.body); b.code = c.value.replace(/\s/g, ''); o = Object.assign({}, o, { body: JSON.stringify(b) }); } } catch (e) {}
    }
    var p = _fetch.call(this, u, o);
    if (isLogin) p.then(function (r) {
      r.clone().json().then(function (d) {
        if (d && d.needTotp) { ensureCodeField(); var w = $('loginTotpWrap'); if (w) { w.style.display = 'block'; var i = $('loginTotp'); if (i) { i.value = ''; setTimeout(function () { i.focus(); }, 60); } } }
        else if (d && d.ok) { var w2 = $('loginTotpWrap'); if (w2) w2.style.display = 'none'; }
      }).catch(function () {});
    }).catch(function () {});
    return p;
  };

  /* ---------- admin: 2FA card in the System tab ---------- */
  var qrLoaded = null;
  function loadQr() {
    if (window.qrcode) return Promise.resolve();
    if (qrLoaded) return qrLoaded;
    qrLoaded = new Promise(function (res) { var s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js'; s.onload = res; s.onerror = res; document.head.appendChild(s); });
    return qrLoaded;
  }
  var box = 'background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:18px;margin-bottom:16px;color:#e7edf5';
  var btn = 'border:0;border-radius:10px;padding:10px 16px;font-weight:700;cursor:pointer;background:#c6ff3d;color:#07080c;margin-right:8px';
  var inp = 'padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.05);color:inherit;font-size:15px;margin:6px 8px 6px 0';
  function paint(card, enabled, extra) {
    card.innerHTML = '<h3 style="margin:0 0 6px;font-size:16px">🔐 Two-factor sign-in (2FA)</h3>' +
      '<p style="margin:0 0 12px;opacity:.7;font-size:13px">Status: <b style="color:' + (enabled ? '#34d399' : '#fbbf24') + '">' + (enabled ? 'ON' : 'OFF') + '</b>. ' + (enabled ? 'Signing in needs a 6-digit code from your authenticator app.' : 'Adds a 6-digit code from your phone on top of the password. Strongly recommended.') + '</p>' +
      (extra || (enabled
        ? '<input id="tfPw" type="password" placeholder="Your password" style="' + inp + '"><input id="tfCode" inputmode="numeric" maxlength="6" placeholder="Code" style="' + inp + 'width:110px"><button id="tfOff" style="' + btn + 'background:#ff6b6b;color:#fff">Turn off</button>'
        : '<button id="tfOn" style="' + btn + '">Turn on 2FA</button>'));
    var on = card.querySelector('#tfOn'), off = card.querySelector('#tfOff');
    if (on) on.onclick = function () { setup(card); };
    if (off) off.onclick = function () {
      api('totpDisable', { password: card.querySelector('#tfPw').value, code: card.querySelector('#tfCode').value }).then(function (d) {
        if (d && d.ok) { toast2('2FA turned off'); paint(card, false); } else toast2((d && d.error) || 'Error', true);
      });
    };
  }
  function setup(card) {
    api('totpSetup').then(function (d) {
      if (!d || !d.ok) { toast2((d && d.error) || 'Error', true); return; }
      loadQr().then(function () {
        var qr = '';
        try { if (window.qrcode) { var q = window.qrcode(0, 'M'); q.addData(d.uri); q.make(); qr = '<div style="background:#fff;padding:10px;border-radius:12px;display:inline-block">' + q.createImgTag(4, 0) + '</div>'; } } catch (e) {}
        paint(card, false,
          '<ol style="margin:0 0 12px;padding-left:20px;font-size:13px;line-height:1.6"><li>Install <b>Google Authenticator</b> or <b>Authy</b> on your phone.</li><li>Scan the QR code' + (qr ? '' : ' (or type the key)') + ':</li></ol>' + qr +
          '<div style="margin:10px 0;font:13px monospace;word-break:break-all;opacity:.85">Key: ' + esc(d.secret) + '</div>' +
          '<p style="margin:0 0 6px;font-size:13px">3. Enter the 6-digit code from the app:</p><input id="tfCode" inputmode="numeric" maxlength="6" placeholder="123456" style="' + inp + 'width:130px"><button id="tfConfirm" style="' + btn + '">Confirm</button>');
        card.querySelector('#tfConfirm').onclick = function () {
          api('totpEnable', { code: card.querySelector('#tfCode').value }).then(function (r) {
            if (r && r.ok) { toast2('✓ 2FA is on'); paint(card, true); } else toast2((r && r.error) || 'Wrong code', true);
          });
        };
      });
    });
  }
  function inject() {
    var sec = document.querySelector('[data-section="system"]');
    if (!sec || $('ncTotpCard')) return;
    var role = ''; try { role = localStorage.getItem('user_role'); } catch (e) {}
    if (role !== 'admin') return;
    var card = document.createElement('div'); card.id = 'ncTotpCard'; card.style.cssText = box; card.className = 'nc-no-i18n'; card.setAttribute('data-nci18n', 'off');
    sec.insertBefore(card, sec.firstChild);
    card.innerHTML = '<div style="opacity:.6;font-size:13px">Loading…</div>';
    api('totpStatus').then(function (d) { paint(card, !!(d && d.enabled)); }).catch(function () { card.remove(); });
  }
  setInterval(function () { try { inject(); } catch (e) {} }, 1500);
})();
