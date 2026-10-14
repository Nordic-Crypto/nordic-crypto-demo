/* ============================================================
   KYC SCREEN FIX v3 — синхронизация DOM с verification.status
   ============================================================ */
(function () {
  'use strict';

  var DEBUG = true;

  function log() {
    if (DEBUG) console.log.apply(console, ['[NC-Fix v3]'].concat([].slice.call(arguments)));
  }

  // Принудительно показать элемент поверх всего
  function showEl(el, zIndex) {
    if (!el) return;
    el.style.display = 'flex';
    el.style.visibility = 'visible';
    el.style.opacity = '1';
    el.style.position = 'fixed';
    el.style.inset = '0';
    el.style.zIndex = String(zIndex || 9999);
    el.classList.add('on');
  }

  // Спрятать элемент
  function hideEl(el) {
    if (!el) return;
    el.style.display = 'none';
    el.classList.remove('on');
  }

  // Спрятать всё, кроме целевого
  function hideAllExcept(targetId) {
    var ids = ['loginScreen', 'pendingScreen', 'verifyScreen', 'rejectedScreen', 'onboard', 'mainApp'];
    ids.forEach(function (id) {
      if (id === targetId) return;
      var el = document.getElementById(id);
      if (el) hideEl(el);
    });
    var sb = document.getElementById('sideBar');
    if (sb && targetId !== 'mainApp') hideEl(sb);
  }

  // Главная функция: сверяем DOM с данными
  function applyFix() {
    // 1. Если st ещё не загружен — выходим
    if (typeof st === 'undefined' || !st) return;

    // 2. Получаем статус KYC из данных (а не из DOM!)
    var kycStatus = (st.verification && st.verification.status) || null;
    var locked = !!st._verificationLocked;

    // 3. Куда должны показывать
    var targetScreen = null;
    if (kycStatus === 'approved') {
      targetScreen = 'mainApp';          // ← дашборд
    } else if (kycStatus === 'pending') {
      targetScreen = 'pendingScreen';    // ← в процессе
    } else if (kycStatus === 'rejected') {
      targetScreen = 'rejectedScreen';   // ← отклонено
    }
    // kycStatus === null → ничего не форсим (пусть app.legacy решает)

    if (!targetScreen) return;

    var target = document.getElementById(targetScreen);
    if (!target) return;

    // 4. Уже показан нужный? Тогда ничего не делаем
    if (target.classList.contains('on') && target.style.display !== 'none') {
      return;
    }

    // 5. Форсим
    log('KYC=' + kycStatus + ' → форсим ' + targetScreen);
    hideAllExcept(targetScreen);
    showEl(target, kycStatus === 'approved' ? 1 : 9999);

    // Побочка: если approved — прячем login и pending, показываем sidebar
    if (kycStatus === 'approved') {
      hideEl(document.getElementById('loginScreen'));
      hideEl(document.getElementById('pendingScreen'));
      var sb = document.getElementById('sideBar');
      if (sb) { sb.style.display = ''; sb.classList.remove('off'); }
    }
  }

  // Запуск: только 1 раз при загрузке + после ключевых событий
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyFix);
  } else {
    applyFix();
  }

  // Реагируем на события, а не крутим таймер
  document.addEventListener('nc:auth:login', function () {
    setTimeout(applyFix, 500);
    setTimeout(applyFix, 1500);
  });

  document.addEventListener('nc:kyc:submit', function () {
    setTimeout(applyFix, 300);
    setTimeout(applyFix, 1200);
  });

  // Плюс редкий поллинг на случай, если события не сработали (раз в 2 сек)
  setInterval(applyFix, 2000);

  log('🛡️ KYC screen fix v3 loaded (event-based + 2s fallback)');
})();
