/* receipt-sender-admin.js v1 — owner sets the "Sender" details printed on transfer confirmations (System section).
   Only the owner sees it. Whatever is left empty is printed as "Not provided"; nothing is invented. */
(function () {
  'use strict';
  if (window.__rsAdmin) return; window.__rsAdmin = 1;
  var BASE = window.WORKER_LOGIN_URL || window.WORKER_URL || 'https://nordic-deposit-checker.otis-790.workers.dev';
  var F = [['name', 'Account holder name', 'e.g. your company legal name'], ['bank', 'Bank name', ''], ['iban', 'IBAN / account number', ''], ['swift', 'SWIFT / BIC', ''], ['country', 'Country', 'e.g. Sweden'], ['address', 'Address (optional)', '']];
  function tok() { return typeof window.getSessionToken === 'function' ? window.getSessionToken() : localStorage.getItem('session_token'); }
  function post(a, b) { return fetch(BASE + '?action=' + a, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ token: tok() }, b || {})) }).then(function (r) { return r.json(); }).catch(function () { return { ok: false }; }); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var st = document.createElement('style');
  st.textContent = '.rsa{margin:0 0 20px;padding:18px 20px;border-radius:16px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.03)}.rsa h3{margin:0 0 4px;font-size:16px}.rsa p{margin:0 0 14px;color:#8b95a5;font-size:13px}.rsa-g{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px}.rsa label{display:block;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#8b95a5;margin-bottom:5px}.rsa input{width:100%;box-sizing:border-box;height:40px;padding:0 12px;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);color:inherit;font:inherit;font-size:14px}.rsa input:focus{outline:0;border-color:#62e8c2}.rsa button{margin-top:14px;height:40px;padding:0 18px;border:0;border-radius:10px;background:#62e8c2;color:#10180a;font:inherit;font-weight:700;cursor:pointer}.rsa-m{display:inline-block;margin-left:12px;font-size:13px;color:#8b95a5}html[data-theme="light"] .rsa{background:#fff;border-color:rgba(15,23,42,.14)}html[data-theme="light"] .rsa input{background:#f6f8f2;border-color:rgba(15,23,42,.14)}';
  document.head.appendChild(st);
  var done = false;
  function build(sec, v) {
    var c = document.createElement('div'); c.className = 'rsa'; c.id = 'rsaCard';
    c.innerHTML = '<h3>Sender details on transfer confirmations</h3><p>Printed in the “From” block of the PDF a client downloads for a payout. Enter the real account the money is sent from. Empty fields are printed as “Not provided”.</p><div class="rsa-g">' +
      F.map(function (f) { return '<div><label for="rsa_' + f[0] + '">' + f[1] + '</label><input id="rsa_' + f[0] + '" maxlength="120" placeholder="' + esc(f[2]) + '" value="' + esc(v[f[0]]) + '" autocomplete="off"></div>'; }).join('') + '</div><button type="button">Save</button><span class="rsa-m"></span>';
    c.querySelector('button').onclick = function () {
      var o = {}; F.forEach(function (f) { o[f[0]] = document.getElementById('rsa_' + f[0]).value; });
      var m = c.querySelector('.rsa-m'); m.textContent = 'Saving…';
      post('setReceiptSender', { sender: o }).then(function (r) { m.textContent = r && r.ok ? 'Saved ✓' : ((r && r.error) || 'Could not save'); });
    };
    sec.insertBefore(c, sec.firstChild);
  }
  function tick() {
    if (done) return; var sec = document.querySelector('#adminPanel [data-section="system"]'); if (!sec || document.getElementById('rsaCard')) return;
    var n = document.querySelector('#adminPanel .admin-nav-item[data-tab="team"]'); if (!n) return;      // owner only
    done = true; post('getReceiptSender').then(function (r) { if (r && r.ok) build(sec, r.sender || {}); else done = false; });
  }
  setInterval(tick, 2000);
})();
