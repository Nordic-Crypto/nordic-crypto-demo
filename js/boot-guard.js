/* ============================================================
   NC BOOT GUARD v1.0
   Цель: клиент НИКОГДА не видит пустой экран после входа.
   - показывает "Loading…" пока грузятся данные
   - если загрузка упала → экран с кнопками Retry / Sign out
   - watchdog: если через 8 сек после входа нет ни одного видимого экрана → тот же экран ошибки
   - ничего не пишет на сервер и не трогает данные клиента
   Подключать СРАЗУ ПОСЛЕ app.legacy.js
   ============================================================ */
(function () {
  'use strict';

  var OVERLAY_ID = 'ncBootOverlay';
  var WATCHDOG_MS = 20000;
  var watchdogTimer = null;
  var waiting = false;

  function $(id) { return document.getElementById(id); }

  function ensureStyles() {
    if ($('ncBootStyles')) return;
    var css = '' +
      '#' + OVERLAY_ID + '{position:fixed;inset:0;z-index:100000;display:none;align-items:center;justify-content:center;' +
      'padding:24px;background:radial-gradient(900px 500px at 25% 10%,rgba(0,212,255,.14),transparent 60%),' +
      'radial-gradient(800px 500px at 75% 90%,rgba(124,58,237,.16),transparent 60%),#070b14;color:#e8eef9;' +
      'font-family:"Schibsted Grotesk",system-ui,-apple-system,"Segoe UI",sans-serif}' +
      '#' + OVERLAY_ID + '.on{display:flex}' +
      '#' + OVERLAY_ID + ' .nb-card{width:100%;max-width:400px;text-align:center}' +
      '#' + OVERLAY_ID + ' .nb-spin{width:44px;height:44px;margin:0 auto 22px;border-radius:50%;' +
      'border:3px solid rgba(255,255,255,.12);border-top-color:#00d4ff;animation:ncbSpin .8s linear infinite}' +
      '#' + OVERLAY_ID + ' h1{font-size:1.35rem;font-weight:700;margin:0 0 8px;letter-spacing:-.02em}' +
      '#' + OVERLAY_ID + ' p{margin:0 0 24px;color:#93a0b5;font-size:.95rem;line-height:1.5}' +
      '#' + OVERLAY_ID + ' .nb-row{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}' +
      '#' + OVERLAY_ID + ' button{font-weight:600;font-size:.95rem;font-family:inherit;padding:13px 22px;border-radius:12px;cursor:pointer;border:1px solid rgba(255,255,255,.16);' +
      'background:transparent;color:inherit;min-height:46px}' +
      '#' + OVERLAY_ID + ' button.nb-pri{background:linear-gradient(135deg,#00d4ff,#7c3aed);border-color:transparent;color:#fff}' +
      '#' + OVERLAY_ID + ' button:focus-visible{outline:2px solid #9fd3ff;outline-offset:2px}' +
      '#' + OVERLAY_ID + ' .nb-note{margin-top:18px;font-size:.8rem;color:#6f7d94}' +
      '@keyframes ncbSpin{to{transform:rotate(360deg)}}' +
      '@media (prefers-reduced-motion:reduce){#' + OVERLAY_ID + ' .nb-spin{animation-duration:2.4s}}';
    var el = document.createElement('style');
    el.id = 'ncBootStyles';
    el.textContent = css;
    document.head.appendChild(el);
  }

  function ensureOverlay() {
    ensureStyles();
    var o = $(OVERLAY_ID);
    if (o) return o;
    o = document.createElement('div');
    o.id = OVERLAY_ID;
    o.setAttribute('role', 'status');
    o.setAttribute('aria-live', 'polite');
    document.body.appendChild(o);
    return o;
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function signOut() {
    if (typeof window.doLogout === 'function') { window.doLogout(); return; }
    try {
      ['session_token', 'user_email', 'user_role', 'user_name', 'session_expires', 'nc_current_user']
        .forEach(function (k) { localStorage.removeItem(k); });
    } catch (e) {}
    window.location.replace('index.html');
  }

  function loading(msg) {
    var o = ensureOverlay();
    o.innerHTML = '<div class="nb-card"><div class="nb-spin" aria-hidden="true"></div>' +
      '<h1>' + esc(msg || 'Loading…') + '</h1><p>This takes a few seconds.</p></div>';
    o.className = 'on';
    waiting = true;
    armWatchdog();
  }

  function done() {
    waiting = false;
    clearTimeout(watchdogTimer);
    var o = $(OVERLAY_ID);
    if (o) o.classList.remove('on');
  }

  function fail(kind, err, retry) {
    waiting = false;
    clearTimeout(watchdogTimer);
    try { console.error('[NCBoot] ' + kind, err); } catch (e) {}
    var o = ensureOverlay();
    var offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    var title = offline ? 'You’re offline' : 'We couldn’t load your account';
    var text = offline
      ? 'Check your internet connection, then try again. Your data is safe.'
      : 'Your data is safe and nothing was changed. Try again, or sign out and sign back in.';
    o.innerHTML = '<div class="nb-card"><h1>' + title + '</h1><p>' + text + '</p>' +
      '<div class="nb-row"><button class="nb-pri" id="ncbRetry" type="button">Try again</button>' +
      '<button id="ncbOut" type="button">Sign out</button></div>' +
      '<div class="nb-note">Code: ' + esc(kind) + '</div></div>';
    o.className = 'on';
    var r = $('ncbRetry'), s = $('ncbOut');
    if (r) r.onclick = function () {
      loading('Loading your account…');
      try {
        if (typeof retry === 'function') retry();
        else if (typeof window.showApp === 'function') window.showApp();
        else window.location.reload();
      } catch (e) { fail('retry', e); }
    };
    if (s) s.onclick = signOut;
  }

  /* ---------- watchdog: есть ли хоть что-то видимое ---------- */
  function shown(el) {
    if (!el) return false;
    var cs = window.getComputedStyle(el);
    return cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity || '1') > 0.05;
  }

  function somethingVisible() {
    var ids = ['sideBar', 'mainApp', 'adminPanel', 'pendingScreen', 'rejectedScreen', 'verifyScreen', 'onboard'];
    for (var i = 0; i < ids.length; i++) {
      var el = $(ids[i]);
      if (!el) continue;
      var isScreen = ids[i] !== 'sideBar' && ids[i] !== 'mainApp';
      if (isScreen ? (el.classList.contains('on') && shown(el)) : shown(el)) return true;
    }
    var login = $('loginScreen');
    if (login && !login.classList.contains('hidden') && shown(login)) return true;
    return false;
  }

  function hasSession() {
    try { return !!localStorage.getItem('session_token'); } catch (e) { return false; }
  }

  function armWatchdog() {
    clearTimeout(watchdogTimer);
    watchdogTimer = setTimeout(function () {
      var o = $(OVERLAY_ID);
      var overlayShowsError = o && o.classList.contains('on') && $('ncbRetry');
      if (overlayShowsError) return;
      // если всё ещё "Loading" или экран пуст — показать ошибку с Retry
      if (waiting || (hasSession() && !somethingVisible())) {
        fail('timeout', new Error('no visible screen after ' + WATCHDOG_MS + 'ms'));
      }
    }, WATCHDOG_MS);
  }

  /* ---------- события ---------- */
  document.addEventListener('nc:auth:login', function () {
    if (hasSession()) armWatchdog();
  });

  window.addEventListener('unhandledrejection', function (e) {
    try { console.warn('[NCBoot] unhandled rejection', e.reason); } catch (x) {}
  });

  // после возврата на вкладку: если сессия есть, а экрана нет — лечим
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) return;
    var o = $(OVERLAY_ID);
    if (o && o.classList.contains('on')) return;
    if (hasSession() && !somethingVisible()) armWatchdog();
  });

  // страховка при обычной загрузке страницы с живой сессией
  window.addEventListener('load', function () {
    if (hasSession()) setTimeout(function () {
      var o = $(OVERLAY_ID);
      if (o && o.classList.contains('on')) return;
      if (!somethingVisible()) armWatchdog();
    }, 1500);
  });

  window.NCBoot = { loading: loading, done: done, fail: fail, somethingVisible: somethingVisible };
})();
