/* deposit-pro.js v1 — "Add Funds" window
   • method tiles (Bitcoin, Ethereum, SEPA, SWIFT, Card) with drawn icons (no emoji: Windows has no flag / coin glyphs)
   • bank transfer: shows the client's own Nordic account details (IBAN, BIC, bank, reference) with one-tap copy
   • card: live animated card preview, number / expiry check. The full number and the CVV are NEVER sent or stored: only brand + last 4 + holder + expiry
   • fixes the wrong "Recipient BTC address" label that appeared under bank transfer
   Crypto keeps its existing flow (address + QR). Transfer mode is untouched. */
(function () {
  'use strict';
  if (window.__ncDepPro) return; window.__ncDepPro = 1;
  var WORKER = window.WORKER_URL || window.WORKER_LOGIN_URL || 'https://nordic-deposit-checker.otis-790.workers.dev';
  function $(id) { return document.getElementById(id); }
  function S() { return window.st || {}; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function nf(n) { return Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function digits(x) { return String(x || '').replace(/\D/g, ''); }
  function isAdd() { try { return typeof mode !== 'undefined' && mode === 'add'; } catch (e) { return false; } }

  var IC = {
    BTC: '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="11" fill="#f7931a"/><path d="M9.2 7.2h3.3a2 2 0 010 4H9.2m0 0h3.7a2.1 2.1 0 010 4.2H9.2m0-8.2v8.2M10.8 5.9v1.3m0 8.2v1.3m2.2-10.8v1.3m0 8.2v1.3" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></svg>',
    ETH: '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="11" fill="#627eea"/><path d="M12 4.5l-4.2 7 4.2 2.5 4.2-2.5z" fill="#fff"/><path d="M12 15.1l-4.2-2.5 4.2 6 4.2-6z" fill="#fff" opacity=".8"/></svg>',
    SEPA: '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="11" fill="#1d4ed8"/><g fill="#ffd23f">' + (function () { var s = ''; for (var i = 0; i < 12; i++) { var a = i * Math.PI / 6; s += '<circle cx="' + (12 + 6.2 * Math.sin(a)).toFixed(2) + '" cy="' + (12 - 6.2 * Math.cos(a)).toFixed(2) + '" r="1"/>'; } return s; })() + '</g></svg>',
    SWIFT: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#47dcff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2c3 3.2 3 16.8 0 20M12 2c-3 3.2-3 16.8 0 20"/></svg>',
    CARD: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#ec4899" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19M6 15h4"/></svg>',
    COPY: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>',
    OK: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
    LOCK: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>'
  };
  var TILES = [['Bitcoin (BTC)', 'Bitcoin', 'On-chain', 'BTC', '#f7931a'], ['Ethereum (ETH)', 'Ethereum', 'On-chain', 'ETH', '#627eea'], ['Bank Transfer (SEPA)', 'SEPA', 'EUR · Europe', 'SEPA', '#3b82f6'], ['Bank Transfer (SWIFT)', 'SWIFT', 'International', 'SWIFT', '#47dcff'], ['Credit Card', 'Card', 'Visa · Mastercard', 'CARD', '#ec4899']];
  var DESC = { 'Bitcoin (BTC)': 'Send Bitcoin to the address below.', 'Ethereum (ETH)': 'Send Ethereum to the address below.', 'Bank Transfer (SEPA)': 'Transfer from your bank using your Nordic account details.', 'Bank Transfer (SWIFT)': 'Send an international transfer to your Nordic account.', 'Credit Card': 'Enter your card to request a card deposit.' };
  function isBank(m) { return m === 'Bank Transfer (SEPA)' || m === 'Bank Transfer (SWIFT)'; }
  function isCry(m) { return m === 'Bitcoin (BTC)' || m === 'Ethereum (ETH)'; }

  /* ───── styles ───── */
  var css = document.createElement('style');
  css.textContent =
    '#mask .box{max-height:92vh;overflow-y:auto;overflow-x:hidden}' +
    '#dpTiles{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:2px 0 14px}' +
    '#dpTiles button{position:relative;text-align:left;padding:10px;border-radius:13px;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.03);color:#e8f4ff;cursor:pointer;font-family:inherit;transition:transform .18s,border-color .18s,box-shadow .18s}' +
    '#dpTiles button:hover{transform:translateY(-2px);border-color:rgba(255,255,255,.28)}' +
    '#dpTiles button.on{border-color:var(--c);box-shadow:0 0 0 1px var(--c) inset,0 8px 24px -12px var(--c);background:linear-gradient(150deg,rgba(255,255,255,.08),rgba(255,255,255,.02))}' +
    '#dpTiles .i{display:block;margin-bottom:6px;height:22px}#dpTiles b{display:block;font-size:12.5px}#dpTiles small{display:block;font-size:10.5px;color:#7c9cbb;margin-top:1px}' +
    '#dpTiles button.on:after{content:"";position:absolute;right:8px;top:8px;width:8px;height:8px;border-radius:50%;background:var(--c);animation:dpPop .3s cubic-bezier(.3,1.6,.5,1)}' +
    '@keyframes dpPop{from{transform:scale(0)}to{transform:scale(1)}}@keyframes dpIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}@keyframes dpShim{to{background-position:-200% 0}}@keyframes dpSpin{to{transform:rotate(360deg)}}' +
    '#dpPanel{animation:dpIn .35s ease both;margin-bottom:72px}' +
    '.dpd-ac{position:relative;border-radius:18px;padding:16px 16px 6px;background:radial-gradient(120% 140% at 0 0,rgba(71,220,255,.18),rgba(168,85,247,.10) 55%,rgba(255,255,255,.03));border:1px solid rgba(71,220,255,.22);overflow:hidden}' +
    '.dpd-ac:before{content:"";position:absolute;inset:0;background:linear-gradient(115deg,transparent 35%,rgba(255,255,255,.07) 50%,transparent 65%);transform:translateX(-100%);animation:dpSheen 3.4s ease-in-out infinite}@keyframes dpSheen{60%,100%{transform:translateX(100%)}}' +
    '.dpd-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;position:relative}.dpd-hd b{font-size:13px;letter-spacing:.02em}.dpd-hd span{margin-left:auto;font-size:10.5px;font-weight:700;padding:3px 8px;border-radius:99px;background:rgba(52,211,153,.15);color:#34d399}' +
    '.dpd-r{position:relative;display:flex;align-items:center;gap:10px;padding:9px 0;border-top:1px solid rgba(255,255,255,.08)}.dpd-r:first-of-type{border-top:0}.dpd-r>div{flex:1;min-width:0}.dpd-r small{display:block;font-size:10px;letter-spacing:.07em;text-transform:uppercase;color:#7c9cbb}.dpd-r b{display:block;font-size:13.5px;font-weight:600;word-break:break-all;margin-top:1px}.dpd-r b.m{font-family:ui-monospace,Menlo,monospace;letter-spacing:.02em}' +
    '.dpd-cp{flex:none;width:32px;height:32px;border-radius:9px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);color:#cfe3f5;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:.2s}.dpd-cp:hover{background:rgba(71,220,255,.16);border-color:#47dcff}.dpd-cp.ok{background:#34d399;border-color:#34d399;color:#04121a;transform:scale(1.08)}' +
    '.dpd-all{width:100%;margin-top:10px;padding:11px;border-radius:12px;border:1px dashed rgba(71,220,255,.4);background:transparent;color:#47dcff;font-weight:700;font-size:13px;cursor:pointer;font-family:inherit;transition:.2s}.dpd-all:hover{background:rgba(71,220,255,.1)}.dpd-all.ok{background:#34d399;border:1px solid #34d399;color:#04121a}' +
    '.dpd-tips{margin:12px 0 0;padding:0;list-style:none;display:flex;flex-direction:column;gap:7px}.dpd-tips li{display:flex;gap:9px;font-size:12px;line-height:1.4;color:#9db4cb}.dpd-tips li:before{content:"";flex:none;width:6px;height:6px;border-radius:50%;background:#47dcff;margin-top:6px}' +
    '.dpd-wait{display:flex;gap:14px;align-items:center;padding:18px;border-radius:16px;border:1px dashed rgba(255,255,255,.18)}.dpd-wait .sp{flex:none;width:28px;height:28px;border-radius:50%;border:3px solid rgba(255,255,255,.15);border-top-color:#47dcff;animation:dpSpin .9s linear infinite}.dpd-wait b{display:block;font-size:14px}.dpd-wait span{font-size:12px;color:#8aa3bb}' +
    '.dpd-sk{height:12px;border-radius:6px;margin-top:10px;background:linear-gradient(90deg,rgba(255,255,255,.05) 25%,rgba(255,255,255,.14) 50%,rgba(255,255,255,.05) 75%);background-size:200% 100%;animation:dpShim 1.4s linear infinite}' +
    /* card preview */
    '.dpd-cv{perspective:900px;margin:2px 0 14px}.dpd-card{position:relative;height:170px;border-radius:18px;padding:18px 20px;color:#fff;background:linear-gradient(135deg,#1e293b,#0f172a 60%,#312e81);box-shadow:0 18px 40px -18px rgba(0,0,0,.8),0 0 0 1px rgba(255,255,255,.08) inset;overflow:hidden;transition:background .5s,transform .4s;transform-style:preserve-3d}' +
    '.dpd-card[data-b="visa"]{background:linear-gradient(135deg,#1a237e,#283593 55%,#3949ab)}.dpd-card[data-b="mastercard"]{background:linear-gradient(135deg,#7f1d1d,#b91c1c 50%,#f59e0b)}.dpd-card[data-b="amex"]{background:linear-gradient(135deg,#065f46,#0e7490)}' +
    '.dpd-card:after{content:"";position:absolute;right:-40px;top:-60px;width:180px;height:180px;border-radius:50%;background:rgba(255,255,255,.07)}' +
    '.dpd-chip{width:38px;height:28px;border-radius:6px;background:linear-gradient(135deg,#e7c979,#b8902f);position:relative}.dpd-chip:after{content:"";position:absolute;inset:6px 4px;border:1px solid rgba(0,0,0,.25);border-radius:3px}' +
    '.dpd-brand{position:absolute;right:20px;top:16px;font-weight:800;font-style:italic;font-size:19px;letter-spacing:.02em;opacity:.95;z-index:1}' +
    '.dpd-num{margin-top:22px;font:600 19px ui-monospace,Menlo,monospace;letter-spacing:.12em;text-shadow:0 1px 2px rgba(0,0,0,.4);position:relative;z-index:1}' +
    '.dpd-ft{position:absolute;left:20px;right:20px;bottom:16px;display:flex;justify-content:space-between;gap:10px;z-index:1}.dpd-ft small{display:block;font-size:8.5px;letter-spacing:.1em;opacity:.6}.dpd-ft b{font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.04em}' +
    '.dpd-f{position:relative}.dpd-f .fc.good{border-color:#34d399}.dpd-f .fc.bad{border-color:#ff6b6b}.dpd-f i{position:absolute;right:12px;bottom:12px;font-style:normal;color:#34d399;opacity:0;transform:scale(.4);transition:.25s}.dpd-f.ok i{opacity:1;transform:none}' +
    '.dpd-row2{display:flex;gap:10px}.dpd-row2>div{flex:1}' +
    '.dpd-safe{display:flex;gap:9px;align-items:flex-start;font-size:11.5px;line-height:1.45;color:#8aa3bb;padding:10px 12px;border-radius:12px;background:rgba(52,211,153,.07);border:1px solid rgba(52,211,153,.18)}.dpd-safe svg{flex:none;color:#34d399;margin-top:1px}' +
    /* success */
    '.dpd-done{text-align:center;padding:10px 0 4px;animation:dpIn .4s ease both}.dpd-done svg.ck{width:78px;height:78px}.dpd-done svg.ck circle{stroke-dasharray:252;stroke-dashoffset:252;animation:dpDraw .7s .05s ease forwards}.dpd-done svg.ck path{stroke-dasharray:60;stroke-dashoffset:60;animation:dpDraw .45s .6s ease forwards}@keyframes dpDraw{to{stroke-dashoffset:0}}' +
    '.dpd-done h3{margin:10px 0 4px;font-size:20px}.dpd-done .am{font-size:28px;font-weight:800;margin:6px 0 2px}.dpd-done .rc{margin:14px 0;padding:4px 14px;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);text-align:left}.dpd-done .rc div{display:flex;justify-content:space-between;gap:12px;padding:8px 0;font-size:13px;border-bottom:1px dashed rgba(255,255,255,.08)}.dpd-done .rc div:last-child{border:0}.dpd-done .rc span{color:#7c9cbb}.dpd-done .rc b{text-align:right;word-break:break-all}' +
    '@media (max-width:420px){#dpTiles{grid-template-columns:repeat(2,1fr)}}' +
    '@media (prefers-reduced-motion:reduce){#dpPanel,.dpd-ac:before,.dpd-done,.dpd-sk,.dpd-wait .sp{animation:none!important}.dpd-done svg.ck circle,.dpd-done svg.ck path{stroke-dashoffset:0!important}}';
  document.head.appendChild(css);

  /* ───── data helpers ───── */
  function refCode() {
    var e = (localStorage.getItem('user_email') || '').toLowerCase(), h = 5381; for (var i = 0; i < e.length; i++) h = ((h << 5) + h + e.charCodeAt(i)) >>> 0;
    var A = '23456789ABCDEFGHJKMNPQRSTUVWXYZ', o = ''; for (var k = 0; k < 6; k++) { o += A[h % A.length]; h = Math.floor(h / A.length) + 7 * (k + 1); } return 'NC-' + o;
  }
  var CN = { SE: 'Sweden', NO: 'Norway', DK: 'Denmark', FI: 'Finland', DE: 'Germany', FR: 'France', ES: 'Spain', IT: 'Italy', NL: 'Netherlands', GB: 'United Kingdom', US: 'United States', CA: 'Canada', AU: 'Australia', IE: 'Ireland', PL: 'Poland', LT: 'Lithuania', EE: 'Estonia', LV: 'Latvia' };
  function holderName() { var u = S().user || {}, c = S().card || {}; return u.name || localStorage.getItem('user_name') || c.name || c.holder || ''; }
  function groupIban(x) { return String(x || '').replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim(); }

  var cur = 'Bitcoin (BTC)', cardState = { brand: 'card' };

  /* ───── mount ───── */
  function mount() {
    var mask = $('mask'), sel = $('mMethod'); if (!mask || !sel) return;
    var fg = sel.closest('.fg'); if (!fg) return;
    if (!$('dpTiles')) {
      var t = document.createElement('div'); t.id = 'dpTiles';
      t.innerHTML = TILES.map(function (x) { return '<button type="button" data-m="' + esc(x[0]) + '" style="--c:' + x[4] + '"><span class="i">' + IC[x[3]] + '</span><b>' + x[1] + '</b><small>' + x[2] + '</small></button>'; }).join('');
      t.addEventListener('click', function (e) { var b = e.target.closest('[data-m]'); if (b) pick(b.getAttribute('data-m')); });
      fg.parentNode.insertBefore(t, fg);
      var p = document.createElement('div'); p.id = 'dpPanel'; p.style.display = 'none'; fg.parentNode.insertBefore(p, $('mDestWrap') || fg.nextSibling);
    }
    var on = mask.classList.contains('on') && isAdd() && !mask.querySelector('.dpd-done'), t0 = $('dpTiles');
    if (mask.querySelector('.dpd-done')) return;
    t0.style.display = on ? 'grid' : 'none'; fg.style.display = on ? 'none' : '';
    if (!on) { var pn = $('dpPanel'); if (pn) { pn.style.display = 'none'; pn.__m = ''; } var ok = $('mOk'); if (ok && ok.__dpTxt) { ok.textContent = ok.__dpTxt; ok.__dpTxt = ''; } return; }
    if (sel.value !== cur) { cur = sel.value; }
    sync();
  }
  function pick(m) {
    var sel = $('mMethod'); if (!sel) return; cur = m; sel.value = m;
    try { if (typeof window.refreshDest === 'function') window.refreshDest(); } catch (e) {}
    try { sel.dispatchEvent(new Event('change')); } catch (e) {}
    var pn = $('dpPanel'); if (pn) pn.__m = ''; sync();
  }
  function sync() {
    var pn = $('dpPanel'), t = $('dpTiles'); if (!pn || !t) return;
    [].forEach.call(t.children, function (b) { b.classList.toggle('on', b.getAttribute('data-m') === cur); });
    var d = $('mDesc'); if (d && d.textContent !== DESC[cur]) d.textContent = DESC[cur];
    var ok = $('mOk'); if (ok) { if (!ok.__dpTxt) ok.__dpTxt = ok.textContent; var tx = isBank(cur) ? 'I’m sending this transfer' : cur === 'Credit Card' ? 'Request card deposit' : ok.__dpTxt; if (ok.textContent !== tx) ok.textContent = tx; }
    if (isCry(cur)) { pn.style.display = 'none'; pn.__m = ''; return; }
    var wrap = $('mDestWrap'); if (wrap) wrap.style.display = 'none';
    [].forEach.call(document.querySelectorAll('#mask [id="mQrWrap"]'), function (q) { q.style.display = 'none'; });
    ['mTransferSepa', 'mTransferSwift', 'mTransferCard'].forEach(function (id) { var e = $(id); if (e) e.style.display = 'none'; });
    pn.style.display = 'block';
    var sig = cur + '|' + (S().user && S().user.iban || '');
    if (pn.__m !== sig) { pn.__m = sig; pn.style.animation = 'none'; void pn.offsetWidth; pn.style.animation = ''; if (isBank(cur)) bankPanel(pn); else cardPanel(pn); }
  }

  /* ───── bank ───── */
  function row(label, val, mono, copy) {
    return '<div class="dpd-r"><div><small>' + label + '</small><b class="' + (mono ? 'm' : '') + '">' + esc(val) + '</b></div>' + (copy ? '<button type="button" class="dpd-cp" data-cp="' + esc(copy) + '" title="Copy">' + IC.COPY + '</button>' : '') + '</div>';
  }
  function bankPanel(pn) {
    var u = S().user || {}, iban = u.iban;
    if (!iban) {
      pn.innerHTML = '<div class="dpd-wait"><div class="sp"></div><div><b>Your account details are being prepared</b><span>Our team is issuing your IBAN. It usually appears here soon. Write to support in the chat if it takes longer.</span></div></div><div class="dpd-sk" style="width:80%"></div><div class="dpd-sk" style="width:60%"></div>';
      return;
    }
    var ref = refCode(), name = holderName() || 'Account holder', swift = u.swift || '', bank = u.bank || '', cc = String(u.country || '').toUpperCase(), country = CN[cc] || cc;
    var all = ['Beneficiary: ' + name, 'IBAN: ' + groupIban(iban), swift ? 'BIC/SWIFT: ' + swift : '', bank ? 'Bank: ' + bank : '', country ? 'Country: ' + country : '', 'Reference: ' + ref].filter(Boolean).join('\n');
    pn.innerHTML = '<div class="dpd-ac"><div class="dpd-hd"><b>Your Nordic account</b><span>' + (cur.indexOf('SEPA') > -1 ? 'SEPA · EUR' : 'SWIFT') + '</span></div>' +
      row('Beneficiary', name, false, name) + row('IBAN', groupIban(iban), true, iban) + (swift ? row('BIC / SWIFT', swift, true, swift) : '') + (bank ? row('Bank', bank, false, bank) : '') + (country ? row('Country', country, false, '') : '') + row('Payment reference', ref, true, ref) + '</div>' +
      '<button type="button" class="dpd-all" data-cp="' + esc(all) + '">Copy all details</button>' +
      '<ul class="dpd-tips"><li><span>Send from a bank account <b>in your own name</b>.</span></li><li><span>Put the <b>payment reference</b> in the transfer description.</span></li>' + (cur.indexOf('SEPA') > -1 ? '<li><span>SEPA transfers are made in <b>euro</b>.</span></li>' : '<li><span>For international transfers your bank may charge its own fees.</span></li>') + '<li><span>Enter the amount above and tap the button below. Your balance is credited after our team confirms the payment.</span></li></ul>';
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-cp]'); if (!b || !$('dpPanel') || !$('dpPanel').contains(b)) return;
    var txt = b.getAttribute('data-cp'), done = function () { var all = b.classList.contains('dpd-all'), old = b.innerHTML; b.classList.add('ok'); b.innerHTML = all ? 'Copied ' + IC.OK : IC.OK; setTimeout(function () { b.classList.remove('ok'); b.innerHTML = old; }, 1400); };
    try { navigator.clipboard.writeText(txt).then(done, fb); } catch (x) { fb(); }
    function fb() { var a = document.createElement('textarea'); a.value = txt; a.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(a); a.select(); try { document.execCommand('copy'); done(); } catch (y) {} a.remove(); }
  });

  /* ───── card ───── */
  function brandOf(n) { return /^4/.test(n) ? 'visa' : /^(5[1-5]|2[2-7])/.test(n) ? 'mastercard' : /^3[47]/.test(n) ? 'amex' : 'card'; }
  var BR = { visa: 'VISA', mastercard: 'Mastercard', amex: 'AMEX', card: '' };
  function luhn(n) { var s = 0, d = false; for (var i = n.length - 1; i >= 0; i--) { var x = +n[i]; if (d) { x *= 2; if (x > 9) x -= 9; } s += x; d = !d; } return n.length >= 13 && s % 10 === 0; }
  function expOk(v) { var m = /^(\d{2})\/(\d{2})$/.exec(v); if (!m) return false; var mm = +m[1], yy = 2000 + +m[2], now = new Date(); return mm >= 1 && mm <= 12 && (yy > now.getFullYear() || (yy === now.getFullYear() && mm >= now.getMonth() + 1)) && yy < now.getFullYear() + 20; }
  function cardPanel(pn) {
    pn.innerHTML = '<div class="dpd-cv"><div class="dpd-card" id="dpCard" data-b="card"><div class="dpd-chip"></div><div class="dpd-brand" id="dpBr"></div><div class="dpd-num" id="dpNum">•••• •••• •••• ••••</div><div class="dpd-ft"><div><small>CARD HOLDER</small><b id="dpHn">YOUR NAME</b></div><div><small>EXPIRES</small><b id="dpEx">MM/YY</b></div></div></div></div>' +
      '<div class="fg dpd-f" id="dpFn"><label>Card number</label><input class="fc" id="dpIn" inputmode="numeric" autocomplete="cc-number" maxlength="23" placeholder="1234 5678 9012 3456"><i>' + IC.OK + '</i></div>' +
      '<div class="fg"><label>Card holder</label><input class="fc" id="dpIh" autocomplete="cc-name" maxlength="40" placeholder="As printed on the card"></div>' +
      '<div class="dpd-row2"><div class="fg dpd-f" id="dpFe"><label>Expiry</label><input class="fc" id="dpIe" inputmode="numeric" autocomplete="cc-exp" maxlength="5" placeholder="MM/YY"><i>' + IC.OK + '</i></div><div></div></div>' +
      '<div class="dpd-safe">' + IC.LOCK + '<span>We never ask for your CVV and we do not keep the full card number: only the brand, the last 4 digits, the holder and the expiry are sent with your request. Our team reviews it before crediting your balance.</span></div>';
    var n = $('dpIn'), h = $('dpIh'), x = $('dpIe');
    n.addEventListener('input', function () {
      var d = digits(n.value).slice(0, 19), b = brandOf(d); cardState.brand = b;
      n.value = (b === 'amex' ? d.replace(/^(\d{0,4})(\d{0,6})(\d{0,5}).*/, function (_, a, c, e) { return [a, c, e].filter(Boolean).join(' '); }) : d.replace(/(.{4})/g, '$1 ').trim());
      var shown = (d + '••••••••••••••••').slice(0, b === 'amex' ? 15 : 16).replace(/(.{4})/g, '$1 ').trim(); $('dpNum').textContent = shown;
      $('dpCard').setAttribute('data-b', b); $('dpBr').textContent = BR[b]; var good = luhn(d); $('dpFn').classList.toggle('ok', good); n.classList.toggle('good', good); n.classList.remove('bad');
    });
    h.addEventListener('input', function () { $('dpHn').textContent = (h.value || 'YOUR NAME').toUpperCase().slice(0, 26); h.classList.remove('bad'); });
    x.addEventListener('input', function () { var d = digits(x.value).slice(0, 4); if (d.length >= 3) d = d.slice(0, 2) + '/' + d.slice(2); else if (d.length === 2 && x.value.length > 2) d = d + '/'; x.value = d; $('dpEx').textContent = d || 'MM/YY'; var g = expOk(d); $('dpFe').classList.toggle('ok', g); x.classList.toggle('good', g); x.classList.remove('bad'); });
    if (!h.value && holderName()) { h.value = holderName(); $('dpHn').textContent = holderName().toUpperCase().slice(0, 26); }
  }

  /* ───── submit (window capture runs before tx-pro's handler) ───── */
  var busy = false;
  function err(msg, el) { if (window.toast) toast(msg, true); if (el) { el.classList.add('bad'); try { el.focus(); } catch (e) {} } }
  window.addEventListener('click', function (e) {
    var ok = e.target && e.target.closest && e.target.closest('#mOk'); if (!ok || !isAdd() || isCry(cur) || !$('dpTiles') || $('dpTiles').style.display === 'none') return;
    e.stopImmediatePropagation(); e.preventDefault(); if (busy) return;
    if (window.adminViewingEmail || localStorage.getItem('user_role') === 'admin') { if (window.toast) toast('Not available for admin accounts', true); return; }
    var a = $('mAmount'), amt = a ? Number(a.value) : 0; if (!(amt > 0)) return err('Enter an amount', a);
    var meta = {};
    if (isBank(cur)) { if (!(S().user && S().user.iban)) return err('Your account details are not ready yet. Please wait for the IBAN.'); meta.ref = refCode(); }
    else {
      var n = digits(($('dpIn') || {}).value), h = (($('dpIh') || {}).value || '').trim(), x = (($('dpIe') || {}).value || '').trim();
      if (!luhn(n)) return err('Check the card number', $('dpIn')); if (h.length < 2) return err('Enter the card holder', $('dpIh')); if (!expOk(x)) return err('Check the expiry date', $('dpIe'));
      meta = { brand: BR[brandOf(n)] || 'Card', last4: n.slice(-4), holder: h, exp: x };
    }
    var tk = typeof getSessionToken === 'function' ? getSessionToken() : localStorage.getItem('session_token'), method = cur;
    busy = true; ok.disabled = true;
    fetch(WORKER + '?action=requestDeposit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: tk, amount: amt, method: method, meta: meta }) }).then(function (r) { return r.json(); }).then(function (r) {
      busy = false; ok.disabled = false;
      if (!r || !r.ok) return err((r && r.error) || 'Could not submit the deposit');
      var w = window.st; if (w) { if (!Array.isArray(w.depositRequests)) w.depositRequests = []; w.depositRequests.unshift(r.request); }
      if (window.addNotification) try { addNotification('Deposit submitted via ' + method + ': $' + nf(amt) + ' — under review', '⏳'); } catch (x2) {}
      done(method, amt, meta, r.request);
    }).catch(function () { busy = false; ok.disabled = false; err('Connection error. Please try again.'); });
  }, true);

  function done(method, amt, meta, rq) {
    var pn = $('dpPanel'), box = document.querySelector('#mask .box'); if (!pn || !box) return;
    var col = isBank(method) ? '#47dcff' : '#ec4899', lbl = isBank(method) ? (method.indexOf('SEPA') > -1 ? 'SEPA transfer' : 'SWIFT transfer') : 'Card deposit';
    var rows = '<div><span>Method</span><b>' + lbl + '</b></div><div><span>Amount</span><b>$' + nf(amt) + '</b></div>' + (meta.last4 ? '<div><span>Card</span><b>' + esc(meta.brand) + ' •••• ' + meta.last4 + '</b></div>' : '') + (meta.ref ? '<div><span>Reference</span><b>' + esc(meta.ref) + '</b></div>' : '') + '<div><span>Status</span><b style="color:#fbbf24">Under review</b></div>';
    var keep = [].slice.call(box.children), ov = document.createElement('div'); ov.className = 'dpd-done';
    ov.innerHTML = '<svg class="ck" viewBox="0 0 84 84" fill="none"><circle cx="42" cy="42" r="40" stroke="' + col + '" stroke-width="4" transform="rotate(-90 42 42)"/><path d="M26 43l11 11 21-24" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg><h3>Request received</h3><div style="color:#9db4cb;font-size:13px">' + (isBank(method) ? 'We will credit your balance once the transfer arrives.' : 'Our team will review your card deposit.') + '</div><div class="am">$' + nf(amt) + '</div><div class="rc">' + rows + '</div><button type="button" class="btn b1" style="width:100%;justify-content:center" id="dpClose">Done</button>';
    keep.forEach(function (c) { c.style.display = 'none'; }); box.appendChild(ov);
    $('dpClose').onclick = function () { ov.remove(); keep.forEach(function (c) { c.style.display = ''; }); if (typeof closeModal === 'function') closeModal(); };
    if (typeof window.playChime === 'function') try { window.playChime(); } catch (e) {}
  }
  document.addEventListener('click', function (e) { if (e.target && e.target.closest && e.target.closest('#mCancel')) { var o = document.querySelector('#mask .dpd-done'); if (o) { o.remove(); [].forEach.call(document.querySelectorAll('#mask .box > *'), function (c) { c.style.display = ''; }); } } }, true);

  setInterval(mount, 350);
})();
