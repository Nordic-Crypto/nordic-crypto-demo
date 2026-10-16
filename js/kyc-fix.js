/* ============================================================
   KYC SCREEN FIX v3.5 — не перебиваем pendingScreen
   ============================================================ */
(function () {
  'use strict';

  function log() {
    console.log.apply(console, ['[NC-Fix v3.5]'].concat([].slice.call(arguments)));
  }

  function isPendingVisible() {
    var p = document.getElementById('pendingScreen');
    if (!p) return false;
    return p.classList.contains('on') || p.style.display === 'flex';
  }

  function forceShowPending() {
    var p = document.getElementById('pendingScreen');
    if (!p) return;
    p.classList.add('on');
    p.style.cssText = 'display:flex !important;visibility:visible !important;opacity:1 !important;z-index:99999 !important;position:fixed !important;inset:0 !important;';

    ['verifyScreen', 'rejectedScreen', 'onboard', 'loginScreen'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) { el.classList.remove('on'); el.style.display = 'none'; }
    });
    var side = document.getElementById('sideBar');
    if (side) side.style.display = 'none';
    var main = document.getElementById('mainApp');
    if (main) main.style.display = 'none';
  }

  function applyFix() {
    if (typeof st === 'undefined' || !st) return;
    if (window.__ncLoadFailed) return;                       // экран ошибки загрузки важнее
    var boot = document.getElementById('ncBootOverlay');
    if (boot && boot.classList.contains('on')) return;       // идёт загрузка/ошибка — не вмешиваемся
    var status = (st.verification && st.verification.status) || null;
    if (status !== 'pending') return;
    if (isPendingVisible()) return;

    var main = document.getElementById('mainApp');
    var side = document.getElementById('sideBar');
    if (main && main.style.display === 'flex') return;
    if (side && side.style.display === 'flex') return;

    log('status=pending, app скрыт → forceShow');
    forceShowPending();
  }

  setInterval(applyFix, 5000);

  document.addEventListener('nc:auth:login', function () {
    setTimeout(applyFix, 500);
    setTimeout(applyFix, 1500);
  });

  document.addEventListener('nc:kyc:submit', function () {
    log('📨 nc:kyc:submit — проверю pending через 2 сек');
    setTimeout(function () {
      if (!isPendingVisible()) {
        log('⚠️ pending не показан через 2 сек → forceShow');
        forceShowPending();
      } else {
        log('✅ pending уже показан — не трогаю');
      }
    }, 2000);
  });

  setTimeout(applyFix, 800);

  log('🛡️ KYC screen fix v3.5 loaded');
})();
