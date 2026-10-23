/* ============================================================
   NC BOOT GUARD v1.2
   - Ждёт, пока loadFromServer завершится (сам факт запроса)
   - Не показывает ошибку, пока идёт загрузка
   - Показывает "Try again" только при РЕАЛЬНОМ сбое
   ============================================================ */
(function () {
  'use strict';

  var OVERLAY_ID = 'ncBootOverlay';
  var watchdogTimer = null;
  var waiting = false;
  var loadStartedAt = 0;
  var LOAD_MIN_MS = 45000; // 45 сек — запас на медленный Worker

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
      '#' + OVERLAY_ID + ' .nb-note{margin-top:18px;font-size:.8rem;color:#6f7d94}' +
      '@keyframes ncbSpin{to{transform:rotate(360deg)}}';
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
      ['session_token','user_email','user_role','user_name','session_expires','nc_current_user']
        .forEach(function (k) { localStorage.removeItem(k); });
    } catch (e) {}
    window.location.replace('index.html');
  }

  function loading(msg) {
    var o = ensureOverlay();
    o.innerHTML = '<div class="nb-card"><div class="nb-spin"></div>' +
      '<h1>' + esc(msg || 'Loading…') + '</h1><p>This takes a few seconds.</p></div>';
    o.className = 'on';
    waiting = true;
    loadStartedAt = Date.now();
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
      '<div class="nb-row"><button class="nb-pri" id="ncbRetry">Try again</button>' +
      '<button id="ncbOut">Sign out</button></div>' +
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

  /* Что-то видно на экране? */
  function shown(el) {
    if (!el) return false;
    var r = el.getBoundingClientRect();
    if (r.width < 50 || r.height < 50) return false;
    var cs = window.getComputedStyle(el);
    if (cs.display === 'none') return false;
    if (cs.visibility === 'hidden') return false;
    if (parseFloat(cs.opacity || '1') < 0.05) return false;
    return true;
  }

  function somethingVisible() {
    var ids = ['sideBar','mainApp','adminPanel','pendingScreen','rejectedScreen','verifyScreen','onboard'];
    for (var i = 0; i < ids.length; i++) {
      if (shown($(ids[i]))) return true;
    }
    return false;
  }

  function hasSession() {
    try { return !!localStorage.getItem('session_token'); } catch (e) { return false; }
  }

  function armWatchdog() {
    clearTimeout(watchdogTimer);
    watchdogTimer = setTimeout(function () {
      var o = $(OVERLAY_ID);
      var isErrorScreen = o && o.classList.contains('on') && $('ncbRetry');
      if (isErrorScreen) return;

      // ✅ ГЛАВНОЕ: если что-то видно — закрываем overlay
      if (somethingVisible()) { done(); return; }

      // ✅ ГЛАВНОЕ: если идёт загрузка — ждём дальше (не показываем ошибку)
      if (typeof window.st === 'undefined' || !window.stateLoaded) {
        // state ещё не загружен — ждём
        armWatchdog();
        return;
      }

      // ✅ Если state загружен, но экран не показан — даём ещё 5 сек
      var elapsed = Date.now() - loadStartedAt;
      if (elapsed < LOAD_MIN_MS) { armWatchdog(); return; }

      // Только теперь ошибка
      fail('timeout', new Error('no visible screen after ' + elapsed + 'ms'));
    }, 3000);
  }

  /* Событие: auth login */
  document.addEventListener('nc:auth:login', function () {
    if (hasSession()) armWatchdog();
  });

  /* Событие: state загружен — сразу закрываем overlay */
  document.addEventListener('nc:state:loaded', function () {
    if (somethingVisible()) done();
  });

  /* На загрузке страницы с живой сессией */
  window.addEventListener('load', function () {
    if (!hasSession()) return;
    setTimeout(function () {
      var o = $(OVERLAY_ID);
      if (o && o.classList.contains('on') && $('ncbRetry')) return;
      if (!somethingVisible()) armWatchdog();
      else done();
    }, 500);
  });

  /* Каждые 2 сек — если видно UI, закрываем overlay */
  setInterval(function () {
    var o = $(OVERLAY_ID);
    if (!o || !o.classList.contains('on')) return;
    if ($('ncbRetry')) return; // это экран ошибки
    if (somethingVisible()) done();
  }, 2000);

  window.NCBoot = { loading: loading, done: done, fail: fail, somethingVisible: somethingVisible };
})();
