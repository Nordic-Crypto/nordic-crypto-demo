/* ============================================================
   NORDIC CRYPTO — LANDING v2.0
   ============================================================ */
(function(){
  'use strict';

  // 🔴 Редирект если уже залогинен
  if (localStorage.getItem('session_token') && localStorage.getItem('user_email')) {
    window.location.replace('index.html');
    return;
  }

  var WORKER_URL = 'https://nordic-deposit-checker.otis-790.workers.dev';

  // 1. HEADER SCROLL
    // 1. HEADER SCROLL — с throttle через requestAnimationFrame
  var header = document.querySelector('.header');
  var _ticking = false;
  var _lastScrolled = false;
  function updateHeader(){
    var shouldScroll = window.scrollY > 40;
    if (shouldScroll !== _lastScrolled){
      _lastScrolled = shouldScroll;
      header.classList.toggle('scrolled', shouldScroll);
    }
    _ticking = false;
  }
  window.addEventListener('scroll', function(){
    if (!_ticking) {
      requestAnimationFrame(updateHeader);
      _ticking = true;
    }
  }, { passive: true });

    // 2. CURSOR GLOW — только на больших экранах, отключаем на слабых
  var cursorGlow = document.getElementById('cursorGlow');
  var isDesktop = window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 1024px)').matches;
  if (cursorGlow && isDesktop) {
    var mouseX = 0, mouseY = 0, glowX = 0, glowY = 0;
    document.addEventListener('mousemove', function(e){
      mouseX = e.clientX; mouseY = e.clientY;
    }, { passive: true });
    (function animateGlow(){
      glowX += (mouseX - glowX) * 0.15;
      glowY += (mouseY - glowY) * 0.15;
      cursorGlow.style.transform = 'translate(' + glowX + 'px, ' + glowY + 'px) translate(-50%, -50%)';
      requestAnimationFrame(animateGlow);
    })();
  } else if (cursorGlow) {
    cursorGlow.style.display = 'none';
  }

  // 3. SCROLL REVEAL
  var revealEls = document.querySelectorAll('.anim-up, .anim-left, .anim-right');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if (entry.isIntersecting){
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
    revealEls.forEach(function(el){ io.observe(el); });
  } else {
    revealEls.forEach(function(el){ el.classList.add('in'); });
  }

  // 4. COUNT-UP
  function animateCount(el){
    var target = parseFloat(el.getAttribute('data-count'));
    var decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
    var prefix = el.getAttribute('data-prefix') || '';
    var suffix = el.getAttribute('data-suffix') || '';
    var duration = 1800;
    var startTime = null;
    function step(ts){
      if (!startTime) startTime = ts;
      var p = Math.min((ts - startTime) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      var value = (target * eased).toFixed(decimals);
      el.textContent = prefix + value + suffix;
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = prefix + target.toFixed(decimals) + suffix;
    }
    requestAnimationFrame(step);
  }
  var statBlocks = document.querySelectorAll('.stat-value[data-count]');
  if ('IntersectionObserver' in window) {
    var statIO = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if (entry.isIntersecting){
          animateCount(entry.target);
          statIO.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });
    statBlocks.forEach(function(el){ statIO.observe(el); });
  } else {
    statBlocks.forEach(function(el){ animateCount(el); });
  }

  // 5. 3D TILT
  var heroCard = document.getElementById('heroCard');
  if (heroCard && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    var wrap = heroCard.parentElement;
    wrap.addEventListener('mousemove', function(e){
      var rect = wrap.getBoundingClientRect();
      var x = e.clientX - rect.left - rect.width / 2;
      var y = e.clientY - rect.top - rect.height / 2;
      var rotX = -(y / rect.height) * 14;
      var rotY = (x / rect.width) * 14;
      heroCard.style.animation = 'none';
      heroCard.style.transform = 'perspective(1400px) rotateX(' + rotX + 'deg) rotateY(' + rotY + 'deg) scale(1.02)';
    });
    wrap.addEventListener('mouseleave', function(){
      heroCard.style.animation = '';
      heroCard.style.transform = '';
    });
  }

  // 6. MODALS
  function openModal(id){
    document.querySelectorAll('.modal-overlay').forEach(function(m){ m.classList.remove('on'); });
    var el = document.getElementById(id);
    if (el) el.classList.add('on');
    document.body.style.overflow = 'hidden';
  }
  function closeModal(){
    document.querySelectorAll('.modal-overlay').forEach(function(m){ m.classList.remove('on'); });
    document.body.style.overflow = '';
  }
  document.querySelectorAll('[data-modal]').forEach(function(btn){
    btn.addEventListener('click', function(e){
      e.preventDefault();
      openModal(this.getAttribute('data-modal'));
    });
  });
  document.querySelectorAll('[data-close]').forEach(function(btn){
    btn.addEventListener('click', closeModal);
  });
  document.querySelectorAll('.modal-overlay').forEach(function(overlay){
    overlay.addEventListener('click', function(e){ if (e.target === overlay) closeModal(); });
  });
  document.querySelectorAll('[data-switch]').forEach(function(a){
    a.addEventListener('click', function(e){
      e.preventDefault();
      openModal(this.getAttribute('data-switch'));
    });
  });
  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape') closeModal();
  });
  document.querySelectorAll('[data-alert]').forEach(function(a){
    a.addEventListener('click', function(e){
      e.preventDefault();
      alert(this.getAttribute('data-alert'));
    });
  });

  // 7. LOGIN
  function showErr(id, msg){
    var el = document.getElementById(id);
    if (el){ el.textContent = msg; el.style.display = 'block'; }
  }
  function hideErr(id){
    var el = document.getElementById(id);
    if (el) el.style.display = 'none';
  }

  var loginBtn = document.getElementById('loginSubmit');
  if (loginBtn) loginBtn.onclick = async function(){
    var email = (document.getElementById('loginEmail').value || '').trim().toLowerCase();
    var password = document.getElementById('loginPassword').value || '';
    hideErr('loginError');
    if (!email || !password){ showErr('loginError', 'Please fill all fields'); return; }
    loginBtn.disabled = true;
    loginBtn.textContent = 'Signing in...';
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
        loginBtn.disabled = false;
        loginBtn.textContent = 'Sign in →';
      }
    } catch(e){
      showErr('loginError', 'Connection error');
      loginBtn.disabled = false;
      loginBtn.textContent = 'Sign in →';
    }
  };
  ['loginEmail','loginPassword'].forEach(function(id){
    var el = document.getElementById(id);
    if (el) el.addEventListener('keydown', function(e){ if (e.key === 'Enter') loginBtn.click(); });
  });

    // 8. REGISTER
  document.querySelectorAll('.acc-type-btn').forEach(function(btn){
    btn.addEventListener('click', function(){
      document.querySelectorAll('.acc-type-btn').forEach(function(b){ b.classList.remove('on'); });
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

    regBtn.disabled = true;
    regBtn.textContent = 'Creating...';

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
        regBtn.disabled = false;
        regBtn.textContent = 'Create account →';
      }
    } catch(e){
      showErr('registerError', 'Connection error');
      regBtn.disabled = false;
      regBtn.textContent = 'Create account →';
    }
  };
  ['regName','regEmail','regPassword','regConfirm'].forEach(function(id){
    var el = document.getElementById(id);
    if (el) el.addEventListener('keydown', function(e){ if (e.key === 'Enter') regBtn.click(); });
  });

  // 9. SMOOTH SCROLL
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click', function(e){
      var target = this.getAttribute('href');
      if (target && target !== '#' && document.querySelector(target)){
        e.preventDefault();
        document.querySelector(target).scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // 10. LIVE CRYPTO TICKER
  (function loadTicker(){
    var map = { BTC: 'tkBTC', ETH: 'tkETH', SOL: 'tkSOL' };
    if (!document.getElementById('tkBTC')) return;

    async function update(){
      try {
        var r = await fetch(WORKER_URL + '?action=multiPrices');
        var d = await r.json();
        if (!d || !d.ok || !d.coins) return;
        d.coins.forEach(function(c){
          var priceEl = document.getElementById(map[c.symbol]);
          if (!priceEl) return;
          priceEl.textContent = '$' + Number(c.usd).toLocaleString('en-US', { maximumFractionDigits: 2 });
          var chgEl = document.getElementById(map[c.symbol] + 'chg');
          if (chgEl){
            var up = c.change24h >= 0;
            chgEl.textContent = (up ? '▲ +' : '▼ ') + Math.abs(c.change24h).toFixed(2) + '%';
            chgEl.className = 'ticker-change ' + (up ? 'up' : 'down');
          }
        });
      } catch(e){}
    }
    update();
    setInterval(update, 30000);
  })();

  // 11. CALCULATOR
  (function calc(){
    var amountEl = document.getElementById('calcAmount');
    var currEl = document.getElementById('calcCurrency');
    var outEl = document.getElementById('calcOutput');
    var rateEl = document.getElementById('calcRate');
    if (!amountEl) return;

    var rates = { EUR: 0.92, USD: 1, SEK: 10.45, NOK: 10.5, GBP: 0.79 };
    var btcPrice = 84000;
    var ethPrice = 3200;

    async function loadPrices(){
      try {
        var r = await fetch(WORKER_URL + '?action=multiPrices');
        var d = await r.json();
        if (d && d.ok && d.coins) {
          d.coins.forEach(function(c){
            if (c.symbol === 'BTC') btcPrice = c.usd;
            if (c.symbol === 'ETH') ethPrice = c.usd;
          });
        }
      } catch(e){}
      update();
    }

    function update(){
      var amount = parseFloat(amountEl.value) || 0;
      var cur = currEl.value;
      var usd = amount / (rates[cur] || 1);
      var btc = usd / btcPrice;
      var eth = usd / ethPrice;
      var showBtc = btc >= 0.001;
      outEl.textContent = showBtc ? btc.toFixed(6) + ' BTC' : eth.toFixed(6) + ' ETH';
      rateEl.textContent = showBtc
        ? '1 BTC = $' + btcPrice.toLocaleString('en-US', { maximumFractionDigits: 0 })
        : '1 ETH = $' + ethPrice.toLocaleString('en-US', { maximumFractionDigits: 0 });
    }

    amountEl.addEventListener('input', update);
    currEl.addEventListener('change', update);
    loadPrices();
    setInterval(loadPrices, 60000);
  })();

  // 12. FOMO NOTIFICATIONS
  (function fomo(){
    var events = [
      { name: 'Eva L.', city: 'Stockholm', action: 'deposited', amount: '€1,200' },
      { name: 'Ole K.', city: 'Oslo', action: 'withdrew', amount: '$250' },
      { name: 'Sara M.', city: 'Copenhagen', action: 'opened IBAN', amount: '' },
      { name: 'Henrik B.', city: 'Helsinki', action: 'bought', amount: '0.05 BTC' },
      { name: 'Astrid N.', city: 'Bergen', action: 'exchanged', amount: '$800' },
      { name: 'Magnus S.', city: 'Aarhus', action: 'deposited', amount: '€3,400' },
      { name: 'Ingrid T.', city: 'Reykjavik', action: 'ordered card', amount: '' }
    ];
    function show(){
      var ev = events[Math.floor(Math.random() * events.length)];
      var div = document.createElement('div');
      div.className = 'fomo-toast';
      div.innerHTML =
        '<div class="fomo-avatar">' + ev.name.charAt(0) + '</div>' +
        '<div class="fomo-body">' +
          '<div class="fomo-text"><b>' + ev.name + '</b> from ' + ev.city + ' just ' + ev.action +
            (ev.amount ? ' <span class="fomo-amount">' + ev.amount + '</span>' : '') + '</div>' +
          '<div class="fomo-time">' + Math.floor(Math.random() * 5 + 1) + ' min ago</div>' +
        '</div>';
      document.body.appendChild(div);
      setTimeout(function(){ div.classList.add('on'); }, 50);
      setTimeout(function(){
        div.classList.remove('on');
        setTimeout(function(){ div.remove(); }, 400);
      }, 5000);
    }
    setTimeout(function(){ show(); setInterval(show, 14000); }, 8000);
  })();

  console.log('%c[NordicCrypto] ✅ Landing v2.0 loaded', 'color:#00e5ff;font-weight:bold;font-size:13px');
})();
