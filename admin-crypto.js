/* admin-crypto.js v1 — "Adjust Balance" window gets a currency switch: USD, Bitcoin or Ethereum.
   Crypto goes through the worker action creditCrypto and shows up in the client's BTC / ETH holdings, history and notifications. */
(function () {
  'use strict';
  if (window.__acCrypto) return; window.__acCrypto = 1;
  var BASE = window.WORKER_LOGIN_URL || window.WORKER_URL || 'https://nordic-deposit-checker.otis-790.workers.dev';
  function $(id) { return document.getElementById(id); }
  function toast(m, w) { try { if (typeof window.toast === 'function') window.toast(m, w); } catch (e) { } }
  function token() { return typeof window.getSessionToken === 'function' ? window.getSessionToken() : localStorage.getItem('session_token'); }
  var busy = false;

  function setup() {
    var mask = $('adminBalanceMask'); if (!mask || $('adminBalanceCoin')) return;
    var amt = $('adminBalanceAmount'); if (!amt) return;
    var fg = amt.closest('.fg'); if (!fg) return;
    var w = document.createElement('div'); w.className = 'fg';
    w.innerHTML = '<label>Currency</label><select class="fc" id="adminBalanceCoin"><option value="USD">$ US dollar</option><option value="BTC">₿ Bitcoin (BTC)</option><option value="ETH">Ξ Ethereum (ETH)</option></select>';
    fg.parentNode.insertBefore(w, fg);
    var sel = $('adminBalanceCoin');
    sel.addEventListener('change', function () { sync(); var t = $('adminBalanceType'); if (t && sel.value !== 'USD') t.value = 'crypto'; });
    /* every time the window opens, start with USD again */
    new MutationObserver(function () { if (mask.classList.contains('on') && !mask.__ac) { mask.__ac = 1; sel.value = 'USD'; sync(); } else if (!mask.classList.contains('on')) mask.__ac = 0; }).observe(mask, { attributes: true, attributeFilter: ['class'] });
    sync();
  }
  function sync() {
    var sel = $('adminBalanceCoin'), amt = $('adminBalanceAmount'), ty = $('adminBalanceType'); if (!sel || !amt) return;
    var c = sel.value;
    amt.placeholder = c === 'USD' ? '100 or -50' : c === 'BTC' ? '0.05 or -0.01  (in BTC)' : '1.5 or -0.2  (in ETH)';
    amt.step = c === 'USD' ? '0.01' : '0.00000001';
    if (ty) {
      var opts = ty.options, keep = { bonus: 1, crypto: 1, correction: 1 };
      for (var i = 0; i < opts.length; i++) { var ok = c === 'USD' || keep[opts[i].value]; opts[i].hidden = !ok; opts[i].disabled = !ok; }
      if (c !== 'USD' && !keep[ty.value]) ty.value = 'crypto';
    }
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('#adminBalanceSave'); if (!b) return;
    var sel = $('adminBalanceCoin'); if (!sel || sel.value === 'USD') return;       // USD keeps the normal flow
    e.preventDefault(); e.stopImmediatePropagation();
    if (busy) return;
    var sym = sel.value, n = Number(($('adminBalanceAmount') || {}).value), email = window.adminTargetEmail || (typeof adminTargetEmail !== 'undefined' ? adminTargetEmail : '');
    if (!email) { toast('No client selected', true); return; }
    if (!isFinite(n) || n === 0) { toast('Enter a valid amount', true); return; }
    var ty = ($('adminBalanceType') || {}).value, src = ($('adminBalanceSource') || {}).value === 'real' ? 'real' : 'admin';
    var LBL = { bonus: 'Bonus', crypto: 'Crypto deposit', correction: 'Correction' };
    var note = (($('adminBalanceNote') || {}).value || '').trim(), lab = LBL[ty] || 'Crypto deposit';
    busy = true; b.disabled = true;
    fetch(BASE + '?action=creditCrypto', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: token(), email: email, symbol: sym, amount: n, source: src, note: note && note.toLowerCase() !== lab.toLowerCase() ? lab + ' — ' + note : lab }) })
      .then(function (r) { return r.json(); }).catch(function () { return { ok: false, error: 'Connection error' }; })
      .then(function (r) {
        busy = false; b.disabled = false;
        if (!r || !r.ok) { toast((r && r.error) || 'Could not update', true); return; }
        toast('✓ ' + (n > 0 ? '+' : '') + n + ' ' + sym + ' · now ' + r.newBalance + ' ' + sym);
        try { if (typeof ncCloseMask === 'function') ncCloseMask('adminBalanceMask'); } catch (x) { }
        try { if (window.adminViewingEmail === email && typeof refreshBalanceFromServer === 'function') refreshBalanceFromServer(); } catch (x) { }
        try { if (typeof loadAdminUsers === 'function') loadAdminUsers(); } catch (x) { }
      });
  }, true);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup); else setup();
  setTimeout(setup, 1500);
})();
