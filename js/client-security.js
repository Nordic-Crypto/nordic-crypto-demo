/* NordicCrypto client security centre: 2FA, active sessions, saved recipients. Independent of security-pro.js. */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function tok() { try { return localStorage.getItem('session_token') || ''; } catch (e) { return ''; } }
  function wurl() { return (typeof WORKER_LOGIN_URL !== 'undefined' && WORKER_LOGIN_URL) || 'https://nordic-deposit-checker.otis-790.workers.dev'; }
  function api(action, body) {
    return fetch(wurl() + '?action=' + action, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ token: tok() }, body || {})) })
      .then(function (r) { return r.json(); }).catch(function () { return { ok: false, error: 'No connection. Check your internet and try again.' }; });
  }
  function say(m, bad) { if (typeof toast === 'function') toast(m, bad); }
  function ago(t) { if (!t) return ''; var s = Math.max(1, (Date.now() - t) / 1000); if (s < 90) return 'just now'; if (s < 5400) return Math.round(s / 60) + ' min ago'; if (s < 129600) return Math.round(s / 3600) + ' h ago'; return Math.round(s / 86400) + ' d ago'; }
  function device(ua) {
    ua = ua || ''; var os = /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'Device';
    var br = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
    return br + ' · ' + os;
  }

  /* ───────── security card in Settings ───────── */
  function card() {
    var m = $('settingsMask'); if (!m) return null;
    var c = $('csCard'); if (c) return c;
    var anchor = $('btnChangeEmail'); if (!anchor) return null;
    c = document.createElement('div'); c.id = 'csCard'; c.className = 'cs-card';
    anchor.parentNode.parentNode.insertBefore(c, anchor.parentNode.nextSibling);
    return c;
  }
  var state = { totp: null, sessions: null, setup: null, codes: null };
  function paint() {
    var c = card(); if (!c) return;
    var t = state.totp, h = '';
    h += '<div class="cs-row"><div><div class="cs-t">Two-factor sign-in</div><div class="cs-s">' + (t ? (t.enabled ? 'On — a code from your authenticator app is required at sign-in.' : 'Off — add a second lock to your account.') : 'Checking…') + '</div></div>' +
      (t ? '<span class="cs-pill ' + (t.enabled ? 'on' : 'off') + '">' + (t.enabled ? 'ON' : 'OFF') + '</span>' : '<span class="cs-skel"></span>') + '</div>';
    if (state.codes) {
      h += '<div class="cs-box"><b>Save these backup codes</b><div class="cs-s">Each works once if you lose your phone. They are shown only now.</div><div class="cs-codes">' + state.codes.map(function (x) { return '<code>' + esc(x) + '</code>'; }).join('') + '</div>' +
        '<button class="cs-btn" id="csCopy">Copy codes</button><button class="cs-btn ghost" id="csDone">I saved them</button></div>';
    } else if (state.setup) {
      h += '<div class="cs-box"><div class="cs-s">1. Scan with Google Authenticator, Authy or 1Password.<br>2. Enter the 6-digit code.</div><canvas id="csQr" class="cs-qr"></canvas>' +
        '<div class="cs-s">Can’t scan? Key: <code>' + esc(state.setup.secret) + '</code></div>' +
        '<input id="csCode" class="cs-in" inputmode="numeric" maxlength="6" placeholder="123456" autocomplete="one-time-code"><button class="cs-btn" id="csConfirm">Turn on</button><button class="cs-btn ghost" id="csCancel">Cancel</button></div>';
    } else if (t && t.enabled) {
      h += '<div class="cs-box"><div class="cs-s">To turn off or get new backup codes, confirm with your password and a current code.</div>' +
        '<input id="csPw" type="password" class="cs-in" placeholder="Password" autocomplete="current-password"><input id="csCode" class="cs-in sm" inputmode="numeric" maxlength="6" placeholder="Code">' +
        '<button class="cs-btn" id="csNew">New backup codes</button><button class="cs-btn danger" id="csOff">Turn off</button></div>';
    } else if (t) {
      h += '<button class="cs-btn" id="csOn">Turn on 2FA</button>';
    }
    h += '<div class="cs-hr"></div><div class="cs-row"><div><div class="cs-t">Where you’re signed in</div><div class="cs-s">Don’t recognise one? Sign it out.</div></div></div><div id="csSess">';
    if (!state.sessions) h += '<div class="cs-skel wide"></div><div class="cs-skel wide"></div>';
    else if (!state.sessions.length) h += '<div class="cs-s">No other sessions.</div>';
    else h += state.sessions.map(function (s) {
      return '<div class="cs-sess"><div class="cs-ic">' + (/iOS|Android/.test(device(s.ua)) ? '📱' : '💻') + '</div><div class="cs-sm"><div class="cs-t">' + esc(device(s.ua)) + (s.current ? ' <span class="cs-pill on">THIS DEVICE</span>' : '') + '</div>' +
        '<div class="cs-s">' + esc(s.place || 'Unknown place') + ' · ' + esc(s.ip || '') + ' · ' + ago(s.createdAt) + '</div></div>' +
        (s.current ? '' : '<button class="cs-x" data-sid="' + esc(s.id) + '" title="Sign out">Sign out</button>') + '</div>';
    }).join('') + '<button class="cs-btn ghost" id="csOthers">Sign out all other devices</button>';
    h += '</div>';
    c.innerHTML = h; bind(c);
    if (state.setup && !window.QRious) { var q = $('csQr'); if (q) q.style.display = 'none'; }
    if (state.setup && window.QRious) { try { new QRious({ element: $('csQr'), value: state.setup.uri, size: 168, background: '#fff', foreground: '#07080c', padding: 8 }); } catch (e) {} }
  }
  function on(c, id, fn) { var e = c.querySelector('#' + id); if (e) e.onclick = fn; }
  function bind(c) {
    on(c, 'csOn', function () { api('totpSetup').then(function (r) { if (!r.ok) return say(r.error, true); state.setup = r; paint(); }); });
    on(c, 'csCancel', function () { state.setup = null; paint(); });
    on(c, 'csConfirm', function () { api('totpEnable', { code: ($('csCode').value || '').replace(/\s/g, '') }).then(function (r) { if (!r.ok) return say(r.error, true); state.setup = null; state.codes = r.backupCodes; state.totp = { enabled: true }; say('Two-factor is on'); paint(); }); });
    on(c, 'csDone', function () { state.codes = null; paint(); });
    on(c, 'csCopy', function () { try { navigator.clipboard.writeText(state.codes.join('\n')); say('Copied'); } catch (e) {} });
    on(c, 'csOff', function () { api('totpDisable', { password: $('csPw').value, code: ($('csCode').value || '').replace(/\s/g, '') }).then(function (r) { if (!r.ok) return say(r.error, true); state.totp = { enabled: false }; say('Two-factor is off'); paint(); }); });
    on(c, 'csNew', function () { api('totpBackup', { password: $('csPw').value, code: ($('csCode').value || '').replace(/\s/g, '') }).then(function (r) { if (!r.ok) return say(r.error, true); state.codes = r.backupCodes; paint(); }); });
    on(c, 'csOthers', function () { api('logoutOthers').then(function (r) { say(r.ok ? 'Signed out ' + r.revoked + ' device(s)' : r.error, !r.ok); load(); }); });
    [].forEach.call(c.querySelectorAll('[data-sid]'), function (b) { b.onclick = function () { api('revokeSession', { id: b.getAttribute('data-sid') }).then(function (r) { say(r.ok ? 'Device signed out' : r.error, !r.ok); load(); }); }; });
  }
  function load() {
    api('totpStatus').then(function (r) { if (r.ok) { state.totp = r; paint(); } });
    api('mySessions').then(function (r) { if (r.ok) { state.sessions = r.sessions; paint(); } });
  }
  function opened() { state.setup = null; state.codes = null; state.sessions = null; paint(); load(); }

  /* ───────── saved recipients in the withdraw modal ───────── */
  var payees = [];
  var MAP = {
    iban: { wdIbanName: 'name', wdIbanNumber: 'iban', wdIbanSwift: 'swift', wdIbanBank: 'bank', wdIbanCountry: 'country' },
    crypto: { wdCryptoDest: 'destination', wdCryptoNetwork: 'network', wdCryptoCoin: 'coin', wdCryptoAddress: 'address', wdCryptoMemo: 'memo' }
  };
  function bar() {
    var m = $('withdrawModal'); if (!m) return null;
    var b = $('csPayees'); if (b) return b;
    var amt = $('wdAmount'); if (!amt) return null;
    b = document.createElement('div'); b.id = 'csPayees'; b.className = 'cs-payees';
    var lab = amt.previousElementSibling || amt; lab.parentNode.insertBefore(b, lab);
    return b;
  }
  function paintPayees() {
    var b = bar(); if (!b) return;
    if (!payees.length) { b.innerHTML = '<div class="cs-s">💡 Save a recipient after your first withdrawal to repeat it in one tap.</div>'; return; }
    b.innerHTML = '<div class="cs-s" style="margin-bottom:6px">Saved recipients</div><div class="cs-chips">' + payees.slice(0, 8).map(function (p) {
      return '<span class="cs-chip" data-pid="' + esc(p.id) + '">' + (p.method === 'crypto' ? '₿ ' : '🏦 ') + esc(p.label) + '<i data-del="' + esc(p.id) + '" title="Remove">×</i></span>';
    }).join('') + '</div>';
    [].forEach.call(b.querySelectorAll('.cs-chip'), function (el) {
      el.onclick = function (e) {
        var d = e.target.getAttribute && e.target.getAttribute('data-del');
        if (d) { e.stopPropagation(); api('payeeDelete', { id: d }).then(function (r) { if (r.ok) { payees = r.payees; paintPayees(); } }); return; }
        fill(el.getAttribute('data-pid'));
      };
    });
  }
  function fill(id) {
    var p = payees.filter(function (x) { return x.id === id; })[0]; if (!p || !MAP[p.method]) return;
    var sel = $('wdMethod'); if (sel) { sel.value = p.method; if (typeof wdSwitchMethod === 'function') wdSwitchMethod(); }
    if (p.method === 'crypto' && typeof wdSwitchCryptoDest === 'function') { var d = $('wdCryptoDest'); if (d) { d.value = p.details.destination || d.value; try { wdSwitchCryptoDest(); } catch (e) {} } }
    var map = MAP[p.method]; Object.keys(map).forEach(function (k) { var el = $(k); if (el && p.details[map[k]] != null) el.value = p.details[map[k]]; });
    var a = $('wdAmount'); if (a) a.focus();
  }
  function loadPayees() { api('payeesList').then(function (r) { if (r.ok) { payees = r.payees; paintPayees(); } }); }
  function saveCurrent() {
    var method = ($('wdMethod') || {}).value; if (!MAP[method]) return say('Card details are not saved for your safety. Use bank or crypto.', true);
    var details = {}; Object.keys(MAP[method]).forEach(function (k) { var el = $(k); if (el && el.value) details[MAP[method][k]] = el.value.trim(); });
    var label = prompt('Name for this recipient (e.g. “My Swedbank”):', method === 'iban' ? (details.name || '') : (details.coin || 'Wallet')); if (!label) return;
    api('payeeSave', { label: label, method: method, details: details }).then(function (r) { if (r.ok) { payees = r.payees; paintPayees(); say('Recipient saved'); } else say(r.error, true); });
  }
  function addSaveBtn() {
    var acts = document.querySelector('#withdrawModal .wd-actions'); if (!acts || $('csSaveP')) return;
    var bt = document.createElement('button'); bt.id = 'csSaveP'; bt.type = 'button'; bt.className = 'wd-btn wd-btn-cancel'; bt.textContent = '💾 Save recipient'; bt.onclick = saveCurrent;
    acts.insertBefore(bt, acts.firstChild);
    var note = document.createElement('p'); note.className = 'cs-s'; note.style.margin = '8px 0 0'; note.textContent = 'ℹ️ For your protection, a first payout to new details may take up to 24 hours to confirm.';
    acts.parentNode.insertBefore(note, acts);
  }

  function init() {
    var sm = $('settingsMask');
    if (sm) { new MutationObserver(function () { if (sm.classList.contains('on')) opened(); }).observe(sm, { attributes: true, attributeFilter: ['class'] }); }
    if (typeof window.openWithdraw === 'function') { var o = window.openWithdraw; window.openWithdraw = function () { var r = o.apply(this, arguments); addSaveBtn(); paintPayees(); loadPayees(); return r; }; }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
