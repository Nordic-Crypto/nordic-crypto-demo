/* NordicCrypto Landing — auth redirect + modal logic */
(function(){
  'use strict';

  // 🔴 КЛЮЧЕВОЕ: если уже залогинен — сразу на dashboard
  if (localStorage.getItem('session_token') && localStorage.getItem('user_email')) {
    window.location.replace('index.html');
    return;
  }

  var WORKER_URL = 'https://nordic-deposit-checker.otis-790.workers.dev';

  // Открыть/закрыть модалку
  function openModal(id) {
    document.querySelectorAll('.modal-overlay').forEach(function(m){ m.classList.remove('on'); });
    var el = document.getElementById(id);
    if (el) el.classList.add('on');
  }
  function closeModal(id) {
    var el = document.getElementById(id);
    if (el) el.classList.remove('on');
  }

  // Bind открытия
  function bindOpen(btnId, modalId) {
    var btn = document.getElementById(btnId);
    if (btn) btn.onclick = function(e){ e.preventDefault(); openModal(modalId); };
  }
  bindOpen('btnLoginTop', 'loginModal');
  bindOpen('btnRegisterTop', 'registerModal');
  bindOpen('btnHeroLogin', 'loginModal');
  bindOpen('btnHeroRegister', 'registerModal');
  bindOpen('btnBottomRegister', 'registerModal');

  // Закрытие
  document.querySelectorAll('[data-close]').forEach(function(btn){
    btn.onclick = function(){ closeModal(this.getAttribute('data-close')); };
  });
  document.querySelectorAll('.modal-overlay').forEach(function(overlay){
    overlay.onclick = function(e){ if (e.target === overlay) overlay.classList.remove('on'); };
  });

  // Переключение login ↔ register
  var switchToReg = document.getElementById('switchToRegister');
  if (switchToReg) switchToReg.onclick = function(e){ e.preventDefault(); openModal('registerModal'); };
  var switchToLogin = document.getElementById('switchToLogin');
  if (switchToLogin) switchToLogin.onclick = function(e){ e.preventDefault(); openModal('loginModal'); };

  // Ошибка
  function showErr(id, msg) {
    var el = document.getElementById(id);
    if (el) { el.textContent = msg; el.style.display = 'block'; }
  }
  function hideErr(id) {
    var el = document.getElementById(id);
    if (el) el.style.display = 'none';
  }

  // ===== LOGIN =====
  var loginBtn = document.getElementById('loginSubmit');
  if (loginBtn) loginBtn.onclick = async function(){
    var email = (document.getElementById('loginEmail').value || '').trim().toLowerCase();
    var password = document.getElementById('loginPassword').value || '';
    hideErr('loginError');
    if (!email || !password) { showErr('loginError', 'Please fill all fields'); return; }

    loginBtn.disabled = true;
    loginBtn.textContent = 'Signing in...';

    try {
      var r = await fetch(WORKER_URL + '?action=login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, password: password })
      });
      var d = await r.json();
      if (d.ok && d.token) {
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
    } catch (e) {
      showErr('loginError', 'Connection error');
      loginBtn.disabled = false;
      loginBtn.textContent = 'Sign in →';
    }
  };

  // Enter в login
  ['loginEmail', 'loginPassword'].forEach(function(id){
    var el = document.getElementById(id);
    if (el) el.onkeydown = function(e){ if (e.key === 'Enter') loginBtn.click(); };
  });

  // ===== REGISTER =====
  var regBtn = document.getElementById('registerSubmit');
  if (regBtn) regBtn.onclick = async function(){
    var name = (document.getElementById('regName').value || '').trim();
    var email = (document.getElementById('regEmail').value || '').trim().toLowerCase();
    var password = document.getElementById('regPassword').value || '';
    var confirm = document.getElementById('regConfirm').value || '';

    hideErr('registerError');
    if (!name) { showErr('registerError', 'Please enter your name'); return; }
    if (!email || email.indexOf('@') === -1) { showErr('registerError', 'Enter valid email'); return; }
    if (password.length < 6) { showErr('registerError', 'Password must be at least 6 characters'); return; }
    if (password !== confirm) { showErr('registerError', 'Passwords do not match'); return; }

    regBtn.disabled = true;
    regBtn.textContent = 'Creating...';

    try {
      var r = await fetch(WORKER_URL + '?action=register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name, email: email, password: password })
      });
      var d = await r.json();
      if (d.ok && d.token) {
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
    } catch (e) {
      showErr('registerError', 'Connection error');
      regBtn.disabled = false;
      regBtn.textContent = 'Create account →';
    }
  };

  // Enter в register
  ['regName', 'regEmail', 'regPassword', 'regConfirm'].forEach(function(id){
    var el = document.getElementById(id);
    if (el) el.onkeydown = function(e){ if (e.key === 'Enter') regBtn.click(); };
  });

  // Footer links
  var fp = document.getElementById('footerPrivacy');
  if (fp) fp.onclick = function(e){ e.preventDefault(); alert('Privacy Policy — demo project. No real data collected.'); };
  var ft = document.getElementById('footerTerms');
  if (ft) ft.onclick = function(e){ e.preventDefault(); alert('Terms of Service — demo project.'); };

  console.log('%c[NordicCrypto] ✅ Landing loaded', 'color:#00e5ff;font-weight:bold');
})();
