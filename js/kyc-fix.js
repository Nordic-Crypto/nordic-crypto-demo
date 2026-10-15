/* ============================================================
   KYC SCREEN FIX v3.1 — аккуратная синхронизация DOM с данными
   ============================================================ */
(function () {
  'use strict';

  var DEBUG = true;

  function log() {
    if (DEBUG) console.log.apply(console, ['[NC-Fix v3.1]'].concat([].slice.call(arguments)));
  }

  // Лёгкое скрытие — без position:fixed
  function hideEl(el) {
    if (!el) return;
    el.classList.remove('on');
    el.style.display = 'none';
  }

  // Лёгкое показывание — БЕЗ position:fixed, БЕЗ inset
  // Для mainApp используется display:flex (как в app.legacy), для оверлеев — flex
  function showEl(el, opts) {
    if (!el) return;
    opts = opts || {};
    el.classList.add('on');
    el.style.display = 'flex';
    el.style.visibility = 'visible';
    el.style.opacity = '1';

    // Только для оверлеев (pending/rejected/verify) — на весь экран
    if (opts.overlay) {
      el.style.position = 'fixed';
      el.style.inset = '0';
      el.style.zIndex = String(opts.zIndex || 9999);
    } else {
      // Для mainApp — сбрасываем возможные форс-стили от старых версий
      el.style.position = '';
      el.style.inset = '';
      el.style.zIndex = '';
    }
  }

  // Показать только target, остальное спрятать
  function showOnly(targetId, opts) {
    var ids = ['loginScreen', 'pendingScreen', 'verifyScreen', 'rejectedScreen', 'onboard', 'mainApp'];
    ids.forEach(function (id) {
      if (id === targetId) return;
      hideEl(document.getElementById(id));
    });

    var sb = document.getElementById('sideBar');
    if (sb) {
      if (targetId === 'mainApp') {
        sb.style.display = '';
        sb.classList.remove('off');
      } else {
        hideEl(sb);
      }
    }

    var target = document.getElementById(targetId);
    if (target) showEl(target, opts);
  }

  function applyFix() {
    if (typeof st === 'undefined' || !st) return;

    var kycStatus = (st.verification && st.verification.status) || null;

    // Ничего не решаем, если статус пустой — пусть app.legacy сам
    if (!kycStatus) return;

    var target, opts;

    if (kycStatus === 'approved') {
      target = 'mainApp';
      opts = { overlay: false };
    } else if (kycStatus === 'pending') {
      target = 'pendingScreen';
      opts = { overlay: true, zIndex: 9999 };
    } else if (kycStatus === 'rejected') {
      target = 'rejectedScreen';
      opts = { overlay: true, zIndex: 9999 };
    } else {
      return;
    }

    var el = document.getElementById(target);
    if (!el) return;

       // 🛡️ FIX: если уже правильно показан — не трогаем (и для overlay тоже)
    var isOn = el.classList.contains('on') && el.style.display !== 'none';
    if (isOn) return;

    // Проверяем что "лишние" экраны спрятаны
    if (!opts.overlay) {
      var needFix = false;
      ['loginScreen', 'pendingScreen', 'verifyScreen', 'rejectedScreen', 'onboard'].forEach(function (id) {
        var e = document.getElementById(id);
        if (e && e.classList.contains('on')) needFix = true;
      });
      if (!needFix && isOn) return;
    }

    log('KYC=' + kycStatus + ' → показываем ' + target);
    showOnly(target, opts);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyFix);
  } else {
    applyFix();
  }

  document.addEventListener('nc:auth:login', function () {
    setTimeout(applyFix, 500);
    setTimeout(applyFix, 1500);
  });

  document.addEventListener('nc:kyc:submit', function () {
    setTimeout(applyFix, 300);
    setTimeout(applyFix, 1200);
  });

  // Fallback: раз в 3 сек (реже, чтобы не мешать)
  setInterval(applyFix, 3000);

  log('🛡️ KYC screen fix v3.1 loaded (no position:fixed for mainApp)');
})();
