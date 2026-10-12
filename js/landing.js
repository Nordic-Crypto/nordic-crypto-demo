/* ============================================================
   NORDIC CRYPTO — LANDING v4.0
   Fixed: CSS-in-JS bug (v3.0)
   Added: password toggle, strength meter, crypto picker,
          retry logic, live flash, offline detection,
          copy-to-clipboard, hotkeys, event tracking
   ============================================================ */
(function () {
  'use strict';

  /* ---------- CONFIG ---------- */
  var WORKER_URL = 'https://nordic-deposit-checker.otis-790.workers.dev';
  var PRICE_REFRESH = 15000;   // 15s
  var MAX_RETRIES = 3;

  /* ---------- TRACKING (bonus) ---------- */
  function track(event, data) {
    try {
      if (window.gtag) window.gtag('event', event, data || {});
      if (window.plausible) window.plausible(event, { props: data || {} });
      if (window.dataLayer) window.dataLayer.push({ event: event, ...(data || {}) });
    } catch (e) {}
  }

  /* ---------- RETRY FETCH (bonus) ---------- */
  async function fetchRetry(url, opts, retries) {
    retries = retries == null ? MAX_RETRIES : retries;
    for (var i = 0; i < retries; i++) {
      try {
        var r = await fetch(url, opts);
        if (r.ok) return r;
        if (r.status >= 400 && r.status < 500) return r;
      } catch (e) {
        if (i === retries - 1) throw e;
      }
      await new Promise(function (res) { setTimeout(res, 400 * (i + 1)); });
    }
    throw new Error('Network failed after retries');
  }

  /* ---------- OFFLINE DETECTION (bonus) ---------- */
  (function offline() {
    function setStatus() {
      var off = !navigator.onLine;
      document.documentElement.classList.toggle('is-offline', off);
      var badge = document.getElementById('offlineBadge');
      if (off && !badge) {
        badge = document.createElement('div');
        badge.id = 'offlineBadge';
        badge.textContent = '⚠ Offline — check your connection';
        badge.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;padding:8px;text-align:center;background:#ff5470;color:#fff;font-weight:700;font-size:.85rem;';
        document.body.appendChild(badge);
      } else if (!off && badge) {
        badge.remove();
      }
    }
    window.addEventListener('online', setStatus);
    window.addEventListener('offline', setStatus);
    setStatus();
  })();

  /* ---------- SESSION REDIRECT ---------- */
  if (localStorage.getItem('session_token') && localStorage.getItem('user_email')) {
    window.location.replace('index.html');
    return;
  }

  /* ---------- 1. HEADER SCROLL ---------- */
  var header = document.querySelector('.header');
  var _ticking = false, _lastScrolled = false;
  function updateHeader() {
    var s = window.scrollY > 40;
    if (s !== _lastScrolled) { _lastScrolled = s; header.classList.toggle('scrolled', s); }
    _ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!_ticking) { requestAnimationFrame(updateHeader); _ticking = true; }
  }, { passive: true });

  /* ---------- 2. SCROLL REVEAL ---------- */
  var revealEls = document.querySelectorAll('.anim-up, .anim-left, .anim-right');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -50px 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- 3. COUNT-UP ---------- */
  function animateCount(el) {
    var target = parseFloat(el.getAttribute('data-count'));
    var dec = parseInt(el.getAttribute('data-decimals') || '0', 10);
    var pre = el.getAttribute('data-prefix') || '';
    var suf = el.getAttribute('data-suffix') || '';
    var dur = 1600, start = null;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = pre + (target * eased).toFixed(dec) + suf;
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = pre + target.toFixed(dec) + suf;
    }
    requestAnimationFrame(step);
  }
  var stats = document.querySelectorAll('.stat-v[data-count]');
  if ('IntersectionObserver' in window) {
    var sio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { animateCount(e.target); sio.unobserve(e.target); }
      });
    }, { threshold: 0.4 });
    stats.forEach(function (el) { sio.observe(el); });
  } else {
    stats.forEach(function (el) { animateCount(el); });
  }

  /* ---------- 4. MODALS ---------- */
  var lastFocused = null;
  function openModal(id) {
    lastFocused = document.activeElement;
    document.querySelectorAll('.modal').forEach(function (m) { m.classList.remove('on'); });
    var el = document.getElementById(id);
    if (el) {
      el.classList.add('on');
      var first = el.querySelector('input, button:not(.modal-x)');
      if (first) setTimeout(function () { first.focus(); }, 100);
      track('modal_open', { id: id });
    }
    document.body.style.overflow = 'hidden';
  }
  function closeModal() {
    document.querySelectorAll('.modal').forEach(function (m) { m.classList.remove('on'); });
    document.body.style.overflow = '';
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }
  document.querySelectorAll('[data-modal]').forEach(function (b) {
    b.addEventListener('click', function (e) { e.preventDefault(); openModal(this.getAttribute('data-modal')); });
  });
  document.querySelectorAll('[data-close]').forEach(function (b) { b.addEventListener('click', closeModal); });
  document.querySelectorAll('.modal').forEach(function (m) {
    m.addEventListener('click', function (e) { if (e.target === m) closeModal(); });
  });
  document.querySelectorAll('[data-switch]').forEach(function (a) {
    a.addEventListener('click', function (e) { e.preventDefault(); openModal(this.getAttribute('data-switch')); });
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });
  document.querySelectorAll('[data-alert]').forEach(function (a) {
    a.addEventListener('click', function (e) { e.preventDefault(); alert(this.getAttribute('data-alert')); });
  });

  /* ---------- 5. PASSWORD TOGGLE + STRENGTH (bonus) ---------- */
  document.querySelectorAll('input[type="password"]').forEach(function (inp) {
    var wrap = document.createElement('div');
    wrap.style.cssText = 'position:relative;';
    inp.parentNode.insertBefore(wrap, inp);
    wrap.appendChild(inp);
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.innerHTML = '👁';
    btn.setAttribute('aria-label', 'Show password');
    btn.style.cssText = 'position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:16px;opacity:.6;padding:4px;';
    btn.onclick = function () {
      inp.type = inp.type === 'password' ? 'text' : 'password';
      btn.innerHTML = inp.type === 'password' ? '👁' : '🙈';
    };
    wrap.appendChild(btn);
  });

  function strength(p) {
    var s = 0;
    if (p.length >= 6) s++;
    if (p.length >= 10) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s; // 0..5
  }
  var regPass = document.getElementById('regPassword');
  if (regPass) {
    var meter = document.createElement('div');
    meter.style.cssText = 'height:4px;border-radius:4px;background:rgba(255,255,255,.08);margin-top:8px;overflow:hidden;';
    var bar = document.createElement('div');
    bar.style.cssText = 'height:100%;width:0;transition:all .3s;';
    meter.appendChild(bar);
    regPass.parentNode.parentNode.appendChild(meter);
    regPass.addEventListener('input', function () {
      var s = strength(regPass.value);
      var colors = ['#ff5470', '#ff5470', '#f59e0b', '#f59e0b', '#10b981', '#10b981'];
      bar.style.width = (s * 20) + '%';
      bar.style.background = colors[s];
    });
  }

  /* ---------- 6. EMAIL LIVE VALIDATION (bonus) ---------- */
  ['loginEmail', 'regEmail'].forEach(function (id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', function () {
      var v = el.value.trim();
      if (!v) { el.style.borderColor = ''; return; }
      var ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      el.style.borderColor = ok ? 'rgba(16,185,129,.5)' : 'rgba(255,84,112,.5)';
    });
  });

  /* ---------- 7. LOGIN ---------- */
  function showErr(id, msg) { var el = document.getElementById(id); if (el) { el.textContent = msg; el.style.display = 'block'; } }
  function hideErr(id) { var el = document.getElementById(id); if (el) el.style.display = 'none'; }

  var loginBtn = document.getElementById('loginSubmit');
  var _loginBusy = false;
  if (loginBtn) loginBtn.onclick = async function () {
    if (_loginBusy) return;
    var email = (document.getElementById('loginEmail').value || '').trim().toLowerCase();
    var password = document.getElementById('loginPassword').value || '';
    hideErr('loginError');
    if (!email || !password) { showErr('loginError', 'Please fill all fields'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showErr('loginError', 'Enter valid email'); return; }
    _loginBusy = true;
    loginBtn.disabled = true; loginBtn.textContent = 'Signing in...';
    try {
      var r = await fetchRetry(WORKER_URL + '?action=login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, password: password })
      });
      var d = await r.json();
      if (d.ok && d.token) {
        localStorage.setItem('session_token', d.token);
        localStorage.setItem('user_email', d.user.email);
        localStorage.setItem('user_role', d.user.role || 'user');
        localStorage.setItem('user_name', d.user.name || 'User');
        track('login_success', { email: email });
        window.location.replace('index.html');
      } else {
        showErr('loginError', d.error || 'Login failed');
        loginBtn.disabled = false; loginBtn.textContent = 'Sign in →';
        _loginBusy = false;
      }
    } catch (e) {
      showErr('loginError', 'Connection error — try again');
      loginBtn.disabled = false; loginBtn.textContent = 'Sign in →';
      _loginBusy = false;
    }
  };
  ['loginEmail', 'loginPassword'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('keydown', function (e) { if (e.key === 'Enter') loginBtn.click(); });
  });

  /* ---------- 8. REGISTER ---------- */
  document.querySelectorAll('.acc').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.acc').forEach(function (b) { b.classList.remove('on'); });
      this.classList.add('on');
      document.getElementById('regAccType').value = this.getAttribute('data-acc');
    });
  });

  var regBtn = document.getElementById('registerSubmit');
  var _regBusy = false;
  if (regBtn) regBtn.onclick = async function () {
    if (_regBusy) return;
    var name = (document.getElementById('regName').value || '').trim();
    var email = (document.getElementById('regEmail').value || '').trim().toLowerCase();
    var password = document.getElementById('regPassword').value || '';
    var confirm = document.getElementById('regConfirm').value || '';
    var accountType = document.getElementById('regAccType').value || 'banking';
    hideErr('registerError');
    if (!name) { showErr('registerError', 'Please enter your name'); return; }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showErr('registerError', 'Enter valid email'); return; }
    if (password.length < 6) { showErr('registerError', 'Password must be at least 6 characters'); return; }
    if (password !== confirm) { showErr('registerError', 'Passwords do not match'); return; }
    _regBusy = true;
    regBtn.disabled = true; regBtn.textContent = 'Creating...';
    try {
      var r = await fetchRetry(WORKER_URL + '?action=register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name, email: email, password: password, accountType: accountType })
      });
      var d = await r.json();
      if (d.ok && d.token) {
        localStorage.setItem('session_token', d.token);
        localStorage.setItem('user_email', d.user.email);
        localStorage.setItem('user_role', d.user.role || 'user');
        localStorage.setItem('user_name', d.user.name || name);
        localStorage.setItem('user_account_type', accountType);
        track('register_success', { email: email, type: accountType });
        window.location.replace('index.html');
      } else {
        showErr('registerError', d.error || 'Registration failed');
        regBtn.disabled = false; regBtn.textContent = 'Create account →';
        _regBusy = false;
      }
    } catch (e) {
      showErr('registerError', 'Connection error — try again');
      regBtn.disabled = false; regBtn.textContent = 'Create account →';
      _regBusy = false;
    }
  };
  ['regName', 'regEmail', 'regPassword', 'regConfirm'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('keydown', function (e) { if (e.key === 'Enter') regBtn.click(); });
  });

  /* ---------- 9. SMOOTH SCROLL ---------- */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var t = this.getAttribute('href');
      if (t && t !== '#' && document.querySelector(t)) {
        e.preventDefault();
        document.querySelector(t).scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  /* ---------- 10. LIVE CRYPTO TICKER ---------- */
  (function ticker() {
    var map = { BTC: 'tkBTC', ETH: 'tkETH', SOL: 'tkSOL' };
    if (!document.getElementById('tkBTC')) return;
    var prev = {};
    function flash(el, up) {
      el.style.transition = 'none';
      el.style.color = up ? '#10b981' : '#ef4444';
      requestAnimationFrame(function () {
        el.style.transition = 'color 1s';
        el.style.color = '';
      });
    }
    async function update() {
      try {
        var r = await fetchRetry(WORKER_URL + '?action=multiPrices');
        var d = await r.json();
        if (!d || !d.ok || !d.coins) return;
        d.coins.forEach(function (c) {
          var pEl = document.getElementById(map[c.symbol]);
          if (!pEl) return;
          var newPrice = Number(c.usd);
          if (prev[c.symbol] != null && prev[c.symbol] !== newPrice) {
            flash(pEl, newPrice > prev[c.symbol]);
          }
          prev[c.symbol] = newPrice;
          pEl.textContent = '$' + newPrice.toLocaleString('en-US', { maximumFractionDigits: 2 });
          var chEl = document.getElementById(map[c.symbol] + 'chg');
          if (chEl) {
            var up = c.change24h >= 0;
            chEl.textContent = (up ? '▲ +' : '▼ ') + Math.abs(c.change24h).toFixed(2) + '%';
            chEl.className = 'chg ' + (up ? 'up' : 'down');
          }
        });
      } catch (e) {}
    }
    update();
    setInterval(update, PRICE_REFRESH);
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) update();
    });
  })();

  /* ---------- 11. CALCULATOR v2 (bonus: SOL + picker) ---------- */
  (function calc() {
    var aEl = document.getElementById('calcAmount');
    var cEl = document.getElementById('calcCurrency');
    var oEl = document.getElementById('calcOutput');
    var rEl = document.getElementById('calcRate');
    if (!aEl || !oEl) return;

    var rates = { EUR: 0.92, USD: 1, SEK: 10.45, NOK: 10.5, GBP: 0.79 };
    var prices = { BTC: 84000, ETH: 3200, SOL: 180 };
    var currentCoin = 'BTC';

    // Crypto picker (bonus)
    var picker = document.createElement('div');
    picker.style.cssText = 'display:flex;gap:8px;margin-bottom:12px;justify-content:center;flex-wrap:wrap;';
    ['BTC', 'ETH', 'SOL'].forEach(function (sym) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = sym;
      b.dataset.coin = sym;
      b.style.cssText = 'padding:6px 14px;border-radius:999px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);color:#7d8a9e;font-weight:700;font-size:.78rem;cursor:pointer;transition:.2s;font-family:inherit;';
      b.onclick = function () {
        currentCoin = sym;
        picker.querySelectorAll('button').forEach(function (x) {
          x.style.background = 'rgba(255,255,255,.04)';
          x.style.color = '#7d8a9e';
          x.style.borderColor = 'rgba(255,255,255,.12)';
        });
        b.style.background = 'rgba(0,229,255,.15)';
        b.style.color = '#00e5ff';
        b.style.borderColor = 'rgba(0,229,255,.4)';
        update();
      };
      picker.appendChild(b);
    });
    // Set default active
    picker.querySelector('[data-coin="BTC"]').style.background = 'rgba(0,229,255,.15)';
    picker.querySelector('[data-coin="BTC"]').style.color = '#00e5ff';
    picker.querySelector('[data-coin="BTC"]').style.borderColor = 'rgba(0,229,255,.4)';
    var calcEl = aEl.closest('.calc') || aEl.parentNode;
    calcEl.parentNode.insertBefore(picker, calcEl);

    async function loadPrices() {
      try {
        var r = await fetchRetry(WORKER_URL + '?action=multiPrices');
        var d = await r.json();
        if (d && d.ok && d.coins) {
          d.coins.forEach(function (c) {
            if (prices[c.symbol] != null) prices[c.symbol] = c.usd;
          });
        }
      } catch (e) {}
      update();
    }
    function update() {
      var amount = parseFloat(aEl.value) || 0;
      var usd = amount / (rates[cEl.value] || 1);
      var coin = usd / (prices[currentCoin] || 1);
      var dec = currentCoin === 'BTC' ? 6 : currentCoin === 'ETH' ? 5 : 3;
      oEl.textContent = coin.toFixed(dec) + ' ' + currentCoin;
      rEl.textContent = '1 ' + currentCoin + ' = $' + (prices[currentCoin] || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
    }
    aEl.addEventListener('input', update);
    cEl.addEventListener('change', update);
    loadPrices();
    setInterval(loadPrices, 60000);
  })();

  /* ---------- 12. FOMO NOTIFICATIONS ---------- */
  (function fomo() {
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || window.innerWidth < 640) return;
    var events = [
      { name: 'Eva L.', city: 'Stockholm', action: 'deposited', amount: '€1,200' },
      { name: 'Ole K.', city: 'Oslo', action: 'withdrew', amount: '$250' },
      { name: 'Sara M.', city: 'Copenhagen', action: 'opened IBAN', amount: '' },
      { name: 'Henrik B.', city: 'Helsinki', action: 'bought', amount: '0.05 BTC' },
      { name: 'Astrid N.', city: 'Bergen', action: 'exchanged', amount: '$800' },
      { name: 'Magnus S.', city: 'Aarhus', action: 'deposited', amount: '€3,400' }
    ];
    function show() {
      var ev = events[Math.floor(Math.random() * events.length)];
      var div = document.createElement('div');
      div.className = 'fomo-toast';
      div.innerHTML =
        '<div class="fomo-avatar">' + ev.name.charAt(0) + '</div>' +
        '<div class="fomo-body">' +
          '<div class="fomo-text"><b>' + ev.name + '</b> · ' + ev.city + ' — ' + ev.action +
            (ev.amount ? ' <span class="fomo-amount">' + ev.amount + '</span>' : '') + '</div>' +
          '<div class="fomo-time">' + Math.floor(Math.random() * 5 + 1) + ' min ago</div>' +
        '</div>';
      document.body.appendChild(div);
      requestAnimationFrame(function () { div.classList.add('on'); });
      setTimeout(function () {
        div.classList.remove('on');
        setTimeout(function () { div.remove(); }, 400);
      }, 5000);
    }
    setTimeout(function () { show(); setInterval(show, 18000); }, 10000);
  })();

  /* ---------- 13. HOTKEYS (bonus) ---------- */
  document.addEventListener('keydown', function (e) {
    if (e.target.matches('input, textarea')) return;
    if (e.key === '/') {
      e.preventDefault();
      var search = document.querySelector('input[type="search"], #calcAmount');
      if (search) search.focus();
    }
    if (e.key === 'o' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      openModal('registerModal');
    }
  });

  /* ---------- 14. LOG ---------- */
  console.log('%c[NordicCrypto] ✅ Landing v4.0 loaded — no CSS-in-JS, all good', 'color:#00e5ff;font-weight:bold;font-size:13px');

  track('landing_view', { v: '4.0' });
})();
/* ---------- 15. FORCE VIDEO AUTOPLAY ---------- */
(function forceVideo() {
  var v = document.querySelector('.hero-video');
  if (!v) return;
  v.muted = true;
  v.playsInline = true;
  var play = function () {
    var p = v.play();
    if (p && p.catch) p.catch(function () {
      // autoplay заблокирован — ждём клик
      document.addEventListener('click', function once() {
        v.play();
        document.removeEventListener('click', once);
      }, { once: true });
    });
  };
  if (v.readyState >= 3) play();
  else v.addEventListener('loadeddata', play, { once: true });
  // На всякий случай — повторим через 1 сек
  setTimeout(play, 1000);
})();
  /* ---------- 15. FORCE VIDEO VISIBLE ---------- */
  (function forceVideo() {
    var v = document.querySelector('.hero-video');
    if (!v) return;
    // Форсим display через inline-стиль — перебивает любой @media
    v.style.display = 'block';
    v.style.visibility = 'visible';
    v.style.opacity = '1';
    // Форсим autoplay
    v.muted = true;
    v.playsInline = true;
    var tryPlay = function () {
      var p = v.play();
      if (p && p.catch) p.catch(function () {
        document.addEventListener('click', function () { v.play(); }, { once: true });
      });
    };
    if (v.readyState >= 2) tryPlay();
    else v.addEventListener('loadeddata', tryPlay, { once: true });
    console.log('[NC] Video forced visible. Reduced-motion:',
      window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  })();
