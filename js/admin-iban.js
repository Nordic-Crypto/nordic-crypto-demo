/* NordicCrypto — admin-iban.js v1
   "Issue IBAN" window for the admin, rebuilt: loads what the client already has (IBAN, SWIFT, bank, country,
   payment reference), lets you change any of it, and shows a live preview of exactly what the client sees in
   "Add money". The payment reference can be set by hand or left on Auto (NC-XXXXXX from the e-mail, as before).
   Replaces window.adminSetIban / window.adminSaveIban. Load after app.legacy.js. */
(function () {
  'use strict';
  if (window.__ncAdmIban) return; window.__ncAdmIban = 1;
  var W = window.WORKER_URL || window.WORKER_LOGIN_URL || 'https://nordic-deposit-checker.otis-790.workers.dev';
  function tok() { try { return typeof window.getSessionToken === 'function' ? window.getSessionToken() : localStorage.getItem('session_token'); } catch (e) { return ''; } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function post(a, b) { return fetch(W + '?action=' + a, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ token: tok() }, b)) }).then(function (r) { return r.json(); }).catch(function () { return { ok: false, error: 'Connection error' }; }); }
  function autoRef(email) { var e = String(email || '').toLowerCase(), h = 5381; for (var i = 0; i < e.length; i++) h = ((h << 5) + h + e.charCodeAt(i)) >>> 0; var A = '23456789ABCDEFGHJKMNPQRSTUVWXYZ', o = ''; for (var k = 0; k < 6; k++) { o += A[h % A.length]; h = Math.floor(h / A.length) + 7 * (k + 1); } return 'NC-' + o; }
  function grp(x) { return String(x || '').replace(/\s+/g, '').toUpperCase().replace(/(.{4})/g, '$1 ').trim(); }
  function ibanOk(x) { x = String(x || '').replace(/\s+/g, '').toUpperCase(); if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(x)) return false; var r = x.slice(4) + x.slice(0, 4), n = ''; for (var i = 0; i < r.length; i++) { var c = r.charCodeAt(i); n += c >= 65 ? String(c - 55) : r[i]; } var m = 0; for (var j = 0; j < n.length; j++) m = (m * 10 + +n[j]) % 97; return m === 1; }
  var REF = /^[A-Z0-9][A-Z0-9 \-\/]{2,23}$/;

  function css() {
    if (document.getElementById('aibCss')) return; var s = document.createElement('style'); s.id = 'aibCss';
    s.textContent =
'#aib{position:fixed;inset:0;z-index:999999;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(2,5,8,.72);backdrop-filter:blur(6px);font-family:inherit;color:#e7edf5}' +
'#aib .w{width:100%;max-width:820px;max-height:calc(100vh - 36px);overflow:auto;border-radius:24px;background:linear-gradient(180deg,#141b1f,#0b1013);border:1px solid rgba(255,255,255,.09);box-shadow:0 40px 100px rgba(0,0,0,.6)}' +
'#aib .hd{display:flex;align-items:center;gap:12px;padding:20px 22px 14px;border-bottom:1px solid rgba(255,255,255,.06)}#aib .hd .ic{width:40px;height:40px;border-radius:13px;display:grid;place-items:center;background:linear-gradient(140deg,#a3fbe3,#45cfa8);color:#03251b}#aib .hd b{display:block;font-size:17px}#aib .hd small{color:#8b95a5;font-size:12.5px}#aib .hd .x{margin-left:auto;width:34px;height:34px;border-radius:11px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);color:#c6d2ce;cursor:pointer;font-size:18px;line-height:1}' +
'#aib .bd{display:grid;grid-template-columns:1fr 1fr;gap:20px;padding:18px 22px 22px}@media(max-width:760px){#aib .bd{grid-template-columns:1fr}}' +
'#aib label{display:block;color:#8b95a5;font-size:11px;letter-spacing:.06em;text-transform:uppercase;margin:12px 0 6px}#aib label:first-child{margin-top:0}' +
'#aib .in{position:relative}#aib input{width:100%;box-sizing:border-box;height:44px;padding:0 14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:12px;color:#e7edf5;font:inherit;font-size:14px;outline:none;transition:border-color .15s,box-shadow .15s}#aib input:focus{border-color:rgba(98,232,194,.6);box-shadow:0 0 0 4px rgba(98,232,194,.1)}#aib input.m{font-family:ui-monospace,Menlo,monospace;letter-spacing:.04em}#aib input.bad{border-color:#ff6b7a}' +
'#aib .st{position:absolute;right:12px;top:50%;transform:translateY(-50%);font-size:11px;font-weight:700}#aib .st.ok{color:#62e8c2}#aib .st.no{color:#ffb4bf}' +
'#aib .two{display:grid;grid-template-columns:1fr 100px;gap:10px}' +
'#aib .ref{display:flex;gap:8px}#aib .ref input{flex:1}#aib .ref button{flex:none;height:44px;padding:0 14px;border-radius:12px;border:1px solid rgba(98,232,194,.35);background:rgba(98,232,194,.1);color:#62e8c2;font:inherit;font-weight:700;font-size:13px;cursor:pointer}#aib .ref button.on{background:#62e8c2;color:#03251b}' +
'#aib .hint{font-size:11.5px;color:#7b8a85;margin-top:6px;line-height:1.45}' +
'#aib .pv{border-radius:20px;padding:16px;background:linear-gradient(135deg,#123129,#0c1a17 55%,#16130a);border:1px solid rgba(98,232,194,.2)}#aib .pv h4{margin:0 0 10px;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#8fb3a7}' +
'#aib .pv .r{display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-top:1px solid rgba(255,255,255,.07);font-size:13px}#aib .pv .r:first-of-type{border-top:0}#aib .pv .r span{color:#86968f}#aib .pv .r b{text-align:right;font-weight:600;overflow-wrap:anywhere}#aib .pv .r b.m{font-family:ui-monospace,Menlo,monospace}' +
'#aib .pv .rf{margin-top:12px;padding:11px 12px;border-radius:14px;background:rgba(255,194,74,.08);border:1px solid rgba(255,194,74,.25)}#aib .pv .rf small{display:block;color:#ffc24a;font-weight:700;font-size:11.5px}#aib .pv .rf b{display:block;font:800 19px/1.3 ui-monospace,Menlo,monospace;letter-spacing:.08em;margin-top:3px}' +
'#aib .note{margin-top:12px;font-size:12px;color:#93a39e;line-height:1.5}' +
'#aib .err{display:none;margin:0 22px;padding:9px 12px;border-radius:10px;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);color:#f87171;font-size:12.5px}' +
'#aib .ft{display:flex;gap:10px;padding:0 22px 22px;margin-top:4px}#aib .ft button{flex:1;height:48px;border-radius:14px;font:inherit;font-weight:700;font-size:14px;cursor:pointer;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);color:#c6d2ce}#aib .ft .p{border:0;background:linear-gradient(135deg,#a6fbe2,#45cfa8);color:#03251b}#aib .ft .p[disabled]{opacity:.6;cursor:wait}' +
'#aib .ld{padding:40px;text-align:center;color:#8b95a5}';
    document.head.appendChild(s);
  }

  window.adminSetIban = function (email) {
    if (!email) return; css();
    var old = document.getElementById('aib'); if (old) old.remove();
    var old2 = document.getElementById('adminIbanModal'); if (old2) old2.remove();
    var m = document.createElement('div'); m.id = 'aib'; m.setAttribute('data-nci18n', 'off');
    m.innerHTML = '<div class="w"><div class="ld">Loading client…</div></div>';
    document.body.appendChild(m);
    m.addEventListener('click', function (e) { if (e.target === m) m.remove(); });
    post('getUserState', { email: email }).then(function (st) {
      var u = Object.assign({}, (st && st.user) || {}); if (!u.name) u.name = (st && st.card && (st.card.name || st.card.holder)) || (st && st.profile && st.profile.name) || '';
      render(m, email, u, (st && st.ok === false) ? st.error : '');
    });
  };
  window.adminSaveIban = function (email) { var b = document.querySelector('#aib .p'); if (b) b.click(); else window.adminSetIban(email); };

  function render(m, email, u, loadErr) {
    var auto = autoRef(email), ref = u.depositRef || '', isAuto = !ref;
    m.innerHTML = '<div class="w"><div class="hd"><span class="ic"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10h16L12 4zM6 10v7m4-7v7m4-7v7m4-7v7M4 20h16"/></svg></span><div><b>' + (u.iban ? 'Client bank details' : 'Issue IBAN') + '</b><small>' + esc(email) + (u.ibanCreatedAt ? ' · issued ' + new Date(u.ibanCreatedAt).toLocaleDateString('en-GB') : '') + '</small></div><button type="button" class="x" data-a="x" aria-label="Close">×</button></div>' +
      '<div class="bd"><div>' +
      '<label for="aibIban">IBAN</label><div class="in"><input id="aibIban" class="m" placeholder="SE45 5000 0000 0583 9825 7466" value="' + esc(grp(u.iban || '')) + '" autocomplete="off"><span class="st" id="aibIs"></span></div>' +
      '<div class="two"><div><label for="aibSwift">SWIFT / BIC</label><input id="aibSwift" class="m" value="' + esc(u.swift || 'ESSESESSXXX') + '" autocomplete="off"></div><div><label for="aibCc">Country</label><input id="aibCc" maxlength="2" value="' + esc(u.country || 'SE') + '" autocomplete="off"></div></div>' +
      '<label for="aibBank">Bank name</label><input id="aibBank" value="' + esc(u.bank || 'NordicCrypto Bank AB') + '" autocomplete="off">' +
      '<label for="aibRef">Payment reference</label><div class="ref"><input id="aibRef" class="m" maxlength="24" placeholder="' + esc(auto) + '" value="' + esc(ref) + '" autocomplete="off"><button type="button" data-a="auto" class="' + (isAuto ? 'on' : '') + '">Auto</button></div>' +
      '<div class="hint">The client must put this reference in their bank transfer so you can match the payment. Leave it empty (Auto) to use <b>' + esc(auto) + '</b>. 3–24 characters: letters, digits, space, - or /.</div>' +
      '</div><div><div class="pv"><h4>What the client sees</h4>' +
      '<div class="r"><span>Beneficiary</span><b id="aibPn">' + esc(u.name || 'Client name') + '</b></div><div class="r"><span>IBAN</span><b class="m" id="aibPi">—</b></div><div class="r"><span>BIC / SWIFT</span><b class="m" id="aibPs">—</b></div><div class="r"><span>Bank</span><b id="aibPb">—</b></div>' +
      '<div class="rf"><small>Reference — add it to the transfer</small><b id="aibPr">—</b></div></div>' +
      '<div class="note">Saving sends the client a notification. The reference also appears on deposit requests, so you can find the payment in the Deposits queue.</div></div></div>' +
      '<div class="err" id="aibErr"' + (loadErr ? ' style="display:block"' : '') + '>' + esc(loadErr ? 'Could not load the client: ' + loadErr : '') + '</div>' +
      '<div class="ft"><button type="button" data-a="x">Cancel</button><button type="button" class="p" data-a="save">' + (u.iban ? 'Save changes' : 'Issue IBAN') + '</button></div></div>';
    var $ = function (id) { return document.getElementById(id); };
    function sync() {
      var ib = $('aibIban').value, ok = ibanOk(ib), r = $('aibRef').value.trim().toUpperCase();
      $('aibIs').textContent = ib.replace(/\s/g, '').length < 5 ? '' : ok ? '✓ valid' : 'check digits';
      $('aibIs').className = 'st ' + (ok ? 'ok' : 'no');
      $('aibPi').textContent = grp(ib) || '—'; $('aibPs').textContent = $('aibSwift').value.trim().toUpperCase() || '—'; $('aibPb').textContent = $('aibBank').value.trim() || '—';
      $('aibPr').textContent = r || auto; m.querySelector('[data-a="auto"]').classList.toggle('on', !r);
      $('aibRef').classList.toggle('bad', !!r && !REF.test(r));
    }
    m.addEventListener('input', function (e) { if (e.target.id === 'aibIban') { var p = e.target.selectionStart, before = e.target.value.length; e.target.value = grp(e.target.value); try { e.target.setSelectionRange(p + (e.target.value.length - before), p + (e.target.value.length - before)); } catch (x) { } } if (e.target.id === 'aibRef' || e.target.id === 'aibSwift' || e.target.id === 'aibCc') e.target.value = e.target.value.toUpperCase(); sync(); });
    m.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('[data-a]'); if (!a) return; var k = a.getAttribute('data-a');
      if (k === 'x') return m.remove();
      if (k === 'auto') { $('aibRef').value = ''; sync(); return; }
      if (k === 'save') save(a);
    });
    function err(t) { var e = $('aibErr'); e.textContent = t; e.style.display = t ? 'block' : 'none'; }
    function save(btn) {
      var iban = $('aibIban').value.replace(/\s/g, '').toUpperCase(), ref = $('aibRef').value.trim().toUpperCase().replace(/\s+/g, ' ');
      if (iban.length < 15) return err('Enter a valid IBAN (at least 15 characters).');
      if (ref && !REF.test(ref)) return err('Reference: 3–24 characters, letters, digits, space, - or /.');
      if (!ibanOk(iban) && !confirm('The IBAN check digits do not match. Save it anyway?')) return;
      err(''); btn.disabled = true; btn.textContent = 'Saving…';
      post('setIban', { email: email, iban: iban, swift: $('aibSwift').value.trim(), bank: $('aibBank').value.trim(), country: $('aibCc').value.trim(), reference: ref }).then(function (d) {
        if (d && d.ok) { if (typeof window.toast === 'function') window.toast('✓ Bank details saved'); m.remove(); if (typeof window.loadAdminUsers === 'function') try { window.loadAdminUsers(); } catch (x) { } }
        else { err((d && d.error) || 'Failed'); btn.disabled = false; btn.textContent = 'Save changes'; }
      });
    }
    sync(); setTimeout(function () { try { $('aibIban').focus(); } catch (x) { } }, 60);
    document.addEventListener('keydown', function esc2(e) { if (e.key === 'Escape' && document.getElementById('aib')) { m.remove(); document.removeEventListener('keydown', esc2); } });
  }
})();
