/* VIEW-AS PRO — admin "Viewing client" mode, done properly.
   • the client's real name everywhere (greeting, card holder) instead of "Admin"
   • Deposit: credits the client's account for real (saved on the server, recorded in the audit log)
   • Withdraw / Transfer: creates the withdrawal on the CLIENT's account (appears in Withdrawals for approval)
   Load at the end of <body>, after app.legacy.js. */
(function () {
  'use strict';
  if (window.__viewAsPro) return; window.__viewAsPro = true;
  var $ = function (id) { return document.getElementById(id); };
  var BAK = 'nc_admin_name_bak';
  function token() { return typeof getSessionToken === 'function' ? getSessionToken() : localStorage.getItem('session_token'); }
  function base() { return window.WORKER_LOGIN_URL || window.WORKER_URL || (typeof WORKER_URL !== 'undefined' ? WORKER_URL : ''); }
  function post(action, body) {
    return fetch(base() + '?action=' + action, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ token: token() }, body || {})) })
      .then(function (r) { return r.json(); }).catch(function () { return { ok: false, error: 'Connection error' }; });
  }
  function toast2(m, bad) { if (typeof toast === 'function') toast(m, !!bad); }

  /* ---------- client names ---------- */
  var names = {}, namesAt = 0;
  function loadNames() {
    if (Date.now() - namesAt < 60000 && Object.keys(names).length) return Promise.resolve();
    return post('listUsers').then(function (r) {
      if (r && r.users) { r.users.forEach(function (u) { names[String(u.email).toLowerCase()] = u.name || ''; }); namesAt = Date.now(); }
    });
  }
  function nameOf(email) { var n = names[String(email || '').toLowerCase()]; return n || String(email || '').split('@')[0]; }
  function applyName(email) {
    var n = nameOf(email);
    try { if (!localStorage.getItem(BAK)) localStorage.setItem(BAK, localStorage.getItem('user_name') || 'Admin'); } catch (e) {}
    try { localStorage.setItem('user_name', n); } catch (e) {}
    var bar = $('adminBackBar');
    if (bar) { var sp = bar.querySelector('span'); if (sp) sp.textContent = '👁 Viewing client: ' + n + ' — ' + email + ' · everything you do here is applied to this client'; }
    try { if (typeof renderCard === 'function' && window.st && st.card) { if (!st.card._named) { /* never persisted: view mode does not save */ } renderCard(); } } catch (e) {}
    try { if (typeof render === 'function' && window.st) render(); } catch (e) {}
  }

  var origView = window.adminViewClient;
  if (typeof origView === 'function') {
    window.adminViewClient = function (email, restore) {
      var args = arguments, self = this, done = false;
      function go() {
        if (done) return; done = true;
        try { localStorage.setItem('user_name', nameOf(email)); if (!localStorage.getItem(BAK)) localStorage.setItem(BAK, 'Admin'); } catch (e) {}
        var r = origView.apply(self, args);
        applyName(email);
        setTimeout(function () { applyName(email); }, 800);        // after the state has loaded
        setTimeout(function () { applyName(email); }, 2500);
        return r;
      }
      try { if (!localStorage.getItem(BAK)) localStorage.setItem(BAK, localStorage.getItem('user_name') || 'Admin'); } catch (e) {}
      loadNames().then(go, go); setTimeout(go, 1500);
    };
  }
  var origBack = window.backToAdmin;
  if (typeof origBack === 'function') {
    window.backToAdmin = function () {
      var r = origBack.apply(this, arguments);
      try { var b = localStorage.getItem(BAK); if (b) { localStorage.setItem('user_name', b); localStorage.removeItem(BAK); } } catch (e) {}
      return r;
    };
  }

  /* ---------- withdrawals made in view mode belong to the client ---------- */
  var _fetch = window.fetch;
  window.fetch = function (url, init) {
    try {
      if (window.adminViewingEmail && typeof url === 'string' && url.indexOf('action=withdraw') > -1 && url.indexOf('action=withdrawal') < 0 && init && typeof init.body === 'string') {
        var b = JSON.parse(init.body); if (!b.email) { b.email = window.adminViewingEmail; init = Object.assign({}, init, { body: JSON.stringify(b) }); }
      }
    } catch (e) {}
    return _fetch.call(this, url, init);
  };

  /* ---------- Deposit in view mode = real credit ---------- */
  document.addEventListener('click', function (e) {
    var t = e.target; if (!t || !t.closest || !t.closest('#mOk')) return;
    if (!window.adminViewingEmail || typeof mode === 'undefined' || mode !== 'add') return;
    e.preventDefault(); e.stopImmediatePropagation();
    var amt = Number(($('mAmount') || {}).value), method = ($('mMethod') || {}).value || 'Deposit';
    if (!(amt > 0)) { toast2('Please enter a valid amount', true); return; }
    var email = window.adminViewingEmail;
    if (!confirm('Credit ' + amt + ' USD to ' + email + '?\nThis is saved on the client account and recorded in the activity log.')) return;
    var btn = $('mOk'); if (btn) btn.disabled = true;
    post('updateUserBalance', { email: email, amount: amt, note: 'Deposit via ' + method + ' (added by admin)' }).then(function (r) {
      if (btn) btn.disabled = false;
      if (!r || !r.ok) { toast2((r && r.error) || 'Could not add the deposit', true); return; }
      toast2('✓ ' + amt + ' USD credited to the client');
      if (typeof closeModal === 'function') closeModal();
      if (typeof refreshBalanceFromServer === 'function') refreshBalanceFromServer();
      setTimeout(function () { if (typeof refreshBalanceFromServer === 'function') refreshBalanceFromServer(); }, 1200);
    });
  }, true);
})();
