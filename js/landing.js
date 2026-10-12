/* ============================================================
   NORDIC CRYPTO — LANDING v6.0 (final clean)
   ============================================================ */
(function () {
  'use strict';

  var WORKER_URL = 'https://nordic-deposit-checker.otis-790.workers.dev';
  var PRICE_REFRESH = 15000;
  var MAX_RETRIES = 3;

  /* ---------- TRACKING ---------- */
  function track(event, data) {
    try {
      if (window.gtag) window.gtag('event', event, data || {});
      if (window.plausible) window.plausible(event, { props: data || {} });
      if (window.dataLayer) window.dataLayer.push({ event: event, ...(data || {}) });
    } catch (e) {}
  }

  /* ---------- RETRY FETCH ---------- */
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

  /* ---------- OFFLINE ---------- */
  (function offline() {
    function setStatus() {
      var off = !navigator.onLine;
      var badge = document.getElementById('offlineBadge');
      if (off && !badge) {
        badge = document.createElement('div');
        badge.id = 'offlineBadge';
        badge.textContent = '⚠ Offline — check your connection';
        badge.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;padding:8px;text-align:center;background:#ff5470;color:#fff;font-weight:700;font-size:.85rem;';
        document.body.appendChild(badge);
      } else if (!off && badge) badge.remove();
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

  /* ---------- HEADER SCROLL ---------- */
  var header = document.querySelector('.header');
  if (header) {
    var _ticking = false, _lastScrolled = false;
    var updateHeader = function () {
      var s = window.scrollY > 40;
      if (s !== _lastScrolled) { _lastScrolled = s; header.classList.toggle('scrolled', s); }
      _ticking = false;
    };
    window.addEventListener('scroll', function () {
      if (!_ticking) { requestAnimationFrame(updateHeader); _ticking = true; }
    }, { passive: true });
  }

  /* ---------- SCROLL REVEAL ---------- */
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

  /* ---------- COUNT-UP (universal: .stat-v[data-count], .cs-val[data-count]) ---------- */
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
  var countEls = document.querySelectorAll('.stat-v[data-count], .cs-val[data-count]');
  if ('IntersectionObserver' in window) {
    var sio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { animateCount(e.target); sio.unobserve(e.target); }
      });
    }, { threshold: 0.4 });
    countEls.forEach(function (el) { sio.observe(el); });
  } else {
    countEls.forEach(function (el) { animateCount(el); });
  }

  /* ---------- MODALS ---------- */
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

  /* ---------- PASSWORD TOGGLE ---------- */
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

  /* ---------- LOGIN ---------- */
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
        method: 'POST', headers: { 'Content-Type': 'application/json' },
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

  /* ---------- REGISTER ---------- */
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
        method: 'POST', headers: { 'Content-Type': 'application/json' },
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

  /* ---------- SMOOTH SCROLL ---------- */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var t = this.getAttribute('href');
      if (t && t !== '#' && document.querySelector(t)) {
        e.preventDefault();
        document.querySelector(t).scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  /* ---------- LIVE CRYPTO TICKER ---------- */
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

  /* ---------- CALCULATOR ---------- */
  (function calc() {
    var aEl = document.getElementById('calcAmount');
    var cEl = document.getElementById('calcCurrency');
    var oEl = document.getElementById('calcOutput');
    var rEl = document.getElementById('calcRate');
    if (!aEl || !oEl) return;

    var rates = { EUR: 0.92, USD: 1, SEK: 10.45, NOK: 10.5, GBP: 0.79 };
    var prices = { BTC: 84000, ETH: 3200, SOL: 180 };
    var currentCoin = 'BTC';

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
    var defaultBtn = picker.querySelector('[data-coin="BTC"]');
    if (defaultBtn) {
      defaultBtn.style.background = 'rgba(0,229,255,.15)';
      defaultBtn.style.color = '#00e5ff';
      defaultBtn.style.borderColor = 'rgba(0,229,255,.4)';
    }
    var calcEl = aEl.closest('.calc') || aEl.parentNode;
    if (calcEl && calcEl.parentNode) calcEl.parentNode.insertBefore(picker, calcEl);

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

  /* ---------- FOMO NOTIFICATIONS ---------- */
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

  /* ---------- HOTKEYS ---------- */
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

  /* ---------- THREAT COUNTER ---------- */
  (function threatCounter() {
    var el = document.getElementById('threatCount');
    if (!el) return;
    var counter = 1247832;
    function fmt(n) { return n.toLocaleString('en-US'); }
    el.textContent = fmt(counter);
    function tick() {
      counter += Math.floor(Math.random() * 7) + 3;
      el.textContent = fmt(counter);
      setTimeout(tick, 2000 + Math.random() * 3000);
    }
    setTimeout(tick, 2500);
  })();

  /* ---------- SCROLL PROGRESS ---------- */
  (function scrollProgress() {
    var bar = document.getElementById('scrollProgress');
    if (!bar) return;
    function update() {
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      var p = max > 0 ? h.scrollTop / max : 0;
      bar.style.transform = 'scaleX(' + p + ')';
    }
    window.addEventListener('scroll', update, { passive: true });
    update();
  })();

  /* ---------- BACK TO TOP ---------- */
  (function backTop() {
    var btn = document.getElementById('backTop');
    if (!btn) return;
    function check() {
      if (window.scrollY > 600) btn.classList.add('on');
      else btn.classList.remove('on');
    }
    window.addEventListener('scroll', check, { passive: true });
    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    check();
  })();

  /* ---------- BENTO CARD MOUSE GLOW ---------- */
  document.querySelectorAll('.b').forEach(function (card) {
    card.addEventListener('mousemove', function (e) {
      var r = card.getBoundingClientRect();
      card.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
      card.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
    });
  });



  /* ---------- FORCE VIDEO AUTOPLAY ---------- */
  (function forceVideo() {
    var v = document.querySelector('.hero-video');
    if (!v) return;
    v.style.display = 'block';
    v.style.visibility = 'visible';
    v.style.opacity = '1';
    v.muted = true;
    v.playsInline = true;
    v.setAttribute('muted', '');
    v.setAttribute('playsinline', '');
    var tryPlay = function () {
      var p = v.play();
      if (p && p.catch) p.catch(function () {
        var kick = function () { v.play().catch(function(){}); };
        document.addEventListener('click', kick, { once: true });
        document.addEventListener('touchstart', kick, { once: true });
        document.addEventListener('scroll', kick, { once: true, passive: true });
      });
    };
    if (v.readyState >= 2) tryPlay();
    else v.addEventListener('loadeddata', tryPlay, { once: true });
    setTimeout(tryPlay, 800);
    setTimeout(tryPlay, 2000);
  })();

  /* ---------- LOG ---------- */
  console.log('%c[NordicCrypto] ✅ Landing v7.0 loaded', 'color:#00e5ff;font-weight:bold;font-size:13px');
  track('landing_view', { v: '6.0' });
})();
