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

  // ============================================================
  // 1. HEADER SCROLL EFFECT
  // ============================================================
  var header = document.querySelector('.header');
  var lastScroll = 0;
  window.addEventListener('scroll', function(){
    var y = window.scrollY;
    if (y > 40) header.classList.add('scrolled');
    else header.classList.remove('scrolled');
    lastScroll = y;
  }, { passive: true });

  // ============================================================
  // 2. CURSOR GLOW
  // ============================================================
  var cursorGlow = document.getElementById('cursorGlow');
  if (cursorGlow && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    var mouseX = 0, mouseY = 0, glowX = 0, glowY = 0;
    document.addEventListener('mousemove', function(e){
      mouseX = e.clientX;
      mouseY = e.clientY;
    });
    (function animateGlow(){
      glowX += (mouseX - glowX) * 0.12;
      glowY += (mouseY - glowY) * 0.12;
      cursorGlow.style.left = glowX + 'px';
      cursorGlow.style.top = glowY + 'px';
      requestAnimationFrame(animateGlow);
    })();
  }

  // ============================================================
  // 3. SCROLL REVEAL (Intersection Observer)
  // ============================================================
  var revealEls = document.querySelectorAll('.anim-up, .anim-left, .anim-right');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
    revealEls.forEach(function(el){ io.observe(el); });
  } else {
    revealEls.forEach(function(el){ el.classList.add('in'); });
  }

  // ============================================================
  // 4. COUNT-UP NUMBERS
  // ============================================================
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
        if (entry.isIntersecting) {
          animateCount(entry.target);
          statIO.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });
    statBlocks.forEach(function(el){ statIO.observe(el); });
  } else {
    statBlocks.forEach(function(el){ animateCount(el); });
  }

  // ============================================================
  // 5. 3D TILT (hero card)
  // ============================================================
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

  // ============================================================
  // 6. MODALS
  // ============================================================
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

  // ============================================================
  // 7. LOGIN
  // ============================================================
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

  // ============================================================
  // 8. REGISTER
  // ============================================================
  var regBtn = document.getElementById('registerSubmit');
  if (regBtn) regBtn.onclick = async function(){
    var name = (document.getElementById('regName').value || '').trim();
    var email = (document.getElementById('regEmail').value || '').trim().toLowerCase();
    var password = document.getElementById('regPassword').value || '';
    var confirm = document.getElementById('regConfirm').value || '';

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
        body: JSON.stringify({ name: name, email: email, password: password })
      });
      var d = await r.json();
      if (d.ok && d.token){
        localStorage.setItem('session_token', d.token);
        localStorage.setItem('user_email', d.user.email);
        localStorage.setItem('user_role', d.user.role || 'user');
        localStorage.setItem('user_name', d.user.name || name);
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

  // ============================================================
  // 9. SMOOTH SCROLL (nav links)
  // ============================================================
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click', function(e){
      var target = this.getAttribute('href');
      if (target && target !== '#' && document.querySelector(target)){
        e.preventDefault();
        document.querySelector(target).scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  console.log('%c[NordicCrypto] ✅ Landing v2.0 loaded', 'color:#00e5ff;font-weight:bold;font-size:13px');
})();
