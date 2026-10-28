/* FAST PRO — after "Confirm" on a crypto deposit the window closes by itself and the site keeps watching in the background (fast).
   Also: instant admin refresh of deposits / KYC counters. Load at the end of <body>, after perf-pro.js and app.legacy.js. */
(function () {
  'use strict';
  if (window.__fastPro) return; window.__fastPro = true;
  var $ = function (id) { return document.getElementById(id); };

  /* ---------- small "waiting for deposit" pill ---------- */
  var css = '.nc-wait{position:fixed;left:16px;bottom:16px;z-index:99990;display:flex;align-items:center;gap:12px;max-width:min(380px,calc(100vw - 32px));padding:12px 14px 12px 16px;border-radius:16px;background:#12141a;color:#f4f5f8;border:1px solid rgba(198,255,61,.35);box-shadow:0 18px 40px -12px rgba(0,0,0,.7);font:600 13px/1.35 Inter,system-ui,sans-serif;opacity:0;transform:translateY(10px);transition:opacity .25s,transform .25s}' +
    '.nc-wait.on{opacity:1;transform:none}.nc-wait small{display:block;font-weight:500;color:#98a0b3;margin-top:2px}' +
    '.nc-wait i{flex:none;width:10px;height:10px;border-radius:50%;background:#c8ff4d;box-shadow:0 0 0 0 rgba(200,255,77,.6);animation:ncw 1.6s infinite}' +
    '@keyframes ncw{70%{box-shadow:0 0 0 10px rgba(200,255,77,0)}100%{box-shadow:0 0 0 0 rgba(200,255,77,0)}}' +
    '.nc-wait button{flex:none;margin-left:4px;width:26px;height:26px;border-radius:8px;color:#98a0b3;font-size:16px;line-height:1}.nc-wait button:hover{background:rgba(255,255,255,.08);color:#fff}' +
    'html[data-theme="light"] .nc-wait{background:#fff;color:#0b0d14;border-color:rgba(61,107,0,.4)}html[data-theme="light"] .nc-wait small{color:#586074}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var pill = null, pillTimer = 0;
  function showPill(coin) {
    hidePill();
    pill = document.createElement('div'); pill.className = 'nc-wait'; pill.setAttribute('role', 'status');
    pill.innerHTML = '<i></i><div>Waiting for your ' + (coin || 'crypto') + ' deposit<small>We are watching the blockchain and will notify you the moment it arrives.</small></div><button type="button" aria-label="Hide">×</button>';
    pill.querySelector('button').onclick = function () { hidePill(); };
    document.body.appendChild(pill); requestAnimationFrame(function () { pill && pill.classList.add('on'); });
    pillTimer = setInterval(function () {                       // hide as soon as the incoming-deposit / survey window opens, or when the fast window is over
      if (window.__ncIncomingOpen || window.__ncSurveyOpen || document.querySelector('.nc-df-modal') || (window.__ncFastUntil || 0) < Date.now()) hidePill();
    }, 1000);
  }
  function hidePill() { if (pillTimer) { clearInterval(pillTimer); pillTimer = 0; } if (pill) { var p = pill; pill = null; p.classList.remove('on'); setTimeout(function () { p.remove(); }, 300); } }

  /* ---------- Confirm on "Add Funds" (crypto) ---------- */
  document.addEventListener('click', function (e) {
    var t = e.target; if (!t || !t.closest || !t.closest('#mOk')) return;
    try {
      if (typeof mode === 'undefined' || mode !== 'add') return;
      var m = ($('mMethod') || {}).value, a = Number(($('mAmount') || {}).value);
      if (!(a > 0) || (m !== 'Bitcoin (BTC)' && m !== 'Ethereum (ETH)')) return;
      var coin = m === 'Bitcoin (BTC)' ? 'BTC' : 'ETH';
      if (typeof getDepositWallet === 'function' && !getDepositWallet(coin)) return;       // the original handler shows the error, keep the window open
      /* the original handler runs right after this one (toast + first check); close the window right behind it */
      setTimeout(function () {
        if (typeof closeModal === 'function') closeModal();
        if (window.NCPerf) window.NCPerf.fast(30);
        showPill(coin);
      }, 60);
    } catch (er) {}
  }, true);

  /* ---------- admin: react at once, not on the next timer ---------- */
  var adminBusy = false;
  function adminPulse() {
    if (adminBusy || document.hidden) return;
    var ap = $('adminPanel'); if (!ap || !ap.classList.contains('on')) return;
    if (typeof getSessionToken !== 'function' || typeof WORKER_URL === 'undefined') return;
    adminBusy = true;
    fetch(WORKER_URL + '?action=listPendingDeposits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: getSessionToken() }) })
      .then(function (r) { return r.json(); }).then(function (d) {
        if (!d || !d.ok && !d.deposits) return;
        var n = (d.deposits || []).length, prev = Number(sessionStorage.getItem('nc_admin_prev_dep') || 0);
        if (n > prev) {
          if (typeof playChime === 'function') playChime();
          if (typeof toast === 'function') toast('💰 New deposit pending');
          if (typeof showAdminTab === 'function' && /^(deposits|stats)$/.test(localStorage.getItem('adminTab') || '')) showAdminTab(localStorage.getItem('adminTab'));
        }
        var nd = $('navDepositsCount'); if (nd) { nd.textContent = n; nd.style.display = n ? 'inline-block' : 'none'; }
        sessionStorage.setItem('nc_admin_prev_dep', String(n));      // the old 5-second loop sees the same number and stays quiet (no double chime)
      }).catch(function () {}).then(function () { adminBusy = false; });
  }
  setInterval(adminPulse, 4000);
})();
