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
  var state = { totp: null, sessions: null, setup: null, codes: null, review: undefined };
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
    var rv = state.review, rs = rv ? rv.status : '';
    h += '<div class="cs-hr"></div><div class="cs-row"><div><div class="cs-t">Your review</div><div class="cs-s">' +
      (rv === undefined ? 'Loading…' : !rv ? 'Share your experience. With your permission we show it on our website after a quick check.' : rs === 'pending' ? 'Thank you! Your review is waiting for approval.' : rs === 'approved' ? 'Published on our website. Thank you!' : 'Not published' + (rv.note ? ': ' + esc(rv.note) : '') + '.') + '</div></div>' +
      (rv === undefined ? '<span class="cs-skel"></span>' : (!rv || rs === 'rejected') ? '<button class="cs-btn" id="csRev" style="margin:0">' + (rs === 'rejected' ? 'Write again' : 'Write a review') + '</button>' : '<button class="cs-x" id="csRevDel">Remove</button>') + '</div>';
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
    on(c, 'csRev', function () { openReview(); });
    on(c, 'csRevDel', function () { if (!confirm('Remove your review from our website?')) return; api('reviewWithdraw').then(function (r) { if (r.ok) { state.review = null; say('Review removed'); paint(); } else say(r.error, true); }); });
    on(c, 'csOthers', function () { api('logoutOthers').then(function (r) { say(r.ok ? 'Signed out ' + r.revoked + ' device(s)' : r.error, !r.ok); load(); }); });
    [].forEach.call(c.querySelectorAll('[data-sid]'), function (b) { b.onclick = function () { api('revokeSession', { id: b.getAttribute('data-sid') }).then(function (r) { say(r.ok ? 'Device signed out' : r.error, !r.ok); load(); }); }; });
  }
  function load() {
    api('totpStatus').then(function (r) { if (r.ok) { state.totp = r; paint(); } });
    api('myReview').then(function (r) { if (r.ok) { state.review = r.review; paint(); } });
    api('mySessions').then(function (r) { if (r.ok) { state.sessions = r.sessions; paint(); } });
  }
  function opened() { state.review = undefined; state.setup = null; state.codes = null; state.sessions = null; paint(); load(); }

  /* ───────── review form ───────── */
  function openReview() {
    sclose();
    var nm = ($('settingsName') || {}).textContent || ''; nm = nm.trim(); var pr = nm.split(/\s+/); var def = pr.length > 1 ? pr[0] + ' ' + pr[pr.length - 1].charAt(0).toUpperCase() + '.' : nm;
    sov = document.createElement('div'); sov.className = 'cs-ov';
    sov.innerHTML = '<div class="cs-sbox"><div class="cs-row"><div class="cs-t" style="font-size:18px">Write a review</div><button class="cs-x" id="csRx" style="border-color:rgba(255,255,255,.2);color:#fff">\u00d7</button></div>' +
      '<div class="cs-s" style="margin:6px 0 10px">Honest and specific is best. Your review is shown on our website only after we approve it, and you can remove it any time.</div>' +
      '<div class="cs-stars" id="csRS" role="radiogroup" aria-label="Rating"></div>' +
      '<textarea id="csRT" class="cs-in" rows="4" maxlength="400" placeholder="What do you like? What could be better?" style="font-weight:500;resize:vertical"></textarea><div class="cs-s" id="csRC" style="text-align:right">0 / 400</div>' +
      '<div style="display:flex;gap:8px"><input id="csRN" class="cs-in" maxlength="30" placeholder="Name to show" value="' + esc(def) + '"><input id="csRL" class="cs-in" maxlength="40" placeholder="City, Country (optional)"></div>' +
      '<label class="cs-s" style="display:flex;gap:10px;align-items:flex-start;margin-top:10px"><input id="csRK" type="checkbox" style="margin-top:3px;accent-color:#c8ff4d"><span>I agree that NordicCrypto may publish this review with the name and city shown above.</span></label>' +
      '<div id="csRM" class="cs-s" style="min-height:18px;margin-top:6px"></div><button class="cs-btn" id="csRG">Send review</button></div>';
    document.body.appendChild(sov);
    sov.addEventListener('click', function (e) { if (e.target === sov) sclose(); }); $('csRx').onclick = sclose;
    var rating = 0, box = $('csRS');
    function stars() { box.innerHTML = [1, 2, 3, 4, 5].map(function (n) { return '<button type="button" class="cs-star' + (n <= rating ? ' on' : '') + '" data-n="' + n + '" aria-label="' + n + '">\u2605</button>'; }).join(''); [].forEach.call(box.children, function (b) { b.onclick = function () { rating = +b.getAttribute('data-n'); stars(); }; }); }
    stars();
    $('csRT').oninput = function () { $('csRC').textContent = this.value.length + ' / 400'; };
    $('csRG').onclick = function () {
      var g = $('csRG'), m = $('csRM'); g.disabled = true; m.textContent = '';
      api('reviewSubmit', { rating: rating, text: $('csRT').value, name: $('csRN').value, location: $('csRL').value, consent: $('csRK').checked }).then(function (r) {
        g.disabled = false;
        if (r.ok) { state.review = r.review; sclose(); say('Thank you! Your review was sent for approval.'); paint(); } else { m.style.color = '#ff8f8f'; m.textContent = r.error || 'Could not send'; }
      });
    };
  }

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
  /* ───────── recurring transfers (loaded only when opened: no background polling) ───────── */
  var sov = null;
  function sclose() { if (sov) { sov.remove(); sov = null; } }
  function cur() { var method = ($('wdMethod') || {}).value; if (!MAP[method]) return null; var details = {}; Object.keys(MAP[method]).forEach(function (k) { var el = $(k); if (el && el.value) details[MAP[method][k]] = el.value.trim(); }); return { method: method, details: details }; }
  function money2(v) { try { return typeof window.fmtCurrency === 'function' ? window.fmtCurrency(v) : '$' + Number(v).toFixed(2); } catch (e) { return '$' + v; } }
  function fdate(t) { try { return new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return ''; } }
  var EV = { weekly: 'Every week', biweekly: 'Every 2 weeks', monthly: 'Every month' };
  function openSched(prefill) {
    sclose();
    sov = document.createElement('div'); sov.className = 'cs-ov';
    sov.innerHTML = '<div class="cs-sbox"><div class="cs-row"><div class="cs-t" style="font-size:18px">Recurring transfers</div><button class="cs-x" id="csSx" style="border-color:rgba(255,255,255,.2);color:#fff">\u00d7</button></div>' +
      '<div class="cs-s" style="margin:6px 0 12px">We create the withdrawal request for you on schedule. It is reviewed and approved like any other, so you stay in control.</div><div id="csSBody"><div class="cs-skel wide"></div><div class="cs-skel wide"></div></div></div>';
    document.body.appendChild(sov);
    sov.addEventListener('click', function (e) { if (e.target === sov) sclose(); });
    $('csSx').onclick = sclose;
    api('schedList').then(function (r) { if (!r.ok) { $('csSBody').textContent = r.error; return; } sview(r.schedules, prefill); });
  }
  function sview(list, prefill) {
    var b = $('csSBody'); if (!b) return;
    var h = list.length ? list.map(function (x) {
      var dst = x.details.iban || x.details.address || '';
      return '<div class="cs-sess"><div class="cs-ic">\ud83d\udd01</div><div class="cs-sm"><div class="cs-t">' + esc(x.label) + ' \u00b7 ' + esc(money2(x.amount)) + (x.active ? '' : ' <span class="cs-pill off">PAUSED</span>') + '</div>' +
        '<div class="cs-s">' + esc(EV[x.every] || x.every) + ' \u00b7 next ' + esc(fdate(x.nextAt)) + (x.fails ? ' \u00b7 ' + x.fails + ' skipped' : '') + '</div><div class="cs-s">' + esc(String(dst).slice(0, 8)) + '\u2026' + esc(String(dst).slice(-4)) + '</div></div>' +
        '<div style="display:flex;flex-direction:column;gap:6px"><button class="cs-x" data-p="' + esc(x.id) + '" data-on="' + (x.active ? '1' : '0') + '">' + (x.active ? 'Pause' : 'Resume') + '</button><button class="cs-x" data-d="' + esc(x.id) + '">Delete</button></div></div>';
    }).join('') : '<div class="px-empty">No recurring transfers yet.</div>';
    var c = prefill && prefill.method;
    h += '<div class="cs-hr"></div><div class="cs-t">New schedule</div>';
    if (!c) h += '<div class="cs-s">Fill in a bank or crypto recipient in the withdraw form (or pick a saved one), then tap \u201cRecurring\u201d again.</div>';
    else {
      var d = new Date(Date.now() + 86400000 * 7); var iso = d.toISOString().slice(0, 10);
      h += '<div class="cs-s">To: <b>' + esc(String(prefill.details.iban || prefill.details.address || '').slice(0, 12)) + '\u2026</b> (' + esc(prefill.method.toUpperCase()) + ')</div>' +
        '<input id="csSN" class="cs-in" maxlength="40" placeholder="Name, e.g. Rent" value="' + esc(prefill.label || '') + '"><div style="display:flex;gap:8px"><input id="csSA" class="cs-in" type="number" min="1" inputmode="decimal" placeholder="Amount (USD)" value="' + esc(prefill.amount || '') + '">' +
        '<select id="csSE" class="cs-in"><option value="monthly">Every month</option><option value="biweekly">Every 2 weeks</option><option value="weekly">Every week</option></select></div>' +
        '<label class="cs-s" style="display:block;margin-top:8px">First transfer on</label><input id="csSD" class="cs-in" type="date" value="' + iso + '" min="' + new Date(Date.now() + 86400000).toISOString().slice(0, 10) + '">' +
        '<div class="cs-s" style="margin-top:8px">\u2139\ufe0f A first payout to new details can wait up to 24 h for confirmation.</div><div id="csSM" class="cs-s" style="min-height:18px"></div><button class="cs-btn" id="csSGo">Start schedule</button>';
    }
    b.innerHTML = h;
    [].forEach.call(b.querySelectorAll('[data-d]'), function (e) { e.onclick = function () { api('schedDelete', { id: e.getAttribute('data-d') }).then(function (r) { if (r.ok) sview(r.schedules, prefill); else say(r.error, true); }); }; });
    [].forEach.call(b.querySelectorAll('[data-p]'), function (e) { e.onclick = function () { api('schedPause', { id: e.getAttribute('data-p'), paused: e.getAttribute('data-on') === '1' }).then(function (r) { if (r.ok) sview(r.schedules, prefill); else say(r.error, true); }); }; });
    var go = $('csSGo');
    if (go) go.onclick = function () {
      go.disabled = true;
      api('schedSave', { label: $('csSN').value, amount: $('csSA').value, every: $('csSE').value, firstAt: new Date($('csSD').value + 'T09:00:00').getTime(), method: prefill.method, details: prefill.details }).then(function (r) {
        if (r.ok) { say('Recurring transfer created'); sview(r.schedules, null); } else { go.disabled = false; var m = $('csSM'); m.style.color = '#ff8f8f'; m.textContent = r.error || 'Could not save'; }
      });
    };
  }
  function startSched() {
    var c = cur();
    if (!c) { openSched(null); return; }
    var a = $('wdAmount'); c.amount = a && a.value ? a.value : '';
    var hit = payees.filter(function (p) { return p.method === c.method && JSON.stringify(p.details) === JSON.stringify(c.details); })[0];
    c.label = hit ? hit.label : '';
    var has = Object.keys(c.details).length >= (c.method === 'iban' ? 2 : 2);
    openSched(has ? c : null);
  }
  function addSaveBtn() {
    var acts = document.querySelector('#withdrawModal .wd-actions'); if (!acts || $('csSaveP')) return;
    var bt = document.createElement('button'); bt.id = 'csSaveP'; bt.type = 'button'; bt.className = 'wd-btn wd-btn-cancel'; bt.textContent = '💾 Save recipient'; bt.onclick = saveCurrent;
    acts.insertBefore(bt, acts.firstChild);
    var rb = document.createElement('button'); rb.id = 'csSchedBtn'; rb.type = 'button'; rb.className = 'wd-btn wd-btn-cancel'; rb.textContent = '\ud83d\udd01 Recurring'; rb.onclick = startSched;
    acts.insertBefore(rb, bt.nextSibling);
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
