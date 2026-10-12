/* ============================================================
   KYC SCREEN FIX v2 — принудительно показывает pendingScreen
   ============================================================ */
(function () {
  'use strict';

  function forceVisible(el, zIndex) {
    if (!el) return;
    el.style.display = 'flex';
    el.style.visibility = 'visible';
    el.style.opacity = '1';
    el.style.position = 'fixed';
    el.style.inset = '0';
    el.style.zIndex = String(zIndex || 9999);
    el.classList.add('on');
  }

  function applyFix() {
    var login    = document.getElementById('loginScreen');
    var pending  = document.getElementById('pendingScreen');
    var verify   = document.getElementById('verifyScreen');
    var rejected = document.getElementById('rejectedScreen');
    var onboard  = document.getElementById('onboard');
    var main     = document.getElementById('mainApp');
    var sidebar  = document.getElementById('sideBar');

    if (!pending) return;

    // Проверяем ТОЛЬКО по классу "on" — надёжнее
    var pendingActive = pending.classList.contains('on');
    var rejectedActive = rejected && rejected.classList.contains('on');
    var verifyActive = verify && verify.classList.contains('on');
    var mainActive = main && (main.style.display === 'flex' || main.classList.contains('on'));

    // 1. Если показан pendingScreen — прячем ВСЁ остальное
    if (pendingActive) {
      if (login)    { login.style.display = 'none'; login.style.pointerEvents = 'none'; }
      if (sidebar)  sidebar.style.display = 'none';
      if (main)     main.style.display = 'none';
      if (verify)   { verify.style.display = 'none'; verify.classList.remove('on'); }
      if (onboard)  onboard.classList.remove('on');
      if (rejected) { rejected.style.display = 'none'; rejected.classList.remove('on'); }
      forceVisible(pending, 9999);
      return;
    }

    // 2. Если показан rejectedScreen — прячем ВСЁ остальное
    if (rejectedActive) {
      if (login)   { login.style.display = 'none'; login.style.pointerEvents = 'none'; }
      if (sidebar) sidebar.style.display = 'none';
      if (main)    main.style.display = 'none';
      if (verify)  { verify.style.display = 'none'; verify.classList.remove('on'); }
      if (pending) pending.style.display = 'none';
      if (onboard) onboard.classList.remove('on');
      forceVisible(rejected, 9999);
      return;
    }

    // 3. Если verifyScreen показан — тоже убираем логин
    if (verifyActive) {
      if (login)   { login.style.display = 'none'; login.style.pointerEvents = 'none'; }
      if (pending) pending.style.display = 'none';
      if (rejected) rejected.style.display = 'none';
      return;
    }

    // 4. Если mainApp показан — убираем pending и login
    if (mainActive) {
      if (login)   { login.style.display = 'none'; login.style.pointerEvents = 'none'; }
      if (pending) pending.style.display = 'none';
      if (rejected) rejected.style.display = 'none';
      if (verify) { verify.style.display = 'none'; }
    }
  }

  // Запуск: при загрузке + каждые 300ms (быстрее реагирует)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyFix);
  } else {
    applyFix();
  }
  setInterval(applyFix, 300);

  // 🎁 Отлавливаем moment когда showPendingScreen вызывается
  document.addEventListener('nc:auth:login', function() {
    setTimeout(applyFix, 500);
    setTimeout(applyFix, 1500);
  });

  console.log('[NC-Fix] 🛡️ KYC screen fix v2 loaded (300ms interval)');
})();
