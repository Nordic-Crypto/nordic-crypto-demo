/* ============================================================
   KYC SCREEN FIX v3.2 — не перебиваем pendingScreen
   ============================================================ */
(function () {
  'use strict';

  function log() {
    console.log.apply(console, ['[NC-Fix v3.2]'].concat([].slice.call(arguments)));
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

    // Скрываем всё остальное
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
  var status = (st.verification && st.verification.status) || null;
  if (status !== 'pending') return;  // 🛡️ работаем ТОЛЬКО с pending

  // Если pendingScreen УЖЕ виден — не трогаем
  if (isPendingVisible()) return;

  // 🛡️ НЕ форсируем, если mainApp/sideBar уже видны (approved)
  var main = document.getElementById('mainApp');
  var side = document.getElementById('sideBar');
  if (main && main.style.display === 'flex') return;
  if (side && side.style.display === 'flex') return;

  // Только теперь форсируем
  log('status=pending, app скрыт → forceShow');
  forceShowPending();
}
    // Для approved и rejected — НЕ трогаем здесь, app.legacy решает
  }

  // Периодическая проверка — 2 секунды
  setInterval(applyFix, 2000);

  document.addEventListener('nc:auth:login', function () {
    setTimeout(applyFix, 500);
    setTimeout(applyFix, 1500);
  });

  // После submit KYC — ждём 2 сек, потом если pending не показан — форсируем
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

  // Начальная проверка
  setTimeout(applyFix, 800);

  log('🛡️ KYC screen fix v3.2 loaded');
})();
