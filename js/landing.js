/* ============================================================
   NORDIC CRYPTO — LANDING v3.0
   ============================================================ */
(function(){
  'use strict';

  // Редирект если уже залогинен
  if (localStorage.getItem('session_token') && localStorage.getItem('user_email')) {
    window.location.replace('index.html');
    return;
  }

  var WORKER_URL = 'https://nordic-deposit-checker.otis-790.workers.dev';

  // 1. HEADER SCROLL (rAF throttle)
  var header = document.querySelector('.header');
  var _ticking = false, _lastScrolled = false;
  function updateHeader(){
    var s = window.scrollY > 40;
    if (s !== _lastScrolled){ _lastScrolled = s; header.classList.toggle('scrolled', s); }
    _ticking = false;
  }
  window.addEventListener('scroll', function(){
    if (!_ticking){ requestAnimationFrame(updateHeader); _ticking = true; }
  }, { passive: true });

  // 2. SCROLL REVEAL
  var revealEls = document.querySelectorAll('.anim-up, .anim-left, .anim-right');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if (e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -50px 0px' });
    revealEls.forEach(function(el){ io.observe(el); });
  } else {
    revealEls.forEach(function(el){ el.classList.add('in'); });
  }

  // 3. COUNT-UP
  function animateCount(el){
    var target = parseFloat(el.getAttribute('data-count'));
    var dec = parseInt(el.getAttribute('data-decimals') || '0', 10);
    var pre = el.getAttribute('data-prefix') || '';
    var suf = el.getAttribute('data-suffix') || '';
    var dur = 1600, start = null;
    function step(ts){
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
    var sio = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if (e.isIntersecting){ animateCount(e.target); sio.unobserve(e.target); }
      });
    }, { threshold: 0.4 });
    stats.forEach(function(el){ sio.observe(el); });
  } else {
    stats.forEach(function(el){ animateCount(el); });
  }

  // 4. MODALS
  function openModal(id){
    document.querySelectorAll('.modal').forEach(function(m){ m.classList.remove('on'); });
    var el = document.getElementById(id);
    if (el) el.classList.add('on');
    document.body.style.overflow = 'hidden';
  }
  function closeModal(){
    document.querySelectorAll('.modal').forEach(function(m){ m.classList.remove('on'); });
    document.body.style.overflow = '';
  }
  document.querySelectorAll('[data-modal]').forEach(function(b){
    b.addEventListener('click', function(e){ e.preventDefault(); openModal(this.getAttribute('data-modal')); });
  });
  document.querySelectorAll('[data-close]').forEach(function(b){ b.addEventListener('click', closeModal); });
  document.querySelectorAll('.modal').forEach(function(m){
    m.addEventListener('click', function(e){ if (e.target === m) closeModal(); });
  });
  document.querySelectorAll('[data-switch]').forEach(function(a){
    a.addEventListener('click', function(e){ e.preventDefault(); openModal(this.getAttribute('data-switch')); });
  });
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape') closeModal(); });
  document.querySelectorAll('[data-alert]').forEach(function(a){
    a.addEventListener('click', function(e){ e.preventDefault(); alert(this.getAttribute('data-alert')); });
  });

  // 5. LOGIN
  function showErr(id, msg){ var el = document.getElementById(id); if (el){ el.textContent = msg; el.style.display = 'block'; } }
  function hideErr(id){ var el = document.getElementById(id); if (el) el.style.display = 'none'; }

  var loginBtn = document.getElementById('loginSubmit');
  if (loginBtn) loginBtn.onclick = async function(){
    var email = (document.getElementById('loginEmail').value || '').trim().toLowerCase();
    var password = document.getElementById('loginPassword').value || '';
    hideErr('loginError');
    if (!email || !password){ showErr('loginError', 'Please fill all fields'); return; }
    loginBtn.disabled = true; loginBtn.textContent = 'Signing in...';
    try {
      var r = await fetch(WORKER_URL + '?action=login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, password: password })
      });
      var d = await r.json();
      if (d.ok && d.token){
        localStorage.setItem('session_token', d.token);
        localStorage.setItem('user_email', d.user.email);
        localStorage.setItem('user_role', d.user.role || 'user');
        localStorage.setItem('user_name', d.user.name || 'User');
        window.location.replace('index.html');
      } else {
        showErr('loginError', d.error || 'Login failed');
        loginBtn.disabled = false; loginBtn.textContent = 'Sign in →';
      }
    } catch(e){
      showErr('loginError', 'Connection error');
      loginBtn.disabled = false; loginBtn.textContent = 'Sign in →';
    }
  };
  ['loginEmail','loginPassword'].forEach(function(id){
    var el = document.getElementById(id);
    if (el) el.addEventListener('keydown', function(e){ if (e.key === 'Enter') loginBtn.click(); });
  });

  // 6. REGISTER
  document.querySelectorAll('.acc').forEach(function(btn){
    btn.addEventListener('click', function(){
      document.querySelectorAll('.acc').forEach(function(b){ b.classList.remove('on'); });
      this.classList.add('on');
      document.getElementById('regAccType').value = this.getAttribute('data-acc');
    });
  });

  var regBtn = document.getElementById('registerSubmit');
  if (regBtn) regBtn.onclick = async function(){
    var name = (document.getElementById('regName').value || '').trim();
    var email = (document.getElementById('regEmail').value || '').trim().toLowerCase();
    var password = document.getElementById('regPassword').value || '';
    var confirm = document.getElementById('regConfirm').value || '';
    var accountType = document.getElementById('regAccType').value || 'banking';
    hideErr('registerError');
    if (!name){ showErr('registerError', 'Please enter your name'); return; }
    if (!email || email.indexOf('@') === -1){ showErr('registerError', 'Enter valid email'); return; }
    if (password.length < 6){ showErr('registerError', 'Password must be at least 6 characters'); return; }
    if (password !== confirm){ showErr('registerError', 'Passwords do not match'); return; }
    regBtn.disabled = true; regBtn.textContent = 'Creating...';
    try {
      var r = await fetch(WORKER_URL + '?action=register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name, email: email, password: password, accountType: accountType })
      });
      var d = await r.json();
      if (d.ok && d.token){
        localStorage.setItem('session_token', d.token);
        localStorage.setItem('user_email', d.user.email);
        localStorage.setItem('user_role', d.user.role || 'user');
        localStorage.setItem('user_name', d.user.name || name);
        localStorage.setItem('user_account_type', accountType);
        window.location.replace('index.html');
      } else {
        showErr('registerError', d.error || 'Registration failed');
        regBtn.disabled = false; regBtn.textContent = 'Create account →';
      }
    } catch(e){
      showErr('registerError', 'Connection error');
      regBtn.disabled = false; regBtn.textContent = 'Create account →';
    }
  };
  ['regName','regEmail','regPassword','regConfirm'].forEach(function(id){
    var el = document.getElementById(id);
    if (el) el.addEventListener('keydown', function(e){ if (e.key === 'Enter') regBtn.click(); });
  });

  // 7. SMOOTH SCROLL
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click', function(e){
      var t = this.getAttribute('href');
      if (t && t !== '#' && document.querySelector(t)){
        e.preventDefault();
        document.querySelector(t).scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // 8. LIVE CRYPTO TICKER
  (function ticker(){
    var map = { BTC: 'tkBTC', ETH: 'tkETH', SOL: 'tkSOL' };
    if (!document.getElementById('tkBTC')) return;
    async function update(){
      try {
        var r = await fetch(WORKER_URL + '?action=multiPrices');
        var d = await r.json();
        if (!d || !d.ok || !d.coins) return;
        d.coins.forEach(function(c){
          var pEl = document.getElementById(map[c.symbol]);
          if (!pEl) return;
          pEl.textContent = '$' + Number(c.usd).toLocaleString('en-US', { maximumFractionDigits: 2 });
          var chEl = document.getElementById(map[c.symbol] + 'chg');
          if (chEl){
            var up = c.change24h >= 0;
            chEl.textContent = (up ? '▲ +' : '▼ ') + Math.abs(c.change24h).toFixed(2) + '%';
            chEl.className = 'chg ' + (up ? 'up' : 'down');
          }
        });
      } catch(e){}
    }
    update();
    setInterval(update, 30000);
  })();

  // 9. CALCULATOR
  (function calc(){
    var aEl = document.getElementById('calcAmount');
    var cEl = document.getElementById('calcCurrency');
    var oEl = document.getElementById('calcOutput');
    var rEl = document.getElementById('calcRate');
    if (!aEl) return;
    var rates = { EUR: 0.92, USD: 1, SEK: 10.45, NOK: 10.5, GBP: 0.79 };
    var btcPrice = 84000, ethPrice = 3200;
    async function loadPrices(){
      try {
        var r = await fetch(WORKER_URL + '?action=multiPrices');
        var d = await r.json();
        if (d && d.ok && d.coins){
          d.coins.forEach(function(c){
            if (c.symbol === 'BTC') btcPrice = c.usd;
            if (c.symbol === 'ETH') ethPrice = c.usd;
          });
        }
      } catch(e){}
      update();
    }
    function update(){
      var amount = parseFloat(aEl.value) || 0;
      var usd = amount / (rates[cEl.value] || 1);
      var btc = usd / btcPrice;
      var eth = usd / ethPrice;
      var showBtc = btc >= 0.001;
      oEl.textContent = showBtc ? btc.toFixed(6) + ' BTC' : eth.toFixed(6) + ' ETH';
      rEl.textContent = showBtc
        ? '1 BTC = $' + btcPrice.toLocaleString('en-US', { maximumFractionDigits: 0 })
        : '1 ETH = $' + ethPrice.toLocaleString('en-US', { maximumFractionDigits: 0 });
    }
    aEl.addEventListener('input', update);
    cEl.addEventListener('change', update);
    loadPrices();
    setInterval(loadPrices, 60000);
  })();

  // 10. FOMO NOTIFICATIONS (только desktop)
  (function fomo(){
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || window.innerWidth < 900) return;
    var events = [
      { name: 'Eva L.', city: 'Stockholm', action: 'deposited', amount: '€1,200' },
      { name: 'Ole K.', city: 'Oslo', action: 'withdrew', amount: '$250' },
      { name: 'Sara M.', city: 'Copenhagen', action: 'opened IBAN', amount: '' },
      { name: 'Henrik B.', city: 'Helsinki', action: 'bought', amount: '0.05 BTC' },
      { name: 'Astrid N.', city: 'Bergen', action: 'exchanged', amount: '$800' },
      { name: 'Magnus S.', city: 'Aarhus', action: 'deposited', amount: '€3,400' }
    ];
    function show(){
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
      requestAnimationFrame(function(){ div.classList.add('on'); });
      setTimeout(function(){
        div.classList.remove('on');
        setTimeout(function(){ div.remove(); }, 400);
      }, 5000);
    }
    setTimeout(function(){ show(); setInterval(show, 18000); }, 10000);
  })();

  console.log('%c[NordicCrypto] ✅ Landing v3.0 loaded', 'color:#00e5ff;font-weight:bold;font-size:13px');
})();
/* FOMO TOAST */
.fomo-toast { position: fixed; bottom: 24px; left: 24px; z-index: 900; display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: rgba(13,19,31,.95); border: 1px solid var(--bd-2); border-radius: 14px; box-shadow: 0 20px 50px -10px rgba(0,0,0,.8); max-width: 340px; opacity: 0; transform: translateY(20px); transition: all .4s cubic-bezier(.34,1.56,.64,1); pointer-events: none; }
.fomo-toast.on { opacity: 1; transform: translateY(0); }
.fomo-avatar { width: 38px; height: 38px; border-radius: 10px; background: linear-gradient(135deg, var(--pri), var(--pri-2)); display: flex; align-items: center; justify-content: center; font-weight: 800; color: #04121a; flex-shrink: 0; }
.fomo-text { font-size: .82rem; line-height: 1.35; color: var(--txt); }
.fomo-text b { color: #fff; font-weight: 700; }
.fomo-amount { color: var(--pri); font-weight: 700; font-family: 'JetBrains Mono', monospace; }
.fomo-time { font-size: .68rem; color: var(--mut-2); margin-top: 3px; }
