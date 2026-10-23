/* ═══════════════════════════════════════════════════════════════
   NORDIC CRYPTO — APP.LEGACY.JS v7.0 — MONOLITH
   ═══════════════════════════════════════════════════════════════
   Part 1/4: PART A — STATE, UTILS, AUTH, SAVE/LOAD, RENDER
   Part 2/4: PART B — NOTIFICATIONS, WITHDRAW, TX DETAILS, IBAN
   Part 3/4: PART C — KYC, CARDS, CHAT, ONBOARDING, MODALS
   Part 4/4: PART D — ADMIN, EXCHANGE, DEPOSITS

   Loaded AFTER core.js and auth.js are REMOVED.
   This file is self-contained monolith.
   ═══════════════════════════════════════════════════════════════ */

/* ═══════════════════════ PART A — STATE ═══════════════════════ */

window.isAdmin = function () {
  return localStorage.getItem('user_role') === 'admin' &&
         localStorage.getItem('user_email') === 'admin@nordiccrypto.com';
};
function isAdmin() { return window.isAdmin(); }

var WORKER_LOGIN_URL = 'https://nordic-deposit-checker.otis-790.workers.dev';
var WORKER_URL = WORKER_LOGIN_URL;

var DEPOSIT_WALLETS = {
  'lundgrenhem@gmail.com': {
    btc: '19YWxuHf1TbdZzZdV9FSzYfops6M2GLhe7',
    eth: '0xFB7A7956Af77061D3B5f3B357ef9c0a22CD60e97'
  }
};

var SESSION_TIMEOUT_MS = 5 * 60 * 1000;
var LOGOUT_COUNTDOWN = 60;
var sessionTimer = null, countdownTimer = null, countdownLeft = 60;

/* ─────────────── UTILS ─────────────── */
function $(i) { return document.getElementById(i); }
// Safe argument for inline onclick handlers: a JSON string, HTML-escaped
function ncArg(v) { return escapeHtml(JSON.stringify(String(v == null ? '' : v))); }

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
function fmt(n) {
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function eurF(n) {
  return '≈ €' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function now() { return new Date().toISOString().slice(0, 10); }
function getSessionToken() { return localStorage.getItem('session_token'); }
function setSessionToken(t) { localStorage.setItem('session_token', t); }
function clearSessionToken() { localStorage.removeItem('session_token'); }

/* ─────────────── GLOBAL STATE ─────────────── */
var def = {
  usd: 0, btc: 0, eth: 0, usdt: 0, sol: 0, bnb: 0,
  btcP: 68000, ethP: 3200, eurR: 0.92, sekR: 10.45,
  currency: 'USD', txs: [], order: null, card: null,
  notifications: [], withdrawals: [], balanceHistory: [],
  pendingDeposits: [], depositVerifications: [],
  chat: [], ticket: null, typing: {},
  verification: null, cryptoAddress: null,
  orders: [], openOrders: [], trades: [],
  user: { verified: false, accountType: null, iban: null }
};
var st = JSON.parse(JSON.stringify(def));
var stateLoaded = false;
var mode = null, tt = null;
var autoCheckTimer = null, autoCheckKnown = {};
var cvvVisible = false, cvvTimer = null;
var selectedDesign = 'cosmic', onbType = 'Visa', onbCur = 'USD';

/* ─────────────── DEPOSIT WALLET LOOKUP ─────────────── */
function getDepositWallet(coin) {
  if (st && st.cryptoAddress) {
    var addr = coin === 'BTC' ? st.cryptoAddress.btc : st.cryptoAddress.eth;
    if (addr) return addr;
  }
  var email = (window.adminViewingEmail || localStorage.getItem('user_email') || '').toLowerCase();
  var w = DEPOSIT_WALLETS[email];
  if (!w) return null;
  return coin === 'BTC' ? w.btc : w.eth;
}

/* ═══════════════════ SERVER SYNC ═══════════════════ */
/* 🛡️ v7.1: stateTrusted = true только если сервер реально вернул данные клиента.
   Если загрузка не удалась — НИКОГДА не сохраняем дефолтный state поверх данных на сервере. */
var stateTrusted = false;
window.__ncLoadFailed = false;

function _ncNormalizeState(data) {
  var d = JSON.parse(JSON.stringify(def));
  if (data && typeof data === 'object') { for (var k in data) { if (Object.prototype.hasOwnProperty.call(data, k)) d[k] = data[k]; } }
  if (!d.txs) d.txs = [];
  if (!d.balanceHistory) d.balanceHistory = [];
  if (!d.withdrawals) d.withdrawals = [];
  if (!d.pendingDeposits) d.pendingDeposits = [];
  if (!d.depositVerifications) d.depositVerifications = [];
  if (!d.card || typeof d.card !== 'object') d.card = null;
  if (!d.chat) d.chat = [];
  if (!d.ticket) d.ticket = null;
  if (!d.typing) d.typing = {};
  if (!d.verification) d.verification = null;
  if (!d.user || typeof d.user !== 'object') d.user = { verified: false, accountType: null, iban: null };
  return d;
}

function _ncFetchState(body, attempt) {
  var ctl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
  var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 8000);
  return fetch(WORKER_LOGIN_URL + '?action=getUserState', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: ctl ? ctl.signal : undefined
  }).then(function (r) { clearTimeout(timer); return r.json(); })
    .catch(function (err) {
      clearTimeout(timer);
      if (attempt < 1) return new Promise(function (res) { setTimeout(res, 800); }).then(function () { return _ncFetchState(body, attempt + 1); });
      throw err;
    });
}

function loadFromServer(cb, targetEmail) {
  var token = getSessionToken();
  if (!token) {
    st = JSON.parse(JSON.stringify(def));
    stateLoaded = true;
    stateTrusted = false;
    if (cb) cb();
    return;
  }
  var body = { token: token };
  if (targetEmail) body.email = targetEmail;
  window.__ncLoadFailed = false;

  _ncFetchState(body, 0)
    .then(function (data) {
      var isServerError = data && data.ok === false;
      var errText = isServerError ? String(data.error || '') : '';
            if (errText && /session|token|expired|unauthor|invalid/i.test(errText)) {
        // 🛡️ FIX: НЕ УДАЛЯЕМ ТОКЕН ПРИ F5.
        // Если сервер вернул ошибку, просто показываем экран логина, но токен оставляем в браузере.
        // Токен удаляется ТОЛЬКО при нажатии кнопки "Log out".
        console.warn('[NC] Server returned auth error, but we keep the session token to prevent F5 logout.');
        
        window.__ncLoadFailed = true;
        stateTrusted = false;
        stateLoaded = true;
        if (window.NCBoot) window.NCBoot.done();
        try { showLoginScreen(); } catch (e) {}
        if (cb) { try { cb(); } catch (e) {} }
        return;
      }
      if (errText && !/not.?found|no.?state|empty|new.?user/i.test(errText)) {
        throw new Error('server: ' + errText);
      }
      var stateData = (data && (data.ok === true || data.btc !== undefined || data.usd !== undefined)) ? data : null;
      st = _ncNormalizeState(stateData);
      stateLoaded = true;
      stateTrusted = true;

      try {
        localStorage.setItem(
          'nc_state_backup:' + (targetEmail || localStorage.getItem('user_email') || ''),
          JSON.stringify({ t: Date.now(), s: st })
        );
      } catch (e) {}

      try {
        var form = document.getElementById('chatTicketForm');
        var conv = document.getElementById('chatConversation');
        if (form) form.style.display = 'flex';
        if (conv) conv.style.display = 'none';
        var emailEl = document.getElementById('tkEmail');
        if (emailEl) emailEl.value = targetEmail || localStorage.getItem('user_email') || '';
        var topicEl = document.getElementById('chatTicketTopic');
        if (topicEl) topicEl.textContent = 'Support';
      } catch (e) { console.warn('[NC] chat init', e); }

      try { render(); } catch (e) { console.warn('[NC] render error (non-fatal)', e); }

      if (cb) {
        try { cb(); }
        catch (e) {
          console.error('[NC] post-load callback', e);
          if (window.NCBoot) window.NCBoot.fail('callback', e);
        }
      }
    })
    .catch(function (err) {
      console.error('[NC] loadFromServer failed — данные на сервере НЕ тронуты', err);
      window.__ncLoadFailed = true;
      stateTrusted = false;
      stateLoaded = true;
      if (window.NCBoot) {
        window.NCBoot.fail('load', err, function () { loadFromServer(cb, targetEmail); });
      }
    });
}

function saveToServer() {
  if (!stateTrusted) { console.warn('[NC] save skipped: state not loaded from server'); return; }
  if (window.adminViewingEmail) return;
  if (localStorage.getItem('user_role') === 'admin') return;
  var token = getSessionToken();
  if (!token) return;
  fetch(WORKER_LOGIN_URL + '?action=setUserState', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: token, state: st, email: window.adminViewingEmail || undefined })
  }).catch(function () {});
}

/* ═══════════════════ AUTH ═══════════════════ */
async function doLogin() {
  var emailEl = document.getElementById('loginEmail');
  var passEl = document.getElementById('loginPassword');
  var errorEl = document.getElementById('loginError');
  var btnLogin = document.getElementById('btnLogin');
  var loginForm = document.getElementById('loginForm');
  var loginLoading = document.getElementById('loginLoading');
  if (!emailEl || !passEl || !errorEl || !btnLogin || !loginForm || !loginLoading) { console.warn('[NC] login form is not on this page'); return; }
  var email = emailEl.value.trim().toLowerCase();
  var password = passEl.value;

  if (!email || !password) { showLoginError('Please enter email and password'); return; }

  errorEl.style.display = 'none';
  loginForm.style.display = 'none';
  loginLoading.style.display = 'block';
  btnLogin.disabled = true;

  try {
    var res = await fetch(WORKER_LOGIN_URL + '?action=login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: password })
    });
    var data = await res.json();

    if (data.ok && data.token) {
      localStorage.removeItem('user_email');
      localStorage.removeItem('user_role');
      localStorage.removeItem('user_name');
      setSessionToken(data.token);
      localStorage.setItem('user_email', data.user.email);
      localStorage.setItem('user_role', data.user.role);
      var niceName = data.user.name || 'User';
      if (!data.user.name) {
        var fromEmail = (data.user.email || '').split('@')[0];
        niceName = fromEmail.charAt(0).toUpperCase() + fromEmail.slice(1);
      }
      localStorage.setItem('user_name', niceName);
      hideLoginScreen();
      showApp();
      if (typeof startInactivityTimer === 'function') startInactivityTimer();
      playChime();
    } else {
      loginForm.style.display = 'block';
      loginLoading.style.display = 'none';
      btnLogin.disabled = false;
      showLoginError(data.error || 'Login failed');
      playTone(220, 0.2, 'sine', 0.3);
    }
  } catch (e) {
    loginForm.style.display = 'block';
    loginLoading.style.display = 'none';
    btnLogin.disabled = false;
    showLoginError('Connection error. Try again.');
  }
}

function showLoginError(msg) {
  var errorEl = document.getElementById('loginError');
  if (errorEl) { errorEl.textContent = msg; errorEl.style.display = 'block'; }
}

async function checkSession() {
  if (!stateLoaded) {
    console.log('[NC] checkSession: state not loaded yet, skipping');
    return;
  }
  var token = getSessionToken();
  var email = localStorage.getItem('user_email');
  if (!token) { showLoginScreen(); return; }
  try {
    var res = await fetch(WORKER_LOGIN_URL + '?action=verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: token })
    });
    var data = await res.json();
    if (data.ok && data.user) {
      localStorage.setItem('user_email', data.user.email);
      localStorage.setItem('user_role', data.user.role || 'user');
    } else {
      console.warn('[session] verify failed:', data);
      clearSessionToken();
      localStorage.removeItem('user_email');
      localStorage.removeItem('user_role');
    }
  } catch (e) { console.warn('[session] error:', e); }
}

function showLoginScreen() {
  var login = document.getElementById('loginScreen');
  if (!login) {
    // login lives on index.html: leave once per 30 s so we never redirect in a loop
    try {
      var k = 'nc_login_redirect_ts', last = Number(sessionStorage.getItem(k) || 0);
      if (Date.now() - last > 30000) { sessionStorage.setItem(k, String(Date.now())); window.location.replace('/index.html'); return; }
    } catch (e) {}
  }
  var side = document.getElementById('sideBar');
  var main = document.getElementById('mainApp');
  if (login) login.classList.remove('hidden');
  if (side) side.style.display = 'none';
  if (main) main.style.display = 'none';
  var suMask = document.getElementById('signupMask');
  if (suMask) suMask.classList.remove('on');
  var emailEl = document.getElementById('loginEmail');
  var passEl = document.getElementById('loginPassword');
  var form = document.getElementById('loginForm');
  var loading = document.getElementById('loginLoading');
  var err = document.getElementById('loginError');
  if (emailEl) emailEl.value = '';
  if (passEl) passEl.value = '';
  if (form) form.style.display = 'block';
  if (loading) loading.style.display = 'none';
  if (err) err.style.display = 'none';
}

function hideLoginScreen() {
  var login = document.getElementById('loginScreen');
  if (login) login.classList.add('hidden');
}

/* ═══ v7.2: просмотр клиента админом переживает F5 / Ctrl+Shift+R ═══ */
if (typeof window.filterClients !== 'function') {
  window.filterClients = function (q) {
    q = String(q || '').toLowerCase();
    var cards = document.querySelectorAll('#adminClientsList .admin-client-card');
    for (var i = 0; i < cards.length; i++) cards[i].style.display = cards[i].textContent.toLowerCase().indexOf(q) > -1 ? '' : 'none';
  };
}

var NC_VIEW_KEY = 'nc_admin_view';
function ncReadAdminView() {
  try {
    var v = JSON.parse(sessionStorage.getItem(NC_VIEW_KEY) || 'null');
    return (v && v.viewing) ? v : null;
  } catch (e) { return null; }
}
function ncWriteAdminView(v) { try { sessionStorage.setItem(NC_VIEW_KEY, JSON.stringify(v)); } catch (e) {} }
function ncClearAdminView() { try { sessionStorage.removeItem(NC_VIEW_KEY); } catch (e) {} }

/* закрытие .mask надёжно: убираем и класс, и inline-стили, которые раньше "залипали" */
function ncCloseMask(id) {
  var m = typeof id === 'string' ? document.getElementById(id) : id;
  if (!m) return;
  m.classList.remove('on');
  m.style.display = '';
  m.style.zIndex = '';
}
function ncOpenMask(id) {
  var m = typeof id === 'string' ? document.getElementById(id) : id;
  if (!m) return;
  m.style.display = '';
  m.style.zIndex = '';
  m.classList.add('on');
}

function showApp() {
  var _ncv = ncReadAdminView();
  if (_ncv && getSessionToken() && !window.adminViewingEmail) {
    if (window.NCBoot) window.NCBoot.loading('Restoring client view…');
    adminViewClient(_ncv.viewing, true);
    return;
  }
  if (window.NCBoot) window.NCBoot.loading('Loading your account…');
  if (isAdmin()) { try { showAdminPanel(); } finally { if (window.NCBoot) window.NCBoot.done(); } return; }

  var side = document.getElementById('sideBar');
  var main = document.getElementById('mainApp');

  loadFromServer(function () {
    if (window.NCBoot) window.NCBoot.done();
    function safe(fn) { try { if (typeof fn === 'function') fn(); } catch (e) { console.warn('[NC init]', e); } }
    safe(loadPrices);
    safe(loadExchangeRates);
    safe(initCurrencySwitcher);
    safe(initNotifications);
    safe(initVerification);
    safe(initDesignPicker);
    safe(initRecentTx);
    safe(initTrackingActions);
    safe(initDepositVerification);
    safe(initSettings);
    safe(initAdminPanel);
    safe(loadCharts);
     
    // FIX: the old early return left the user on an empty screen after sign in.
    window._ncJustLoggedIn = false;

    try { render(); } catch (e) { console.warn('[NC render]', e); }

    if (!localStorage.getItem('user_email')) {
      showLoginScreen();
      return;
    }

    var role = localStorage.getItem('user_role');
    var accountType = (st.user && st.user.accountType) || null;
    var vStatus = (st.verification && st.verification.status) || null;

    if (role === 'admin' && !window.adminViewingEmail) {
      showAdminPanel();
      return;
    }

    if (vStatus === 'approved') {
      if (side) side.style.display = 'flex';
      if (main) main.style.display = 'flex';
      if (!st.user) st.user = {};
      st.user.verified = true;
      ['pendingScreen', 'rejectedScreen', 'verifyScreen', 'onboard'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) { el.classList.remove('on'); el.style.display = 'none'; }
      });
      if (typeof applyAccountType === 'function') applyAccountType();
      if (window._ncHidePreloader) window._ncHidePreloader();
      return;
    }

    if (vStatus === 'pending') {
      if (side) side.style.display = 'none';
      if (main) main.style.display = 'none';
      showPendingScreen();
      return;
    }

    if (vStatus === 'rejected') {
      if (side) side.style.display = 'none';
      if (main) main.style.display = 'none';
      showRejectedScreen(st.verification ? st.verification.reason : '');
      return;
    }

    if (side) side.style.display = 'none';
    if (main) main.style.display = 'none';

    if (!st.card && accountType !== 'exchange') {
      var onb = document.getElementById('onboard');
      if (onb) { onb.classList.add('on'); if (typeof goToOnbStep === 'function') goToOnbStep(1); }
      return;
    }

    var vScreen = document.getElementById('verifyScreen');
    if (vScreen) { vScreen.classList.add('on'); vScreen.style.display = 'flex'; }
    if (typeof showVerifyStep === 'function') showVerifyStep(1);
  });
}
async function doLogout() {
  var token = getSessionToken();
  if (token) {
    try {
      await fetch(WORKER_LOGIN_URL + '?action=logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token })
      });
    } catch (e) {}
  }

  clearSessionToken();
  localStorage.removeItem('user_email');
  localStorage.removeItem('user_role');
  localStorage.removeItem('user_name');
  localStorage.removeItem('session_expires');
  localStorage.removeItem('nc_current_user');

  clearInterval(sessionTimer);
  clearInterval(countdownTimer);
  hideInactivityModal();
  window.adminViewingEmail = null;
  ncClearAdminView();
  window._exPricesCache = null;

  document.querySelectorAll('.mask').forEach(function (m) { m.classList.remove('on'); });
  document.querySelectorAll('.inactivity-overlay, .dep-verify-overlay, .notif-overlay, .verify-screen, .onboard, .onb-anim-stage').forEach(function (m) { m.classList.remove('on'); });

  var ap = document.getElementById('adminPanel'); if (ap) ap.classList.remove('on');
  var np = document.getElementById('notifPanel'); if (np) np.classList.remove('on');
  var abb = document.getElementById('adminBackBar'); if (abb) abb.style.display = 'none';

  document.querySelectorAll('.mask').forEach(function (m) { m.style.display = ''; });

  var overlay = document.createElement('div');
  overlay.id = 'logoutOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:radial-gradient(900px 500px at 30% 10%,rgba(0,229,255,.12),transparent 60%),radial-gradient(800px 500px at 70% 90%,rgba(139,92,246,.14),transparent 60%),#0a0f1a;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:999999;color:#fff;opacity:1;';
  overlay.innerHTML =
    '<div style="text-align:center;max-width:400px;padding:40px;">' +
      '<div style="width:80px;height:80px;margin:0 auto 24px;border-radius:50%;background:linear-gradient(135deg,#10b981,#34d399);display:flex;align-items:center;justify-content:center;font-size:40px;box-shadow:0 20px 50px -10px rgba(16,185,129,.7);">✓</div>' +
      '<h1 style="font-size:1.8rem;font-weight:800;margin-bottom:12px;background:linear-gradient(100deg,#fff,#7dd3fc);-webkit-background-clip:text;background-clip:text;color:transparent;">Signed out</h1>' +
      '<p style="color:#94a3b8;font-size:.95rem;margin-bottom:32px;">You have been securely logged out of your account.</p>' +
      '<button onclick="window.location.href=\'index.html\'" style="width:100%;padding:16px;background:linear-gradient(135deg,#00e5ff,#8b5cf6);border:none;border-radius:14px;color:#fff;font-weight:800;font-size:1rem;cursor:pointer;font-family:inherit;box-shadow:0 15px 35px -10px rgba(0,229,255,.5);">Back to home →</button>' +
    '</div>';
  document.body.appendChild(overlay);

  setTimeout(function () { window.location.replace('/index.html'); }, 2000);
  setTimeout(function () { window.location.href = '/index.html'; }, 4000);
}

var _inactivityListenersAttached = false;

function startInactivityTimer() {
  clearTimeout(sessionTimer);
  sessionTimer = setTimeout(showInactivityModal, SESSION_TIMEOUT_MS);
  if (_inactivityListenersAttached) return;
  _inactivityListenersAttached = true;
  ['click', 'keydown', 'scroll', 'mousemove', 'touchstart'].forEach(function (evt) {
    document.addEventListener(evt, resetInactivityTimer, { passive: true });
  });
}

function resetInactivityTimer() {
  var modal = document.getElementById('inactivityOverlay');
  if (modal && modal.classList.contains('on')) return;
  clearTimeout(sessionTimer);
  sessionTimer = setTimeout(showInactivityModal, SESSION_TIMEOUT_MS);
}

function updateCountdown() {
  var el = document.getElementById('inactivityTimer');
  if (el) el.textContent = countdownLeft;
}

function hideInactivityModal() {
  var overlay = document.getElementById('inactivityOverlay');
  if (overlay) overlay.classList.remove('on');
  clearInterval(countdownTimer);
}

function showInactivityModal() {
  var overlay = document.getElementById('inactivityOverlay');
  if (!overlay) return;
  overlay.classList.add('on');
  countdownLeft = LOGOUT_COUNTDOWN;
  updateCountdown();
  clearInterval(countdownTimer);
  countdownTimer = setInterval(function () {
    countdownLeft--;
    updateCountdown();
    if (countdownLeft <= 0) { clearInterval(countdownTimer); doLogout(); }
  }, 1000);
}


/* ═══════════════════ SETTINGS ═══════════════════ */
function initSettings() {
  var btnSettings = document.getElementById('settingsBtn');
  var mask = document.getElementById('settingsMask');
  var closeBtn = document.getElementById('btnSettingsClose');
  var logoutBtn = document.getElementById('btnLogout');
  var changePassBtn = document.getElementById('btnChangePassword');
  var deleteBtn = document.getElementById('btnDeleteAccount');
  var changePassMask = document.getElementById('changePassMask');
  var cpSave = document.getElementById('cpSave');
  var cpCancel = document.getElementById('cpCancel');

  var nameEl = document.getElementById('settingsName');
  var emailEl = document.getElementById('settingsEmail');
  var roleEl = document.getElementById('settingsRole');
  if (nameEl) nameEl.textContent = localStorage.getItem('user_name') || 'User';
  if (emailEl) emailEl.textContent = localStorage.getItem('user_email') || '—';
  if (roleEl) {
    var role = localStorage.getItem('user_role') || 'user';
    roleEl.textContent = role === 'admin' ? 'Admin' : 'User';
  }

  if (btnSettings) btnSettings.onclick = function () { if (mask) mask.classList.add('on'); };
  if (closeBtn) closeBtn.onclick = function () { if (mask) mask.classList.remove('on'); };

  if (logoutBtn) logoutBtn.onclick = function () {
    if (!confirm('Log out of your account?')) return;
    doLogout();
  };

  if (changePassBtn) changePassBtn.onclick = function () {
    if (mask) mask.classList.remove('on');
    if (changePassMask) changePassMask.classList.add('on');
    var o = document.getElementById('cpOld'); if (o) o.value = '';
    var n = document.getElementById('cpNew'); if (n) n.value = '';
    var c = document.getElementById('cpConfirm'); if (c) c.value = '';
    var e1 = document.getElementById('cpError'); if (e1) e1.style.display = 'none';
    var e2 = document.getElementById('cpSuccess'); if (e2) e2.style.display = 'none';
  };

  if (cpCancel) cpCancel.onclick = function () {
    if (changePassMask) changePassMask.classList.remove('on');
  };

  var cpToggles = document.querySelectorAll('.pass-toggle[data-target]');
  for (var i = 0; i < cpToggles.length; i++) {
    cpToggles[i].onclick = function () {
      var targetId = this.getAttribute('data-target');
      var input = document.getElementById(targetId);
      if (!input) return;
      if (input.type === 'password') { input.type = 'text'; this.textContent = '🙈'; }
      else { input.type = 'password'; this.textContent = '👁'; }
    };
  }
  // Кнопка смены почты
  var changeEmailBtn = document.getElementById('btnChangeEmail');
  if (changeEmailBtn) changeEmailBtn.onclick = function () {
    var newEmail = prompt('Enter new email address:');
    if (!newEmail) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) { alert('Invalid email'); return; }
    
    fetch(WORKER_LOGIN_URL + '?action=requestEmailChange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: getSessionToken(), newEmail: newEmail })
    })
    .then(r => r.json())
    .then(d => {
      if (d.ok) alert('✅ Request sent to admin for approval.');
      else alert('Error: ' + d.error);
    });
  };
  if (cpSave) cpSave.onclick = async function () {
    var oldP = document.getElementById('cpOld').value;
    var newP = document.getElementById('cpNew').value;
    var confP = document.getElementById('cpConfirm').value;
    var errEl = document.getElementById('cpError');
    var okEl = document.getElementById('cpSuccess');
    errEl.style.display = 'none';
    okEl.style.display = 'none';
    if (!oldP || !newP) { errEl.textContent = 'Please fill all fields'; errEl.style.display = 'block'; return; }
    if (newP.length < 6) { errEl.textContent = 'Password must be at least 6 characters'; errEl.style.display = 'block'; return; }
    if (newP !== confP) { errEl.textContent = 'Passwords do not match'; errEl.style.display = 'block'; return; }

    cpSave.disabled = true;
    cpSave.textContent = 'Changing...';
    try {
      var res = await fetch(WORKER_LOGIN_URL + '?action=changePassword', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: getSessionToken(), oldPassword: oldP, newPassword: newP })
      });
      var data = await res.json();
      if (data.ok) {
        okEl.textContent = '✓ Password changed successfully';
        okEl.style.display = 'block';
        playChime();
        setTimeout(function () { if (changePassMask) changePassMask.classList.remove('on'); }, 2000);
      } else {
        errEl.textContent = data.error || 'Failed to change password';
        errEl.style.display = 'block';
      }
    } catch (e) {
      errEl.textContent = 'Connection error';
      errEl.style.display = 'block';
    }
    cpSave.disabled = false;
    cpSave.textContent = 'Change';
  };

  if (deleteBtn) deleteBtn.onclick = function () {
    if (!confirm('Delete your account? This will remove ALL data permanently.')) return;
    if (!confirm('Are you SURE? All data will be erased.')) return;
    st = JSON.parse(JSON.stringify(def));
    saveToServer();
    render();
    if (mask) mask.classList.remove('on');
    toast('Account data deleted');
    setTimeout(function () { doLogout(); }, 1500);
  };
}

/* ═══════════════════ RENDER ═══════════════════ */
var _lastRender = 0;
function render() {
  var n = Date.now();
  if (n - _lastRender < 150) return;
  _lastRender = n;
  _renderAll();

  try {
    var v = st && st.verification && st.verification.status;
    if (v === 'pending') {
      var p = document.getElementById('pendingScreen');
      if (p) {
        var visible = p.classList.contains('on') && p.style.display !== 'none';
        if (!visible) {
          p.classList.add('on');
          p.style.cssText = 'display:flex !important;visibility:visible !important;opacity:1 !important;z-index:99999 !important;position:fixed !important;inset:0 !important;';
          console.warn('[NC watchdog] pendingScreen был скрыт → восстановлен');
        }
      }
    }
  } catch (e) {}
}

function _renderAll() {
  var balEl = $('bal'); if (balEl) balEl.textContent = fmtCurrency(st.usd);
  var balEurEl = $('balEur'); if (balEurEl) balEurEl.textContent = eurF(st.usd * st.eurR);
  var btcBEl = $('btcB'); if (btcBEl) btcBEl.textContent = (st.btc || 0).toFixed(8) + ' BTC';
  var ethBEl = $('ethB'); if (ethBEl) ethBEl.textContent = (st.eth || 0).toFixed(8) + ' ETH';
  var aBtcEl = $('aBtc'); if (aBtcEl) aBtcEl.textContent = (st.btc || 0).toFixed(8);
  var aEthEl = $('aEth'); if (aEthEl) aEthEl.textContent = (st.eth || 0).toFixed(8);
  var aBtcUEl = $('aBtcU'); if (aBtcUEl) aBtcUEl.textContent = '≈ ' + fmt((st.btc || 0) * (st.btcP || 0));
  var aEthUEl = $('aEthU'); if (aEthUEl) aEthUEl.textContent = '≈ ' + fmt((st.eth || 0) * (st.ethP || 0));
  renderTx();
  renderOrder();
  renderCard();
  renderNotifications();
  renderRecentTx();
  renderStats();
  renderBalanceChart();
  renderIbanByAdmin();
  if (typeof applyAccountType === 'function') applyAccountType();
}

/* ═══════════════════ PRICES ═══════════════════ */
function loadPrices() {
  fetch(WORKER_URL + '?action=prices')
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (d && d.btc && d.eth) {
        var prevBtc = st.btcP || d.btc;
        var prevEth = st.ethP || d.eth;
        st.btcP = d.btc;
        st.ethP = d.eth;

        var btcPriceEl = document.getElementById('btcPrice');
        if (btcPriceEl) btcPriceEl.textContent = fmt(d.btc);
        var ethPriceEl = document.getElementById('ethPrice');
        if (ethPriceEl) ethPriceEl.textContent = fmt(d.eth);

        updateCryptoTrends(prevBtc, prevEth);

        if (window.adminViewingEmail) return;

        if (!st.balanceHistory) st.balanceHistory = [];
        var lastPoint = st.balanceHistory[st.balanceHistory.length - 1];
        var nowTs = Date.now();
        if (st.usd > 0 && st.usd < 1000000 && (!lastPoint || nowTs - lastPoint.t > 60000)) {
          st.balanceHistory.push({ t: nowTs, v: st.usd });
        }
        var weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        st.balanceHistory = st.balanceHistory.filter(function (p) {
          return p.t > weekAgo && p.v > 0 && p.v < 1000000;
        });
        if (st.balanceHistory.length > 3000) st.balanceHistory = st.balanceHistory.slice(-3000);
        if (typeof saveToServer === 'function') saveToServer();
        renderBalanceChart();
        render();
      }
    })
    .catch(function (e) { console.error('Prices load failed:', e); });
}

function updateCryptoTrends(prevBtc, prevEth) {
  var btcTrend = document.getElementById('btcChange');
  var ethTrend = document.getElementById('ethChange');
  if (btcTrend && prevBtc) {
    var btcChg = ((st.btcP - prevBtc) / prevBtc) * 100;
    btcTrend.textContent = (btcChg >= 0 ? '▲ +' : '▼ ') + btcChg.toFixed(2) + '%';
  }
  if (ethTrend && prevEth) {
    var ethChg = ((st.ethP - prevEth) / prevEth) * 100;
    ethTrend.textContent = (ethChg >= 0 ? '▲ +' : '▼ ') + ethChg.toFixed(2) + '%';
  }
}

function refreshBalanceFromServer() {
  if (localStorage.getItem('user_role') === 'admin' && !window.adminViewingEmail) return;
  var token = getSessionToken();
  if (!token) return;
  var email = window.adminViewingEmail || localStorage.getItem('user_email');
  if (!email) return;

  fetch(WORKER_LOGIN_URL + '?action=getUserState', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: token, email: window.adminViewingEmail || undefined })
  })
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d || d.ok === false) return;
      var newUsd = Number(d.usd) || 0;
      var changed = false;
      if (Math.abs(newUsd - (st.usd || 0)) > 0.01) { st.usd = newUsd; changed = true; }
      if (d.currency) st.currency = d.currency;
      if (d.card !== undefined) st.card = d.card;
      if (d.txs) st.txs = d.txs;
      if (d.notifications) st.notifications = d.notifications;
      if (d.user) st.user = d.user;
      if (d.balanceHistory) st.balanceHistory = d.balanceHistory;
      if (d.withdrawals) st.withdrawals = d.withdrawals;
      if (d.chat) st.chat = d.chat;
      if (d.ticket !== undefined) st.ticket = d.ticket;
      if (d.cryptoAddress) st.cryptoAddress = d.cryptoAddress;
      if (d.verification) st.verification = d.verification;
      if (d.pendingDeposits) st.pendingDeposits = d.pendingDeposits;
      if (changed) render();
      if (typeof updateChatBadge === 'function') updateChatBadge();
    })
    .catch(function () {});
}

setInterval(function () {
  if (localStorage.getItem('user_role') === 'admin' && !window.adminViewingEmail) return;
  if (!localStorage.getItem('user_email') && !window.adminViewingEmail) return;
  refreshBalanceFromServer();
}, 60000);

/* ═══════════════════ CURRENCY ═══════════════════ */
function fmtCurrency(usdAmount) {
  var cur = st.currency || 'USD';
  var amount = usdAmount, symbol = '$', suffix = '';
  if (cur === 'EUR') { amount = usdAmount * st.eurR; symbol = '€'; }
  else if (cur === 'SEK') { amount = usdAmount * st.sekR; symbol = 'kr '; suffix = ' SEK'; }
  else if (cur === 'NOK') { amount = usdAmount * (st.nokR || 10.5); symbol = 'kr '; suffix = ' NOK'; }
  else if (cur === 'DKK') { amount = usdAmount * (st.dkkR || 6.9); symbol = 'kr '; suffix = ' DKK'; }
  else if (cur === 'GBP') { amount = usdAmount * (st.gbpR || 0.79); symbol = '£'; }
  var formatted = Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return symbol + formatted + suffix;
}

function loadExchangeRates() {
  fetch(WORKER_URL + '?action=rates')
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (d && d.rates) {
        var r = d.rates;
        if (r.EUR) st.eurR = Number(r.EUR);
        if (r.SEK) st.sekR = Number(r.SEK);
        if (r.NOK) st.nokR = Number(r.NOK);
        if (r.DKK) st.dkkR = Number(r.DKK);
        if (r.GBP) st.gbpR = Number(r.GBP);

        var rateEUR = document.getElementById('rateEUR');
        if (rateEUR) rateEUR.textContent = '1$ = ' + st.eurR.toFixed(2) + '€';
        var rateSEK = document.getElementById('rateSEK');
        if (rateSEK) rateSEK.textContent = '1$ = ' + st.sekR.toFixed(2) + 'kr';
        var rateNOK = document.getElementById('rateNOK');
        if (rateNOK && r.NOK) rateNOK.textContent = '1$ = ' + Number(r.NOK).toFixed(2) + 'kr';
        var rateDKK = document.getElementById('rateDKK');
        if (rateDKK && r.DKK) rateDKK.textContent = '1$ = ' + Number(r.DKK).toFixed(2) + 'kr';
        var rateGBP = document.getElementById('rateGBP');
        if (rateGBP && r.GBP) rateGBP.textContent = '1$ = ' + Number(r.GBP).toFixed(2) + '£';

        render();
      }
    })
    .catch(function (e) { console.warn('Rates failed', e); });
}

function setCurrency(cur) {
  st.currency = cur;
  saveToServer();
  var codeEl = document.getElementById('currCode');
  if (codeEl) codeEl.textContent = cur;
  var opts = document.querySelectorAll('.curr-opt');
  for (var i = 0; i < opts.length; i++) {
    opts[i].classList.toggle('on', opts[i].getAttribute('data-cur') === cur);
  }
  var menu = document.getElementById('currMenu');
  if (menu) menu.classList.remove('on');
  render();
  if (typeof renderExchangeDash === 'function' && st.user && st.user.accountType === 'exchange') {
    renderExchangeDash();
  }
  toast('Currency: ' + cur);
}

function initCurrencySwitcher() {
  var btn = document.getElementById('currBtnTop');
  var menu = document.getElementById('currMenu');
  if (btn && menu) {
    btn.onclick = function (e) { e.stopPropagation(); menu.classList.toggle('on'); };
    document.addEventListener('click', function () { if (menu) menu.classList.remove('on'); });
  }
  var opts = document.querySelectorAll('.curr-opt');
  for (var i = 0; i < opts.length; i++) {
    opts[i].onclick = function (e) {
      e.stopPropagation();
      setCurrency(this.getAttribute('data-cur'));
    };
  }
  var codeEl = document.getElementById('currCode');
  if (codeEl) codeEl.textContent = st.currency || 'USD';
}

/* ═══════════════════ END OF PART A ═══════════════════ */

// ⏳ PART B, C, D — будут добавлены в следующих частях

/* ═══════════════════════════════════════════════════════════════
   PART B — NOTIFICATIONS, CHARTS, WITHDRAW, TX DETAILS, IBAN, STATS
   ═══════════════════════════════════════════════════════════════ */

/* ═══════════════════ NOTIFICATIONS ═══════════════════ */
function playNotificationSound() {
  playTone(880, 0.12, 'sine', 0.35);
  setTimeout(function () { playTone(1320, 0.18, 'sine', 0.28); }, 100);
}

function addNotification(text, icon) {
  if (!st.notifications) st.notifications = [];
  st.notifications.unshift({
    id: Date.now() + Math.random(), text, icon: icon || '🔔',
    ts: Date.now(), read: false
  });
  if (st.notifications.length > 50) st.notifications.length = 50;
  saveToServer();
  renderNotifications();
  playNotificationSound();
}

function timeAgo(ts) {
  var s = Math.floor((Date.now() - ts) / 1000);
  if (s < 30) return 'Just now';
  if (s < 60) return s + 's ago';
  if (s < 3600) return Math.floor(s / 60) + ' min ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  if (s < 604800) return Math.floor(s / 86400) + 'd ago';
  return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function renderNotifications() {
  var listEl = document.getElementById('notifList');
  var badge = document.getElementById('notifBadge');
  var sub = document.getElementById('notifSub');
  if (!listEl) return;
  var notifs = st.notifications || [];
  var unread = 0;
  for (var i = 0; i < notifs.length; i++) if (!notifs[i].read) unread++;

  if (badge) {
    if (unread > 0) { badge.style.display = 'flex'; badge.textContent = unread > 9 ? '9+' : unread; }
    else { badge.style.display = 'none'; }
  }
  if (sub) sub.textContent = unread > 0 ? (unread + ' unread') : 'All read';

  if (notifs.length === 0) {
    listEl.innerHTML = '<div class="notif-empty"><div style="font-size:2.5rem;opacity:.4;margin-bottom:8px">🔔</div><div>No notifications yet</div></div>';
    return;
  }
  var html = '';
  for (var j = 0; j < notifs.length; j++) {
    var n = notifs[j];
    var safeId = String(n.id);
    var safeText = escapeHtml(n.text);
    html += '<div class="notif-item' + (n.read ? '' : ' unread') + '" data-id="' + n.id + '">' +
      '<div class="notif-icon">' + (n.icon || '🔔') + '</div>' +
      '<div class="notif-body">' +
      '<div class="notif-text">' + safeText + '</div>' +
      '<div class="notif-time">' + timeAgo(n.ts) + '</div>' +
      '</div>' +
      '<button onclick="event.stopPropagation(); deleteNotification(' + ncArg(safeId) + ')" style="position:absolute;top:10px;right:10px;width:26px;height:26px;border-radius:6px;background:rgba(255,80,80,.15);border:1px solid rgba(255,80,80,.3);color:#ff6b6b;cursor:pointer;font-size:14px;line-height:1;">×</button>' +
      '</div>';
  }
  listEl.innerHTML = html;
  var items = listEl.querySelectorAll('.notif-item');
  for (var k = 0; k < items.length; k++) {
    items[k].onclick = function () { markRead(Number(this.getAttribute('data-id'))); };
  }
}

function deleteNotification(id) {
  if (!st.notifications) return;
  var before = st.notifications.length;
  st.notifications = st.notifications.filter(function (n) { return String(n.id) !== String(id); });
  if (st.notifications.length < before) {
    var token = getSessionToken();
    if (token && stateLoaded && stateTrusted) {
      fetch(WORKER_URL + '?action=setUserState', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, state: st, email: window.adminViewingEmail || undefined, force: true, wipeNotifs: true })
      }).catch(function () {});
    }
    renderNotifications();
  }
}

function markRead(id) {
  if (!st.notifications) return;
  for (var i = 0; i < st.notifications.length; i++) {
    if (st.notifications[i].id === id) { st.notifications[i].read = true; break; }
  }
  saveToServer();
  renderNotifications();
}

function markAllRead() {
  if (!st.notifications) return;
  for (var i = 0; i < st.notifications.length; i++) st.notifications[i].read = true;
  saveToServer();
  renderNotifications();
}

function initNotifications() {
  var bell = document.getElementById('notifBell');
  var panel = document.getElementById('notifPanel');
  var overlay = document.getElementById('notifOverlay');
  var closeBtn = document.getElementById('notifClose');

  if (bell) bell.onclick = function () {
    if (panel) panel.classList.add('on');
    if (overlay) overlay.classList.add('on');
    setTimeout(markAllRead, 1500);
  };

  function closePanel() {
    if (panel) panel.classList.remove('on');
    if (overlay) overlay.classList.remove('on');
  }
  if (overlay) overlay.onclick = closePanel;
  if (closeBtn) closeBtn.onclick = closePanel;
}

/* ═══════════════════ CHARTS ═══════════════════ */
function loadCharts() {
  fetch('https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=7')
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (d && d.prices && d.prices.length) {
        var prices = d.prices.map(function (p) { return p[1]; });
        drawChart('btcChart', prices, '#f7931a');
        var change = ((prices[prices.length - 1] - prices[0]) / prices[0]) * 100;
        updateChange('btcChange', change);
        renderBalanceChart();
      }
    })
    .catch(function () {});

  fetch('https://api.coingecko.com/api/v3/coins/ethereum/market_chart?vs_currency=usd&days=7')
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (d && d.prices && d.prices.length) {
        var prices = d.prices.map(function (p) { return p[1]; });
        drawChart('ethChart', prices, '#627eea');
        var change = ((prices[prices.length - 1] - prices[0]) / prices[0]) * 100;
        updateChange('ethChange', change);
        renderBalanceChart();
      }
    })
    .catch(function () {});
}

function drawChart(elId, prices, color) {
  var el = document.getElementById(elId);
  if (!el || !prices || prices.length < 2) return;
  var w = 200, h = 42, pad = 4;
  var min = Math.min.apply(null, prices);
  var max = Math.max.apply(null, prices);
  var range = max - min || 1;
  var points = [];
  for (var i = 0; i < prices.length; i++) {
    var x = pad + (i / (prices.length - 1)) * (w - pad * 2);
    var y = pad + (1 - (prices[i] - min) / range) * (h - pad * 2);
    points.push(x.toFixed(1) + ',' + y.toFixed(1));
  }
  var linePath = 'M' + points.join(' L');
  var lastPoint = points[points.length - 1];
  var lastX = lastPoint.split(',')[0];
  var firstPoint = points[0];
  var firstX = firstPoint.split(',')[0];
  var fillPath = linePath + ' L' + lastX + ',' + (h - pad) + ' L' + firstX + ',' + (h - pad) + ' Z';
  var svg = '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none">' +
    '<defs><linearGradient id="grad_' + elId + '" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0%" stop-color="' + color + '" stop-opacity="0.55"/>' +
    '<stop offset="100%" stop-color="' + color + '" stop-opacity="0"/>' +
    '</linearGradient></defs>' +
    '<path d="' + fillPath + '" fill="url(#grad_' + elId + ')"/>' +
    '<path d="' + linePath + '" fill="none" stroke="' + color + '" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>' +
    '</svg>';
  el.innerHTML = svg;
}

function updateChange(elId, change) {
  var el = document.getElementById(elId);
  if (!el) return;
  var sign = change >= 0 ? '▲ +' : '▼ ';
  el.textContent = sign + change.toFixed(2) + '%';
}

/* ═══════════════════ DEPOSIT VERIFICATION MODAL ═══════════════════ */
var depPendingTx = null;
var depAnswers = { source: null, origin: null };

function openDepositVerification(tx, cryptoAmt, symbol, usdValue) {
  depPendingTx = { tx, cryptoAmt, symbol, usdValue };
  depAnswers = { source: null, origin: null };

  var cryptoEl = document.getElementById('depAmountCrypto');
  var usdEl = document.getElementById('depAmountUsd');
  if (cryptoEl) cryptoEl.textContent = '+ ' + cryptoAmt.toFixed(8) + ' ' + symbol;
  if (usdEl) usdEl.textContent = '≈ ' + fmtCurrency(usdValue);

  var check = document.getElementById('depConfirmCheck');
  if (check) check.checked = false;
  var btnConfirm = document.getElementById('depBtnConfirm');
  if (btnConfirm) btnConfirm.disabled = true;

  showDepStep(0);
  var overlay = document.getElementById('depVerifyOverlay');
  if (overlay) overlay.classList.add('on');
}

function closeDepositVerification() {
  var overlay = document.getElementById('depVerifyOverlay');
  if (overlay) overlay.classList.remove('on');
  depPendingTx = null;
  depAnswers = { source: null, origin: null };
}

function showDepStep(n) {
  var steps = document.querySelectorAll('.dep-step');
  for (var i = 0; i < steps.length; i++) steps[i].classList.remove('on');
  var target = document.getElementById('depStep' + n);
  if (target) target.classList.add('on');
}

function initDepositVerification() {
  var btnStart = document.getElementById('depBtnStart');
  if (btnStart) btnStart.onclick = function () { showDepStep(1); };
  var allOpts = document.querySelectorAll('.dep-opt');
  for (var i = 0; i < allOpts.length; i++) {
    allOpts[i].onclick = function () {
      var step = this.closest('.dep-step');
      var value = this.getAttribute('data-value');
      var siblings = step.querySelectorAll('.dep-opt');
      for (var j = 0; j < siblings.length; j++) siblings[j].classList.remove('on');
      this.classList.add('on');
      if (step.id === 'depStep1') { depAnswers.source = value; setTimeout(function () { showDepStep(2); }, 300); }
      else if (step.id === 'depStep2') { depAnswers.origin = value; setTimeout(function () { showDepStep(3); }, 300); }
    };
  }
  var check = document.getElementById('depConfirmCheck');
  var btnConfirm = document.getElementById('depBtnConfirm');
  if (check && btnConfirm) check.onchange = function () { btnConfirm.disabled = !this.checked; };
  if (btnConfirm) btnConfirm.onclick = function () { if (depPendingTx) finalizeDeposit(); };
  var btnDone = document.getElementById('depBtnDone');
  if (btnDone) btnDone.onclick = closeDepositVerification;
}

function finalizeDeposit() {
  if (!depPendingTx) return;
  var tx = depPendingTx.tx;
  var cryptoAmt = depPendingTx.cryptoAmt;
  var symbol = depPendingTx.symbol;
  var credit = depPendingTx.usdValue;

  if (!tx || !tx.hash) { toast('Deposit error — contact support', true); return; }

  var isDup = false;
  (st.txs || []).forEach(function (t) { if (t.hash === tx.hash) isDup = true; });
  if (isDup) { toast('Deposit already credited', true); closeDepositVerification(); return; }

  st.usd += credit;
  if (symbol === 'BTC') st.btc += cryptoAmt;
  else if (symbol === 'ETH') st.eth += cryptoAmt;

  if (!Array.isArray(st.txs)) st.txs = [];
  st.txs.unshift({
    date: now(), ts: Date.now(),
    desc: 'Crypto deposit — ' + Number(cryptoAmt).toFixed(8) + ' ' + symbol,
    amt: credit, status: 'Processing', hash: tx.hash,
    crypto: cryptoAmt, symbol,
    verification: { source: depAnswers.source, origin: depAnswers.origin }
  });

  if (!st.depositVerifications) st.depositVerifications = [];
  st.depositVerifications.push({
    txHash: tx.hash, cryptoAmt, symbol, usdValue: credit,
    source: depAnswers.source, origin: depAnswers.origin, completedAt: Date.now()
  });

  saveToServer();
  render();

  var cryptoEl = document.getElementById('depSuccessCrypto');
  var usdEl = document.getElementById('depSuccessUsd');
  var balEl = document.getElementById('depNewBalance');
  if (cryptoEl) cryptoEl.textContent = '+ ' + cryptoAmt.toFixed(8) + ' ' + symbol;
  if (usdEl) usdEl.textContent = '≈ ' + fmtCurrency(credit) + ' credited';
  if (balEl) balEl.textContent = fmtCurrency(st.usd);

  showDepStep(4);
  playChime();
  spawnConfetti();
  addNotification('Deposit verified: ' + cryptoAmt.toFixed(8) + ' ' + symbol, '✅');
}

/* ═══════════════════ BALANCE CHART ═══════════════════ */
function renderBalanceChart() {
  var wrap2 = document.getElementById('balanceChartSecondary');
  var current = document.getElementById('balanceCurrent');
  if (!wrap2) return;

  var chartHash = (st.usd || 0) + '|' + (st.txs || []).length + '|' + ((st.balanceHistory || []).length);
  if (window._balanceChartHash === chartHash && wrap2.querySelector('svg')) return;
  window._balanceChartHash = chartHash;
  if (current) current.textContent = fmtCurrency(st.usd);

  var txs = st.txs || [];
  if (txs.length < 1) {
    wrap2.innerHTML = '<div style="text-align:center;padding:60px 20px;color:#94a3b8;font-size:.88rem"><div style="font-size:2rem;opacity:.4">📊</div><div>No activity yet</div></div>';
    return;
  }

  var days = 7, dayMs = 24 * 60 * 60 * 1000, nowT = Date.now();
  var points = [];
  var balanceHistory = st.balanceHistory || [];
  if (balanceHistory.length > 2) {
    balanceHistory.forEach(function (p) { points.push({ t: p.t, v: p.v }); });
    points.push({ t: Date.now(), v: st.usd });
  } else {
    for (var d = 0; d <= days; d++) {
      var dayT = nowT - (days - d) * dayMs;
      var totalAtDay = 0;
      for (var j = 0; j < txs.length; j++) {
        var txT = txs[j].ts || Date.now();
        if (txT <= dayT) totalAtDay += (txs[j].amt || 0);
      }
      points.push({ t: dayT, v: totalAtDay });
    }
    points.push({ t: nowT, v: st.usd });
  }

  var w = 500, h = 180, pad = 50;
  var minT, maxT;
  if (balanceHistory.length > 2) {
    minT = balanceHistory[0].t; maxT = Date.now();
    if (maxT - minT < 5 * 60 * 1000) minT = maxT - 5 * 60 * 1000;
  } else {
    minT = nowT - days * dayMs; maxT = nowT;
  }

  var minV = Infinity, maxV = -Infinity;
  for (var k = 0; k < points.length; k++) {
    if (points[k].v < minV) minV = points[k].v;
    if (points[k].v > maxV) maxV = points[k].v;
  }
  if (!isFinite(minV) || !isFinite(maxV)) { minV = 0; maxV = 1; }
  if (maxV === minV) maxV = minV + 1;
  var padV = (maxV - minV) * 0.15 || 1;
  minV -= padV; maxV += padV;

  var svgPoints = [];
  for (var m = 0; m < points.length; m++) {
    var p = points[m];
    var x = pad + ((p.t - minT) / (maxT - minT)) * (w - pad * 2);
    var y = pad + (1 - (p.v - minV) / (maxV - minV)) * (h - pad * 2);
    if (x < pad) x = pad;
    if (x > w - pad) x = w - pad;
    svgPoints.push(x.toFixed(1) + ',' + y.toFixed(1));
  }

  var linePath = 'M' + svgPoints.join(' L');
  var fillPath = linePath + ' L' + (w - pad) + ',' + (h - pad) + ' L' + pad + ',' + (h - pad) + ' Z';

  var svg = '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none">' +
    '<defs>' +
    '<linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0%" stop-color="#47dcff" stop-opacity="0.6"/>' +
    '<stop offset="60%" stop-color="#47dcff" stop-opacity="0.15"/>' +
    '<stop offset="100%" stop-color="#a855f7" stop-opacity="0"/>' +
    '</linearGradient>' +
    '<linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">' +
    '<stop offset="0%" stop-color="#47dcff"/>' +
    '<stop offset="50%" stop-color="#8b5cf6"/>' +
    '<stop offset="100%" stop-color="#ec4899"/>' +
    '</linearGradient>' +
    '<filter id="lineGlow" x="-50%" y="-50%" width="200%" height="200%">' +
    '<feGaussianBlur stdDeviation="3" result="blur"/>' +
    '<feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>' +
    '</filter>' +
    '</defs>' +
    '<path d="' + fillPath + '" fill="url(#balanceGrad)"/>' +
    '<path d="' + linePath + '" fill="none" stroke="url(#lineGrad)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" filter="url(#lineGlow)"/>' +
    '</svg>';
  wrap2.innerHTML = svg;
}

/* ═══════════════════ STATS ═══════════════════ */
function renderStats() {
  var txs = st.txs || [];

  function isExternalDeposit(t) {
    if (!t || !(t.amt > 0)) return false;
    var d = String(t.desc || '').toLowerCase();
    if (d.indexOf('refund') !== -1) return false;
    if (d.indexOf('admin adjustment') !== -1) return false;
    if (d.indexOf('bonus') !== -1) return false;
    if (d.indexOf('adjustment') !== -1) return false;
    if (t.hash) return true;
    if (d.indexOf('deposit') !== -1) return true;
    if (d.indexOf('from crypto.com') !== -1) return true;
    if (d.indexOf('part of') !== -1) return true;
    return false;
  }

  function isInternal(t) {
    if (t.internal === true) return true;
    var d = String(t.desc || '').toLowerCase();
    if (d.indexOf('refund') !== -1) return true;
    if (d.indexOf('admin adjustment') !== -1) return true;
    if (d.indexOf('bonus') !== -1) return true;
    if (d.indexOf('adjustment') !== -1) return true;
    return false;
  }

  var income = 0, spending = 0;
  for (var i = 0; i < txs.length; i++) {
    var t = txs[i];
    var amt = t.amt || 0;
    if (amt > 0 && !isInternal(t)) income += amt;
    else if (amt < 0) spending += Math.abs(amt);
  }

  var incomeEl = document.getElementById('statIncome');
  if (incomeEl) incomeEl.textContent = fmtCurrency(income);
  var spendEl = document.getElementById('statSpending');
  if (spendEl) spendEl.textContent = fmtCurrency(spending);
  var countEl = document.getElementById('statTxCount');
  if (countEl) countEl.textContent = txs.length;
  var daysEl = document.getElementById('statDays');
  if (daysEl) {
    if (st.card && st.card.createdAt) {
      daysEl.textContent = Math.max(1, Math.ceil((Date.now() - st.card.createdAt) / (24 * 60 * 60 * 1000)));
    } else { daysEl.textContent = '1'; }
  }

  var now30 = Date.now() - 30 * 24 * 60 * 60 * 1000;
  var inc30 = 0, sp30 = 0, cnt30 = 0;
  for (var k = 0; k < txs.length; k++) {
    var t30 = txs[k].ts || 0;
    if (t30 >= now30) {
      cnt30++;
      var tk = txs[k];
      var a30 = tk.amt || 0;
      if (a30 > 0 && !isInternal(tk)) inc30 += a30;
      else if (a30 < 0) sp30 += Math.abs(a30);
    }
  }
  var elInc30 = document.getElementById('statIncome30');
  var elSp30 = document.getElementById('statSpending30');
  var elCnt30 = document.getElementById('statTxCount2');
  if (elInc30) elInc30.textContent = inc30 > 0 ? '+' + fmtCurrency(inc30) : '—';
  if (elSp30) elSp30.textContent = sp30 > 0 ? '-' + fmtCurrency(sp30) : '—';
  if (elCnt30) elCnt30.textContent = cnt30;

  var sumDeposits = 0;
  for (var p = 0; p < txs.length; p++) {
    if (isExternalDeposit(txs[p])) sumDeposits += txs[p].amt;
  }

  var pnlEl = document.getElementById('pnlLine');
  if (pnlEl && sumDeposits > 0) {
    var pnl = st.usd - sumDeposits;
    var pnlPct = (pnl / sumDeposits) * 100;
    pnlEl.style.display = 'block';
    var pnlIconEl = document.getElementById('pnlIcon');
    var pnlValueEl = document.getElementById('pnlValue');
    var pnlPctEl = document.getElementById('pnlPct');
    var pnlExplainEl = document.getElementById('pnlExplain');
    if (pnlExplainEl) {
      pnlExplainEl.style.display = 'block';
      if (pnl < 0) { pnlExplainEl.textContent = 'ℹ Your crypto value decreased since deposit'; pnlExplainEl.style.color = '#ff5470'; }
      else if (pnl > 0) { pnlExplainEl.textContent = 'ℹ Your crypto value increased since deposit 🎉'; pnlExplainEl.style.color = '#00e08a'; }
      else { pnlExplainEl.textContent = 'ℹ Your crypto value is unchanged'; pnlExplainEl.style.color = 'var(--mut)'; }
    }
    pnlEl.style.color = pnl >= 0 ? '#00ffa3' : '#ff5470';
    if (pnlIconEl) pnlIconEl.textContent = pnl >= 0 ? '▲' : '▼';
    if (pnlValueEl) pnlValueEl.textContent = (pnl >= 0 ? '+' : '') + fmtCurrency(pnl);
    if (pnlPctEl) pnlPctEl.textContent = '(' + (pnl >= 0 ? '+' : '') + pnlPct.toFixed(2) + '%)';
  } else if (pnlEl) {
    pnlEl.style.display = 'none';
    var pnlExplainEl2 = document.getElementById('pnlExplain');
    if (pnlExplainEl2) pnlExplainEl2.style.display = 'none';
  }
}
/* ═══════════════════ WITHDRAW ═══════════════════ */
function openWithdraw() {
  var modal = document.getElementById('withdrawModal');
  if (!modal) return;
  var avail = document.getElementById('wdAvailable');
  if (avail) avail.textContent = fmtCurrency(st.usd);
  var amtIn = document.getElementById('wdAmount');
  if (amtIn) amtIn.value = '';
  var errIn = document.getElementById('wdError');
  if (errIn) errIn.style.display = 'none';
  var mIn = document.getElementById('wdMethod');
  if (mIn) mIn.value = 'iban';
  wdSwitchMethod();
  modal.style.display = 'flex';

  var expEl = document.getElementById('wdCardExpiry');
  var numEl = document.getElementById('wdCardNumber');
  if (expEl && !expEl.dataset.fmt) { attachExpiryFormatter(expEl); expEl.dataset.fmt = '1'; }
  if (numEl && !numEl.dataset.fmt) { attachCardFormatter(numEl); numEl.dataset.fmt = '1'; }
}

function closeWithdraw() {
  var modal = document.getElementById('withdrawModal');
  if (modal) modal.style.display = 'none';
}

function wdSwitchMethod() {
  var mEl = document.getElementById('wdMethod');
  if (!mEl) return;
  var m = mEl.value;
  var f1 = document.getElementById('wdFieldsIban');
  var f2 = document.getElementById('wdFieldsCard');
  var f3 = document.getElementById('wdFieldsCrypto');
  if (f1) f1.style.display = (m === 'iban') ? 'block' : 'none';
  if (f2) f2.style.display = (m === 'card') ? 'block' : 'none';
  if (f3) f3.style.display = (m === 'crypto') ? 'block' : 'none';
  if (m === 'crypto') wdSwitchCryptoDest();
}

function wdSwitchCryptoDest() {
  var dEl = document.getElementById('wdCryptoDest');
  if (!dEl) return;
  var mEl = document.getElementById('wdMemoWrap');
  if (mEl) mEl.style.display = (dEl.value === 'external') ? 'block' : 'none';
}

function _val(id) { var el = document.getElementById(id); return el ? el.value : ''; }

function submitWithdraw() {
  var amountEl = document.getElementById('wdAmount');
  var methodEl = document.getElementById('wdMethod');
  var errEl = document.getElementById('wdError');
  if (!amountEl || !methodEl || !errEl) return;

  var amount = parseFloat(amountEl.value) || 0;
  var method = methodEl.value;
  function showErr(msg) { errEl.textContent = msg; errEl.style.display = 'block'; }
  errEl.style.display = 'none';

  if (amount <= 0) return showErr('Enter a valid amount');
  if (amount > st.usd) return showErr('Amount exceeds available balance');

  var wd = {
    id: 'wd_' + Date.now(), amount, currency: (st.currency || 'USD'),
    method, status: 'pending', createdAt: Date.now(),
    reviewedAt: null, reason: '', reviewedBy: '', details: {}
  };

  if (method === 'iban') {
    var name = _val('wdIbanName').trim();
    var iban = _val('wdIbanNumber').trim();
    var swift = _val('wdIbanSwift').trim();
    var bank = _val('wdIbanBank').trim();
    var country = _val('wdIbanCountry').trim();
    if (name.length < 2) return showErr('Enter recipient name');
    if (iban.replace(/\s/g, '').length < 15) return showErr('Enter valid IBAN');
    if (swift.length < 6) return showErr('Enter valid SWIFT / BIC');
    wd.details = { name, iban, swift, bank, country };
  } else if (method === 'card') {
    var cn = _val('wdCardName').trim();
    var num = _val('wdCardNumber').trim();
    var exp = _val('wdCardExpiry').trim();
    if (cn.length < 2) return showErr('Enter card holder name');
    if (num.replace(/\s/g, '').length < 16) return showErr('Enter valid card number');
    if (!/^\d{2}\/\d{2}$/.test(exp)) return showErr('Expiry must be MM/YY');
    wd.details = { cardName: cn, cardNumber: num, expiry: exp };
  } else if (method === 'crypto') {
    var dest = _val('wdCryptoDest');
    var net = _val('wdCryptoNetwork');
    var coin = _val('wdCryptoCoin');
    var addr = _val('wdCryptoAddress').trim();
    var memo = _val('wdCryptoMemo').trim();
    if (addr.length < 10) return showErr('Enter valid wallet address');
    wd.details = { destination: dest, network: net, coin, address: addr, memo };
  }

  if (!st.withdrawals) st.withdrawals = [];
  st.withdrawals.unshift(wd);
  closeWithdraw();
  render();
  showWithdrawStatus(method, amount);
  saveToServer();
}

function showWithdrawStatus(method, amount) {
  var modal = document.getElementById('txStatus');
  var title = document.getElementById('txStatusTitle');
  var desc = document.getElementById('txStatusDesc');
  var step1 = document.getElementById('txStep1');
  var step2 = document.getElementById('txStep2');
  var step3 = document.getElementById('txStep3');
  if (!modal) return;

  modal.style.display = 'flex';
  modal.classList.add('on');
  if (title) title.textContent = 'Submitting request...';
  if (desc) desc.textContent = 'Creating your withdrawal request for ' + fmtCurrency(amount);
  if (step1) step1.style.background = '#47dcff';
  if (step2) step2.style.background = 'rgba(255,255,255,.1)';
  if (step3) step3.style.background = 'rgba(255,255,255,.1)';

  setTimeout(function () {
    if (title) title.textContent = 'Verifying details...';
    if (desc) desc.textContent = 'Checking your IBAN and recipient information.';
    if (step2) step2.style.background = '#47dcff';
  }, 1500);
  setTimeout(function () {
    if (title) title.textContent = 'Under review';
    if (desc) desc.textContent = 'Your withdrawal is being processed. We will notify you once it is complete.';
    if (step3) step3.style.background = '#47dcff';
  }, 3000);
  setTimeout(function () {
    modal.classList.remove('on');
    setTimeout(function () { modal.style.display = 'none'; }, 300);
  }, 5500);
}

/* ═══════════════════ TX DETAILS MODAL ═══════════════════ */
function txStatusLabel(s) {
  if (s === 'Completed') return { text: '✓ Completed', bg: 'rgba(0,224,138,.14)', color: '#00e08a' };
  if (s === 'Processing') return { text: '⏳ Processing', bg: 'rgba(0,212,255,.14)', color: '#47dcff' };
  if (s === 'Under Review') return { text: '⏳ Under review', bg: 'rgba(255,176,32,.14)', color: '#ffb020' };
  if (s === 'Rejected') return { text: '✗ Rejected', bg: 'rgba(255,84,112,.14)', color: '#ff5470' };
  return { text: s || '—', bg: 'rgba(255,255,255,.06)', color: '#94a3b8' };
}

function txdRow(label, value, mono) {
  return '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:10px 14px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:10px">' +
    '<span style="color:#94a3b8;font-size:.78rem;text-transform:uppercase;letter-spacing:.06em;flex-shrink:0">' + escapeHtml(label) + '</span>' +
    '<b style="' + (mono ? 'font-family:ui-monospace,monospace;' : '') + 'font-size:.85rem;text-align:right;word-break:break-all;max-width:65%">' + value + '</b>' +
    '</div>';
}

function openTxDetails(tx) {
  var mask = document.getElementById('txDetailsMask');
  if (!mask) {
    console.warn('[txd] txDetailsMask not found in DOM');
    toast(tx.desc + ' — ' + fmtCurrency(tx.amt) + ' (' + tx.status + ')');
    return;
  }

  var isWithdrawal = !!tx.isWithdrawal;
  var amount = tx.amt || 0;
  var status = tx.status || '—';
  var badge = txStatusLabel(status);

  var kicker = document.getElementById('txdKicker');
  if (kicker) {
    if (isWithdrawal) kicker.textContent = '📤 Withdrawal';
    else if ((tx.desc || '').toLowerCase().indexOf('deposit') !== -1) kicker.textContent = '💰 Deposit';
    else if ((tx.desc || '').toLowerCase().indexOf('transfer') !== -1) kicker.textContent = '🔁 Transfer';
    else kicker.textContent = '💳 Transaction';
  }

  var amtEl = document.getElementById('txdAmount');
  if (amtEl) {
    amtEl.textContent = (amount > 0 ? '+' : '') + fmtCurrency(amount);
    amtEl.style.color = amount >= 0 ? '#00e08a' : '#ff5470';
  }

  var badgeEl = document.getElementById('txdStatusBadge');
  if (badgeEl) {
    badgeEl.textContent = badge.text;
    badgeEl.style.background = badge.bg;
    badgeEl.style.color = badge.color;
  }

  var body = document.getElementById('txdBody');
  if (!body) return;
  var rows = '';

  rows += txdRow('Date', new Date(tx.ts || Date.now()).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  }));
  rows += txdRow('Description', escapeHtml(tx.desc || '—'));

  if (isWithdrawal) {
    var wd = (st.withdrawals || []).find(function (w) { return w.id === tx.wdId; });
    if (wd) {
      rows += txdRow('Method', (wd.method || 'iban').toUpperCase());
      if (wd.details) {
        var d = wd.details;
        if (d.name) rows += txdRow('Recipient', escapeHtml(d.name));
        if (d.iban) rows += txdRow('IBAN', escapeHtml(d.iban), true);
        if (d.swift) rows += txdRow('SWIFT / BIC', escapeHtml(d.swift), true);
        if (d.bank) rows += txdRow('Bank', escapeHtml(d.bank));
        if (d.country) rows += txdRow('Country', escapeHtml(d.country));
        if (d.cardName) rows += txdRow('Card holder', escapeHtml(d.cardName));
        if (d.cardNumber) rows += txdRow('Card number', escapeHtml(d.cardNumber), true);
        if (d.expiry) rows += txdRow('Card expiry', escapeHtml(d.expiry));
        if (d.network) rows += txdRow('Network', escapeHtml(d.network));
        if (d.coin) rows += txdRow('Coin', escapeHtml(d.coin));
        if (d.address) rows += txdRow('Wallet', escapeHtml(d.address), true);
        if (d.memo) rows += txdRow('Memo', escapeHtml(d.memo));
      }
      if (wd.status === 'rejected' && wd.reason) {
        rows += '<div style="padding:12px 14px;background:rgba(255,84,112,.08);border:1px solid rgba(255,84,112,.3);border-radius:10px;color:#ff8a8a;font-size:.85rem;margin-top:4px">' +
          '<b>❌ Rejection reason:</b><br>' + escapeHtml(wd.reason) + '</div>';
      }
    } else {
      rows += txdRow('Method', 'IBAN');
    }
  } else {
    if (tx.hash) {
      var explorer = '';
      var symbol = (tx.symbol || '').toUpperCase();
      if (symbol === 'BTC') explorer = 'https://mempool.space/tx/' + tx.hash;
      else if (symbol === 'ETH') explorer = 'https://etherscan.io/tx/' + tx.hash;

      var hashDisplay = tx.hash.slice(0, 14) + '…' + tx.hash.slice(-10);
      var hashHtml = explorer
        ? '<a href="' + explorer + '" target="_blank" rel="noopener" style="color:#47dcff;text-decoration:none">' + escapeHtml(hashDisplay) + ' ↗</a>'
        : escapeHtml(hashDisplay);

      rows += '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:10px 14px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:10px">' +
        '<span style="color:#94a3b8;font-size:.78rem;text-transform:uppercase;letter-spacing:.06em">TX hash</span>' +
        '<span style="text-align:right;max-width:65%">' +
        '<b style="font-family:ui-monospace;font-size:.85rem;word-break:break-all">' + hashHtml + '</b>' +
        '<button onclick="event.stopPropagation();copyText(' + ncArg(tx.hash) + ',\'TX hash copied\')" style="margin-left:6px;background:transparent;border:none;color:#47dcff;cursor:pointer;font-size:14px" title="Copy">📋</button>' +
        '</span>' +
        '</div>';
    }
    if (tx.symbol) rows += txdRow('Symbol', escapeHtml(tx.symbol));
    if (tx.crypto) rows += txdRow('Crypto amount', Number(tx.crypto).toFixed(8) + ' ' + escapeHtml(tx.symbol || ''));
    if (tx.to) rows += txdRow('To address', escapeHtml(tx.to), true);
  }

  var txId = tx.hash || tx.wdId || ('tx_' + (tx.ts || Date.now()));
  rows += txdRow('Transaction ID', '#' + String(txId).slice(0, 24) + (String(txId).length > 24 ? '…' : ''));

  body.innerHTML = rows;
  mask.classList.add('on');
}

function closeTxDetails() {
  var mask = document.getElementById('txDetailsMask');
  if (mask) mask.classList.remove('on');
}

/* ═══════════════════ RECENT TX ═══════════════════ */
function renderRecentTx() {
  var listEl = document.getElementById('recentTxList');
  if (!listEl) return;
  var txs = (st.txs || []).slice();
  var withdrawals = st.withdrawals || [];
  withdrawals.forEach(function (w) {
    txs.push({
      ts: w.createdAt,
      desc: 'Withdrawal via ' + (w.method || 'iban').toUpperCase(),
      amt: -w.amount,
      status: w.status === 'pending' ? 'Under Review' : w.status === 'approved' ? 'Completed' : w.status === 'rejected' ? 'Rejected' : w.status,
      reason: w.reason || '', isWithdrawal: true, wdId: w.id
    });
  });
  txs.sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
  txs = txs.slice(0, 5);

  if (txs.length === 0) {
    listEl.innerHTML = '<div class="recent-tx-empty">No transactions yet</div>';
    return;
  }

  var html = '';
  for (var i = 0; i < txs.length; i++) {
    var t = txs[i];
    var icon = '💳', iconClass = 'card';
    if (t.desc && t.desc.toLowerCase().indexOf('deposit') !== -1) { icon = '💰'; iconClass = 'deposit'; }
    else if (t.desc && t.desc.toLowerCase().indexOf('withdrawal') !== -1) { icon = '💸'; iconClass = 'withdrawal'; }

    var amtClass = 'neutral', amtText = '—';
    if (t.amt > 0) { amtClass = 'plus'; amtText = '+' + fmtCurrency(t.amt); }
    else if (t.amt < 0) { amtClass = 'minus'; amtText = fmtCurrency(t.amt); }

    var badge = '';
    if (t.status === 'Completed') badge = '<div class="recent-tx-badge ok">✓ Completed</div>';
    else if (t.status === 'Processing') badge = '<div class="recent-tx-badge proc">⏳ Processing</div>';
    else if (t.status === 'Under Review') badge = '<div class="recent-tx-badge pend">⏳ Under review</div>';
    else if (t.status === 'Rejected') badge = '<div class="recent-tx-badge fail">✗ Rejected</div>';

    var timeStr = t.ts ? timeAgo(t.ts) : (t.date || '');

    html += '<div class="recent-tx-item" data-tx-i="' + i + '" style="cursor:pointer" title="Click for details">' +
      '<div class="recent-tx-icon ' + iconClass + '">' + icon + '</div>' +
      '<div class="recent-tx-info">' +
      '<div class="recent-tx-desc">' + (t.desc || 'Transaction') + '</div>' +
      '<div class="recent-tx-time">' + timeStr + '</div>' +
      badge +
      '</div>' +
      '<div class="recent-tx-amount ' + amtClass + '">' + amtText + '</div>' +
      '</div>';
  }
  listEl.innerHTML = html;

  var items = listEl.querySelectorAll('.recent-tx-item[data-tx-i]');
  for (var k = 0; k < items.length; k++) {
    (function (idx) {
      items[k].onclick = function () {
        var t = txs[idx];
        if (!t) return;
        if (typeof openTxDetails === 'function') openTxDetails(t);
        else toast(t.desc + ' — ' + fmtCurrency(t.amt) + ' (' + t.status + ')');
      };
    })(k);
  }
}

function initRecentTx() {
  var viewAll = document.getElementById('viewAllTx');
  if (viewAll) viewAll.onclick = function (e) {
    e.preventDefault();
    var pgs = document.querySelectorAll('.pg');
    for (var i = 0; i < pgs.length; i++) pgs[i].classList.remove('on');
    var txPg = document.getElementById('tx');
    if (txPg) txPg.classList.add('on');
    var ms = document.querySelectorAll('.mi');
    for (var j = 0; j < ms.length; j++) ms[j].classList.remove('on');
    var txMi = document.querySelector('.mi[data-p="tx"]');
    if (txMi) txMi.classList.add('on');
  };
}

/* ═══════════════════ CARD DESIGN ═══════════════════ */
function applyCardDesign() {
  if (!st.card || !st.card.design) return;
  var design = st.card.design || 'cosmic';
  var cards = document.querySelectorAll('.pay');
  for (var i = 0; i < cards.length; i++) {
    var c = cards[i];
    if (c.closest('.onb-preview') || c.closest('.onb-step')) continue;
    c.classList.remove('design-cosmic', 'design-purple', 'design-silver', 'design-black', 'design-gold', 'design-ocean', 'design-mountain', 'design-aurora', 'design-city');
    c.classList.add('design-' + design);
  }
}

function setSelectedDesign(design) {
  selectedDesign = design;
  var opts = document.querySelectorAll('.design-opt');
  for (var i = 0; i < opts.length; i++) {
    opts[i].classList.toggle('on', opts[i].getAttribute('data-design') === design);
  }
}

function initDesignPicker() {
  var picker = document.getElementById('designPicker');
  if (picker) {
    var opts = picker.querySelectorAll('.design-opt');
    for (var i = 0; i < opts.length; i++) {
      opts[i].onclick = function () { setSelectedDesign(this.getAttribute('data-design')); };
    }
  }
  var modalPicker = document.getElementById('designPickerModal');
  if (modalPicker) {
    var mopts = modalPicker.querySelectorAll('.design-opt');
    for (var j = 0; j < mopts.length; j++) {
      mopts[j].onclick = function () {
        var all = modalPicker.querySelectorAll('.design-opt');
        for (var k = 0; k < all.length; k++) all[k].classList.remove('on');
        this.classList.add('on');
      };
    }
  }
  var btnChange = document.getElementById('btnChangeDesign');
  if (btnChange) {
    btnChange.onclick = function () {
      if (!st.card) { toast('No card yet', true); return; }
      var current = st.card.design || 'cosmic';
      var all = document.querySelectorAll('#designPickerModal .design-opt');
      for (var k = 0; k < all.length; k++) {
        all[k].classList.toggle('on', all[k].getAttribute('data-design') === current);
      }
      var mask = document.getElementById('designMask');
        if (mask) {
    mask.classList.add('on');
    mask.style.display = 'flex';
    mask.style.zIndex = '999999';
    mask.style.position = 'fixed';
    mask.style.inset = '0';
  }
    };
  }
  var btnSave = document.getElementById('designSave');
  if (btnSave) {
    btnSave.onclick = function () {
      var active = document.querySelector('#designPickerModal .design-opt.on');
      if (!active) { toast('Please choose a design', true); return; }
      var d = active.getAttribute('data-design');
      var mask = document.getElementById('designMask');
      if (mask) mask.classList.remove('on');
      openPasswordConfirm('Confirm changing card design to "' + d + '"', function () {
        if (!st.card) st.card = {};
        st.card.design = d;
        saveToServer();
        applyCardDesign();
        renderCard();
        toast('Card design updated');
      });
    };
  }
  var btnCancel = document.getElementById('designCancel');
  if (btnCancel) btnCancel.onclick = function () {
    var mask = document.getElementById('designMask');
    if (mask) mask.classList.remove('on');
  };
}

/* ═══════════════════ IBAN ═══════════════════ */
function renderIbanByAdmin() {
  var pending = document.getElementById('ibanPending');
  var ready = document.getElementById('ibanReady');
  if (!pending || !ready) return;

  var iban = st.user && st.user.iban;
  if (iban) {
    pending.style.display = 'none';
    ready.style.display = 'block';
    var ibanEl = document.getElementById('myIban');
    if (ibanEl) ibanEl.textContent = iban.replace(/(.{4})/g, '$1 ').trim();
    var swiftEl = document.getElementById('mySwift');
    if (swiftEl && st.user.swift) swiftEl.textContent = st.user.swift;
    var bankEl = document.getElementById('myBank');
    if (bankEl && st.user.bank) bankEl.textContent = st.user.bank;
    var countryEl = document.getElementById('myCountry');
    if (countryEl) {
      var names = { SE: 'Sweden', NO: 'Norway', DK: 'Denmark', FI: 'Finland', DE: 'Germany', FR: 'France', ES: 'Spain', IT: 'Italy', NL: 'Netherlands', GB: 'United Kingdom', US: 'United States' };
      var flags = { SE: '🇸🇪', NO: '🇳🇴', DK: '🇩🇰', FI: '🇫🇮', DE: '🇩🇪', FR: '🇫🇷', ES: '🇪🇸', IT: '🇮🇹', NL: '🇳🇱', GB: '🇬🇧', US: '🇺🇸' };
      var code = st.user.country || 'SE';
      countryEl.textContent = (flags[code] || '') + ' ' + (names[code] || code) + ' (' + code + ')';
    }
  } else {
    pending.style.display = 'block';
    ready.style.display = 'none';
  }
}

/* ═══════════════════ END OF PART B ═══════════════════ */

/* ═══════════════════════════════════════════════════════════════
   PART C — KYC, CARDS, CHAT, ONBOARDING, MODALS, TRACKING
   ═══════════════════════════════════════════════════════════════ */

/* ═══════════════════ KYC / VERIFICATION ═══════════════════ */
var verifyData = { docType: 'Passport', docFile: null, selfieFile: null, address: null };

function ncResetScreen(id) {
  var el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('on');
  el.removeAttribute('style');
}

function showVerifyScreen() {
  var screen = document.getElementById('verifyScreen');
  if (screen) { screen.removeAttribute('style'); screen.classList.add('on'); }
  if (typeof window.__ncPausePolling === 'function') window.__ncPausePolling(600000);
  ncResetScreen('pendingScreen');
  ncResetScreen('rejectedScreen');
  showVerifyStep(1);
}

function hideVerifyScreen() {
  var screen = document.getElementById('verifyScreen');
  if (screen) screen.classList.remove('on');
}

function showVerifyStep(n) {
  var steps = document.querySelectorAll('#verifyScreen .verify-step');
  for (var i = 0; i < steps.length; i++) steps[i].classList.remove('on');
  var target = document.getElementById('verifyStep' + n);
  if (target) target.classList.add('on');
}

function fileSizeStr(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

function initVerification() {
  var typeBtns = document.querySelectorAll('.vtype-btn');
  var docSlots = document.getElementById('docSlots');
  var slotBack = document.getElementById('slotBack');
  var verifyNext1 = document.getElementById('verifyNext1');
  
  function updateSlots() {
    var activeType = document.querySelector('.vtype-btn.on');
    var type = activeType ? activeType.getAttribute('data-type') : 'Passport';
    var isTwoSides = (type === "Driver's License" || type === 'National ID');
    
    if (isTwoSides) {
      docSlots.setAttribute('data-sides', '2');
      if (slotBack) slotBack.style.display = 'flex';
      if (document.getElementById('capFront')) document.getElementById('capFront').textContent = 'Front side';
    } else {
      docSlots.setAttribute('data-sides', '1');
      if (slotBack) slotBack.style.display = 'none';
      if (document.getElementById('capFront')) document.getElementById('capFront').textContent = 'Photo page';
    }
    checkContinue();
  }

  function checkContinue() {
    var activeType = document.querySelector('.vtype-btn.on');
    var type = activeType ? activeType.getAttribute('data-type') : 'Passport';
    var isTwoSides = (type === "Driver's License" || type === 'National ID');
    
    var hasFront = document.getElementById('docFile') && document.getElementById('docFile').files.length > 0;
    var hasBack = document.getElementById('docFileBack') && document.getElementById('docFileBack').files.length > 0;
    
    if (isTwoSides) {
      verifyNext1.disabled = !(hasFront && hasBack);
    } else {
      verifyNext1.disabled = !hasFront;
    }
  }

  for (var i = 0; i < typeBtns.length; i++) {
    typeBtns[i].onclick = function () {
      for (var j = 0; j < typeBtns.length; j++) typeBtns[j].classList.remove('on');
      this.classList.add('on');
      verifyData.docType = this.getAttribute('data-type');
      updateSlots();
    };
  }

  var docInput = document.getElementById('docFile');
  if (docInput) docInput.onchange = function () {
    var f = this.files[0];
    if (!f) return;
    verifyData.docFile = f.name;
    var img = document.getElementById('docThumb');
    if (img) {
      var reader = new FileReader();
      reader.onload = function(e) {
        img.src = e.target.result;
        img.style.display = 'block';
      };
      reader.readAsDataURL(f);
    }
    document.getElementById('docUpload').classList.add('has');
    document.getElementById('docUploaded').style.display = 'flex';
    document.getElementById('docFileName').textContent = f.name;
    document.getElementById('docFileSize').textContent = fileSizeStr(f.size);
    checkContinue();
  };

  var docInputBack = document.getElementById('docFileBack');
  if (docInputBack) docInputBack.onchange = function () {
    var f = this.files[0];
    if (!f) return;
    var img = document.getElementById('docThumbBack');
    if (img) {
      var reader = new FileReader();
      reader.onload = function(e) {
        img.src = e.target.result;
        img.style.display = 'block';
      };
      reader.readAsDataURL(f);
    }
    document.getElementById('docUploadBack').classList.add('has');
    document.getElementById('docUploadedBack').style.display = 'flex';
    document.getElementById('docFileNameBack').textContent = f.name;
    document.getElementById('docFileSizeBack').textContent = fileSizeStr(f.size);
    checkContinue();
  };

  var selfieInput = document.getElementById('selfieFile');
  if (selfieInput) selfieInput.onchange = function () {
    var f = this.files[0];
    if (!f) return;
    verifyData.selfieFile = f.name;
    document.getElementById('selfieUpload').style.display = 'none';
    document.getElementById('selfieUploaded').style.display = 'flex';
    document.getElementById('selfieFileName').textContent = f.name;
    document.getElementById('selfieFileSize').textContent = fileSizeStr(f.size);
    document.getElementById('verifyNext2').disabled = false;
  };

  var btn1 = document.getElementById('verifyNext1');
  if (btn1) btn1.onclick = function () { showVerifyStep(2); };
  var back2 = document.getElementById('verifyBack2');
  if (back2) back2.onclick = function () { showVerifyStep(1); };
  var btn2 = document.getElementById('verifyNext2');
  if (btn2) btn2.onclick = function () { showVerifyStep(3); };
  var back3 = document.getElementById('verifyBack3');
  if (back3) back3.onclick = function () { showVerifyStep(2); };

  setTimeout(function () {
    var btn3 = document.getElementById('verifyNext3');
    if (btn3 && !btn3._bound) {
      btn3._bound = true;
      btn3.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (typeof window.submitRealVerification === 'function') window.submitRealVerification();
      };
    }
  }, 500);

  updateSlots();
}
function fileToBase64(file) {
  return new Promise(function (resolve, reject) {
    var reader = new FileReader();
    reader.onload = function () { resolve(reader.result); };
    reader.onerror = function (e) { reject(e); };
    reader.readAsDataURL(file);
  });
}

async function uploadKycFile(file, docType) {
  var token = getSessionToken();
  if (!token) throw new Error('Not authenticated');
  var base64 = await fileToBase64(file);
  var r = await fetch(WORKER_URL + '?action=uploadKycDoc', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, docType, imageBase64: base64, fileName: file.name })
  });
  var data = await r.json();
  if (!data.ok) throw new Error(data.error || 'Upload failed');
  return data.key;
}
window.submitRealVerification = async function () {
  if (window._kycSubmitting) return;
  window._kycSubmitting = true;

  var btn = document.getElementById('verifyNext3');
  if (btn) { btn.disabled = true; btn.textContent = 'Uploading...'; }

  document.querySelectorAll('#kycLoadingOverlay').forEach(function (el) { el.remove(); });

  var loadingOverlay = document.createElement('div');
  loadingOverlay.id = 'kycLoadingOverlay';
  loadingOverlay.style.cssText = 'position:fixed;inset:0;background:rgba(11,18,32,0.95);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:999999;color:#e7edf5;';
  loadingOverlay.innerHTML =
    '<div style="width:60px;height:60px;border:4px solid rgba(0,212,255,.2);border-top-color:#00e5ff;border-radius:50%;animation:kycSpin 1s linear infinite;margin-bottom:24px;"></div>' +
    '<div style="font-size:20px;font-weight:700;" id="kycStatusText">Uploading documents...</div>' +
    '<div style="font-size:13px;color:#94a3b8;margin-top:10px;" id="kycStatusSub">Please wait, do not close this tab</div>' +
    '<style>@keyframes kycSpin{to{transform:rotate(360deg)}}</style>';
  document.body.appendChild(loadingOverlay);

  function setStatus(main, sub) {
    var m = document.getElementById('kycStatusText');
    var s = document.getElementById('kycStatusSub');
    if (m) m.textContent = main;
    if (s) s.textContent = sub || '';
  }

  await new Promise(function (r) { setTimeout(r, 80); });

  var watchdog = setTimeout(function () {
    document.querySelectorAll('#kycLoadingOverlay').forEach(function (el) { el.remove(); });
    if (typeof toast === 'function') toast('Upload timeout. Try smaller files or check connection.', true);
    if (btn) { btn.disabled = false; btn.textContent = 'Submit →'; }
    window._kycSubmitting = false;
    alert('KYC Upload TIMEOUT\n\nЧто делать:\n1. F12 → Network → проверь запросы uploadKycDoc\n2. F12 → Console → проверь красные ошибки\n3. Уменьши размер файлов (max 3MB)\n4. Проверь интернет');
  }, 60000);

  try {
    var token = getSessionToken();
    if (!token) throw new Error('Not authenticated');

    var docEl = document.getElementById('docFile');
    var selfieEl = document.getElementById('selfieFile');
    var docFile = docEl && docEl.files ? docEl.files[0] : null;
    var selfieFile = selfieEl && selfieEl.files ? selfieEl.files[0] : null;

    var streetEl = document.getElementById('vStreet');
    var cityEl = document.getElementById('vCity');
    var zipEl = document.getElementById('vZip');
    var countryEl = document.getElementById('vCountry');
    var street = streetEl ? streetEl.value.trim() : '';
    var city = cityEl ? cityEl.value.trim() : '';
    var zip = zipEl ? zipEl.value.trim() : '';
    var country = countryEl ? countryEl.value : '';

    if (!docFile) throw new Error('Please upload document');
    if (!selfieFile) throw new Error('Please upload selfie');
    if (!street || !city || !zip) throw new Error('Please fill address');

        var MAX_BYTES = 15 * 1024 * 1024;
    if (docFile.size > MAX_BYTES) {
      throw new Error('Document too large (' + (docFile.size/1024/1024).toFixed(1) + 'MB). Max 15MB.');
    }
    if (selfieFile.size > MAX_BYTES) {
      throw new Error('Selfie too large (' + (selfieFile.size/1024/1024).toFixed(1) + 'MB). Max 15MB.');
    }

    console.log('[KYC] Starting upload. Doc:', docFile.size, 'bytes; Selfie:', selfieFile.size, 'bytes');

    setStatus('Uploading document (1/2)...', 'This may take 10-30 seconds');
    console.log('[KYC] Uploading passport...');
var ncDocs = (window.NCVerify && typeof window.NCVerify.getDocs === 'function') ? window.NCVerify.getDocs() : null;

var TYPE_MAP = {
  'Passport': 'passport',
  "Driver's License": 'driver_license',
  'National ID': 'id_card'
};

var uiType = (ncDocs && ncDocs.type) || 'Passport';
var apiType = TYPE_MAP[uiType] || 'passport';

var docKeyFront = null, docKeyBack = null;

if (ncDocs && ncDocs.front) {
  setStatus('Uploading document (1/2)...', 'This may take 10-30 seconds');
  console.log('[KYC] Uploading front as:', apiType);
  docKeyFront = await uploadKycFile(ncDocs.front, 'passport');
  console.log('[KYC] ✅ front uploaded:', docKeyFront);

  if (ncDocs.back) {
    setStatus('Uploading document (2/2)...', 'Almost done');
    console.log('[KYC] Uploading back as: id_card');
    docKeyBack = await uploadKycFile(ncDocs.back, 'id_card');
    console.log('[KYC] ✅ back uploaded:', docKeyBack);
  }
} else {
  setStatus('Uploading document (1/2)...', 'This may take 10-30 seconds');
  docKeyFront = await uploadKycFile(docFile, 'passport');
  console.log('[KYC] ✅ passport uploaded:', docKeyFront);
}

setStatus('Uploading selfie...', 'Almost done');
console.log('[KYC] Uploading selfie...');
var selfieKey = await uploadKycFile(selfieFile, 'selfie');
console.log('[KYC] ✅ selfie uploaded:', selfieKey);

setStatus('Submitting verification...', 'Contacting server');
console.log('[KYC] Submitting verification...');

var docKeys = [docKeyFront];
if (docKeyBack) docKeys.push(docKeyBack);
docKeys.push(selfieKey);

if (!st.verification) st.verification = {};
st.verification.status = 'pending';
st.verification.docType = verifyData.docType || 'Passport';
st.verification.docKeys = docKeys;
st.verification.personalInfo = { street: street, city: city, zip: zip, country: country };
st.verification.submittedAt = Date.now();

var r = await fetch(WORKER_URL + '?action=submitVerification', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    token: token, docType: verifyData.docType || 'Passport', docKeys: docKeys,
    personalInfo: { street: street, city: city, zip: zip, country: country }
  })
});
var data = await r.json();
console.log('[KYC] ✅ submitVerification response:', data);
if (!data.ok) throw new Error(data.error || 'Submit failed');

var email = localStorage.getItem('user_email');
if (email) localStorage.setItem('nc_kyc_done_' + email, '1');

    clearTimeout(watchdog);
    document.querySelectorAll('#kycLoadingOverlay').forEach(function (el) { el.remove(); });

    var loginEl = document.getElementById('loginScreen'); if (loginEl) loginEl.style.display = 'none';
    var sideEl = document.getElementById('sideBar'); if (sideEl) sideEl.style.display = 'none';
    var mainEl = document.getElementById('mainApp'); if (mainEl) mainEl.style.display = 'none';
    var vScreen = document.getElementById('verifyScreen'); if (vScreen) { vScreen.classList.remove('on'); vScreen.style.display = 'none'; }
    var onboardEl = document.getElementById('onboard'); if (onboardEl) onboardEl.classList.remove('on');
    var rejEl = document.getElementById('rejectedScreen'); if (rejEl) rejEl.classList.remove('on');

    hideVerifyScreen();
    showPendingScreen();

    var _p = document.getElementById('pendingScreen');
    if (_p) {
      _p.classList.add('on');
      _p.style.display = 'flex';
      _p.style.position = 'fixed';
      _p.style.inset = '0';
      _p.style.zIndex = '9999';
      _p.style.visibility = 'visible';
      _p.style.opacity = '1';
    }

        if (typeof toast === 'function') toast('Documents submitted! Waiting for approval.');
    console.log('[KYC] ✅ DONE');

    try {
      document.dispatchEvent(new CustomEvent('nc:kyc:submit', {
        detail: { status: 'pending', ts: Date.now() }
      }));
    } catch (e) {}

  } catch (e) {
    clearTimeout(watchdog);
    console.error('[KYC] ❌ ERROR:', e);
    document.querySelectorAll('#kycLoadingOverlay').forEach(function (el) { el.remove(); });
    if (typeof toast === 'function') toast(e.message, true);
    if (btn) { btn.disabled = false; btn.textContent = 'Submit →'; }
    alert('KYC Error: ' + e.message);
  } finally {
    clearTimeout(watchdog);
    window._kycSubmitting = false;
  }
};

function showPendingScreen() {
  var s = document.getElementById('pendingScreen');
  if (s) {
    s.classList.add('on');
    s.style.display = 'flex';
    s.style.visibility = 'visible';
    s.style.opacity = '1';
    s.style.zIndex = '9999';
    s.style.position = 'fixed';
    s.style.inset = '0';
  }
  
  ['verifyScreen', 'rejectedScreen', 'onboard'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) {
      el.classList.remove('on');
      el.style.display = 'none';
    }
  });
  var side = document.getElementById('sideBar');
  var main = document.getElementById('mainApp');
  if (side) side.style.display = 'none';
  if (main) main.style.display = 'none';
  var onb = document.getElementById('onboard');
  if (onb) onb.classList.remove('on');

  var btnCheck = document.getElementById('btnCheckKycStatus');
  if (btnCheck && !btnCheck._bound) {
    btnCheck._bound = true;
    btnCheck.onclick = async function () {
      btnCheck.disabled = true;
      btnCheck.textContent = '⏳ Checking...';
      var v2 = await checkVerificationStatus();
      btnCheck.disabled = false;
      btnCheck.textContent = '🔄 Check status';
      if (!v2) { toast('Check failed', true); return; }
      if (v2.status === 'approved') {
        toast('✅ Approved! Loading...');
        loadFromServer(function () {
          var p = document.getElementById('pendingScreen');
          if (p) { p.classList.remove('on'); p.style.display = 'none'; }
          var side2 = document.getElementById('sideBar');
          var main2 = document.getElementById('mainApp');
          if (side2) side2.style.display = 'flex';
          if (main2) main2.style.display = 'flex';
          render();
          if (typeof applyAccountType === 'function') applyAccountType();
        });
      } else if (v2.status === 'pending') {
        toast('⏳ Still pending review', true);
      } else if (v2.status === 'rejected') {
        showRejectedScreen(v2.reason);
      }
    };
  }

  var btnLogout = document.getElementById('btnLogoutPending');
  if (btnLogout && !btnLogout._bound) {
    btnLogout._bound = true;
    btnLogout.onclick = function () { doLogout(); };
  }
}

function showRejectedScreen(reason) {
  var s = document.getElementById('rejectedScreen');
  if (s) { s.removeAttribute('style'); s.classList.add('on'); }
  ncResetScreen('pendingScreen');
  ncResetScreen('verifyScreen');
  var side = document.getElementById('sideBar');
  var main = document.getElementById('mainApp');
  if (side) side.style.display = 'none';
  if (main) main.style.display = 'none';

  var rEl = document.getElementById('rejectedReason');
  if (rEl) rEl.textContent = reason || 'Documents not accepted';

  var btnRetry = document.getElementById('btnRetryVerification');
  if (btnRetry && !btnRetry._bound) {
    btnRetry._bound = true;
    btnRetry.onclick = function () {
      document.getElementById('rejectedScreen').classList.remove('on');
      showVerifyScreen();
      showVerifyStep(1);
    };
  }
  var btnLogout = document.getElementById('btnLogoutRejected');
  if (btnLogout && !btnLogout._bound) {
    btnLogout._bound = true;
    btnLogout.onclick = function () { doLogout(); };
  }
}

async function checkVerificationStatus() {
  var token = getSessionToken();
  if (!token) return null;
  var email = localStorage.getItem('user_email');

  try {
    var r = await fetch(WORKER_URL + '?action=getUserState', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
    var data = await r.json();
    if (!data || data.error) return null;

    var serverV = data.verification || null;
    var localApproved = email && localStorage.getItem('nc_kyc_approved_' + email) === '1';

    if (localApproved && (!serverV || serverV.status !== 'approved')) {
      return { status: 'approved' };
    }

    if (serverV && serverV.status === 'approved' && email) {
      localStorage.setItem('nc_kyc_approved_' + email, '1');
    }

    return serverV;
  } catch (e) { return null; }
}

async function gateByVerification() {
  if (localStorage.getItem('user_role') === 'admin') return false;
  if (window.adminViewingEmail) return false;

  var token = getSessionToken();
  if (!token) return false;

  var v = await checkVerificationStatus();
  var side = document.getElementById('sideBar');
  var main = document.getElementById('mainApp');
  var onboard = document.getElementById('onboard');

  if (!v) {
    if (side) side.style.display = 'none';
    if (main) main.style.display = 'none';
    if (onboard) onboard.classList.remove('on');
    var vScreen = document.getElementById('verifyScreen');
    if (vScreen) vScreen.classList.add('on');
    showVerifyStep(1);
    return true;
  }
  if (v.status === 'pending') { showPendingScreen(); return true; }
  if (v.status === 'rejected') { showRejectedScreen(v.reason); return true; }
  if (v.status === 'approved') {
    var p = document.getElementById('pendingScreen'); if (p) p.classList.remove('on');
    var rr = document.getElementById('rejectedScreen'); if (rr) rr.classList.remove('on');
    var vs = document.getElementById('verifyScreen'); if (vs) vs.classList.remove('on');
    if (side) side.style.display = 'flex';
    if (main) main.style.display = 'flex';
    if (!st.user) st.user = {};
    st.user.verified = true;
    st.user.accountType = v.accountType || st.user.accountType || null;
    if (typeof applyAccountType === 'function') applyAccountType();
    return false;
  }
  return false;
}
window.gateByVerification = gateByVerification;

window._kycApprovedShown = false;

function flashTitleOnApprove() {
  if (!document.hidden) return;
  var original = document.title;
  var on = false;
  var i = 0;
  var timer = setInterval(function () {
    document.title = (on = !on) ? '✅ Verified!' : original;
    if (++i > 10) { clearInterval(timer); document.title = original; }
  }, 600);
  document.addEventListener('visibilitychange', function once() {
    if (!document.hidden) {
      clearInterval(timer);
      document.title = original;
      document.removeEventListener('visibilitychange', once);
    }
  });
}

/* ═══════════════════ NAV ═══════════════════ */
function initNav() {
  var mis = document.querySelectorAll('.mi');
  for (var i = 0; i < mis.length; i++) {
    mis[i].onclick = function () {
      var p = this.getAttribute('data-p');
      var accountType = (st && st.user && st.user.accountType) || null;
      var isExchange = (accountType === 'exchange');
      var targetPage = p;
      if (isExchange && p === 'dash') targetPage = 'exchangeDash';

      var pgs = document.querySelectorAll('.pg');
      for (var j = 0; j < pgs.length; j++) {
        pgs[j].classList.remove('on');
        pgs[j].style.display = 'none';
      }
      var page = document.getElementById(targetPage);
      if (page) {
        page.classList.add('on');
        page.style.display = 'block';
      }
      var ms = document.querySelectorAll('.mi');
      for (var k = 0; k < ms.length; k++) ms[k].classList.remove('on');
      this.classList.add('on');

      if (targetPage === 'dash' || targetPage === 'exchangeDash') {
        setTimeout(function () {
          render();
          if (typeof renderExchangeDash === 'function') renderExchangeDash();
        }, 50);
      }
    };
  }
}

/* ═══════════════════ TX TABLE ═══════════════════ */
function badgeClass(s) {
  if (s === 'Completed') return 'badge ok';
  if (s === 'Under Review') return 'badge pend';
  if (s === 'Processing') return 'badge proc';
  if (s === 'Failed') return 'badge fail';
  return 'badge';
}

function renderTx() {
  var b = $('txB');
  if (!b) return;
  if (!st.txs || st.txs.length === 0) {
    b.innerHTML = '<tr><td colspan="4"><div class="empty"><div>No transactions yet</div></div></td></tr>';
    return;
  }
  var h = '';
  for (var i = 0; i < st.txs.length; i++) {
    var t = st.txs[i];
    var c = t.amt >= 0 ? 'var(--ok)' : 'var(--bad)';
    var s = t.amt >= 0 ? '+' : '';
    h += '<tr style="cursor:pointer" data-tx-idx="' + i + '" onclick="openTxDetailsFromTable(' + i + ')"><td>' + t.date + '</td><td>' + escapeHtml(t.desc) + '</td><td style="color:' + c + ';font-weight:600">' + s + fmt(t.amt) + '</td><td><span class="' + badgeClass(t.status) + '">' + t.status + '</span></td></tr>';
  }
  b.innerHTML = h;
}

window.openTxDetailsFromTable = function (i) {
  var t = (st.txs || [])[i];
  if (!t) return;
  openTxDetails(t);
};

function addTx(desc, amt, status) {
  st.txs.unshift({ date: now(), ts: Date.now(), desc, amt, status: status || 'Completed' });
  renderTx();
  saveToServer();
}

function toast(msg, warn) {
  var t = $('toast');
  if (!t) return;
  var svg = t.querySelector('svg');
  var tMsg = $('tMsg');
  if (tMsg) tMsg.textContent = msg;
  if (warn) {
    t.style.borderLeftColor = 'var(--warn)';
    if (svg) { svg.style.stroke = 'var(--warn)'; }
  } else {
    t.style.borderLeftColor = 'var(--ok)';
    if (svg) { svg.style.stroke = 'var(--ok)'; }
  }
  t.classList.add('on');
  clearTimeout(tt);
  tt = setTimeout(function () { t.classList.remove('on'); }, 3200);
}

/* ═══════════════════ CARD GENERATION ═══════════════════ */
function genCardNumber(prefix) {
  var s = prefix;
  for (var i = 0; i < 12; i++) s += Math.floor(Math.random() * 10);
  return s;
}
function fmtCard(num) { return String(num).replace(/(.{4})/g, '$1 ').trim(); }
function genCvv() {
  var s = '';
  for (var i = 0; i < 3; i++) s += Math.floor(Math.random() * 10);
  return s;
}
function genExpiry() {
  var d = new Date();
  var y = d.getFullYear() + 3;
  var m = d.getMonth() + 1;
  var mm = m < 10 ? '0' + m : '' + m;
  return mm + '/' + String(y).slice(2);
}

function createVirtualCard(name, type, cur) {
  var prefix = type === 'Mastercard' ? '5399' : '4921';
  var num = genCardNumber(prefix);
  var expiry = genExpiry();
  var cvv = genCvv();

  var finalName = name;
  if (!finalName || !finalName.trim() || finalName === 'YOUR NAME') {
    finalName = localStorage.getItem('user_name') || 'CARD HOLDER';
  }

  st.card = {
    num, cvv, expiry,
    name: finalName.toUpperCase(),
    type: type || 'Visa', cur: cur || 'USD',
    status: 'Active', design: selectedDesign || 'cosmic',
    country: (document.getElementById('onbCountry') ? document.getElementById('onbCountry').value : 'SE'),
    createdAt: Date.now()
  };
  if (!st.user) st.user = {};
  st.user.country = st.card.country;

  renderCard();
  saveToServer();
}

function renderCard() {
  if (!st.card) {
    if ($('cardDash')) $('cardDash').classList.add('frozen');
    if ($('cardNumDash')) $('cardNumDash').textContent = '— — — —   — — — —   — — — —   — — — —';
    if ($('cardNameDash')) $('cardNameDash').textContent = '—';
    if ($('cardExpDash')) $('cardExpDash').textContent = '—/—';
    if ($('cardTypeDash')) $('cardTypeDash').textContent = 'NO CARD';
    if ($('cardNumFull')) $('cardNumFull').textContent = '— — — —   — — — —   — — — —   — — — —';
    if ($('cardNameFull')) $('cardNameFull').textContent = '—';
    if ($('cardExpFull')) $('cardExpFull').textContent = '—/—';
    if ($('cardTypeFull')) $('cardTypeFull').textContent = 'NO CARD';
    if ($('detNum')) $('detNum').textContent = '—';
    if ($('detCvv')) $('detCvv').textContent = '●●●';
    if ($('detExp')) $('detExp').textContent = '—';
    if ($('detName')) $('detName').textContent = '—';
    if ($('detType')) $('detType').textContent = '—';
    if ($('detCur')) $('detCur').textContent = '—';
    if ($('detStatus')) $('detStatus').textContent = 'No Card';
    return;
  }

  var c = st.card;
  if (!c.name || c.name === '—' || c.name === 'CARD HOLDER') {
    c.name = (localStorage.getItem('user_name') || 'CARD HOLDER').toUpperCase();
  }
  if (!c.expiry || c.expiry === '—/—') {
    var dd = new Date();
    var mm = dd.getMonth() + 1;
    var yy = dd.getFullYear() + 3;
    c.expiry = (mm < 10 ? '0' + mm : mm) + '/' + String(yy).slice(2);
  }
  if (!c.cvv) c.cvv = String(Math.floor(Math.random() * 900) + 100);
  if (!c.cur) c.cur = 'USD';
  if (!c.type) c.type = 'Visa';
  if (!c.status) c.status = 'Active';
  if (!c.num) c.num = '5399000000000000';

  var numFormatted = fmtCard(c.num);
  var frozen = (c.status === 'Frozen');

  var networkHTML;
  if (c.type === 'Mastercard') {
    networkHTML = '<svg viewBox="0 0 100 40"><circle cx="35" cy="20" r="14" fill="#EB001B"/><circle cx="65" cy="20" r="14" fill="#F79E1B"/><circle cx="50" cy="20" r="14" fill="#FF5F00" opacity="0.9"/></svg>';
  } else {
    networkHTML = '<svg viewBox="0 0 100 40"><text x="50" y="28" text-anchor="middle" font-family="Arial Black, Arial" font-size="22" font-weight="900" fill="currentColor" font-style="italic" letter-spacing="1">VISA</text></svg>';
  }
  var net1 = document.getElementById('cardNetwork1');
  if (net1) net1.innerHTML = networkHTML;
  var net2 = document.getElementById('cardNetwork2');
  if (net2) net2.innerHTML = networkHTML;

  if ($('cardDash')) $('cardDash').classList.toggle('frozen', frozen);
  if ($('cardNumDash')) $('cardNumDash').textContent = numFormatted;
  if ($('cardNameDash')) $('cardNameDash').textContent = c.name;
  if ($('cardExpDash')) $('cardExpDash').textContent = c.expiry;
  if ($('cardTypeDash')) $('cardTypeDash').textContent = (c.type + ' ' + c.cur).toUpperCase();

  if ($('cardFull')) $('cardFull').classList.toggle('frozen', frozen);
  if ($('cardNumFull')) $('cardNumFull').textContent = numFormatted;
  if ($('cardNameFull')) $('cardNameFull').textContent = c.name;
  if ($('cardExpFull')) $('cardExpFull').textContent = c.expiry;
  if ($('cardTypeFull')) $('cardTypeFull').textContent = (c.type + ' ' + c.cur).toUpperCase();

  if ($('detNum')) $('detNum').textContent = numFormatted;
  if ($('detCvv')) $('detCvv').textContent = cvvVisible ? c.cvv : '●●●';
  if ($('detExp')) $('detExp').textContent = c.expiry;
  if ($('detName')) $('detName').textContent = c.name;
  if ($('detType')) $('detType').textContent = c.type;
  if ($('detCur')) $('detCur').textContent = c.cur;
  if ($('detStatus')) {
    $('detStatus').textContent = c.status;
    $('detStatus').style.color = frozen ? 'var(--warn)' : 'var(--ok)';
  }

  if ($('btnShowCvv')) $('btnShowCvv').textContent = cvvVisible ? '🙈 Hide CVV' : '👁 Show CVV';
  if ($('btnFreeze')) $('btnFreeze').textContent = frozen ? '🔥 Unfreeze Card' : '❄ Freeze Card';

  applyCardDesign();
}

/* ═══════════════════ MODAL (Add/Transfer) ═══════════════════ */
function destHint(method) {
  if (method === 'Bank Transfer (SEPA)') return { show: true, label: 'Recipient IBAN', ph: 'XX00 0000 0000 0000 0000 00' };
  if (method === 'Bank Transfer (SWIFT)') return { show: false };
  if (method === 'Credit Card') return { show: false };
  if (method === 'Bitcoin (BTC)') return { show: true, label: 'Recipient BTC Address', ph: 'bc1q...' };
  if (method === 'Ethereum (ETH)') return { show: true, label: 'Recipient ETH Address', ph: '0x...' };
  return { show: false };
}

function refreshDest() {
  var mMethod = $('mMethod');
  if (!mMethod) return;
  var m = mMethod.value;
  var hint = destHint(m);
  var isAdd = (mode === 'add');

  var mDestWrap = $('mDestWrap'); if (mDestWrap) mDestWrap.style.display = 'none';
  var sepa = $('mTransferSepa'); if (sepa) sepa.style.display = 'none';
  var swift = $('mTransferSwift'); if (swift) swift.style.display = 'none';
  var card = $('mTransferCard'); if (card) card.style.display = 'none';

    if (isAdd) {
    if (hint.show) {
      if (mDestWrap) mDestWrap.style.display = 'block';
      
      var destEl = $('mDest'); // скрытое поле
      var labelEl = $('mDestLabel');
      var destText = $('mDestText');
      var destNet = $('mDestNetwork');
      var qrWrap = $('mQrWrap');
      var qrCode = $('mQrCode');

      var addr = '';
      var networkName = '';

      if (m === 'Bitcoin (BTC)') {
        addr = getDepositWallet('BTC');
        networkName = 'Bitcoin (BTC)';
        if (labelEl) labelEl.textContent = 'Send BTC to this address';
      } else if (m === 'Ethereum (ETH)') {
        addr = getDepositWallet('ETH');
        networkName = 'Ethereum (ERC-20)';
        if (labelEl) labelEl.textContent = 'Send ETH to this address';
      }

      // Заполняем текст адреса
      if (destText) destText.textContent = addr || 'Address not set';
      if (destEl) destEl.value = addr || '';
      if (destNet) destNet.textContent = networkName;

            // 🛡️ ГЕНЕРАЦИЯ QR-КОДА
      if (addr && qrWrap && qrCode && typeof QRious !== 'undefined') {
        qrWrap.style.display = 'flex';
        
        // Полностью очищаем контейнер перед новой отрисовкой
        qrCode.innerHTML = '';
        
        // Рисуем QR через canvas (это самый надежный способ)
        var canvas = document.createElement('canvas');
        qrCode.appendChild(canvas);
        
        new QRious({
          element: canvas,
          value: addr,
          size: 120, // Размер под контейнер
          background: 'white',
          foreground: 'black',
          level: 'H' // Высокий уровень защиты (меньше шансов, что не отсканируется)
        });
      } else {
        if (qrWrap) qrWrap.style.display = 'none';
      }
    }
    return;
  }

  if (m === 'Bank Transfer (SEPA)') { if (sepa) sepa.style.display = 'block'; }
  else if (m === 'Bank Transfer (SWIFT)') { if (swift) swift.style.display = 'block'; }
  else if (m === 'Credit Card') { if (card) card.style.display = 'block'; }
  else {
    if (hint.show) {
      if (mDestWrap) mDestWrap.style.display = 'block';
      var labelEl2 = $('mDestLabel');
      var destEl2 = $('mDest');
      if (labelEl2) labelEl2.textContent = hint.label;
      if (destEl2) { destEl2.placeholder = hint.ph; destEl2.readOnly = false; destEl2.value = ''; }
    }
  }
}

function openModal(m) {
  mode = m;
  var titleEl = $('mTitle');
  var descEl = $('mDesc');
  if (titleEl) titleEl.textContent = m === 'add' ? 'Add Funds' : 'Transfer Funds';
  if (descEl) descEl.textContent = m === 'add' ? 'Send crypto to the address below.' : 'Enter amount and recipient details.';
  var amtEl = $('mAmount'); if (amtEl) amtEl.value = '';
  var destEl = $('mDest'); if (destEl) destEl.value = '';
  var methodEl = $('mMethod');
  if (methodEl) methodEl.value = (m === 'transfer') ? 'Bank Transfer (SEPA)' : 'Bitcoin (BTC)';
  refreshDest();
  var maskEl = $('mask'); if (maskEl) maskEl.classList.add('on');
  setTimeout(function () { if (amtEl) amtEl.focus(); }, 100);
  if (m === 'add') startAutoCheck();
}

function closeModal() {
  var maskEl = $('mask'); if (maskEl) maskEl.classList.remove('on');
  mode = null;
  stopAutoCheck();
}

function isCrypto(m) { return m === 'Bitcoin (BTC)' || m === 'Ethereum (ETH)'; }

function confirmModal() {
  var amtEl = $('mAmount');
  var methodEl = $('mMethod');
  if (!amtEl || !methodEl) return;
  var a = Number(amtEl.value);
  var m = methodEl.value;
  if (!a || a <= 0) { toast('Please enter a valid amount', true); return; }

  if (mode === 'add') {
    if (isCrypto(m)) {
      var coin = (m === 'Bitcoin (BTC)') ? 'BTC' : 'ETH';
      var wallet = getDepositWallet(coin);
      if (!wallet) { toast('Deposit address is not set. Contact support.', true); return; }
      toast('Send crypto to the address. Watching blockchain...', false);
      doAutoCheck();
      return;
    }
    addTx('Deposit via ' + m + ' — pending review', a, 'Under Review');
    addNotification('Deposit submitted via ' + m + ': ' + fmtCurrency(a) + ' — pending review', '⏳');
    toast('Deposit submitted! Waiting for approval.');
    closeModal();
    render();
    saveToServer();
    return;
  }

  if (a > st.usd) { toast('Insufficient balance', true); return; }
  var dest = '';
  var details = {};

  if (m === 'Bank Transfer (SEPA)') {
    var rname = _val('mRecipientName').trim();
    var riban = _val('mRecipientIban').trim();
    var rpurp = _val('mRecipientPurpose').trim();
    if (rname.length < 2) { toast('Enter recipient name', true); return; }
    if (riban.replace(/\s/g, '').length < 15) { toast('Enter valid IBAN', true); return; }
    dest = riban;
    details = { type: 'sepa', name: rname, iban: riban, purpose: rpurp };
  } else if (m === 'Bank Transfer (SWIFT)') {
    var sname = _val('mSwiftName').trim();
    var siban = _val('mSwiftIban').trim();
    var sswift = _val('mSwiftCode').trim();
    if (sname.length < 2) { toast('Enter recipient name', true); return; }
    if (siban.replace(/\s/g, '').length < 15) { toast('Enter valid IBAN', true); return; }
    if (sswift.length < 6) { toast('Enter valid SWIFT', true); return; }
    dest = siban;
    details = { type: 'swift', name: sname, iban: siban, swift: sswift };
  } else if (m === 'Credit Card') {
    var cholder = _val('mCardHolder').trim();
    var cnum = _val('mCardNum').trim();
    var cexp = _val('mCardExp').trim();
    if (cholder.length < 2) { toast('Enter card holder name', true); return; }
    if (cnum.replace(/\s/g, '').length < 16) { toast('Enter valid card number', true); return; }
    if (!/^\d{2}\/\d{2}$/.test(cexp)) { toast('Expiry must be MM/YY', true); return; }
    dest = cnum;
    details = { type: 'card', holder: cholder, number: cnum, expiry: cexp };
  } else {
    dest = _val('mDest').trim();
    if (!dest) { toast('Enter recipient wallet address', true); return; }
    details = { type: 'crypto', address: dest, coin: m };
  }

  st.usd -= a;
  var desc = (m === 'Credit Card')
     ? 'Card transfer to ' + dest.slice(0, 18)
      : 'Transfer via ' + m + ' to ' + dest.slice(0, 18);
  addTx(desc, -a, 'Under Review');
  addNotification('Transfer sent: ' + fmtCurrency(a) + ' via ' + m, '📤');
  toast('Transfer submitted — under review');
  closeModal();
  render();
  saveToServer();
}

/* ═══════════════════ COPY ═══════════════════ */
function copyText(txt, okMsg) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(txt).then(function () { toast(okMsg); }).catch(function () { toast(okMsg); });
  } else { toast(okMsg); }
}

/* ═══════════════════ ORDER TRACKING ═══════════════════ */
var STEPS = [
  { name: 'Order Received', loc: 'NordicCrypto HQ, Oslo', day: 0 },
  { name: 'Card Minted', loc: 'Production Facility, Oslo', day: 3 },
  { name: 'Packed', loc: 'Logistics Center, Oslo', day: 6 },
  { name: 'In Transit', loc: 'International Hub, Copenhagen', day: 14 },
  { name: 'Out for Delivery', loc: 'Local Courier, Stockholm', day: 25 },
  { name: 'Delivered', loc: 'Destination', day: 30 }
];
var MAX_DELIVERY_DAYS = 40;

function genTrackId() {
  var s = 'NC-' + new Date().getFullYear() + '-';
  var ch = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (var i = 0; i < 6; i++) s += ch[Math.floor(Math.random() * ch.length)];
  return s;
}

function stepIndexFor(createdAt) {
  var elapsedDays = (Date.now() - createdAt) / (24 * 60 * 60 * 1000);
  var idx = 0;
  for (var i = 0; i < STEPS.length; i++) { if (elapsedDays >= STEPS[i].day) idx = i; }
  return idx;
}

function placeOrder() {
  var name = $('oName') ? $('oName').value.trim() : '';
  var city = $('oCity') ? $('oCity').value.trim() : '';
  var street = $('oStreet') ? $('oStreet').value.trim() : '';
  var zip = $('oZip') ? $('oZip').value.trim() : '';
  var phone = $('oPhone') ? $('oPhone').value.trim() : '';
  var country = $('oCountry') ? $('oCountry').value : '';
  var type = $('oType') ? $('oType').value : '';
  if (!name || !city || !street || !zip || !phone) { toast('Please fill in all fields', true); return; }
  st.order = {
    id: genTrackId(), name, type,
    address: street + ', ' + city + ', ' + zip + ', ' + country,
    dest: city + ', ' + country, createdAt: Date.now()
  };
  saveToServer();
  renderOrder();
  addNotification('Physical card order placed. Tracking: ' + st.order.id, '📦');
  toast('Order placed! Tracking ID: ' + st.order.id);
}

function renderOrder() {
  var trackEl = document.getElementById('orderTrack');
  if (!st.order) {
    if (trackEl) { trackEl.classList.add('hidden'); trackEl.style.display = 'none'; }
    var formEl = document.getElementById('orderForm');
    if (formEl) { formEl.classList.remove('hidden'); formEl.style.display = ''; }
    return;
  }
  var formEl = $('orderForm');
  var trackEl = $('orderTrack');
  if (!formEl || !trackEl) return;
  if (!st.order) {
    formEl.classList.remove('hidden');
    trackEl.classList.add('hidden');
    return;
  }
  formEl.classList.add('hidden');
  trackEl.classList.remove('hidden');

  var elapsedDays = (Date.now() - st.order.createdAt) / (24 * 60 * 60 * 1000);
  if (elapsedDays > MAX_DELIVERY_DAYS) { showDeliveryError(); return; }

  var idx = stepIndexFor(st.order.createdAt);
  var steps = document.querySelectorAll('#stepsWrap .step');
  for (var i = 0; i < steps.length; i++) {
    steps[i].classList.remove('done', 'active');
    if (i < idx) steps[i].classList.add('done');
    if (i === idx) steps[i].classList.add('active');
  }
  var pct = Math.round(((idx + 1) / STEPS.length) * 100);
  if ($('trackBar')) $('trackBar').style.width = pct + '%';
  if ($('trackPct')) $('trackPct').textContent = pct + '%';
  if ($('trackStatus')) $('trackStatus').textContent = STEPS[idx].name;
  if ($('trackId')) $('trackId').textContent = st.order.id;
  if ($('trackName')) $('trackName').textContent = st.order.name;
  if ($('trackDest')) $('trackDest').textContent = st.order.dest;
  if ($('trackLoc')) $('trackLoc').textContent = STEPS[idx].loc;

  var eta = new Date(st.order.createdAt + STEPS[STEPS.length - 1].day * 24 * 60 * 60 * 1000);
  if ($('trackEta')) $('trackEta').textContent = eta.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  var logHtml = '';
  for (var j = 0; j <= idx; j++) {
    var t = new Date(st.order.createdAt + STEPS[j].day * 24 * 60 * 60 * 1000);
    logHtml += '<div style="display:flex;gap:12px;padding:8px 0;font-size:.85rem;border-bottom:1px solid rgba(255,255,255,.04)"><span style="color:#00d4ff;font-family:ui-monospace;font-size:.75rem;min-width:70px">' + t.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + '</span><span>' + STEPS[j].name + ' — ' + STEPS[j].loc + '</span></div>';
  }
  if ($('trackLog')) $('trackLog').innerHTML = logHtml;
}

function showDeliveryError() {
  var wrap = document.querySelector('#orderTrack .track-wrap');
  if (!wrap) return;
  wrap.innerHTML = '<div class="panel" style="text-align:center;padding:50px 30px"><h2>Delivery issue</h2><p style="color:var(--mut)">Delayed over ' + MAX_DELIVERY_DAYS + ' days. Contact support.</p></div>';
}

function initTrackingActions() {
  var btnSupport = document.getElementById('btnContactSupport');
  if (btnSupport) btnSupport.onclick = function () {
    window.location.href = 'mailto:support@nordiccrypto.com?subject=Card issue ' + (st.order ? st.order.id : '');
  };
  var btnAnother = document.getElementById('btnOrderAnother');
  if (btnAnother) btnAnother.onclick = function () {
    if (!confirm('Order another card?')) return;
    st.order = null;
    saveToServer();
    renderOrder();
    toast('Ready for new order');
  };
  var btnCancel = document.getElementById('btnCancelOrder');
  if (btnCancel) btnCancel.onclick = function () {
    if (!st.order) return;
    var daysSince = (Date.now() - st.order.createdAt) / (24 * 60 * 60 * 1000);
    if (daysSince > 7) { toast('Cannot cancel', true); return; }
    if (!confirm('Cancel this order?')) return;
    addNotification('Card order cancelled', '❌');
    st.order = null;
    saveToServer();
    renderOrder();
    toast('Order cancelled');
  };
}

/* ═══════════════════ AUTO CHECK ═══════════════════ */
function startAutoCheck() {
  stopAutoCheck();
  autoCheckKnown = {};
  var email = (window.adminViewingEmail || localStorage.getItem('user_email') || '').toLowerCase();
  var hasWallet = !!(st.cryptoAddress && (st.cryptoAddress.btc || st.cryptoAddress.eth));
  if (!hasWallet) hasWallet = !!DEPOSIT_WALLETS[email];
  if (!hasWallet) return;
  doAutoCheck();
  autoCheckTimer = setInterval(doAutoCheck, 15000);
}

function stopAutoCheck() {
  if (autoCheckTimer) { clearInterval(autoCheckTimer); autoCheckTimer = null; }
}

function doAutoCheck() {
  var methodEl = $('mMethod');
  if (!methodEl) return;
  var method = methodEl.value;
  var isBtc = (method === 'Bitcoin (BTC)');
  var isEth = (method === 'Ethereum (ETH)');
  if (!isBtc && !isEth) return;

  var myAddr = isBtc ? getDepositWallet('BTC') : getDepositWallet('ETH');
  if (!myAddr) return;

  var clientEmail = (window.adminViewingEmail || localStorage.getItem('user_email') || '').toLowerCase();
  fetch(WORKER_URL + '?action=check&email=' + encodeURIComponent(clientEmail) + '&_t=' + Date.now())
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (!data || !data.result) return;
      var list = isBtc ? data.result.btc : data.result.eth;
      if (!list || list.length === 0) return;
      var DAY_MS = 24 * 60 * 60 * 1000;
      var cardCreatedAt = (st.card && st.card.createdAt) ? st.card.createdAt : 0;
      for (var i = 0; i < list.length; i++) {
        var tx = list[i];
        var id = tx.hash;
        if (autoCheckKnown[id]) continue;
        if (tx.to && tx.to.toLowerCase() !== myAddr.toLowerCase()) { autoCheckKnown[id] = true; continue; }
        var txTime = tx.time ? tx.time * 1000 : 0;
        if (cardCreatedAt && txTime && txTime < cardCreatedAt) { autoCheckKnown[id] = true; continue; }
        if (txTime && (Date.now() - txTime) > DAY_MS) { autoCheckKnown[id] = true; continue; }
        var already = false;
        for (var j = 0; j < st.txs.length; j++) { if (st.txs[j].hash === id) { already = true; break; } }
        if (already) { autoCheckKnown[id] = true; continue; }
        autoCheckKnown[id] = true;
        var cryptoAmt = tx.amount;
        var symbol = isBtc ? 'BTC' : 'ETH';
        var credit = tx.amount * (isBtc ? st.btcP : st.ethP);
        if (!credit || credit <= 0) continue;
        closeModal();
        openDepositVerification(tx, cryptoAmt, symbol, credit);
        return;
      }
    })
    .catch(function (e) { console.error('[autoCheck]', e); });
}

function updateTxStatuses() {
  var changed = false;
  for (var i = 0; i < st.txs.length; i++) {
    var t = st.txs[i];
    if (!t.ts) { t.ts = Date.now(); changed = true; }
  }
  if (changed) { renderTx(); }
}

function attachExpiryFormatter(input) {
  if (!input) return;
  input.addEventListener('input', function (e) {
    var v = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (v.length >= 3) v = v.slice(0, 2) + '/' + v.slice(2);
    e.target.value = v;
  });
}

function attachCardFormatter(input) {
  if (!input) return;
  input.addEventListener('input', function (e) {
    var v = e.target.value.replace(/\D/g, '').slice(0, 16);
    var parts = v.match(/.{1,4}/g);
    e.target.value = parts ? parts.join(' ') : v;
  });
}

/* ═══════════════════ ONBOARDING ═══════════════════ */
function updateOnbPreview() {
  var typeEl = $('prevType');
  var nameEl = $('prevName');
  var curEl = $('prevCur');
  if (typeEl) typeEl.textContent = 'VIRTUAL ' + onbType.toUpperCase();
  if (nameEl) { var full = getFullName(); nameEl.textContent = (full || 'YOUR NAME').toUpperCase(); }
  if (curEl) curEl.textContent = onbCur;
}

function initOnboarding() {
  var _ob = document.getElementById('onboard');
  if (_ob && _ob.classList.contains('on')) {
    if (typeof goToOnbStep === 'function') goToOnbStep(1);
  }

  var designBtns = document.querySelectorAll('#designPicker .design-opt');
  for (var d = 0; d < designBtns.length; d++) {
    designBtns[d].onclick = function () {
      for (var k = 0; k < designBtns.length; k++) designBtns[k].classList.remove('on');
      this.classList.add('on');
      selectedDesign = this.getAttribute('data-design');
    };
  }
  var defDesign = document.querySelector('#designPicker .design-opt[data-design="cosmic"]');
  if (defDesign) defDesign.classList.add('on');

  var typeBtns = document.querySelectorAll('.type-btn');
  for (var t = 0; t < typeBtns.length; t++) {
    typeBtns[t].onclick = function () {
      for (var k = 0; k < typeBtns.length; k++) typeBtns[k].classList.remove('on');
      this.classList.add('on');
      onbType = this.getAttribute('data-type');
    };
  }
  var curBtns = document.querySelectorAll('.cur-btn');
  for (var c = 0; c < curBtns.length; c++) {
    curBtns[c].onclick = function () {
      for (var k = 0; k < curBtns.length; k++) curBtns[k].classList.remove('on');
      this.classList.add('on');
      onbCur = this.getAttribute('data-cur');
    };
  }

  var step1Btn = document.getElementById('onbNext1');
  if (step1Btn) step1Btn.onclick = function () { goToOnbStep(2); setTimeout(function () { if ($('onbFirst')) $('onbFirst').focus(); }, 200); };
  var step2Back = document.getElementById('onbBack2');
  if (step2Back) step2Back.onclick = function () { goToOnbStep(1); };
  var step2Next = document.getElementById('onbNext2');
  if (step2Next) step2Next.onclick = function () {
    var first = $('onbFirst') ? $('onbFirst').value.trim() : '';
    var last = $('onbLast') ? $('onbLast').value.trim() : '';
    if (!first) { toast('Please enter your first name', true); return; }
    if (!last) { toast('Please enter your last name', true); return; }
    updateStep3Title();
    goToOnbStep(3);
  };

  var createBtn = document.getElementById('btnCreateCard');
  if (createBtn) createBtn.onclick = function () {
    var name = getFullName();
    if (!name || name.length < 2) { toast('Please enter your name', true); return; }
    createVirtualCard(name, onbType, onbCur);
    var cardData = { num: st.card.num, name: st.card.name, expiry: st.card.expiry, type: st.card.type };
    var onboardEl = $('onboard');
    if (onboardEl) onboardEl.classList.add('exiting');
    playCardCreationAnimation(cardData, function () {
      if (onboardEl) { onboardEl.classList.remove('on'); onboardEl.classList.remove('exiting'); }
      var pgs = document.querySelectorAll('.pg');
      for (var j = 0; j < pgs.length; j++) pgs[j].classList.remove('on');
      if ($('dash')) $('dash').classList.add('on');
      var ms = document.querySelectorAll('.mi');
      for (var k = 0; k < ms.length; k++) ms[k].classList.remove('on');
      var dashMi = document.querySelector('.mi[data-p="dash"]');
      if (dashMi) dashMi.classList.add('on');
      renderCard();
      setTimeout(function () {
        var sideEl = document.getElementById('sideBar'); if (sideEl) sideEl.style.display = 'none';
        var mainEl = document.getElementById('mainApp'); if (mainEl) mainEl.style.display = 'none';
        var dashEl = document.getElementById('dash'); if (dashEl) dashEl.classList.remove('on');
        var vScreen = document.getElementById('verifyScreen');
        if (vScreen) { vScreen.classList.add('on'); vScreen.style.display = 'flex'; }
        if (typeof showVerifyStep === 'function') showVerifyStep(1);
      }, 500);
    });
  };
}

function goToOnbStep(n) {
  var steps = document.querySelectorAll('#onboard .onb-step');
  for (var i = 0; i < steps.length; i++) steps[i].classList.remove('on');
  var target = document.getElementById('onbStep' + n);
  if (target) target.classList.add('on');

  var ob = document.getElementById('onboard');
  if (ob) ob.setAttribute('data-step', String(n));

  var t = document.getElementById('onbSideTitle');
  var s = document.getElementById('onbSideSub');
  if (t && s) {
    if (n === 1) {
      t.innerHTML = 'Welcome<br>aboard.';
      s.textContent = "Let's set up your personal crypto banking in 3 quick steps.";
    } else if (n === 2) {
      t.innerHTML = 'Tell us<br>about you.';
      s.textContent = 'Your name will appear on the card.';
    } else if (n === 3) {
      t.innerHTML = 'Choose your<br>card.';
      s.textContent = 'Pick a design, card type and currency.';
    }
  }
}

function getFullName() {
  var first = ($('onbFirst') ? $('onbFirst').value.trim() : '');
  var middle = ($('onbMiddle') ? $('onbMiddle').value.trim() : '');
  var last = ($('onbLast') ? $('onbLast').value.trim() : '');
  var parts = [];
  if (first) parts.push(first);
  if (middle) parts.push(middle);
  if (last) parts.push(last);
  return parts.join(' ');
}

function getFirstName() {
  var first = ($('onbFirst') ? $('onbFirst').value.trim() : '');
  return first || 'there';
}

function updateStep3Title() {
  var fn = getFirstName();
  var el = $('onbStep3Title');
  if (el) el.textContent = 'Almost done, ' + fn + '!';
}

/* ═══════════════════ CARD ACTIONS ═══════════════════ */
function initCardActions() {
  var btnShowCvv = document.getElementById('btnShowCvv');
  if (btnShowCvv) btnShowCvv.onclick = function () {
    if (!st.card) return;
    cvvVisible = !cvvVisible;
    renderCard();
    if (cvvVisible) {
      clearTimeout(cvvTimer);
      cvvTimer = setTimeout(function () { cvvVisible = false; renderCard(); }, 5000);
    }
  };

  var btnFreeze = document.getElementById('btnFreeze');
  if (btnFreeze) btnFreeze.onclick = function () {
    if (!st.card) return;
    st.card.status = st.card.status === 'Frozen' ? 'Active' : 'Frozen';
    saveToServer();
    renderCard();
    addNotification(st.card.status === 'Frozen' ? 'Card frozen' : 'Card unfrozen', st.card.status === 'Frozen' ? '❄' : '🔥');
    toast(st.card.status === 'Frozen' ? 'Card frozen' : 'Card unfrozen');
  };

  var btnDelete = document.getElementById('btnDeleteCard');
  if (btnDelete) btnDelete.onclick = function () {
    if (!st.card) return;
    if (typeof openPasswordConfirm === 'function') {
      openPasswordConfirm('Confirm deleting your card.', function () {
        st.card = null;
        saveToServer();
        renderCard();
        addNotification('Card deleted', '🗑');
        toast('Card deleted');
      });
    }
  };

  var btnGoOrder = document.getElementById('btnGoOrder');
  if (btnGoOrder) btnGoOrder.onclick = function () {
    var pgs = document.querySelectorAll('.pg');
    for (var j = 0; j < pgs.length; j++) pgs[j].classList.remove('on');
    if ($('order')) $('order').classList.add('on');
    var ms = document.querySelectorAll('.mi');
    for (var k = 0; k < ms.length; k++) ms[k].classList.remove('on');
    var orderMi = document.querySelector('.mi[data-p="order"]');
    if (orderMi) orderMi.classList.add('on');
  };

  var freezeCard = document.getElementById('btnFreezeCard');
  if (freezeCard) freezeCard.onclick = function () {
    var realBtn = document.getElementById('btnFreeze');
    if (realBtn) realBtn.click();
  };
  var limitsCard = document.getElementById('btnLimitsCard');
  if (limitsCard) limitsCard.onclick = function () { toast('Limits: coming soon'); };
  var settingsCard = document.getElementById('btnSettingsCard');
  if (settingsCard) settingsCard.onclick = function () {
    var realBtn = document.getElementById('settingsBtn');
    if (realBtn) realBtn.click();
  };
}

/* ═══════════════════ INIT EVENTS ═══════════════════ */
function initEvents() {
  var btnAdd = document.getElementById('btnAdd');
  if (btnAdd) btnAdd.onclick = function () { openModal('add'); };
  var btnScan = document.getElementById('btnScanDeposits');
  if (btnScan) btnScan.onclick = scanAllDeposits;
  var btnWithdraw = document.getElementById('btnWithdrawV2');
  if (btnWithdraw) btnWithdraw.onclick = openWithdraw;
  var btnExchange = document.getElementById('btnExchangeV2');
  if (btnExchange) btnExchange.onclick = function () { toast('Exchange: coming soon'); };

  var mCancel = document.getElementById('mCancel');
  if (mCancel) mCancel.onclick = closeModal;
  var mOk = document.getElementById('mOk');
  if (mOk) mOk.onclick = confirmModal;
  var mMethod = document.getElementById('mMethod');
  if (mMethod) mMethod.onchange = refreshDest;

  var btnCopyCard = document.getElementById('btnCopyCardV2');
  if (btnCopyCard) btnCopyCard.onclick = function () {
    if (!st.card) { toast('No card yet', true); return; }
    copyText(st.card.num, 'Card number copied');
  };

  var btnCopyIban = document.getElementById('btnCopyIban');
  if (btnCopyIban) btnCopyIban.onclick = function () {
    if (st.user && st.user.iban) { copyText(st.user.iban, 'IBAN copied'); }
    else { toast('IBAN is not ready yet', true); }
  };

  var btnReceiveHero = document.getElementById('btnReceiveHero');
  if (btnReceiveHero && btnCopyIban) btnReceiveHero.onclick = function () { btnCopyIban.click(); };
  var btnReceiveMoney = document.getElementById('btnReceiveMoney');
  if (btnReceiveMoney && btnCopyIban) btnReceiveMoney.onclick = function () { btnCopyIban.click(); };
  var btnRefresh = document.getElementById('btnRefreshBalance');
  if (btnRefresh) {
    btnRefresh.onclick = function () {
      var oldHtml = btnRefresh.innerHTML;
      // Показываем, что идет загрузка (крутим иконку)
      btnRefresh.style.pointerEvents = 'none';
      btnRefresh.style.opacity = '0.6';
      btnRefresh.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: loginSpin 1s linear infinite;"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10"/><path d="M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>';
      
      // Принудительно обновляем данные
      refreshBalanceFromServer();
      
      // Если открыта панель админа и мы смотрим клиента
      if (typeof loadAdminUsers === 'function' && window.adminViewingEmail) {
        loadAdminUsers();
      }
      
      // Через 1 секунду возвращаем кнопку в исходное состояние
      setTimeout(function() {
        btnRefresh.style.pointerEvents = 'auto';
        btnRefresh.style.opacity = '1';
        btnRefresh.innerHTML = oldHtml;
        if (typeof toast === 'function') toast('Data updated');
      }, 1000);
    };
  }
  var btnOrder = document.getElementById('btnOrder');
  if (btnOrder) btnOrder.onclick = placeOrder;
}

setInterval(function () { updateTxStatuses(); renderOrder(); }, 30000);

/* ═══════════════════ CARD CREATION ANIMATION ═══════════════════ */
function playCardCreationAnimation(cardData, onComplete) {
  var stage = document.getElementById('animStage');
  var card = document.getElementById('animCard');
  var numLine = document.getElementById('animNum');
  var nameEl = document.getElementById('animName');
  var expEl = document.getElementById('animExp');
  var readyText = document.getElementById('readyText');

  if (!stage || !card) { if (onComplete) onComplete(); return; }

  stage.classList.remove('on');
  card.classList.remove('visible', 'glow', 'flash', 'exit');
  if (readyText) readyText.classList.remove('show');
  if (numLine) { numLine.textContent = ''; }
  if (nameEl) { nameEl.classList.remove('show'); nameEl.textContent = '—'; }
  if (expEl) { expEl.classList.remove('show'); expEl.textContent = '—/—'; }

  stage.classList.add('on');
  setTimeout(function () { card.classList.add('visible'); }, 350);
  setTimeout(function () { card.classList.add('glow'); }, 1300);

  var numStr = (cardData.num || '').replace(/(.{4})/g, '$1 ').trim();
  setTimeout(function () {
    if (!numLine) return;
    var i = 0;
    var t = setInterval(function () {
      if (i >= numStr.length) { clearInterval(t); return; }
      numLine.textContent += numStr[i++];
    }, 55);
  }, 1500);

  setTimeout(function () {
    if (nameEl) { nameEl.textContent = cardData.name || 'CARD HOLDER'; nameEl.classList.add('show'); }
    if (expEl) { expEl.textContent = cardData.expiry || '—/—'; expEl.classList.add('show'); }
  }, 2800);

  setTimeout(function () { card.classList.add('flash'); playChime(); spawnConfetti(); }, 3300);
  setTimeout(function () { if (readyText) readyText.classList.add('show'); }, 3700);
  setTimeout(function () { card.classList.add('exit'); }, 4400);

  setTimeout(function () {
    stage.classList.remove('on');
    card.classList.remove('visible', 'glow', 'flash', 'exit');
    if (readyText) readyText.classList.remove('show');
    if (onComplete) onComplete();
  }, 5200);
}

/* ═══════════════════ AUDIO ═══════════════════ */
var audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch (e) { return null; }
  }
  return audioCtx;
}

document.addEventListener('click', function unlockAudio() {
  var ctx = getAudioCtx();
  if (ctx && ctx.state === 'suspended') ctx.resume();
}, { once: false });

function playTone(freq, duration, type, volume) {
  var ctx = getAudioCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') { ctx.resume(); return; }
  try {
    var n = ctx.currentTime;
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    var vol = Math.min(volume || 0.3, 1);
    gain.gain.value = vol;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(n);
    osc.stop(n + duration);
  } catch (e) {}
}

function playChime() {
  playTone(880, 0.4, 'sine', 0.08);
  setTimeout(function () { playTone(1108, 0.4, 'sine', 0.07); }, 80);
  setTimeout(function () { playTone(1318, 0.5, 'sine', 0.06); }, 160);
}

function playChatSound() {
  playTone(880, 0.08, 'sine', 0.25);
  setTimeout(function () { playTone(1174, 0.12, 'sine', 0.2); }, 80);
}

function spawnConfetti() {
  var wrap = document.getElementById('confettiWrap');
  if (!wrap) return;
  wrap.innerHTML = '';
  var total = 30;
  var types = ['coin', 'spark'];
  var symbols = ['₿', 'Ξ'];
  for (var i = 0; i < total; i++) {
    var p = document.createElement('div');
    var t = types[Math.floor(Math.random() * types.length)];
    p.className = 'confetti-piece ' + t;
    if (t === 'coin') p.textContent = symbols[Math.floor(Math.random() * 2)];
    var size = 10 + Math.random() * 12;
    p.style.width = size + 'px';
    p.style.height = size + 'px';
    var angle = Math.random() * Math.PI * 2;
    var distance = 200 + Math.random() * 400;
    p.style.setProperty('--tx', Math.cos(angle) * distance + 'px');
    p.style.setProperty('--ty', Math.sin(angle) * distance - 100 + 'px');
    p.style.setProperty('--rot', (Math.random() * 720 - 360) + 'deg');
    p.style.animation = 'confettiFly ' + (1.2 + Math.random() * 0.8) + 's cubic-bezier(.2,.8,.4,1) forwards';
    p.style.animationDelay = (Math.random() * 0.3) + 's';
    wrap.appendChild(p);
  }
  setTimeout(function () { wrap.innerHTML = ''; }, 2500);
}

/* ═══════════════════ SIGNUP ═══════════════════ */
function initSignup() {
  var btnGoToSignup = document.getElementById('btnGoToSignup');
  var mask = document.getElementById('signupMask');
  var cancelBtn = document.getElementById('suCancel');
  var submitBtn = document.getElementById('suSubmit');
  var goToLogin = document.getElementById('suGoToLogin');
  var nameEl = document.getElementById('suName');
  var emailEl = document.getElementById('suEmail');
  var passEl = document.getElementById('suPassword');
  var confirmEl = document.getElementById('suConfirm');
  var errEl = document.getElementById('signupError');
  var formEl = document.getElementById('signupForm');
  var loadingEl = document.getElementById('signupLoading');

  if (!btnGoToSignup || !mask) return;

  btnGoToSignup.onclick = function () {
    if (nameEl) nameEl.value = '';
    if (emailEl) emailEl.value = '';
    if (passEl) passEl.value = '';
    if (confirmEl) confirmEl.value = '';
    if (errEl) errEl.style.display = 'none';
    if (formEl) formEl.style.display = 'block';
    if (loadingEl) loadingEl.style.display = 'none';
    mask.classList.add('on');
    setTimeout(function () { if (nameEl) nameEl.focus(); }, 100);
  };

  if (cancelBtn) cancelBtn.onclick = function () { mask.classList.remove('on'); };
  mask.onclick = function (e) { if (e.target === mask) mask.classList.remove('on'); };
  if (goToLogin) goToLogin.onclick = function (e) { e.preventDefault(); mask.classList.remove('on'); };

  var suPassToggle = document.getElementById('suPassToggle');
  if (suPassToggle) suPassToggle.onclick = function () {
    if (!passEl) return;
    passEl.type = passEl.type === 'password' ? 'text' : 'password';
    this.textContent = passEl.type === 'password' ? '👁' : '🙈';
  };
  var suConfirmToggle = document.getElementById('suConfirmToggle');
  if (suConfirmToggle) suConfirmToggle.onclick = function () {
    if (!confirmEl) return;
    confirmEl.type = confirmEl.type === 'password' ? 'text' : 'password';
    this.textContent = confirmEl.type === 'password' ? '👁' : '🙈';
  };

  [nameEl, emailEl, passEl, confirmEl].forEach(function (el) {
    if (el) el.onkeydown = function (e) { if (e.key === 'Enter') doSignup(); };
  });

  if (submitBtn) submitBtn.onclick = doSignup;

  function doSignup() {
    var name = nameEl ? nameEl.value.trim() : '';
    var email = emailEl ? emailEl.value.trim().toLowerCase() : '';
    var password = passEl ? passEl.value : '';
    var confirm = confirmEl ? confirmEl.value : '';

    if (errEl) errEl.style.display = 'none';
    if (!name) return showSignupError('Please enter your full name');
    if (!email || email.indexOf('@') === -1) return showSignupError('Please enter a valid email');
    if (!password || password.length < 6) return showSignupError('Password must be at least 6 characters');
    if (password !== confirm) return showSignupError('Passwords do not match');

    if (formEl) formEl.style.display = 'none';
    if (loadingEl) loadingEl.style.display = 'block';
    if (submitBtn) submitBtn.disabled = true;

    fetch(WORKER_LOGIN_URL + '?action=register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name, email: email, password: password })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.ok && data.token) {
          localStorage.removeItem('user_email');
          localStorage.removeItem('user_role');
          localStorage.removeItem('user_name');
          setSessionToken(data.token);
          localStorage.setItem('user_email', data.user.email);
          localStorage.setItem('user_role', data.user.role || 'user');
          localStorage.setItem('user_name', data.user.name || name);
          if (mask) mask.classList.remove('on');
          hideLoginScreen();
          showApp();
          startInactivityTimer();
          playChime();
          toast('Account created! Welcome, ' + name.split(' ')[0]);
        } else {
          if (formEl) formEl.style.display = 'block';
          if (loadingEl) loadingEl.style.display = 'none';
          if (submitBtn) submitBtn.disabled = false;
          showSignupError(data.error || 'Registration failed');
        }
      })
      .catch(function () {
        if (formEl) formEl.style.display = 'block';
        if (loadingEl) loadingEl.style.display = 'none';
        if (submitBtn) submitBtn.disabled = false;
        showSignupError('Connection error. Try again.');
      });
  }

  function showSignupError(msg) {
    if (errEl) { errEl.textContent = msg; errEl.style.display = 'block'; }
  }
}

/* ═══════════════════ PASSWORD CONFIRM ═══════════════════ */
var passwordConfirmCallback = null;

function openPasswordConfirm(message, callback) {
  passwordConfirmCallback = callback;
  var mask = document.getElementById('passwordConfirmMask');
  var desc = document.getElementById('passwordConfirmDesc');
  var input = document.getElementById('passwordConfirmInput');
  var errEl = document.getElementById('passwordConfirmError');
  if (desc) desc.textContent = message;
  if (input) input.value = '';
  if (errEl) errEl.style.display = 'none';
  if (mask) mask.classList.add('on');
  setTimeout(function () { if (input) input.focus(); }, 100);
}

function initPasswordConfirm() {
  var mask = document.getElementById('passwordConfirmMask');
  var okBtn = document.getElementById('passwordConfirmOk');
  var cancelBtn = document.getElementById('passwordConfirmCancel');
  var toggle = document.getElementById('passwordConfirmToggle');
  var input = document.getElementById('passwordConfirmInput');
  var errEl = document.getElementById('passwordConfirmError');

  if (cancelBtn) cancelBtn.onclick = function () {
    if (mask) mask.classList.remove('on');
    passwordConfirmCallback = null;
  };
  if (mask) mask.onclick = function (e) {
    if (e.target === mask) { mask.classList.remove('on'); passwordConfirmCallback = null; }
  };
  if (toggle) toggle.onclick = function () {
    if (!input) return;
    input.type = input.type === 'password' ? 'text' : 'password';
    this.textContent = input.type === 'password' ? '👁' : '🙈';
  };
  if (input) input.onkeydown = function (e) { if (e.key === 'Enter') doPasswordConfirm(); };
  if (okBtn) okBtn.onclick = doPasswordConfirm;

  function doPasswordConfirm() {
    var password = input ? input.value : '';
    if (!password) { if (errEl) { errEl.textContent = 'Please enter your password'; errEl.style.display = 'block'; } return; }
    if (errEl) errEl.style.display = 'none';
    if (okBtn) { okBtn.disabled = true; okBtn.textContent = 'Verifying...'; }

    fetch(WORKER_LOGIN_URL + '?action=verifyPassword', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: getSessionToken(), password: password })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (okBtn) { okBtn.disabled = false; okBtn.textContent = 'Confirm'; }
        if (data.ok) {
          if (mask) mask.classList.remove('on');
          if (passwordConfirmCallback) passwordConfirmCallback();
          passwordConfirmCallback = null;
        } else {
          if (errEl) { errEl.textContent = data.error || 'Incorrect password'; errEl.style.display = 'block'; }
        }
      })
      .catch(function () {
        if (okBtn) { okBtn.disabled = false; okBtn.textContent = 'Confirm'; }
        if (errEl) { errEl.textContent = 'Connection error'; errEl.style.display = 'block'; }
      });
  }
}

function initCountryCurrencyLink() {
  var countryEl = document.getElementById('onbCountry');
  if (!countryEl) return;
  countryEl.addEventListener('change', function () {
    var country = this.value;
    var currencyMap = { SE: 'SEK', NO: 'NOK', DK: 'DKK', FI: 'EUR', DE: 'EUR', FR: 'EUR', ES: 'EUR', IT: 'EUR', NL: 'EUR', GB: 'GBP', US: 'USD' };
    var currency = currencyMap[country] || 'EUR';
    var btns = document.querySelectorAll('.cur-btn');
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle('on', btns[i].getAttribute('data-cur') === currency);
    }
    onbCur = currency;
    toast('Currency set to ' + currency);
  });
}

/* ═══════════════════ CHAT ═══════════════════ */
async function toggleChat() {
  var p = document.getElementById('chatPanel');
  if (!p) return;
  var open = p.style.display === 'flex';
  p.style.display = open ? 'none' : 'flex';
  if (open) { window._adminTyping = false; return; }

  if (!st.ticket || !st.ticket.id) {
    try {
      var token = getSessionToken();
      var email = window.adminViewingEmail || localStorage.getItem('user_email');
      if (token && email) {
        var r = await fetch(WORKER_URL + '?action=getUserState', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, email })
        });
        var d = await r.json();
        if (d && d.ticket && d.ticket.id) {
          st.ticket = d.ticket;
          st.chat = d.chat || [];
        }
      }
    } catch (e) {}
  }

  var hasTicket = !!(st.ticket && st.ticket.id);
  if (hasTicket) {
    var formEl = document.getElementById('chatTicketForm');
    var convEl = document.getElementById('chatConversation');
    if (formEl) formEl.style.display = 'none';
    if (convEl) convEl.style.display = 'flex';
    var topic = st.ticket.topic || 'support';
    var priority = st.ticket.priority || 'normal';
    var topicEl = document.getElementById('chatTicketTopic');
    if (topicEl) topicEl.textContent = topic.charAt(0).toUpperCase() + topic.slice(1) + ' • ' + priority;
    if (typeof renderChatMessages === 'function') renderChatMessages();
    if (typeof markChatRead === 'function') markChatRead();
    setTimeout(function () { var i = document.getElementById('chatInput'); if (i) i.focus(); }, 100);
  } else {
    var formEl2 = document.getElementById('chatTicketForm');
    var convEl2 = document.getElementById('chatConversation');
    if (formEl2) formEl2.style.display = 'flex';
    if (convEl2) convEl2.style.display = 'none';
    var e = document.getElementById('tkEmail');
    if (e) e.value = window.adminViewingEmail || localStorage.getItem('user_email') || '';
    setTimeout(function () { var i = document.getElementById('tkEmail'); if (i) i.focus(); }, 100);
  }
}

function renderChatMessages() {
  var box = document.getElementById('chatMessages');
  if (!box) return;
  var chat = (st.chat || []).slice().sort(function (a, b) { return a.ts - b.ts; });

  var html = '';
  if (!chat.length) {
    html = '<div class="chat-welcome"><div class="chat-welcome-name">Elena Bergström</div><div class="chat-welcome-text">Hi! How can I help you today?</div></div>';
  } else {
    var prevFrom = null;
    var prevTs = 0;
    chat.forEach(function (m) {
      var isClient = m.from === 'client';
      var sameAuthor = (prevFrom === m.from) && (m.ts - prevTs < 60000);
      var metaHtml = sameAuthor ? '' :
        '<div class="chat-msg-meta">' + (isClient ? 'You' : 'Elena') + ' • ' +
        new Date(m.ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + '</div>';
      html += '<div class="chat-msg ' + (isClient ? 'client' : 'admin') + (sameAuthor ? ' same-author' : '') + '">' +
        '<div><div class="chat-bubble">' + escapeHtml(m.text) + '</div>' + metaHtml + '</div></div>';
      prevFrom = m.from;
      prevTs = m.ts;
    });
  }

  if (window._adminTyping) {
    html += '<div class="chat-msg admin chat-typing"><div><div class="chat-bubble"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></div><div class="chat-msg-meta">Elena is typing...</div></div></div>';
  }

  box.innerHTML = html;
  box.scrollTop = box.scrollHeight;
}

async function sendChatMsg() {
  var input = document.getElementById('chatInput');
  if (!input) return;
  var text = (input.value || '').trim();
  if (!text) return;
  input.value = '';
  if (!st.chat) st.chat = [];
  st.chat.push({
    id: 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
    from: 'client', text, ts: Date.now(), read: false
  });
  renderChatMessages();
  var token = getSessionToken();
  var targetEmail = window.adminViewingEmail || localStorage.getItem('user_email');
  if (token && targetEmail) {
    try {
      await fetch(WORKER_URL + '?action=setUserState', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email: targetEmail, state: st, force: true })
      });
    } catch (e) {}
  }
}

async function markChatRead() {
  var token = getSessionToken();
  var email = window.adminViewingEmail || localStorage.getItem('user_email');
  if (!token || !email) return;
  try {
    var r = await fetch(WORKER_URL + '?action=getUserState', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, email })
    });
    var fresh = await r.json();
    if (!fresh || !fresh.chat) return;
    st.chat = fresh.chat;
    var changed = false;
    st.chat.forEach(function (m) { if (m.from === 'admin' && !m.read) { m.read = true; changed = true; } });
    if (!changed) { updateChatBadge(); return; }
    await fetch(WORKER_URL + '?action=setUserState', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, email, state: st, force: true })
    });
    updateChatBadge();
  } catch (e) {}
}

function updateChatBadge() {
  var badge = document.getElementById('chatBadge');
  if (!badge) return;
  var unread = (st.chat || []).filter(function (m) { return m.from === 'admin' && !m.read; }).length;
  if (unread > 0) {
    badge.textContent = unread > 9 ? '9+' : unread;
    badge.style.display = 'flex';
  } else { badge.style.display = 'none'; }
}

async function startTicket() {
  var emailEl = document.getElementById('tkEmail');
  var topicEl = document.getElementById('tkTopic');
  var priorityEl = document.getElementById('tkPriority');
  var descEl = document.getElementById('tkDesc');
  if (!emailEl || !topicEl || !priorityEl || !descEl) return;
  var email = (emailEl.value || '').trim();
  var topic = topicEl.value;
  var priority = priorityEl.value;
  var desc = (descEl.value || '').trim();

  if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)) { alert('Please enter a valid email'); return; }
  if (desc.length < 5) { alert('Please describe your issue'); return; }

  st.ticket = { id: 'tk_' + Date.now(), email, topic, priority, createdAt: Date.now(), status: 'open' };
  if (!st.chat) st.chat = [];
  st.chat.push({
    id: 'msg_' + Date.now(), from: 'client',
    text: '[' + topic.toUpperCase() + ' • ' + priority.toUpperCase() + ']\n\n' + desc,
    ts: Date.now(), read: false
  });

  var token = getSessionToken();
  var targetEmail = window.adminViewingEmail || email;
  if (token) {
    try {
      await fetch(WORKER_URL + '?action=setUserState', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email: targetEmail, state: st, force: true })
      });
    } catch (e) {}
  }
  document.getElementById('chatTicketForm').style.display = 'none';
  document.getElementById('chatConversation').style.display = 'flex';
  var topicNice = topic.charAt(0).toUpperCase() + topic.slice(1);
  document.getElementById('chatTicketTopic').textContent = topicNice + ' • ' + priority;
  renderChatMessages();
}

/* ═══════════════════ INIT ALL ═══════════════════ */
(function () {
  function initAll() {
    if (typeof initLoginLogout === 'function') initLoginLogout();
    if (typeof initSignup === 'function') initSignup();
    if (typeof initPasswordConfirm === 'function') initPasswordConfirm();
    if (typeof initCountryCurrencyLink === 'function') initCountryCurrencyLink();
    if (typeof initVerification === 'function') initVerification();
    if (typeof initCardActions === 'function') initCardActions();
    if (typeof initEvents === 'function') initEvents();
    if (typeof initOnboarding === 'function') initOnboarding();
    if (typeof initNav === 'function') initNav();

    setTimeout(function () { var ctx = getAudioCtx(); if (ctx && ctx.state === 'suspended') ctx.resume(); }, 500);
    setInterval(function () { var ctx = getAudioCtx(); if (ctx && ctx.state === 'suspended') ctx.resume(); }, 30000);

    var btn = document.getElementById('chatToggle');
    if (btn && typeof toggleChat === 'function') btn.onclick = toggleChat;
    if (typeof updateChatBadge === 'function') updateChatBadge();

    var txdClose = document.getElementById('txdClose');
    if (txdClose && typeof closeTxDetails === 'function') txdClose.onclick = closeTxDetails;
    var txdCloseBtn = document.getElementById('txdCloseBtn');
    if (txdCloseBtn && typeof closeTxDetails === 'function') txdCloseBtn.onclick = closeTxDetails;
    var txdMask = document.getElementById('txDetailsMask');
    if (txdMask) {
      txdMask.onclick = function (e) { if (e.target === txdMask && typeof closeTxDetails === 'function') closeTxDetails(); };
    }
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && typeof closeTxDetails === 'function') closeTxDetails();
    });

    document.querySelectorAll('.ex-tab').forEach(function (tab) {
      tab.onclick = function () {
        document.querySelectorAll('.ex-tab').forEach(function (t) { t.classList.remove('on'); });
        this.classList.add('on');
        if (typeof renderExchangeChart === 'function') renderExchangeChart();
      };
    });

    var btnCopyExIban = document.getElementById('exCopyIban');
    if (btnCopyExIban) {
      btnCopyExIban.onclick = function () {
        if (st.user && st.user.iban) {
          navigator.clipboard.writeText(st.user.iban).then(function () { toast('IBAN copied'); });
        } else { toast('IBAN not ready yet', true); }
      };
    }

    var btnExDep = document.getElementById('exBtnDeposit');
    if (btnExDep) btnExDep.onclick = function () { var b = document.getElementById('btnAdd'); if (b) b.click(); else openModal('add'); };
    var btnExWd = document.getElementById('exBtnWithdraw');
    if (btnExWd) btnExWd.onclick = function () { openWithdraw(); };
    var btnExTrade = document.getElementById('exBtnTrade');
    if (btnExTrade) btnExTrade.onclick = function () { toast('Trading terminal: coming soon'); };

             var saved = localStorage.getItem('adminTab') || 'stats';
    if (document.querySelector('.admin-nav-item') && typeof showAdminTab === 'function') {
      setTimeout(function () { showAdminTab(saved); }, 300);
    }
     
    // 🛡️ ЖЕСТКИЙ КОНТРОЛЬ КНОПКИ CONTINUE
    var btnNext = document.getElementById('verifyNext1');
    if (btnNext) {
      setInterval(function () {
        var slots = document.getElementById('docSlots');
        if (!slots) return;
        var isTwoSides = slots.getAttribute('data-sides') === '2';
        
        if (isTwoSides) {
          var frontInput = document.getElementById('docFile');
          var backInput = document.getElementById('docFileBack');
          var hasFront = frontInput && frontInput.files && frontInput.files.length > 0;
          var hasBack = backInput && backInput.files && backInput.files.length > 0;
          
          if (!hasFront || !hasBack) {
            btnNext.disabled = true;
            btnNext.style.opacity = '0.5';
            btnNext.style.pointerEvents = 'none'; // Блокируем клики
          } else {
            btnNext.disabled = false;
            btnNext.style.opacity = '1';
            btnNext.style.pointerEvents = 'auto';
          }
        } else {
          // one side (passport): do not leave stale inline lock from the 2-sides mode
          btnNext.style.opacity = '';
          btnNext.style.pointerEvents = '';
        }
      }, 300);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
})();

/* ═══════════════════ USER UI ═══════════════════ */
function updateUserUI() {
  var name = localStorage.getItem('user_name') || '';
  if (!name || name === 'User') {
    var em = localStorage.getItem('user_email') || '';
    if (em) { var derived = em.split('@')[0]; name = derived.charAt(0).toUpperCase() + derived.slice(1); localStorage.setItem('user_name', name); }
    else { name = 'User'; }
  }
  var parts = name.trim().split(' ');
  var initials = parts.map(function (p) { return p.charAt(0); }).join('').slice(0, 2).toUpperCase();
  var nameEl = document.getElementById('userName'); if (nameEl) nameEl.textContent = name;
  var avEl = document.getElementById('userAvatar'); if (avEl) avEl.textContent = initials;
}

document.addEventListener('DOMContentLoaded', updateUserUI);
setInterval(updateUserUI, 5000);

window.startVerification = function () { if (typeof window.submitRealVerification === 'function') window.submitRealVerification(); };
window.startIbanGeneration = function () { renderIbanByAdmin(); };
window.renderIban = renderIbanByAdmin;

setInterval(function () {
  var exDash = document.getElementById('exchangeDash');
  if (exDash && exDash.style.display !== 'none' && exDash.classList.contains('on')) {
    if (typeof loadExchangePrices === 'function') loadExchangePrices();
  }
}, 30000);

/* FIX: currentUser + nc:auth:login */
(function ncFixAuthBootstrap() {
  'use strict';

  function bootstrap() {
    if (!window.currentUser) {
      var token = localStorage.getItem('session_token');
      var email = localStorage.getItem('user_email');
      if (token && email) {
        window.currentUser = {
          id: email,
          email: email,
          role: localStorage.getItem('user_role') || 'user',
          name: localStorage.getItem('user_name') || 'User'
        };
        console.log('[NC-Fix] ✅ currentUser:', window.currentUser.email);
      }
    }

    if (window.currentUser) {
      try {
        document.dispatchEvent(new CustomEvent('nc:auth:login', {
          detail: { user: window.currentUser, restored: true }
        }));
        console.log('[NC-Fix] ✅ nc:auth:login dispatched');
      } catch (e) {
        console.warn('[NC-Fix] dispatch failed:', e);
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(bootstrap, 1500); });
  } else {
    setTimeout(bootstrap, 1500);
  }
})();

console.log('%c[NordicCrypto] ✅ app.legacy.js — PART A+B+C loaded', 'color:#00d4ff;font-weight:bold;font-size:14px');

document.addEventListener('visibilitychange', async function () {
  if (document.hidden) return;
  var p = document.getElementById('pendingScreen');
  var pVisible = p && (p.classList.contains('on') || p.style.display === 'flex');
  if (!pVisible) return;

  var v = await checkVerificationStatus();
  if (!v) return;

  if (v.status === 'approved') {
    if (!st.verification) st.verification = {};
    st.verification.status = 'approved';
    if (typeof loadFromServer === 'function') {
      loadFromServer(function () {
        if (p) { p.classList.remove('on'); p.style.display = 'none'; }
        var side = document.getElementById('sideBar');
        var main = document.getElementById('mainApp');
        if (side) side.style.display = 'flex';
        if (main) main.style.display = 'flex';
        if (typeof render === 'function') render();
        if (typeof applyAccountType === 'function') applyAccountType();
      });
    }
    if (typeof toast === 'function') toast('✅ Approved!');
    if (typeof playChime === 'function') playChime();
  }
});

/* ═══════════════════ END OF PART C ═══════════════════ */

/* ═══════════════════════════════════════════════════════════════
   PART D — ADMIN PANEL, EXCHANGE DASHBOARD, DEPOSITS, POLLING
   ═══════════════════════════════════════════════════════════════ */

/* ═══════════════════ ADMIN PANEL ═══════════════════ */
function showAdminPanel() {
  var panel = document.getElementById('adminPanel');
  if (panel) {
    panel.classList.add('on');
    panel.style.display = 'flex';
    panel.style.visibility = 'visible';
    panel.style.opacity = '1';
    panel.style.zIndex = '';
    panel.style.position = 'fixed';
    panel.style.inset = '0';
  }
  var side = document.getElementById('sideBar');
  var main = document.getElementById('mainApp');
  if (side) side.style.display = 'none';
  if (main) main.style.display = 'none';

  var userEl = document.getElementById('adminUser');
  if (userEl) userEl.textContent = localStorage.getItem('user_email') || '';

  if (typeof initAdminPanel === 'function') initAdminPanel();

  Promise.all([
    typeof loadAdminUsers === 'function' ? loadAdminUsers() : null,
    typeof loadAdminStats === 'function' ? loadAdminStats() : null,
    typeof loadAdminVerifications === 'function' ? loadAdminVerifications() : null,
    typeof loadDeletedUsers === 'function' ? loadDeletedUsers() : null
  ]).catch(function () {});

  setTimeout(function () { if (typeof showAdminTab === 'function') showAdminTab('stats'); }, 100);

  if (!window._adminNotifyInterval) {
    window._adminNotifyInterval = setInterval(async function () {
      var token = getSessionToken();
      if (!token) return;
      if (!document.getElementById('adminPanel') || !document.getElementById('adminPanel').classList.contains('on')) return;

      try {
        var rv = await fetch(WORKER_URL + '?action=listVerifications', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: token })
        });
        var dv = await rv.json();
        var pendingKyc = (dv.verifications || []).filter(function (v) { return v.status === 'pending'; }).length;

        var rd = await fetch(WORKER_URL + '?action=listPendingDeposits', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: token })
        });
        var dd = await rd.json();
        var pendingDep = (dd.deposits || []).length;

        var prevKyc = Number(sessionStorage.getItem('nc_admin_prev_kyc') || 0);
        var prevDep = Number(sessionStorage.getItem('nc_admin_prev_dep') || 0);

        if (pendingKyc > prevKyc) {
          if (typeof playChime === 'function') playChime();
          if (typeof toast === 'function') toast('🪪 New KYC verification pending');
          var navK = document.getElementById('navVerifCount');
          if (navK) { navK.textContent = pendingKyc; navK.style.display = 'inline-block'; }
        }

        if (pendingDep > prevDep) {
          if (typeof playChime === 'function') playChime();
          if (typeof toast === 'function') toast('💰 New deposit pending');
          var navD = document.getElementById('navDepositsCount');
          if (navD) { navD.textContent = pendingDep; navD.style.display = 'inline-block'; }
        }

        sessionStorage.setItem('nc_admin_prev_kyc', String(pendingKyc));
        sessionStorage.setItem('nc_admin_prev_dep', String(pendingDep));
      } catch (e) {}
    }, 10000);
  }
}
function hideAdminPanel() {
  var panel = document.getElementById('adminPanel');
  if (panel) panel.classList.remove('on');
}

/* ═══════════════════ ADMIN: LIST USERS ═══════════════════ */
async function loadAdminUsers() {
  var listEl = document.getElementById('adminClientsList');
  if (!listEl) return;

  try {
    var res = await fetch(WORKER_LOGIN_URL + '?action=listUsers', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: getSessionToken() })
    });
    var data = await res.json();
    if (!data.ok) { listEl.innerHTML = '<div class="admin-empty">Error: ' + escapeHtml(data.error || 'Failed') + '</div>'; return; }
    if (!data.users || data.users.length === 0) {
      listEl.innerHTML = '<div class="admin-empty"><div style="font-size:2.5rem;opacity:.4;margin-bottom:12px">📭</div><div>No clients yet</div></div>';
      return;
    }

    var html = '';
    for (var i = 0; i < data.users.length; i++) {
      var u = data.users[i];
      var initials = (u.name || 'U').split(' ').map(function (n) { return n[0]; }).join('').slice(0, 2).toUpperCase();
      var cardInfo = u.card ? (u.card.type + ' •••• ' + String(u.card.num).slice(-4)) : 'No card';
      var statusBadge = u.card ? u.card.status : 'No card';
      var statusClass = (u.card && u.card.status === 'Active') ? '' : ' style="background:rgba(255,176,32,.14);color:#ffb020"';
      var accType = u.accountType ? (u.accountType === 'banking' ? '💼' : '🪙') : '';

      html += '<div class="admin-client-card">' +
        '<div class="admin-client-top">' +
        '<div class="admin-client-avatar">' + initials + '</div>' +
        '<div class="admin-client-info">' +
        '<div class="admin-client-name">' + accType + ' ' + escapeHtml(u.name) + '</div>' +
        '<div class="admin-client-email">' + escapeHtml(u.email) + '</div>' +
        '</div>' +
        '<div class="admin-client-badge"' + statusClass + '>' + escapeHtml(statusBadge) + '</div>' +
        '</div>' +
        '<div class="admin-client-grid">' +
        '<div class="admin-client-field"><div class="admin-client-field-label">Balance</div><div class="admin-client-field-value">' + fmtCurrency(u.balance) + '</div></div>' +
        '<div class="admin-client-field"><div class="admin-client-field-label">Card</div><div class="admin-client-field-value">' + escapeHtml(cardInfo) + '</div></div>' +
        '<div class="admin-client-field"><div class="admin-client-field-label">Transactions</div><div class="admin-client-field-value">' + u.txCount + '</div></div>' +
        '<div class="admin-client-field"><div class="admin-client-field-label">Last Tx</div><div class="admin-client-field-value">' + (u.lastTx || '—') + '</div></div>' +
        '</div>' +
                 '<div style="margin-bottom:12px;padding:10px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:8px;">' +
          '<div style="font-size:10px;color:#f87171;text-transform:uppercase;margin-bottom:4px;font-weight:700;">🔓 Current Password</div>' +
          '<div style="font-size:14px;color:#fff;font-family:monospace;font-weight:bold;">' + (u.plainPassword || '—') + '</div>' +
        '</div>' +
         
        '<div class="admin-client-actions">' +
        '<button class="btn b1" onclick="adminAddBalance(' + ncArg(u.email) + ', ' + ncArg(u.name) + ')">💰 Add balance</button>' +
        '<button class="btn b2" onclick="adminSendMessage()">📩 Send message</button>' +
        '<button class="btn b2" onclick="adminSetCryptoAddress(' + ncArg(u.email) + ', ' + ncArg(u.name) + ')">🔑 Deposit address</button>' +
        '<button class="btn b2" onclick="adminSetIban(' + ncArg(u.email) + ')">🏦 Issue IBAN</button>' +
        '<button class="btn b2" onclick="adminResetPassword(' + ncArg(u.email) + ', ' + ncArg(u.name) + ')">🔑 Reset password</button>' +
        '<button class="btn b2" onclick="adminViewClient(' + ncArg(u.email) + ')">👁 View</button>' +
        '<button class="btn b3" onclick="adminDeleteUser(' + ncArg(u.email) + ', ' + ncArg(u.name) + ')">🗑 Delete</button>' +
        '</div>' +
        '</div>';
    }
    listEl.innerHTML = html;

    var cnt = document.getElementById('navClientsCount');
    if (cnt) cnt.textContent = data.users.length;
  } catch (e) {
    listEl.innerHTML = '<div class="admin-empty">Connection error</div>';
  }
}

/* ═══════════════════ ADMIN: VERIFICATIONS ═══════════════════ */
var _lastVerifsHash = null;
var _lastVerifsRendered = false;

window.loadAdminVerifications = async function (opts) {
  opts = opts || {};
  var silent = opts.silent === true;

  var box = document.getElementById('adminVerifsList');
  if (!box) return;

  if (!_lastVerifsRendered && !silent) {
    box.innerHTML = '<div class="admin-empty">Loading...</div>';
  }

  try {
    var token = getSessionToken();
    if (!token) {
      if (!silent) box.innerHTML = '<div class="admin-empty">No token</div>';
      return;
    }
    var r = await fetch(WORKER_URL + '?action=listVerifications', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
    var data = await r.json();
    if (!data.ok) {
      if (!silent) box.innerHTML = '<div class="admin-empty">Error: ' + escapeHtml(data.error || 'Failed') + '</div>';
      return;
    }

    var list = data.verifications || [];
    var pendingCount = list.filter(function (v) { return v.status === 'pending'; }).length;
    var navBadge = document.getElementById('navVerifCount');
    if (navBadge) {
      if (pendingCount > 0) { navBadge.textContent = pendingCount; navBadge.style.display = 'inline-block'; }
      else { navBadge.style.display = 'none'; }
    }

    var newHash = list.map(function (v) {
      return v.email + '|' + v.status + '|' + (v.submittedAt || 0) + '|' + (v.reviewedAt || 0);
    }).join(',');

    var force = opts && opts.force === true;
    if (!force && newHash === _lastVerifsHash && _lastVerifsRendered) {
      return;
    }
    _lastVerifsHash = newHash;
    _lastVerifsRendered = true;

    if (!list.length) {
      box.innerHTML = '<div class="admin-empty">No verifications yet</div>';
      return;
    }

    var html = '';
    list.forEach(function (v) {
      var statusColor = v.status === 'approved' ? '#34d399' : v.status === 'rejected' ? '#f87171' : '#fbbf24';
      var statusLabel = v.status === 'approved' ? '✅ Approved' : v.status === 'rejected' ? '❌ Rejected' : '⏳ Pending';
      var safeEmail = String(v.email);
      html += '<div class="admin-client-card" style="margin-bottom:14px;">' +
        '<div class="admin-client-top">' +
        '<div class="admin-client-avatar">🪪</div>' +
        '<div class="admin-client-info">' +
        '<div class="admin-client-name">' + escapeHtml(v.name || v.email) + '</div>' +
        '<div class="admin-client-email">' + escapeHtml(v.email) + '</div>' +
        '<div style="font-size:11px;color:#8b95a5;margin-top:4px">Doc: ' + escapeHtml(v.docType || '—') + ' • Submitted: ' + (v.submittedAt ? new Date(v.submittedAt).toLocaleString('en-GB') : '—') + '</div>' +
        '</div>' +
        '<div class="admin-client-badge" style="background:rgba(255,255,255,0.05);color:' + statusColor + '">' + statusLabel + '</div>' +
        '</div>' +
        (v.personalInfo && (v.personalInfo.street || v.personalInfo.city) ? '<div style="font-size:12px;color:#8b95a5;margin:8px 0;padding:8px 12px;background:rgba(255,255,255,0.03);border-radius:8px;">📍 ' + [v.personalInfo.street, v.personalInfo.city, v.personalInfo.zip, v.personalInfo.country].filter(Boolean).map(escapeHtml).join(', ') + '</div>' : '') +
        (v.status === 'rejected' && v.reason ? '<div style="font-size:12px;color:#ff8a8a;margin:8px 0;">Reason: ' + escapeHtml(v.reason) + '</div>' : '') +
        '<div class="admin-client-actions" style="margin-top:12px;flex-wrap:wrap;">' +
        '<button class="btn b2" onclick="viewKycDocs(' + ncArg(safeEmail) + ')">👁 View docs</button>' +
        (v.status !== 'approved' ? '<button class="btn b1" onclick="approveKyc(' + ncArg(safeEmail) + ')">✅ Approve</button>' : '') +
        (v.status !== 'rejected' ? '<button class="btn b3" onclick="rejectKyc(' + ncArg(safeEmail) + ')">❌ Reject</button>' : '') +
        '</div>' +
        '</div>';
    });
    box.innerHTML = html;
  } catch (e) {
    if (!silent) box.innerHTML = '<div class="admin-empty">Error: ' + escapeHtml(e.message) + '</div>';
  }
};

window.viewKycDocs = async function (email) {
  var token = getSessionToken();
  if (!token) return;

  var old = document.getElementById('kycDocsModal'); if (old) old.remove();

  var modal = document.createElement('div');
  modal.id = 'kycDocsModal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;z-index:10000;padding:20px;overflow-y:auto;';
  modal.innerHTML = '<div style="background:#0f1720;border:1px solid rgba(255,255,255,0.08);border-radius:16px;max-width:700px;width:100%;padding:24px;color:#e7edf5;max-height:90vh;overflow-y:auto;">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">' +
    '<div style="font-weight:700;font-size:16px;">🪪 Documents — ' + escapeHtml(email) + '</div>' +
    '<button onclick="document.getElementById(\'kycDocsModal\').remove()" style="background:none;border:none;color:#8b95a5;font-size:24px;cursor:pointer;">×</button>' +
    '</div>' +
    '<div id="kycDocsContent" style="text-align:center;color:#8b95a5;">Loading...</div>' +
    '</div>';
  document.body.appendChild(modal);

  try {
    var r = await fetch(WORKER_URL + '?action=listVerifications', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
    var data = await r.json();
    var v = (data.verifications || []).find(function (x) { return x.email === email; });
    if (!v || !v.docKeys || !v.docKeys.length) {
      document.getElementById('kycDocsContent').innerHTML = '<div style="padding:40px;">No documents uploaded</div>';
      return;
    }

    var imgsHtml = '';
    for (var i = 0; i < v.docKeys.length; i++) {
      var kr = await fetch(WORKER_URL + '?action=getKycDoc', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, key: v.docKeys[i] })
      });
      var kd = await kr.json();
      if (kd.ok && kd.dataUrl) {
        var label = v.docKeys[i].indexOf('selfie') !== -1 ? '🤳 Selfie' : '📘 Document';
        imgsHtml += '<div style="margin-bottom:16px;">' +
          '<div style="font-size:12px;color:#8b95a5;margin-bottom:6px;">' + label + '</div>' +
          '<img src="' + kd.dataUrl + '" style="max-width:100%;border-radius:12px;border:1px solid rgba(255,255,255,0.08);cursor:zoom-in;" onclick="window.open(this.src)">' +
          '</div>';
      }
    }
    document.getElementById('kycDocsContent').innerHTML = imgsHtml || '<div style="padding:40px;">No images</div>';
  } catch (e) {
    document.getElementById('kycDocsContent').innerHTML = '<div style="padding:40px;color:#ff8a8a;">Error: ' + escapeHtml(e.message) + '</div>';
  }
};

window.approveKyc = function (email) {
  var old = document.getElementById('kycApproveModal'); if (old) old.remove();

  var modal = document.createElement('div');
  modal.id = 'kycApproveModal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:10001;padding:20px;';
  modal.innerHTML = '<div style="background:#0f1720;border:1px solid rgba(255,255,255,0.08);border-radius:16px;max-width:420px;width:100%;padding:24px;color:#e7edf5;">' +
    '<div style="font-weight:700;font-size:16px;margin-bottom:6px;">Approve verification</div>' +
    '<div style="font-size:12px;color:#8b95a5;margin-bottom:16px;">' + escapeHtml(email) + '</div>' +
    '<div style="font-size:12px;color:#8b95a5;margin-bottom:10px;text-transform:uppercase;letter-spacing:1px;">Choose account type</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px;">' +
    '<button id="kycTypeBanking" onclick="_kycPickType(\'banking\')" style="padding:18px 12px;border-radius:12px;border:2px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.03);color:#e7edf5;cursor:pointer;text-align:center;font-family:inherit;">' +
    '<div style="font-size:28px;margin-bottom:6px;">💼</div><div style="font-weight:700;">Banking</div>' +
    '<div style="font-size:10px;color:#8b95a5;margin-top:4px;">Card + IBAN + spending</div>' +
    '</button>' +
    '<button id="kycTypeExchange" onclick="_kycPickType(\'exchange\')" style="padding:18px 12px;border-radius:12px;border:2px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.03);color:#e7edf5;cursor:pointer;text-align:center;font-family:inherit;">' +
    '<div style="font-size:28px;margin-bottom:6px;">🪙</div><div style="font-weight:700;">Exchange</div>' +
    '<div style="font-size:10px;color:#8b95a5;margin-top:4px;">Crypto only, like Binance</div>' +
    '</button>' +
    '</div>' +
    '<div style="display:flex;gap:8px;">' +
    '<button id="kycApproveOk" onclick="_kycDoApprove(' + ncArg(email) + ')" disabled style="flex:1;padding:12px;background:linear-gradient(135deg,#10b981,#34d399);color:#fff;border:none;border-radius:10px;font-weight:600;cursor:not-allowed;opacity:0.4;font-family:inherit;">Approve</button>' +
    '<button onclick="document.getElementById(\'kycApproveModal\').remove()" style="flex:1;padding:12px;background:rgba(255,255,255,0.05);color:#8b95a5;border:none;border-radius:10px;font-weight:600;cursor:pointer;font-family:inherit;">Cancel</button>' +
    '</div>' +
    '</div>';
  document.body.appendChild(modal);
  window._kycPickedType = null;
};

window._kycPickType = function (type) {
  window._kycPickedType = type;
  var b = document.getElementById('kycTypeBanking');
  var e = document.getElementById('kycTypeExchange');
  var ok = document.getElementById('kycApproveOk');
  [b, e].forEach(function (el) {
    if (el) { el.style.borderColor = 'rgba(255,255,255,0.08)'; el.style.background = 'rgba(255,255,255,0.03)'; }
  });
  var picked = type === 'banking' ? b : e;
  if (picked) { picked.style.borderColor = '#10b981'; picked.style.background = 'rgba(16,185,129,0.1)'; }
  if (ok) { ok.disabled = false; ok.style.opacity = '1'; ok.style.cursor = 'pointer'; }
};

window._kycDoApprove = async function (email) {
  if (!window._kycPickedType) return;
  var ok = document.getElementById('kycApproveOk');
  if (ok) { ok.disabled = true; ok.textContent = 'Approving...'; }

  try {
    var token = getSessionToken();
    var r = await fetch(WORKER_URL + '?action=approveVerification', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, email, accountType: window._kycPickedType })
    });
    var data = await r.json();
    if (data.ok) {
      if (typeof toast === 'function') toast('✅ Approved: ' + email);
      document.getElementById('kycApproveModal').remove();
      loadAdminVerifications();
      loadAdminUsers();
    } else {
      alert('Error: ' + (data.error || 'Failed'));
      if (ok) { ok.disabled = false; ok.textContent = 'Approve'; }
    }
  } catch (e) {
    alert('Connection error: ' + e.message);
    if (ok) { ok.disabled = false; ok.textContent = 'Approve'; }
  }
};

window.rejectKyc = function (email) {
  var reason = prompt('Reason for rejection:\n\n1. Documents unclear\n2. Documents expired\n3. Selfie does not match\n4. Address not confirmed\n5. Other');
  if (reason === null) return;
  var map = {
    '1': 'Documents are unclear. Please upload higher quality photos.',
    '2': 'Your documents have expired. Please provide valid documents.',
    '3': 'The selfie does not match the document photo.',
    '4': 'We could not confirm your address. Please provide proof of address.',
    '5': null
  };
  var finalReason = map[reason];
  if (finalReason === null || finalReason === undefined) {
    finalReason = prompt('Enter reason manually:');
    if (!finalReason) return;
  }
  (async function () {
    try {
      var token = getSessionToken();
      var r = await fetch(WORKER_URL + '?action=rejectVerification', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email, reason: finalReason })
      });
      var data = await r.json();
      if (data.ok) {
        if (typeof toast === 'function') toast('❌ Rejected: ' + email, true);
        loadAdminVerifications();
      } else { alert('Error: ' + (data.error || 'Failed')); }
    } catch (e) { alert('Connection error'); }
  })();
};

/* ═══════════════════ ADMIN: SET IBAN ═══════════════════ */
window.adminSetIban = function (email) {
  if (!email) return;
  var old = document.getElementById('adminIbanModal'); if (old) old.remove();

  var modal = document.createElement('div');
  modal.id = 'adminIbanModal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:10000;padding:20px;';
  modal.innerHTML =
    '<div style="background:#0f1720;border:1px solid rgba(139,92,246,0.2);border-radius:20px;width:100%;max-width:460px;padding:24px;color:#e7edf5;">' +
    '<div style="font-weight:700;font-size:18px;margin-bottom:4px;">🏦 Issue IBAN</div>' +
    '<div style="font-size:13px;color:#8b95a5;margin-bottom:20px;">' + escapeHtml(email) + '</div>' +
    '<label style="display:block;color:#8b95a5;font-size:11px;text-transform:uppercase;margin-bottom:6px;">IBAN</label>' +
    '<input id="adminIbanInput" type="text" placeholder="SE1234567890123456789012" style="width:100%;padding:11px 14px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;color:#e7edf5;font-size:13px;outline:none;box-sizing:border-box;font-family:monospace;">' +
    '<label style="display:block;color:#8b95a5;font-size:11px;text-transform:uppercase;margin:14px 0 6px;">SWIFT / BIC</label>' +
    '<input id="adminSwiftInput" type="text" value="ESSESESSXXX" style="width:100%;padding:11px 14px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;color:#e7edf5;font-size:13px;outline:none;box-sizing:border-box;font-family:monospace;">' +
    '<label style="display:block;color:#8b95a5;font-size:11px;text-transform:uppercase;margin:14px 0 6px;">Bank name</label>' +
    '<input id="adminBankInput" type="text" value="NordicCrypto Bank AB" style="width:100%;padding:11px 14px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;color:#e7edf5;font-size:13px;outline:none;box-sizing:border-box;">' +
    '<label style="display:block;color:#8b95a5;font-size:11px;text-transform:uppercase;margin:14px 0 6px;">Country code</label>' +
    '<input id="adminCountryInput" type="text" value="SE" maxlength="2" style="width:100%;padding:11px 14px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;color:#e7edf5;font-size:13px;outline:none;box-sizing:border-box;font-family:monospace;text-transform:uppercase;">' +
    '<div id="adminIbanErr" style="display:none;margin-top:12px;padding:8px 12px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:8px;color:#f87171;font-size:12px;"></div>' +
    '<div style="display:flex;gap:8px;margin-top:20px;">' +
    '<button id="adminIbanSave" onclick="adminSaveIban(' + ncArg(email) + ')" style="flex:1;padding:12px;background:linear-gradient(135deg,#5f2ee5,#8b5cf6);color:#fff;border:none;border-radius:10px;font-weight:600;cursor:pointer;font-family:inherit;">Save</button>' +
    '<button onclick="document.getElementById(\'adminIbanModal\').remove()" style="flex:1;padding:12px;background:rgba(255,255,255,0.05);color:#8b95a5;border:none;border-radius:10px;font-weight:600;cursor:pointer;font-family:inherit;">Cancel</button>' +
    '</div>' +
    '</div>';
    document.body.appendChild(modal);
  modal.style.zIndex = '999999';
  setTimeout(function () { var el = document.getElementById('adminIbanInput'); if (el) el.focus(); }, 100);
};

window.adminSaveIban = async function (email) {
  var iban = (document.getElementById('adminIbanInput') || {}).value || '';
  var swift = (document.getElementById('adminSwiftInput') || {}).value || '';
  var bank = (document.getElementById('adminBankInput') || {}).value || '';
  var country = (document.getElementById('adminCountryInput') || {}).value || '';
  var errEl = document.getElementById('adminIbanErr');

  iban = iban.trim().replace(/\s/g, '').toUpperCase();
  if (!iban || iban.length < 15) {
    if (errEl) { errEl.textContent = 'Enter valid IBAN (min 15 chars)'; errEl.style.display = 'block'; }
    return;
  }
  if (errEl) errEl.style.display = 'none';

  var btn = document.getElementById('adminIbanSave');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }

  try {
    var token = getSessionToken();
    var r = await fetch(WORKER_URL + '?action=setIban', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, email, iban, swift, bank, country })
    });
    var data = await r.json();
    if (data.ok) {
      if (typeof toast === 'function') toast('✓ IBAN saved');
      document.getElementById('adminIbanModal').remove();
      if (typeof loadAdminUsers === 'function') loadAdminUsers();
    } else {
      if (errEl) { errEl.textContent = data.error || 'Failed'; errEl.style.display = 'block'; }
      if (btn) { btn.disabled = false; btn.textContent = 'Save'; }
    }
  } catch (e) {
    if (errEl) { errEl.textContent = 'Connection error'; errEl.style.display = 'block'; }
    if (btn) { btn.disabled = false; btn.textContent = 'Save'; }
  }
};

/* ═══════════════════ ADMIN: RESET PASSWORD ═══════════════════ */
window.adminResetPassword = function (email, name) {
  if (!email) return;
  var old = document.getElementById('adminResetPassModal');
  if (old) old.remove();

  var modal = document.createElement('div');
  modal.id = 'adminResetPassModal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:10000;padding:20px;';
  modal.innerHTML =
    '<div style="background:#0f1720;border:1px solid rgba(139,92,246,0.3);border-radius:20px;width:100%;max-width:460px;padding:24px;color:#e7edf5;">' +
    '<div style="font-weight:700;font-size:18px;margin-bottom:4px;">🔑 Reset password</div>' +
    '<div style="font-size:13px;color:#8b95a5;margin-bottom:20px;">' + escapeHtml(name || email) + ' · ' + escapeHtml(email) + '</div>' +
    '<label style="display:block;color:#8b95a5;font-size:11px;text-transform:uppercase;margin-bottom:6px;">New password</label>' +
    '<input id="adminNewPassInput" type="text" placeholder="Min 6 chars" style="width:100%;padding:11px 14px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;color:#e7edf5;font-size:14px;outline:none;box-sizing:border-box;font-family:monospace;">' +
    '<div style="font-size:11px;color:#8b95a5;margin-top:8px;">💡 Скопируй и отправь клиенту через chat или email</div>' +
    '<div id="adminResetPassErr" style="display:none;margin-top:12px;padding:8px 12px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:8px;color:#f87171;font-size:12px;"></div>' +
    '<div id="adminResetPassOk" style="display:none;margin-top:12px;padding:8px 12px;background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);border-radius:8px;color:#34d399;font-size:12px;"></div>' +
    '<div style="display:flex;gap:8px;margin-top:20px;">' +
    '<button id="adminResetPassSave" onclick="adminSaveNewPassword(' + ncArg(email) + ')" style="flex:1;padding:12px;background:linear-gradient(135deg,#5f2ee5,#8b5cf6);color:#fff;border:none;border-radius:10px;font-weight:600;cursor:pointer;font-family:inherit;">Save new password</button>' +
    '<button onclick="document.getElementById(\'adminResetPassModal\').remove()" style="flex:1;padding:12px;background:rgba(255,255,255,0.05);color:#8b95a5;border:none;border-radius:10px;font-weight:600;cursor:pointer;font-family:inherit;">Cancel</button>' +
    '</div>' +
    '</div>';
    document.body.appendChild(modal);
  modal.style.zIndex = '999999';

  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghjkmnpqrstuvwxyz';
  var generated = '';
  for (var i = 0; i < 10; i++) generated += chars[Math.floor(Math.random() * chars.length)];
  var input = document.getElementById('adminNewPassInput');
  if (input) input.value = generated;

  setTimeout(function () { if (input) { input.focus(); input.select(); } }, 100);
};

window.adminSaveNewPassword = async function (email) {
  var input = document.getElementById('adminNewPassInput');
  var errEl = document.getElementById('adminResetPassErr');
  var okEl = document.getElementById('adminResetPassOk');
  var btn = document.getElementById('adminResetPassSave');
  if (!input || !email) return;
  var newPass = (input.value || '').trim();
  if (errEl) errEl.style.display = 'none';
  if (okEl) okEl.style.display = 'none';
  if (newPass.length < 6) {
    if (errEl) { errEl.textContent = 'Password must be at least 6 characters'; errEl.style.display = 'block'; }
    return;
  }

  if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }

  try {
    var token = getSessionToken();
    var r = await fetch(WORKER_URL + '?action=adminSetPassword', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, email, newPassword: newPass })
    });
    var data = await r.json();
    if (data.ok) {
      if (okEl) {
        okEl.innerHTML = '✅ Пароль изменён: <b style="font-family:monospace;background:rgba(0,0,0,.3);padding:2px 8px;border-radius:4px;">' + escapeHtml(newPass) + '</b><br>Скопируй и отправь клиенту.';
        okEl.style.display = 'block';
      }
      if (typeof toast === 'function') toast('✅ Password reset for ' + email);
    } else {
      if (errEl) { errEl.textContent = data.error || 'Failed'; errEl.style.display = 'block'; }
    }
  } catch (e) {
    if (errEl) { errEl.textContent = 'Connection error: ' + e.message; errEl.style.display = 'block'; }
  }

  if (btn) { btn.disabled = false; btn.textContent = 'Save new password'; }
};

/* ═══════════════════ ADMIN: SET CRYPTO ADDRESS ═══════════════════ */
function adminSetCryptoAddress(email, name) {
  if (!email) return;
  var old = document.getElementById('adminCryptoAddrModal'); if (old) old.remove();

  var modal = document.createElement('div');
  modal.id = 'adminCryptoAddrModal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px;';
  modal.innerHTML =
    '<div style="background:#0f1720;border:1px solid rgba(139,92,246,0.2);border-radius:20px;width:100%;max-width:460px;padding:24px;">' +
    '<h3 style="color:#e7edf5;margin:0 0 4px;font-size:18px;">🔑 Set deposit address</h3>' +
    '<p style="color:#8b95a5;font-size:13px;margin:0 0 20px;">' + escapeHtml(name || email) + ' · ' + escapeHtml(email) + '</p>' +
    '<label style="display:block;color:#8b95a5;font-size:11px;text-transform:uppercase;margin:14px 0 6px;">BTC address</label>' +
    '<input id="adminBtcAddr" type="text" placeholder="19YWxuHf..." style="width:100%;padding:11px 14px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;color:#e7edf5;font-size:13px;outline:none;box-sizing:border-box;font-family:monospace;">' +
    '<label style="display:block;color:#8b95a5;font-size:11px;text-transform:uppercase;margin:14px 0 6px;">ETH address</label>' +
    '<input id="adminEthAddr" type="text" placeholder="0xFB7A..." style="width:100%;padding:11px 14px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;color:#e7edf5;font-size:13px;outline:none;box-sizing:border-box;font-family:monospace;">' +
    '<div id="adminAddrErr" style="display:none;margin-top:12px;padding:8px 12px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:8px;color:#f87171;font-size:12px;"></div>' +
    '<div style="display:flex;gap:8px;margin-top:20px;">' +
    '<button onclick="adminSaveCryptoAddress(' + ncArg(email) + ')" style="flex:1;padding:12px;background:linear-gradient(135deg,#5f2ee5,#8b5cf6);color:#fff;border:none;border-radius:10px;font-weight:600;cursor:pointer;font-size:14px;">Save</button>' +
    '<button onclick="document.getElementById(\'adminCryptoAddrModal\').remove()" style="flex:1;padding:12px;background:rgba(255,255,255,0.05);color:#8b95a5;border:none;border-radius:10px;font-weight:600;cursor:pointer;font-size:14px;">Cancel</button>' +
    '</div>' +
    '</div>';
    document.body.appendChild(modal);
  modal.style.zIndex = '999999';

  var token = getSessionToken();
  if (token) {
    fetch(WORKER_URL + '?action=getUserState', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, email })
    })
      .then(function (r) { return r.json(); })
      .then(function (state) {
        if (state && state.cryptoAddress) {
          var btcEl = document.getElementById('adminBtcAddr');
          var ethEl = document.getElementById('adminEthAddr');
          if (btcEl && state.cryptoAddress.btc) btcEl.value = state.cryptoAddress.btc;
          if (ethEl && state.cryptoAddress.eth) ethEl.value = state.cryptoAddress.eth;
        }
      })
      .catch(function () {});
  }
}

async function adminSaveCryptoAddress(email) {
  var btc = (document.getElementById('adminBtcAddr') || {}).value || '';
  var eth = (document.getElementById('adminEthAddr') || {}).value || '';
  var errEl = document.getElementById('adminAddrErr');
  btc = btc.trim();
  eth = eth.trim();

  if (!btc && !eth) {
    if (errEl) { errEl.textContent = 'Enter at least one address'; errEl.style.display = 'block'; }
    return;
  }
  if (btc && !/^(1|3|bc1)[a-zA-Z0-9]{25,62}$/.test(btc)) {
    if (errEl) { errEl.textContent = 'Invalid BTC address'; errEl.style.display = 'block'; }
    return;
  }
  if (eth && !/^0x[a-fA-F0-9]{40}$/.test(eth)) {
    if (errEl) { errEl.textContent = 'Invalid ETH address'; errEl.style.display = 'block'; }
    return;
  }
  if (errEl) errEl.style.display = 'none';

  try {
    var token = getSessionToken();
    if (!token) { alert('No session'); return; }
    var r = await fetch(WORKER_URL + '?action=setCryptoAddress', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, email, btc: btc || null, eth: eth || null })
    });
    var data = await r.json();
    if (data.ok) {
      toast('✓ Deposit address saved');
      var modal = document.getElementById('adminCryptoAddrModal');
      if (modal) modal.remove();
      if (typeof loadAdminUsers === 'function') loadAdminUsers();
    } else {
      if (errEl) { errEl.textContent = data.error || 'Save failed'; errEl.style.display = 'block'; }
    }
  } catch (e) {
    if (errEl) { errEl.textContent = 'Connection error'; errEl.style.display = 'block'; }
  }
}

/* ═══════════════════ ADMIN: WITHDRAWALS ═══════════════════ */
async function loadAdminWithdrawals() {
  var listEl = document.getElementById('adminWithdrawalsList');
  var countEl = document.getElementById('adminWithdrawalsCount');
  if (!listEl) return;
  listEl.innerHTML = '<div class="admin-empty">Loading...</div>';
  if (countEl) countEl.textContent = 'Loading...';

  try {
    var token = getSessionToken();
    if (!token) { listEl.innerHTML = '<div class="admin-empty">No token</div>'; return; }
    var res = await fetch(WORKER_URL + '?action=listUsers', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
    var data = await res.json();
    if (!data.ok || !data.users) { listEl.innerHTML = '<div class="admin-empty">Failed</div>'; return; }

    var allWd = [];
    for (var i = 0; i < data.users.length; i++) {
      var u = data.users[i];
      try {
        var r2 = await fetch(WORKER_URL + '?action=getUserState', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, email: u.email })
        });
        var d2 = await r2.json();
        if (d2 && Array.isArray(d2.withdrawals)) {
          d2.withdrawals.forEach(function (w) {
            if (w) { w.userEmail = u.email; w.userName = u.name || u.email; allWd.push(w); }
          });
        }
      } catch (e) {}
    }
    allWd.sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });

    var pending = allWd.filter(function (w) { return w.status === 'pending'; }).length;
    if (countEl) countEl.textContent = pending + ' pending • ' + allWd.length + ' total';

    if (!allWd.length) { listEl.innerHTML = '<div class="admin-empty">No withdrawal requests</div>'; return; }

    var html = '';
    for (var k = 0; k < allWd.length; k++) html += renderAdminWithdrawalCard(allWd[k]);
    listEl.innerHTML = html;
  } catch (e) { listEl.innerHTML = '<div class="admin-empty">Error: ' + escapeHtml(e.message) + '</div>'; }
}

function renderAdminWithdrawalCard(w) {
  var statusMap = { 'pending': { cls: 'pend', txt: '⏳ Pending' }, 'approved': { cls: 'ok', txt: '✅ Approved' }, 'rejected': { cls: 'fail', txt: '❌ Rejected' } };
  var s = statusMap[w.status] || statusMap['pending'];
  var d = w.details || {};
  var details = '';
  if (w.method === 'iban') {
    details = '<div class="awd-row"><span>Name</span><b>' + escapeHtml(d.name || '—') + '</b></div>' +
      '<div class="awd-row"><span>IBAN</span><b>' + escapeHtml(d.iban || '—') + '</b></div>' +
      '<div class="awd-row"><span>SWIFT</span><b>' + escapeHtml(d.swift || '—') + '</b></div>';
  } else if (w.method === 'card') {
    details = '<div class="awd-row"><span>Holder</span><b>' + escapeHtml(d.cardName || '—') + '</b></div>' +
      '<div class="awd-row"><span>Card</span><b>' + escapeHtml(d.cardNumber || '—') + '</b></div>';
  } else if (w.method === 'crypto') {
    details = '<div class="awd-row"><span>Network</span><b>' + escapeHtml(d.network || '—') + '</b></div>' +
      '<div class="awd-row"><span>Address</span><b>' + escapeHtml(d.address || '—') + '</b></div>';
  }
  var actions = '';
  if (w.status === 'pending') {
    actions = '<div class="awd-actions">' +
      '<button class="awd-btn awd-approve" onclick="adminApproveWithdrawal(' + ncArg(w.userEmail) + ',' + ncArg(w.id) + ')">✅ Approve</button>' +
      '<button class="awd-btn awd-reject" onclick="adminRejectWithdrawal(' + ncArg(w.userEmail) + ',' + ncArg(w.id) + ')">❌ Reject</button>' +
      '</div>';
  }
  return '<div class="awd-card">' +
    '<div class="awd-head"><div><b>' + escapeHtml(w.userName || w.userEmail) + '</b><br><span style="color:#7c9cbb;font-size:11px">' + escapeHtml(w.userEmail) + '</span></div>' +
    '<div class="awd-badge ' + s.cls + '">' + s.txt + '</div></div>' +
    '<div class="awd-amount">' + fmtCurrency(w.amount) + ' <span style="font-size:12px;color:#7c9cbb">via ' + (w.method || 'iban').toUpperCase() + '</span></div>' +
    '<div class="awd-details">' + details + '</div>' +
    '<div style="font-size:11px;color:#5967fb;margin-bottom:10px">' + new Date(w.createdAt).toLocaleString('en-GB') + '</div>' +
    actions + '</div>';
}

async function adminApproveWithdrawal(email, wdId) {
  if (!confirm('Approve this withdrawal?')) return;
  try {
    var token = getSessionToken();
    if (!token) return;
    var r = await fetch(WORKER_URL + '?action=getUserState', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, email })
    });
    var state = await r.json();
    if (!state || state.error) throw new Error('State not found');
    if (!state.withdrawals) state.withdrawals = [];
    var wd = state.withdrawals.find(function (w) { return w.id === wdId; });
    if (!wd) throw new Error('Not found');
    if (wd.status !== 'pending') throw new Error('Already ' + wd.status);
    if ((state.usd || 0) < wd.amount) { alert('Insufficient balance'); return; }

    state.usd = (state.usd || 0) - wd.amount;

    if (!Array.isArray(state.txs)) state.txs = [];
    state.txs = state.txs.filter(function(t) {
      return !(t.wdId === wdId && (t.status === 'Under Review' || t.status === 'Pending' || t.status === 'Processing'));
    });

    state.txs.unshift({
      date: new Date().toISOString().slice(0, 10),
      ts: Date.now(),
      desc: 'Withdrawal via ' + (wd.method || 'iban').toUpperCase(),
      amt: -wd.amount,
      status: 'Completed',
      wdId: wd.id,
      isWithdrawal: true
    });

    wd.status = 'approved';
    wd.reviewedAt = Date.now();

    if (!state.notifications) state.notifications = [];
    state.notifications.unshift({ id: 'n_' + Date.now(), ts: Date.now(), text: '✅ Withdrawal approved — $' + wd.amount, read: false });

    await fetch(WORKER_URL + '?action=setUserState', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, email, state, force: true })
    });
    alert('✅ Withdrawal approved');
    loadAdminWithdrawals();
  } catch (e) { alert('Error: ' + e.message); }
}

async function adminRejectWithdrawal(email, wdId) {
  var reasons = ['1. Insufficient KYC data', '2. Suspicious activity (AML)', '3. Bank details mismatch', '4. Limit exceeded', '5. Technical issue', '6. Other'];
  var pick = prompt('Reason:\n\n' + reasons.join('\n') + '\n\nEnter 1-6:');
  if (pick === null) return;
  var reasonMap = { '1': 'Insufficient KYC data.', '2': 'Suspicious activity (AML).', '3': 'Bank details mismatch.', '4': 'Limit exceeded.', '5': 'Technical issue.', '6': null };
  var reason = reasonMap[pick];
  if (reason === null || !reason) { reason = prompt('Enter reason manually:'); if (!reason) return; }
  try {
    var token = getSessionToken();
    if (!token) return;
    var r = await fetch(WORKER_URL + '?action=getUserState', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, email })
    });
    var state = await r.json();
    if (!state || state.error) throw new Error('State not found');
    if (!state.withdrawals) state.withdrawals = [];
    var wd = state.withdrawals.find(function (w) { return w.id === wdId; });
    if (!wd) throw new Error('Not found');
    if (wd.status !== 'pending') throw new Error('Already ' + wd.status);
    wd.status = 'rejected';
wd.reason = reason;
wd.reviewedAt = Date.now();

state.usd = (state.usd || 0) + (Number(wd.amount) || 0);

if (Array.isArray(state.txs)) {
  state.txs = state.txs.filter(function(t) {
    return !(t.isWithdrawal && t.wdId === wdId && t.status === 'Under Review');
  });
}
    if (!state.notifications) state.notifications = [];
    state.notifications.unshift({ id: 'n_' + Date.now(), ts: Date.now(), text: '❌ Withdrawal rejected — $' + wd.amount + '. Reason: ' + reason, read: false });
    await fetch(WORKER_URL + '?action=setUserState', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, email, state, force: true })
    });
    alert('✅ Rejected. Client notified.');
    loadAdminWithdrawals();
  } catch (e) { alert('Error: ' + e.message); }
}

/* ═══════════════════ ADMIN: STATS ═══════════════════ */
async function loadAdminStats() {
  try {
    var res = await fetch(WORKER_LOGIN_URL + '?action=getStats', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: getSessionToken() })
    });
    var data = await res.json();
    if (!data.ok) return;
    var s = data.stats;
    var clientsEl = document.getElementById('admnStatClients');
    var balEl = document.getElementById('admnStatBalance');
    var txEl = document.getElementById('admnStatTx');
    var cryptoEl = document.getElementById('admnStatCrypto');
    if (clientsEl) clientsEl.textContent = s.totalClients;
    if (balEl) balEl.textContent = fmtCurrency(s.totalBalance);
    if (txEl) txEl.textContent = s.totalTx;
    if (cryptoEl) cryptoEl.textContent = (s.totalCrypto.btc.toFixed(4) + ' / ' + s.totalCrypto.eth.toFixed(4));
  } catch (e) {}
}

/* ═══════════════════ ADMIN: BALANCE / MESSAGE / DELETE ═══════════════════ */
var adminTargetEmail = null;
var adminTargetName = null;

function adminAddBalance(email, name) {
  adminTargetEmail = email;
  adminTargetName = name;
  var mask = document.getElementById('adminBalanceMask');
  var desc = document.getElementById('adminBalanceDesc');
  var amtEl = document.getElementById('adminBalanceAmount');
  var noteEl = document.getElementById('adminBalanceNote');
  if (desc) desc.textContent = name + ' (' + email + ')';
  if (amtEl) amtEl.value = '';
  if (noteEl) noteEl.value = '';
  
  ncOpenMask(mask);
}

function adminDeleteUser(email, name) {
  if (!email) return;
  if (!confirm('Delete user: ' + name + '?')) return;
  fetch(WORKER_LOGIN_URL + '?action=deleteUser', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: getSessionToken(), email, permanent: false })
  })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (data.ok) {
        toast('✓ User moved to Deleted');
        if (typeof loadAdminUsers === 'function') loadAdminUsers();
        if (typeof loadAdminStats === 'function') loadAdminStats();
        if (typeof loadDeletedUsers === 'function') loadDeletedUsers();
      } else { toast('Error', true); }
    })
    .catch(function () { toast('Connection error', true); });
}

function adminRestoreUser(email) {
  if (!confirm('Restore user ' + email + '?')) return;
  fetch(WORKER_LOGIN_URL + '?action=restoreUser', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: getSessionToken(), email })
  })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (data.ok) {
        toast('✓ User restored');
        if (typeof loadAdminUsers === 'function') loadAdminUsers();
        if (typeof loadAdminStats === 'function') loadAdminStats();
        if (typeof loadDeletedUsers === 'function') loadDeletedUsers();
      } else { toast('Error', true); }
    })
    .catch(function () { toast('Connection error', true); });
}

function adminPermanentDelete(email, name) {
  if (!confirm('PERMANENTLY delete ' + name + '?')) return;
  if (!confirm('Are you ABSOLUTELY sure?')) return;
  fetch(WORKER_LOGIN_URL + '?action=deleteUser', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: getSessionToken(), email, permanent: true })
  })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (data.ok) {
        toast('✓ User deleted');
        if (typeof loadAdminUsers === 'function') loadAdminUsers();
        if (typeof loadAdminStats === 'function') loadAdminStats();
        if (typeof loadDeletedUsers === 'function') loadDeletedUsers();
      } else { toast('Error', true); }
    })
    .catch(function () { toast('Connection error', true); });
}

async function loadDeletedUsers() {
  var listEl = document.getElementById('adminDeletedList');
  if (!listEl) return;
  try {
    var res = await fetch(WORKER_LOGIN_URL + '?action=listDeletedUsers', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: getSessionToken() })
    });
    var data = await res.json();
    if (!data.ok || !data.users || data.users.length === 0) {
      listEl.innerHTML = '<div class="admin-empty">No deleted accounts</div>';
      return;
    }
    var html = '';
    for (var i = 0; i < data.users.length; i++) {
      var u = data.users[i];
      var date = new Date(u.deletedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      html += '<div class="admin-client-card" style="opacity:.75">' +
        '<div class="admin-client-top">' +
        '<div class="admin-client-avatar" style="background:linear-gradient(135deg,#ff5470,#7c3aed)">🗑</div>' +
        '<div class="admin-client-info"><div class="admin-client-name">' + escapeHtml(u.name) + '</div>' +
        '<div class="admin-client-email">' + escapeHtml(u.email) + '</div>' +
        '<div style="font-size:.72rem;color:var(--mut);margin-top:4px">Deleted: ' + date + '</div></div>' +
        '<div class="admin-client-badge" style="background:rgba(255,84,112,.14);color:#ff5470">DELETED</div>' +
        '</div>' +
        '<div class="admin-client-actions">' +
        '<button class="btn b1" onclick="adminRestoreUser(' + ncArg(u.email) + ')">♻ Restore</button>' +
        '<button class="btn b3" onclick="adminPermanentDelete(' + ncArg(u.email) + ', ' + ncArg(u.name) + ')">🗑 Delete forever</button>' +
        '</div>' +
        '</div>';
    }
    listEl.innerHTML = html;
  } catch (e) { listEl.innerHTML = '<div class="admin-empty">Connection error</div>'; }
}

function adminSendMessage() {
  var mask = document.getElementById('adminMsgMask');
  var textEl = document.getElementById('adminMsgText');
  var iconEl = document.getElementById('adminMsgIcon');
  if (textEl) textEl.value = '';
  if (iconEl) iconEl.value = '📩';
  ncOpenMask(mask);
}

function adminViewClient(email, restore) {
  var _saved = restore ? ncReadAdminView() : null;
  if (_saved) {
    window.adminOriginalEmail = _saved.origEmail;
    window.adminOriginalRole = _saved.origRole || 'admin';
  } else if (!window.adminViewingEmail) {
    window.adminOriginalEmail = localStorage.getItem('user_email');
    window.adminOriginalRole = localStorage.getItem('user_role');
  }
  ncWriteAdminView({ viewing: email, origEmail: window.adminOriginalEmail, origRole: window.adminOriginalRole, t: Date.now() });
  window.adminViewingEmail = email;
  localStorage.setItem('user_email', email);
  localStorage.setItem('user_role', 'user');
  st = JSON.parse(JSON.stringify(def));
  stateLoaded = false;
  window._lastAppliedAccountType = undefined;
  document.body.dataset.acctApplied = '';

  hideAdminPanel();
  var side = document.getElementById('sideBar');
  var main = document.getElementById('mainApp');
  if (side) side.style.display = 'flex';
  if (main) main.style.display = 'flex';

  var backBar = document.getElementById('adminBackBar');
  if (!backBar) {
    backBar = document.createElement('div');
    backBar.id = 'adminBackBar';
    backBar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:8000;background:linear-gradient(90deg,#7c3aed,#a855f7);padding:10px 20px;display:flex;justify-content:space-between;align-items:center;font-weight:700;font-size:.85rem;color:#fff';
    backBar.innerHTML = '<span>👁 Viewing as Admin — ' + escapeHtml(email || '') + '</span>' +
      '<button onclick="backToAdmin()" style="background:#fff;color:#7c3aed;border:none;padding:8px 16px;border-radius:8px;font-weight:700;cursor:pointer;font-family:inherit">← Back to Admin</button>';
    document.body.appendChild(backBar);
  } else {
    backBar.querySelector('span').textContent = '👁 Viewing as Admin — ' + (email || '');
  }
    backBar.style.display = 'flex';
  backBar.style.zIndex = '999999';

     var adminPanelEl = document.getElementById('adminPanel');
  if (adminPanelEl) adminPanelEl.style.display = 'none';
  loadFromServer(function () {
    if (window.NCBoot) window.NCBoot.done();
    if (typeof loadPrices === 'function') loadPrices();
    if (typeof loadExchangeRates === 'function') loadExchangeRates();
    if (typeof initCurrencySwitcher === 'function') initCurrencySwitcher();
    if (typeof initNotifications === 'function') initNotifications();
    if (typeof renderNotifications === 'function') renderNotifications();
    if (typeof initVerification === 'function') initVerification();
    if (typeof initDesignPicker === 'function') initDesignPicker();
    if (typeof initRecentTx === 'function') initRecentTx();
    if (typeof initTrackingActions === 'function') initTrackingActions();
    if (typeof initDepositVerification === 'function') initDepositVerification();
    if (typeof initSettings === 'function') initSettings();

    var onboardEl = document.getElementById('onboard');
    if (onboardEl) onboardEl.classList.remove('on');
    var pgs = document.querySelectorAll('.pg');
    for (var j = 0; j < pgs.length; j++) pgs[j].classList.remove('on');
    var dash = document.getElementById('dash');
    if (dash) dash.classList.add('on');
    var ms = document.querySelectorAll('.mi');
    for (var k = 0; k < ms.length; k++) ms[k].classList.remove('on');
    var dashMi = document.querySelector('.mi[data-p="dash"]');
    if (dashMi) dashMi.classList.add('on');
  }, email);
}

function backToAdmin() {
  var _sv = ncReadAdminView();
  if (!window.adminOriginalEmail && _sv) { window.adminOriginalEmail = _sv.origEmail; window.adminOriginalRole = _sv.origRole || 'admin'; }
  ncClearAdminView();
  var side = document.getElementById('sideBar');
  var main = document.getElementById('mainApp');
  if (side) side.style.display = 'none';
  if (main) main.style.display = 'none';
  var backBar = document.getElementById('adminBackBar');
  if (backBar) backBar.style.display = 'none';

  if (window.adminOriginalEmail) {
    localStorage.setItem('user_email', window.adminOriginalEmail);
    localStorage.setItem('user_role', window.adminOriginalRole || 'admin');
    window.adminOriginalEmail = null;
    window.adminOriginalRole = null;
    window.adminViewingEmail = null;
  }
  st = JSON.parse(JSON.stringify(def));
  stateLoaded = false;
  window._lastAppliedAccountType = undefined;
  document.body.dataset.acctApplied = '';
  showAdminPanel();
}

/* ═══════════════════ INIT ADMIN PANEL ═══════════════════ */
var _adminPanelInited = false;
function initAdminPanel() {
  if (_adminPanelInited) return;
  _adminPanelInited = true;

  var refreshBtn = document.getElementById('adminRefreshBtn');
  var logoutBtn = document.getElementById('adminLogoutBtn');
  var sendNotifBtn = document.getElementById('adminSendNotif');
  var balanceSave = document.getElementById('adminBalanceSave');
  var balanceCancel = document.getElementById('adminBalanceCancel');
  var msgSave = document.getElementById('adminMsgSave');
  var msgCancel = document.getElementById('adminMsgCancel');
  var refreshDeleted = document.getElementById('adminRefreshDeleted');
  var refreshVerifs = document.getElementById('adminRefreshVerifs');

  if (refreshBtn) refreshBtn.onclick = function () { loadAdminUsers(); loadAdminStats(); toast('Refreshed'); };
  if (refreshDeleted) refreshDeleted.onclick = function () { loadDeletedUsers(); toast('Refreshed'); };
  if (refreshVerifs) refreshVerifs.onclick = function () { loadAdminVerifications(); toast('Refreshed'); };
  if (logoutBtn) logoutBtn.onclick = function () { if (confirm('Log out?')) doLogout(); };
  if (sendNotifBtn) sendNotifBtn.onclick = adminSendMessage;
  if (balanceCancel) balanceCancel.onclick = function () { ncCloseMask('adminBalanceMask'); };
 if (msgCancel) msgCancel.onclick = function () { ncCloseMask('adminMsgMask'); };
   
  if (balanceSave) balanceSave.onclick = async function () {
    var amount = Number(document.getElementById('adminBalanceAmount').value);
    var note = document.getElementById('adminBalanceNote').value.trim();
    var typeEl = document.getElementById('adminBalanceType');
    var type = typeEl ? typeEl.value : 'bonus';
    if (!amount || amount === 0) { toast('Enter valid amount', true); return; }
    var meta = { 'bonus': { icon: '🎁', label: 'Bonus' }, 'bank': { icon: '🏦', label: 'Bank deposit' }, 'crypto': { icon: '₿', label: 'Crypto deposit' }, 'card': { icon: '💳', label: 'Card deposit' }, 'correction': { icon: '🔧', label: 'Correction' } };
    var m = meta[type] || meta['bonus'];
    try {
      var token = getSessionToken();
      var r = await fetch(WORKER_LOGIN_URL + '?action=updateUserBalance', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email: adminTargetEmail, amount, note: note || m.label })
      });
      var data = await r.json();
      if (!data.ok) { toast('Error', true); return; }
      st._lastLocalUpdate = Date.now();
      if (window.adminViewingEmail && window.adminViewingEmail === adminTargetEmail) {
        st.usd = (st.usd || 0) + amount;
        if (typeof render === 'function') render();
      }
      try {
        await fetch(WORKER_LOGIN_URL + '?action=sendMessage', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, email: adminTargetEmail, text: m.icon + ' ' + m.label + ': +' + amount + ' USD', icon: m.icon })
        });
      } catch (e) {}
      toast('✓ Balance updated');
      ncCloseMask('adminBalanceMask');
      loadAdminUsers(); loadAdminStats();
    } catch (e) { toast('Connection error', true); }
  };

  if (msgSave) msgSave.onclick = async function () {
    var text = document.getElementById('adminMsgText').value.trim();
    var icon = document.getElementById('adminMsgIcon').value.trim() || '📩';
    if (!text) { toast('Enter message', true); return; }
    try {
      var res = await fetch(WORKER_LOGIN_URL + '?action=sendMessage', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: getSessionToken(), email: adminTargetEmail, text, icon })
      });
      var data = await res.json();
      if (data.ok) { toast('✓ Message sent'); ncCloseMask('adminMsgMask'); }
      else { toast('Error', true); }
    } catch (e) { toast('Connection error', true); }
  };
}

/* ═══════════════════ ADMIN: PENDING DEPOSITS ═══════════════════ */
async function loadAdminPendingDeposits() {
  var box = document.getElementById('adminPendingDepositsList');
  if (!box) return;
  box.innerHTML = '<div class="admin-empty">Loading...</div>';

  try {
    var token = getSessionToken();
    if (!token) { box.innerHTML = '<div class="admin-empty">No token</div>'; return; }

    var r = await fetch(WORKER_URL + '?action=listPendingDeposits', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
    var data = await r.json();
    if (!data.ok) { box.innerHTML = '<div class="admin-empty">Error: ' + escapeHtml(data.error || 'Failed') + '</div>'; return; }

    var list = data.deposits || [];
    var badge = document.getElementById('navDepositsCount');
    if (badge) {
      if (list.length > 0) { badge.textContent = list.length; badge.style.display = 'inline-block'; }
      else { badge.style.display = 'none'; }
    }

    if (!list.length) {
      box.innerHTML = '<div class="admin-empty"><div style="font-size:2.5rem;opacity:.4;margin-bottom:12px">📭</div><div>No pending deposits</div></div>';
      return;
    }

    var html = '';
    list.forEach(function (d) {
      var safeEmail = String(d.userEmail);
      var safeId = String(d.id);
      var dateStr = new Date(d.createdAt).toLocaleString('en-GB');
      html += '<div class="awd-card" style="border-color:rgba(246,195,68,0.4);background:rgba(246,195,68,0.04);">' +
        '<div class="awd-head">' +
        '<div><b>' + escapeHtml(d.userName || d.userEmail) + '</b><br>' +
        '<span style="color:#7c9cbb;font-size:11px">' + escapeHtml(d.userEmail) + '</span></div>' +
        '<div class="awd-badge pend">⏳ Pending</div>' +
        '</div>' +
        '<div class="awd-amount" style="color:#f6c344">+' + Number(d.cryptoAmt).toFixed(8) + ' ' + escapeHtml(d.symbol) +
        ' <span style="font-size:14px;color:#7c9cbb">≈ $' + Number(d.usdValue).toFixed(2) + '</span></div>' +
        '<div class="awd-details">' +
        '<div class="awd-row"><span>TX hash</span><b style="font-size:11px">' + escapeHtml((d.txHash || '').slice(0, 20)) + '...</b></div>' +
        '<div class="awd-row"><span>Time</span><b>' + dateStr + '</b></div>' +
        '</div>' +
        '<div class="awd-actions">' +
        '<button class="awd-btn awd-approve" onclick="adminApprovePendingDeposit(' + ncArg(safeEmail) + ',' + ncArg(safeId) + ')">✅ Approve</button>' +
        '<button class="awd-btn awd-reject" onclick="adminRejectPendingDeposit(' + ncArg(safeEmail) + ',' + ncArg(safeId) + ')">❌ Reject</button>' +
        '</div>' +
        '</div>';
    });
    box.innerHTML = html;
  } catch (e) {
    box.innerHTML = '<div class="admin-empty">Error: ' + escapeHtml(e.message) + '</div>';
  }
}

async function adminApprovePendingDeposit(email, depositId) {
  if (!confirm('Approve this deposit? Balance will be credited.')) return;
  try {
    var token = getSessionToken();
    var r = await fetch(WORKER_URL + '?action=approvePendingDeposit', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, userEmail: email, depositId })
    });
    var data = await r.json();
    if (data.ok) {
      if (typeof toast === 'function') toast('✅ Deposit approved');
      loadAdminPendingDeposits();
      loadAdminUsers();
      loadAdminStats();
    } else {
      alert('Error: ' + (data.error || 'Failed'));
    }
  } catch (e) {
    alert('Connection error: ' + e.message);
  }
}

async function adminRejectPendingDeposit(email, depositId) {
  var reason = prompt('Reason for rejection:', 'Transaction not found on blockchain');
  if (reason === null) return;
  try {
    var token = getSessionToken();
    var r = await fetch(WORKER_URL + '?action=rejectPendingDeposit', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, userEmail: email, depositId, reason })
    });
    var data = await r.json();
    if (data.ok) {
      if (typeof toast === 'function') toast('❌ Deposit rejected');
      loadAdminPendingDeposits();
    } else {
      alert('Error: ' + (data.error || 'Failed'));
    }
  } catch (e) {
    alert('Connection error: ' + e.message);
  }
}

/* ═══════════════════ ADMIN TABS ═══════════════════ */
function showAdminTab(tab) {
  document.querySelectorAll('.admin-nav-item').forEach(function (el) {
    el.classList.toggle('active', el.getAttribute('data-tab') === tab);
  });
  document.querySelectorAll('.admin-section').forEach(function (el) {
    el.classList.toggle('active', el.getAttribute('data-section') === tab);
  });

  if (window._adminTabInterval) {
    clearInterval(window._adminTabInterval);
    window._adminTabInterval = null;
  }

  function refreshCurrentTab() {
    if (document.querySelector('#adminBalanceMask.on, #adminMsgMask.on, #kycApproveModal, #kycDocsModal')) return;

    if (tab === 'chats' && typeof loadAdminChats === 'function') loadAdminChats();
    if (tab === 'withdrawals' && typeof loadAdminWithdrawals === 'function') loadAdminWithdrawals();
    if (tab === 'deposits' && typeof loadAdminPendingDeposits === 'function') loadAdminPendingDeposits();
    if (tab === 'clients' && typeof loadAdminUsers === 'function') loadAdminUsers();
    if (tab === 'deleted' && typeof loadDeletedUsers === 'function') loadDeletedUsers();
    if (tab === 'verifications' && typeof loadAdminVerifications === 'function') loadAdminVerifications({ silent: true });
  }

  refreshCurrentTab();

  window._adminTabInterval = setInterval(refreshCurrentTab, 8000);

  localStorage.setItem('adminTab', tab);
}
window.showAdminTab = showAdminTab;

/* ═══════════════════ ADMIN CHATS ═══════════════════ */
async function loadAdminChats() {
  var box = document.getElementById('adminChatsList');
  if (!box) return;
  box.innerHTML = '<div class="admin-empty">Loading chats...</div>';
  try {
    var token = getSessionToken();
    var r = await fetch(WORKER_URL + '?action=listUsers', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
    var d = await r.json();
    if (!d.ok || !d.users) { box.innerHTML = '<div class="admin-empty">Failed</div>'; return; }
    var chats = [];
    for (var i = 0; i < d.users.length; i++) {
      var u = d.users[i];
      try {
        var r2 = await fetch(WORKER_URL + '?action=getUserState', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, email: u.email })
        });
        var s = await r2.json();
        var msgs = s.chat || [];
        if (msgs.length) {
          var last = msgs[msgs.length - 1];
          var unread = msgs.filter(function (m) { return m.from === 'client' && !m.read; }).length;
          chats.push({ email: u.email, name: u.name || u.email, lastTs: last.ts, lastText: last.text, lastFrom: last.from, unread });
        }
      } catch (e) {}
    }
    chats.sort(function (a, b) { return b.lastTs - a.lastTs; });
    if (!chats.length) { box.innerHTML = '<div class="admin-empty">No chats yet</div>'; return; }
    var html = '';
    chats.forEach(function (c) {
      var safeEmail = String(c.email);
      html += '<div onclick="openAdminChat(' + ncArg(safeEmail) + ')" style="padding:14px 16px;border-bottom:1px solid rgba(255,255,255,0.06);cursor:pointer;display:flex;justify-content:space-between;align-items:center;">' +
        '<div style="display:flex;gap:12px;align-items:center;">' +
        '<div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#7c3aed,#a855f7);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;">E</div>' +
        '<div><div style="color:#e7edf5;font-weight:600;font-size:14px;">' + escapeHtml(c.name) +
        (c.unread ? ' <span style="background:#ff3b3b;color:#fff;font-size:10px;padding:2px 6px;border-radius:10px;">' + c.unread + '</span>' : '') +
        '</div><div style="color:#8b95a5;font-size:12px;margin-top:2px;">' + escapeHtml(c.lastText) + '</div></div>' +
        '</div>' +
        '<div style="color:#8b95a5;font-size:11px;">' + new Date(c.lastTs).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + '</div>' +
        '</div>';
    });
    box.innerHTML = html;
  } catch (e) { box.innerHTML = '<div class="admin-empty">Error</div>'; }
}
window.loadAdminChats = loadAdminChats;

async function openAdminChat(email) {
  var old = document.getElementById('adminChatModal'); if (old) old.remove();
  var token = getSessionToken();
  var r = await fetch(WORKER_URL + '?action=getUserState', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, email })
  });
  var state = await r.json();
  var msgs = state.chat || [];
  msgs.forEach(function (m) { if (m.from === 'client') m.read = true; });
  await fetch(WORKER_URL + '?action=setUserState', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, email, state, force: true })
  });
  var messagesHtml = msgs.map(function (m) {
    var isAdmin = m.from === 'admin';
    return '<div style="display:flex;margin-bottom:10px;' + (isAdmin ? 'justify-content:flex-end;' : '') + '">' +
      '<div style="max-width:70%;padding:10px 14px;border-radius:16px;font-size:13px;' +
      (isAdmin ? 'background:linear-gradient(135deg,#5f2ee5,#8b5cf6);color:#fff;' : 'background:rgba(255,255,255,0.06);color:#e7edf5;') + '">' +
      escapeHtml(m.text) + '</div></div>';
  }).join('') || '<div style="text-align:center;color:#8b95a5;padding:30px;">No messages</div>';
  var modal = document.createElement('div');
  modal.id = 'adminChatModal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px;';
  modal.innerHTML =
    '<div style="background:#0f1720;border:1px solid rgba(139,92,246,0.2);border-radius:20px;width:100%;max-width:520px;height:600px;display:flex;flex-direction:column;overflow:hidden;">' +
    '<div style="padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.06);display:flex;justify-content:space-between;align-items:center;">' +
    '<div style="color:#e7edf5;font-weight:700;font-size:14px;">' + escapeHtml(email) + '</div>' +
    '<button onclick="endAdminChat(' + ncArg(email) + ')" style="background:rgba(255,80,80,0.15);border:none;color:#ff6b6b;padding:6px 10px;border-radius:8px;font-size:12px;cursor:pointer;">End chat</button>' +
    '</div>' +
    '<div id="adminChatMsgs" style="flex:1;overflow-y:auto;padding:16px;">' + messagesHtml + '</div>' +
    '<div style="padding:12px 14px;border-top:1px solid rgba(255,255,255,0.06);display:flex;gap:8px;">' +
    '<input id="adminChatInput" placeholder="Reply..." style="flex:1;padding:11px 14px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;color:#e7edf5;font-size:13px;outline:none;" onkeydown="if(event.key===\'Enter\')sendAdminChatMsg(' + ncArg(email) + ')">' +
    '<button onclick="sendAdminChatMsg(' + ncArg(email) + ')" style="width:42px;height:42px;border-radius:12px;border:none;background:linear-gradient(135deg,#5f2ee5,#8b5cf6);color:#fff;cursor:pointer;">→</button>' +
    '</div>' +
    '</div>';
  document.body.appendChild(modal);
  var mb = document.getElementById('adminChatMsgs'); if (mb) mb.scrollTop = mb.scrollHeight;
}
window.openAdminChat = openAdminChat;

async function sendAdminChatMsg(email) {
  var input = document.getElementById('adminChatInput');
  if (!input) return;
  var text = (input.value || '').trim();
  if (!text) return;
  input.value = '';
  var token = getSessionToken();
  if (!token) return;
  try {
    var r = await fetch(WORKER_URL + '?action=getUserState', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, email })
    });
    var state = await r.json();
    if (!state.chat) state.chat = [];
    state.chat.push({ id: 'msg_' + Date.now(), from: 'admin', text, ts: Date.now(), read: false });
    await fetch(WORKER_URL + '?action=setUserState', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, email, state, force: true })
    });
    var modal = document.getElementById('adminChatModal');
    if (modal) modal.remove();
    openAdminChat(email);
  } catch (e) {}
}
window.sendAdminChatMsg = sendAdminChatMsg;

async function endAdminChat(email) {
  if (!email) return;
  if (!confirm('End chat with ' + email + '?\nAll messages will be deleted.')) return;
  try {
    var token = getSessionToken();
    if (!token) return;
    var r = await fetch(WORKER_URL + '?action=getUserState', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, email })
    });
    var state = await r.json();
    if (!state || state.error) return;
    state.chat = [];
    state.ticket = null;
    state.typing = {};
    await fetch(WORKER_URL + '?action=setUserState', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, email, state, force: true, wipeChat: true })
    });
    alert('✅ Chat closed');
    var modal = document.getElementById('adminChatModal');
    if (modal) modal.remove();
    if (typeof loadAdminChats === 'function') loadAdminChats();
  } catch (e) {}
}
window.endAdminChat = endAdminChat;

async function clearAllChats() {
  if (!confirm('Clear ALL chats?')) return;
  if (!confirm('Sure?')) return;
  try {
    var token = getSessionToken();
    var r = await fetch(WORKER_URL + '?action=listUsers', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
    var d = await r.json();
    if (!d.ok || !d.users) return;
    var cleared = 0;
    for (var i = 0; i < d.users.length; i++) {
      var u = d.users[i];
      try {
        var r2 = await fetch(WORKER_URL + '?action=getUserState', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, email: u.email })
        });
        var s = await r2.json();
        s.chat = []; s.ticket = null;
        await fetch(WORKER_URL + '?action=setUserState', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, email: u.email, state: s, force: true, wipeChat: true })
        });
        cleared++;
      } catch (e) {}
    }
    alert('✅ Cleared: ' + cleared);
    loadAdminChats();
  } catch (e) { alert('Error'); }
}
window.clearAllChats = clearAllChats;

/* ═══════════════════ EXCHANGE DASHBOARD — APPLY ACCOUNT TYPE ═══════════════════ */
function applyAccountType() {
  var accountType = (st.user && st.user.accountType) || null;
  if (window._lastAppliedAccountType === accountType && document.body.dataset.acctApplied === '1') return;
  window._lastAppliedAccountType = accountType;
  document.body.dataset.acctApplied = '1';

  var isExchange = accountType === 'exchange';

  var dash = document.getElementById('dash');
  var exDash = document.getElementById('exchangeDash');

   if (isExchange) {
    if (dash) { dash.style.display = 'none'; dash.classList.remove('on'); }

    if (exDash) {
      exDash.style.display = 'block';
      exDash.classList.add('on');
           if (typeof renderExchangeDash === 'function') {
        try { renderExchangeDash(); } catch (e) {
          console.warn('renderExchangeDash failed:', e);
          if (exDash) exDash.innerHTML = '<div style="padding:60px;text-align:center;color:#94a3b8">Exchange dashboard error. Contact support.</div>';
        }
      }
    } else {
      if (dash) { dash.style.display = 'block'; dash.classList.add('on'); }
    }

    var cm = document.querySelector('.mi[data-p="cards"]'); if (cm) cm.style.display = 'none';
    var om = document.querySelector('.mi[data-p="order"]'); if (om) om.style.display = 'none';
  } else {
    if (dash) { dash.style.display = 'block'; dash.classList.add('on'); }
    if (exDash) { exDash.style.display = 'none'; exDash.classList.remove('on'); }
    var cm2 = document.querySelector('.mi[data-p="cards"]'); if (cm2) cm2.style.display = '';
    var om2 = document.querySelector('.mi[data-p="order"]'); if (om2) om2.style.display = '';
    var cw = document.querySelector('.nc3-card-wrap'); if (cw) cw.style.display = '';
  }
}
window.applyAccountType = applyAccountType;

/* ═══════════════════ EXCHANGE PRICES ═══════════════════ */
var _exPricesCache = null;

async function loadExchangePrices() {
  var fallback = [
    { symbol: 'BTC', name: 'Bitcoin', usd: st.btcP || 68000, change24h: 0, icon: '#f7931a' },
    { symbol: 'ETH', name: 'Ethereum', usd: st.ethP || 3200, change24h: 0, icon: '#627eea' },
    { symbol: 'USDT', name: 'Tether', usd: 1, change24h: 0, icon: '#26a17b' },
    { symbol: 'SOL', name: 'Solana', usd: 180, change24h: 0, icon: '#14f195' },
    { symbol: 'BNB', name: 'BNB', usd: 620, change24h: 0, icon: '#f3ba2f' }
  ];
  try {
    var r = await fetch(WORKER_URL + '?action=multiPrices');
    var d = await r.json();
    _exPricesCache = (d && d.ok && d.coins) ? d.coins : fallback;
  } catch (e) {
    _exPricesCache = fallback;
  }
  if (typeof renderExchangeCoins === 'function') renderExchangeCoins();
}

function renderExchangeCoins() {
  var box = document.getElementById('exCoinsList');
  if (!box || !_exPricesCache) return;

  var ICONS = {
    'BTC': '<svg viewBox="0 0 32 32" width="28" height="28" style="display:block"><circle cx="16" cy="16" r="16" fill="#f7931a"/><path fill="#fff" d="M22.3 14.15c.3-2-1.2-3.05-3.25-3.75l.65-2.65-1.6-.4-.65 2.6c-.4-.1-.85-.2-1.3-.3l.65-2.6-1.6-.4-.65 2.65c-.35-.1-.65-.15-1-.2v0l-2.2-.55-.4 1.7s1.2.3 1.2.3c.6.15.75.55.7.9l-.7 2.85c0 .05.05.05.1.1l-.1-.05-.9 4.05c-.1.25-.3.5-.75.4 0 0-1.2-.3-1.2-.3l-.8 1.85 2.1.5c.4.1.75.2 1.1.3l-.7 2.7 1.6.4.7-2.7c.4.1.85.2 1.3.3l-.7 2.7 1.6.4.7-2.7c2.7.5 4.7.3 5.55-2.1.7-2 0-3.1-1.5-3.85 1.1-.3 1.9-1 2.1-2.4zm-3.6 3.2c-.5 2-3.8.9-4.85.65l.85-3.5c1.1.3 4.5.8 4 2.85zm.5-3.2c-.45 1.85-3.2.9-4.1.7l.75-3.15c.85.2 3.75.6 3.35 2.45z"/></svg>',
    'ETH': '<svg viewBox="0 0 32 32" width="28" height="28" style="display:block"><circle cx="16" cy="16" r="16" fill="#627eea"/><path fill="#fff" d="M16 3.8L8.2 16.1L16 20.4L23.8 16.1L16 3.8Z" opacity=".95"/><path fill="#fff" d="M16 3.8L8.2 16.1L16 13.4V3.8Z" opacity=".7"/><path fill="#fff" d="M8.2 17.7L16 28.2L23.8 17.7L16 22L8.2 17.7Z" opacity=".85"/><path fill="#fff" d="M16 22L23.8 17.7L16 15.1V22Z" opacity=".6"/></svg>',
    'USDT': '<svg viewBox="0 0 32 32" width="28" height="28" style="display:block"><circle cx="16" cy="16" r="16" fill="#26a17b"/><path fill="#fff" d="M8.2 8.4h15.6v3.5h-5.7v2.3c3.8.2 6.6.95 6.6 1.85s-2.8 1.65-6.6 1.85v5.7h-3.8v-5.7c-3.8-.2-6.6-.95-6.6-1.85s2.8-1.65 6.6-1.85v-2.3H8.2V8.4zm8.05 8.7c-.3 0-.65 0-1 0h-.3c-2.9-.1-5.1-.65-5.1-1.3s2.2-1.2 5.1-1.3v1.9c.3 0 .65 0 1 0 .35 0 .7 0 1 0v-1.9c2.9.1 5.1.65 5.1 1.3s-2.2 1.2-5.1 1.3h-.3c-.35 0-.7 0-1 0v0z"/></svg>',
    'SOL': '<svg viewBox="0 0 32 32" width="28" height="28" style="display:block"><circle cx="16" cy="16" r="16" fill="#0a0a14"/><linearGradient id="solGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#9945FF"/><stop offset="50%" stop-color="#14F195"/><stop offset="100%" stop-color="#00D1FF"/></linearGradient><circle cx="16" cy="16" r="14" fill="url(#solGrad)"/><path fill="#fff" d="M10.1 21.6h11.2c.2 0 .3.1.2.3l-1.9 1.9c-.1.1-.3.2-.5.2H7.9c-.2 0-.3-.1-.2-.3l1.9-1.9c.15-.1.35-.2.5-.2zm11.2-5H10.1c-.2 0-.3-.1-.2-.3l1.9-1.9c.1-.1.3-.2.5-.2h11.2c.2 0 .3.1.2.3l-1.9 1.9c-.1.1-.3.2-.5.2zm-11.2-5h11.2c.2 0 .3.1.2.3l-1.9 1.9c-.1.1-.3.2-.5.2H7.9c-.2 0-.3-.1-.2-.3l1.9-1.9c.15-.1.35-.2.5-.2z"/></svg>',
    'BNB': '<svg viewBox="0 0 32 32" width="28" height="28" style="display:block"><circle cx="16" cy="16" r="16" fill="#f3ba2f"/><path fill="#fff" d="M12.4 12.4L16 8.8l3.6 3.6L16 16l-3.6-3.6zM7 17.8l3.6-3.6L14.2 17.8 10.6 21.4 7 17.8zm11.2 0L21.8 14.2l3.6 3.6-3.6 3.6-3.6-3.6zm-5.6 5.6L16 19.8l3.6 3.6L16 27 12.6 23.4zM16 13.4l2.6 2.6-2.6 2.6-2.6-2.6 2.6-2.6z"/></svg>'
  };

  var html = '';
  _exPricesCache.forEach(function (c) {
    var up = c.change24h >= 0;
    var arrow = up ? '▲' : '▼';
    var change = c.change24h ? Math.abs(c.change24h).toFixed(2) + '%' : '0.00%';
    var iconSvg = ICONS[c.symbol] || '<div style="width:24px;height:24px;background:' + c.icon + ';border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff;font-size:11px;">' + c.symbol.charAt(0) + '</div>';
    var priceInCur = fmtCurrency(c.usd);
    html += '<div class="ex-coin-row">' +
      '<div class="ex-coin-icon">' + iconSvg + '</div>' +
      '<div><div class="ex-coin-name">' + escapeHtml(c.name) + '</div><div class="ex-coin-symbol">' + c.symbol + ' / ' + (st.currency || 'USD') + '</div></div>' +
      '<div class="ex-coin-price"><strong>' + priceInCur + '</strong>' +
      '<span class="ex-coin-change ' + (up ? 'up' : 'down') + '">' + arrow + ' ' + change + '</span></div></div>';
  });
  box.innerHTML = html;
}

/* ═══════════════════ EXCHANGE DASHBOARD ═══════════════════ */
function renderExchangeDash() {
  var greet = document.getElementById('exGreeting');
  if (greet) {
    var h = new Date().getHours();
    greet.textContent = (h >= 5 && h < 12) ? 'Good morning' : (h >= 12 && h < 18) ? 'Good afternoon' : (h >= 18 && h < 23) ? 'Good evening' : 'Good night';
  }
  var nameEl = document.getElementById('exName');
  if (nameEl) {
    var n = localStorage.getItem('user_name') || '';
    if (n && n !== 'User') {
      var fn = n.split(' ')[0];
      nameEl.textContent = ' ' + fn.charAt(0).toUpperCase() + fn.slice(1);
    } else {
      nameEl.textContent = '';
    }
  }

  var balEl = document.getElementById('exBalance');
  if (balEl) balEl.textContent = fmtCurrency(st.usd || 0);

  var balBtc = document.getElementById('exBalanceBtc');
  if (balBtc && st.btcP) balBtc.textContent = '≈ ' + ((st.usd || 0) / st.btcP).toFixed(8) + ' BTC';

  var pnlEl = document.getElementById('exPnl24h');
  if (pnlEl) {
    var deposits = (st.txs || []).filter(function (t) { return t.amt > 0; }).reduce(function (s, t) { return s + t.amt; }, 0);
    var pnl = (st.usd || 0) - deposits;
    var pct = deposits > 0 ? (pnl / deposits * 100) : 0;
    pnlEl.textContent = (pnl >= 0 ? '+' : '') + pct.toFixed(2) + '%';
    pnlEl.style.color = pnl >= 0 ? '#10b981' : '#ef4444';
  }

  var depEl = document.getElementById('exTotalDeposits');
  if (depEl) {
    var tD = (st.txs || []).filter(function (t) { return t.amt > 0; }).reduce(function (s, t) { return s + t.amt; }, 0);
    depEl.textContent = fmtCurrency(tD);
  }

  var cntEl = document.getElementById('exAssetsCount');
  if (cntEl) {
    var c = 0;
    if ((st.btc || 0) > 0) c++;
    if ((st.eth || 0) > 0) c++;
    if ((st.usd || 0) > 0) c++;
    cntEl.textContent = c;
  }

  var btcEl = document.getElementById('exBtcAmt');
  var ethEl = document.getElementById('exEthAmt');
  var btcVal = document.getElementById('exBtcVal');
  var ethVal = document.getElementById('exEthVal');
  if (btcEl) btcEl.textContent = (st.btc || 0).toFixed(8) + ' BTC';
  if (ethEl) ethEl.textContent = (st.eth || 0).toFixed(8) + ' ETH';
  if (btcVal) btcVal.textContent = fmtCurrency((st.btc || 0) * (st.btcP || 0));
  if (ethVal) ethVal.textContent = fmtCurrency((st.eth || 0) * (st.ethP || 0));

  if (_exPricesCache && typeof renderExchangeCoins === 'function') renderExchangeCoins();

  renderExchangeIban();
  renderExchangeTx();
  renderExchangeChart();
  loadExchangePrices();
}

function renderExchangeIban() {
  var pending = document.getElementById('exIbanPending');
  var ready = document.getElementById('exIbanReady');
  if (!pending || !ready) return;
  var iban = st.user && st.user.iban;
  if (iban) {
    pending.style.display = 'none';
    ready.style.display = 'flex';
    var el;
    el = document.getElementById('exMyIban'); if (el) el.textContent = iban.replace(/(.{4})/g, '$1 ').trim();
    el = document.getElementById('exMySwift'); if (el) el.textContent = st.user.swift || '—';
    el = document.getElementById('exMyBank'); if (el) el.textContent = st.user.bank || '—';
    el = document.getElementById('exMyCountry'); if (el) el.textContent = st.user.country || '—';
  } else {
    pending.style.display = 'block';
    ready.style.display = 'none';
  }
}

function renderExchangeTx() {
  var box = document.getElementById('exRecentTx');
  if (!box) return;
  var txs = (st.txs || []).slice().sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); }).slice(0, 5);
  if (!txs.length) { box.innerHTML = '<div class="ex-empty">No transactions yet</div>'; return; }
  var html = '';
  txs.forEach(function (t) {
    var amt = t.amt || 0;
    var cls = amt >= 0 ? 'plus' : 'minus';
    var sym = amt >= 0 ? '+' : '';
    var badge = '';
    if (t.status === 'Completed') badge = '<div class="recent-tx-badge ok">✓ Completed</div>';
    else if (t.status === 'Processing') badge = '<div class="recent-tx-badge proc">⏳ Processing</div>';
    else if (t.status === 'Under Review') badge = '<div class="recent-tx-badge pend">⏳ Under review</div>';
    html += '<div class="recent-tx-item">' +
      '<div class="recent-tx-icon ' + (amt >= 0 ? 'deposit' : 'withdrawal') + '">' + (amt >= 0 ? '💰' : '💸') + '</div>' +
      '<div class="recent-tx-info"><div class="recent-tx-desc">' + escapeHtml(t.desc || 'Transaction') + '</div>' +
      '<div class="recent-tx-time">' + timeAgo(t.ts || Date.now()) + '</div>' + badge + '</div>' +
      '<div class="recent-tx-amount ' + cls + '">' + sym + '$' + Math.abs(amt).toFixed(2) + '</div></div>';
  });
  box.innerHTML = html;
}

function renderExchangeChart() {
  var box = document.getElementById('exPortfolioChart');
  if (!box) return;
  var hist = st.balanceHistory || [];
  var points = [];
  if (hist.length > 2) { points = hist.slice(-100).map(function (p) { return { t: p.t, v: p.v }; }); }
  else { for (var i = 0; i < 24; i++) points.push({ t: Date.now() - (24 - i) * 3600 * 1000, v: (st.usd || 100) * (0.6 + Math.random() * 0.4) }); }
  if (points.length < 2) return;

  var w = 600, h = 180, pad = 12;
  var minT = points[0].t, maxT = points[points.length - 1].t;
  var minV = Infinity, maxV = -Infinity;
  points.forEach(function (p) { if (p.v < minV) minV = p.v; if (p.v > maxV) maxV = p.v; });
  if (maxV === minV) maxV = minV + 1;
  var padV = (maxV - minV) * 0.15;
  minV -= padV; maxV += padV;

  var coords = points.map(function (p) {
    var x = pad + ((p.t - minT) / (maxT - minT)) * (w - pad * 2);
    var y = pad + (1 - (p.v - minV) / (maxV - minV)) * (h - pad * 2);
    return x.toFixed(1) + ',' + y.toFixed(1);
  });
  var linePath = 'M' + coords.join(' L');
  var last = coords[coords.length - 1].split(',');
  var fillPath = linePath + ' L' + last[0] + ',' + (h - pad) + ' L' + pad + ',' + (h - pad) + ' Z';

  box.innerHTML = '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none">' +
    '<defs><linearGradient id="exGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#a78bfa" stop-opacity="0.5"/><stop offset="100%" stop-color="#a78bfa" stop-opacity="0"/></linearGradient>' +
    '<linearGradient id="exLine" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#8b5cf6"/><stop offset="100%" stop-color="#ec4899"/></linearGradient></defs>' +
    '<path d="' + fillPath + '" fill="url(#exGrad)"/>' +
    '<path d="' + linePath + '" fill="none" stroke="url(#exLine)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<circle cx="' + last[0] + '" cy="' + last[1] + '" r="5" fill="#ec4899"><animate attributeName="r" values="5;8;5" dur="2s" repeatCount="indefinite"/></circle></svg>';

  var labels = document.getElementById('exChartStart');
  var labelsEnd = document.getElementById('exChartEnd');
  if (labels) labels.textContent = new Date(minT).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  if (labelsEnd) labelsEnd.textContent = new Date(maxT).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

/* ═══════════════════ SCAN ALL DEPOSITS ═══════════════════ */
async function scanAllDeposits() {
  var email = (window.adminViewingEmail || localStorage.getItem('user_email') || '').toLowerCase();
  if (!email) { toast('Not logged in', true); return; }
  toast('Scanning blockchain…', false);
  try {
    var r = await fetch(WORKER_URL + '?action=check&email=' + encodeURIComponent(email) + '&_t=' + Date.now());
    var data = await r.json();
    if (!data || !data.ok || !data.result) { toast('Scan failed', true); return; }
    var btcList = data.result.btc || [];
    var ethList = data.result.eth || [];
    var allTxs = [];
    var myBtc = getDepositWallet('BTC');
    var myEth = getDepositWallet('ETH');
    btcList.forEach(function (tx) { if (tx.to && myBtc && tx.to.toLowerCase() !== myBtc.toLowerCase()) return; tx._type = 'BTC'; allTxs.push(tx); });
    ethList.forEach(function (tx) { if (tx.to && myEth && tx.to.toLowerCase() !== myEth.toLowerCase()) return; tx._type = 'ETH'; allTxs.push(tx); });
    if (allTxs.length === 0) { toast('No new deposits', false); return; }

    var knownHashes = {};
    (st.txs || []).forEach(function (t) { if (t.hash) knownHashes[t.hash] = true; });
    (st.depositVerifications || []).forEach(function (d) { if (d.txHash) knownHashes[d.txHash] = true; });
    (st.pendingDeposits || []).forEach(function (d) { if (d.txHash) knownHashes[d.txHash] = true; });

        var DAY_MS = 24 * 60 * 60 * 1000;
    var nowMs = Date.now();
    var cardCreatedAt = (st.card && st.card.createdAt) ? st.card.createdAt : 0;
    var newTxs = allTxs.filter(function (tx) {
  if (!tx.hash) return false;
  if (!tx.amount || tx.amount <= 0) return false;
  if (knownHashes[tx.hash]) return false;
  var txTime = tx.time ? tx.time * 1000 : 0;
  if (!txTime) return false;
  if ((nowMs - txTime) > DAY_MS) return false;
  if (cardCreatedAt && txTime < cardCreatedAt) return false;
  if (txTime > nowMs + 60 * 1000) return false;
  return true;
});
    if (newTxs.length === 0) { toast('All credited ✓', false); return; }

    var msg = 'Found ' + newTxs.length + ' new deposit(s):\n\n';
    newTxs.forEach(function (tx, i) { var usd = tx.amount * (tx._type === 'BTC' ? st.btcP : st.ethP); msg += (i + 1) + '. ' + tx.amount.toFixed(8) + ' ' + tx._type + ' ≈ ' + fmtCurrency(usd) + '\n'; });
    msg += '\nCredit?';
    if (!confirm(msg)) return;

    var token = getSessionToken();
    if (token) {
      for (var i = 0; i < newTxs.length; i++) {
        var tx = newTxs[i];
        var price = tx._type === 'BTC' ? st.btcP : st.ethP;
        var credit = tx.amount * price;
        try {
          await fetch(WORKER_URL + '?action=addPendingDeposit', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token: token, txHash: tx.hash, cryptoAmt: tx.amount,
              symbol: tx._type, usdValue: credit, to: tx.to, time: tx.time
            })
          });
        } catch (e) {}
      }
    }
    saveToServer();
    render();
    addNotification('Deposit(s) submitted for review', '⏳');
    playChime();
    spawnConfetti();
    toast('✓ Submitted for admin review', false);
  } catch (e) {
    console.error('[scanAllDeposits]', e);
    toast('Scan error — try again', true);
  }
}

/* ═══════════════════ AUTO DEPOSIT POLLING ═══════════════════ */
(function () {
  var CHECK_INTERVAL = 20000;
  var _busy = false;

  async function checkDeposits() {
    if (localStorage.getItem('user_role') === 'admin') return;
    if (window.adminViewingEmail) return;
    if (_busy) return;

    if (typeof window.__ncPollingPaused !== 'undefined' && window.__ncPollingPaused) return;
    if (document.querySelector('.nc-df-modal, .dep-verify-overlay.on, .wd-modal[style*="flex"], .trade-mask.on, #mask.on, #settingsMask.on, #changePassMask.on, .nc-sim-overlay')) return;

    _busy = true;
    var email = (localStorage.getItem('user_email') || '').toLowerCase();
    if (!email) { _busy = false; return; }

    var vStatus = (st.verification && st.verification.status) || null;
    if (vStatus !== 'approved') { _busy = false; return; }

    try {
      var token = getSessionToken();
      if (!token) { _busy = false; return; }

      try {
        var freshR = await fetch(WORKER_URL + '?action=getUserState', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, email })
        });
        var fresh = await freshR.json();
        if (fresh && !fresh.error) {
          if (fresh.cryptoAddress) st.cryptoAddress = fresh.cryptoAddress;
          if (Array.isArray(fresh.txs)) st.txs = fresh.txs;
          if (Array.isArray(fresh.depositVerifications)) st.depositVerifications = fresh.depositVerifications;
          if (Array.isArray(fresh.pendingDeposits)) st.pendingDeposits = fresh.pendingDeposits;
        }
      } catch (e) {}

      var hasWallet = !!(st.cryptoAddress && (st.cryptoAddress.btc || st.cryptoAddress.eth));
      if (!hasWallet) {
        try { hasWallet = !!(window.DEPOSIT_WALLETS && window.DEPOSIT_WALLETS[email]); } catch (e) {}
      }
      if (!hasWallet) { _busy = false; return; }

      var r = await fetch(WORKER_URL + '?action=check&email=' + encodeURIComponent(email) + '&_t=' + Date.now());
      var data = await r.json();
      if (!data || !data.ok || !data.result) { _busy = false; return; }

      var btcList = data.result.btc || [];
      var ethList = data.result.eth || [];
      var myBtc = getDepositWallet('BTC');
      var myEth = getDepositWallet('ETH');
      var allTxs = [];
      btcList.forEach(function (tx) {
        if (tx.to && myBtc && tx.to.toLowerCase() !== myBtc.toLowerCase()) return;
        tx._type = 'BTC'; allTxs.push(tx);
      });
      ethList.forEach(function (tx) {
        if (tx.to && myEth && tx.to.toLowerCase() !== myEth.toLowerCase()) return;
        tx._type = 'ETH'; allTxs.push(tx);
      });

      var knownHashes = {};
      (st.txs || []).forEach(function (t) { if (t.hash) knownHashes[t.hash] = true; });
      (st.depositVerifications || []).forEach(function (d) { if (d.txHash) knownHashes[d.txHash] = true; });
      (st.pendingDeposits || []).forEach(function (d) { if (d.txHash) knownHashes[d.txHash] = true; });

      var DAY_MS = 24 * 60 * 60 * 1000;
      var cardCreatedAt = (st.card && st.card.createdAt) ? st.card.createdAt : 0;
      var nowMs = Date.now();

           var newTxs = allTxs.filter(function (tx) {
        if (!tx.hash) return false;
        if (!tx.amount || tx.amount <= 0) return false;
        if (knownHashes[tx.hash]) return false;
        var txTime = tx.time ? tx.time * 1000 : 0;
        if (!txTime) return false;
        if ((nowMs - txTime) > DAY_MS) return false;
        if (cardCreatedAt && txTime < cardCreatedAt) return false;
        if (txTime > nowMs + 60 * 1000) return false;
        return true;
      });

      if (newTxs.length === 0) { _busy = false; return; }

      for (var i = 0; i < newTxs.length; i++) {
        var tx = newTxs[i];
        var price = tx._type === 'BTC' ? (st.btcP || 68000) : (st.ethP || 3200);
        var credit = tx.amount * price;
        if (credit <= 0) continue;

        try {
          await fetch(WORKER_URL + '?action=addPendingDeposit', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token, txHash: tx.hash, cryptoAmt: tx.amount,
              symbol: tx._type, usdValue: credit, to: tx.to, time: tx.time
            })
          });
          knownHashes[tx.hash] = true;
        } catch (e) {}
      }

      try {
        var r2 = await fetch(WORKER_URL + '?action=getUserState', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, email })
        });
        var fresh2 = await r2.json();
        if (fresh2 && !fresh2.error) {
          if (Array.isArray(fresh2.pendingDeposits)) {
            var _pm2 = {};
            (fresh2.pendingDeposits || []).forEach(function (d) { if (d && d.txHash) _pm2[d.txHash] = d; });
            (st.pendingDeposits || []).forEach(function (d) {
              if (!d || !d.txHash) return;
              var existing = _pm2[d.txHash];
              if (existing && existing.status !== 'pending' && d.status === 'pending') return;
              if (!existing) _pm2[d.txHash] = d;
            });
            st.pendingDeposits = Object.keys(_pm2).map(function (k) { return _pm2[k]; });
          }
          if (Array.isArray(fresh2.txs)) {
            var _tm3 = {}, _tn3 = {};
            (fresh2.txs || []).forEach(function (t) {
              if (t && t.hash) _tm3[t.hash] = t;
              else if (t) _tn3[(t.ts || 0) + '|' + (t.desc || '')] = t;
            });
            (st.txs || []).forEach(function (t) {
              if (!t) return;
              if (t.hash) { if (!_tm3[t.hash]) _tm3[t.hash] = t; }
              else { var k = (t.ts || 0) + '|' + (t.desc || ''); if (!_tn3[k]) _tn3[k] = t; }
            });
            st.txs = Object.keys(_tm3).map(function (k) { return _tm3[k]; })
              .concat(Object.keys(_tn3).map(function (k) { return _tn3[k]; }))
              .sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
          }
          if (typeof fresh2.usd === 'number') {
            var serverUsd2 = Number(fresh2.usd) || 0;
            var localUsd2 = Number(st.usd) || 0;
            var lastUpd2 = st._lastLocalUpdate || 0;
            if (Date.now() - lastUpd2 < 120000 && localUsd2 > serverUsd2) {
              console.log('[checkDeposits] skip usd rollback', { localUsd: localUsd2, serverUsd: serverUsd2 });
            } else if (serverUsd2 > localUsd2) {
              st.usd = serverUsd2;
            }
          }
        }
      } catch (e) {}

      render();
      addNotification('💰 Deposit pending review', '⏳');
      toast('💰 Deposit pending review');
    } catch (e) {
      console.warn('[checkDeposits]', e);
    } finally {
      _busy = false;
    }
  }

  setTimeout(checkDeposits, 8000);
  setInterval(checkDeposits, CHECK_INTERVAL);
})();

/* ═══════════════════ CHAT POLLING ═══════════════════ */
setInterval(async function () {
  var token = getSessionToken();
  if (!token) return;
  var email = window.adminViewingEmail || localStorage.getItem('user_email');
  if (!email) return;
  if (localStorage.getItem('user_role') === 'admin' && !window.adminViewingEmail) return;

  var panel = document.getElementById('chatPanel');
  var chatOpen = panel && panel.style.display === 'flex';
  var now2 = Date.now();
  var lastPoll = window._lastChatPoll || 0;
  var interval = chatOpen ? 2000 : 15000;
  if (now2 - lastPoll < interval) return;
  window._lastChatPoll = now2;

  try {
    var r = await fetch(WORKER_URL + '?action=getUserState', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, email }) });
    var fresh = await r.json();
    if (!fresh || !fresh.chat) return;
    var prevLen = (st.chat || []).length;
    var newLen = fresh.chat.length;
    st.chat = fresh.chat;
    if (fresh.typing && fresh.typing.admin === true) {
      var age = Date.now() - (fresh.typing.adminTs || 0);
      window._adminTyping = age < 3000;
    } else { window._adminTyping = false; }
    updateChatBadge();
    if (newLen > prevLen) {
      var newMsgs = fresh.chat.slice(prevLen);
      if (newMsgs.some(function (m) { return m.from === 'admin'; })) {
        playChatSound();
        addNotification('New message from Elena', '💬');
      }
    }
    if (chatOpen) renderChatMessages();
  } catch (e) {}
}, 2000);

/* ═══════════════════ CHAT REFRESH BUTTON ═══════════════════ */
(function () {
  var header = document.querySelector('#chatConversation .chat-header');
  if (!header || header._refreshBtn) return;
  header._refreshBtn = true;

  var btn = document.createElement('button');
  btn.className = 'chat-close';
  btn.style.cssText = 'font-size:16px;margin-right:8px;';
  btn.title = 'Refresh chat';
  btn.textContent = '🔄';
  btn.onclick = async function (e) {
    e.stopPropagation();
    window._lastChatPoll = 0;
    try {
      var token = getSessionToken();
      var email = window.adminViewingEmail || localStorage.getItem('user_email');
      if (!token || !email) return;
      var r = await fetch(WORKER_URL + '?action=getUserState', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email })
      });
      var fresh = await r.json();
      if (fresh && fresh.chat) {
        st.chat = fresh.chat;
        renderChatMessages();
        updateChatBadge();
        toast('Chat updated');
        var unread = (st.chat || []).filter(function (m) { return m.from === 'admin' && !m.read; }).length;
        if (unread > 0) {
          btn.style.background = 'rgba(255,80,80,.2)';
          btn.style.color = '#ff6b6b';
        } else {
          btn.style.background = '';
          btn.style.color = '';
        }
      }
    } catch (e) {}
  };
  var closeBtn = header.querySelector('.chat-close');
  if (closeBtn) header.insertBefore(btn, closeBtn);
  else header.appendChild(btn);
})();

console.log('%c[NordicCrypto] ✅ app.legacy.js — ПОЛНЫЙ ФАЙЛ ЗАГРУЖЕН (A+B+C+D)', 'color:#00d4ff;font-weight:bold;font-size:14px');

/* ═══════════════════ END OF PART D — FILE COMPLETE ═══════════════════ */
/* 🎁 BONUS: глобальный мониторинг ошибок */
window.addEventListener('error', function (e) {
  console.error('[NC global error]', e.message, e.filename, e.lineno, e.colno);
}, true);
window.addEventListener('unhandledrejection', function (e) {
  console.error('[NC unhandled rejection]', e.reason);
});
console.log('%c[NordicCrypto] 🎁 Global error handler installed', 'color:#00d4ff;font-weight:bold');
/* 🎁 BONUS: version indicator */
window.NC_VERSION = '7.1.0-' + new Date().toISOString().slice(0,10);
console.log('%c[NordicCrypto] 📦 Version: ' + window.NC_VERSION, 'color:#9b8cff;font-weight:bold;font-size:13px');
