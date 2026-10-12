/* ============================================================
   KYC SCREEN FIX — принудительно показывает pendingScreen
   ============================================================ */
(function () {
  'use strict';

  function applyFix() {
    var login = document.getElementById('loginScreen');
    var pending = document.getElementById('pendingScreen');
    var main = document.getElementById('mainApp');
    var sidebar = document.getElementById('sideBar');

    if (!pending) return;

    // Если pendingScreen активен (class 'on') — покажем его поверх всех
    if (pending.classList.contains('on')) {
      // Скрываем логин полностью
      if (login) {
        login.style.display = 'none';
        login.style.opacity = '0';
        login.style.pointerEvents = 'none';
      }
      // Показываем pending поверх всего
      pending.style.display = 'flex';
      pending.style.zIndex = '9999';
      pending.style.position = 'fixed';
      pending.style.inset = '0';
      pending.style.visibility = 'visible';
      pending.style.opacity = '1';

      console.log('[NC-Fix] ✅ KYC pendingScreen forced visible');
    }

    // Если rejectedScreen активен — тоже показать
    var rejected = document.getElementById('rejectedScreen');
    if (rejected && rejected.classList.contains('on')) {
      if (login) {
        login.style.display = 'none';
        login.style.opacity = '0';
      }
      rejected.style.display = 'flex';
      rejected.style.zIndex = '9999';
      rejected.style.position = 'fixed';
      rejected.style.inset = '0';
      console.log('[NC-Fix] ✅ KYC rejectedScreen forced visible');
    }

    // Если mainApp активен — скрываем pending (на случай залипания)
    if (main && main.style.display === 'flex' && main.offsetParent !== null) {
      if (pending) pending.style.display = 'none';
    }
  }

  // Запускаем при загрузке
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyFix);
  } else {
    applyFix();
  }

  // И каждые 500ms на случай поздней инициализации
  setInterval(applyFix, 500);

  console.log('[NC-Fix] 🛡️ KYC screen fix loaded');
})();
