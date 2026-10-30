/* withdraw-crypto.js v1.0 — crypto withdrawals: amount in USD / EUR / coin, live conversion, address check, animation.
   Loads AFTER withdraw-flow.js. IBAN / card withdrawals keep using the original flow. Needs worker >= 6.4.0 for clean details. */
(function () {
  'use strict';
  if (window.__ncWdCrypto) return; window.__ncWdCrypto = 1;
  var WORKER = 'https://nordic-deposit-checker.otis-790.workers.dev';
  var cur = 'USD'; // amount currency: USD | EUR | COIN

  function $(id) { return document.getElementById(id); }
  function S() { return window.st || {}; }
  function coin() { return ($('wdCryptoCoin') || {}).value || 'USDT'; }
  function priceUsd(c) { var s = S(); if (c === 'ETH') return s.ethP || 0; if (c === 'BTC') return s.btcP || 0; return 1; }
  function locCode() { var c = String(S().currency || 'USD').toUpperCase(); return c === 'USD' ? 'EUR' : c; }   // client's own currency (EUR by default for USD users)
  function locRate() { var s = S(), m = { EUR: s.eurR || 0.92, SEK: s.sekR || 10.45, NOK: s.nokR || 10.5, DKK: s.dkkR || 6.9, GBP: s.gbpR || 0.79, CAD: s.cadR || 1.38 }; return m[locCode()] || 1; }   // 1 USD = locRate units
  function dp(c) { return (c === 'ETH' || c === 'BTC') ? 8 : 2; }
  function nf(n, d) { return Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }); }
  function toUsd(v) {
    if (cur === 'LOC') return v / locRate();
    if (cur === 'COIN') return v * priceUsd(coin());
    return v;
  }
  function fromUsd(u, to) {
    if (to === 'LOC') return u * locRate();
    if (to === 'COIN') { var p = priceUsd(coin()); return p ? u / p : 0; }
    return u;
  }
  function round2(x) { return Math.round(x * 100) / 100; }

  /* ---------- styles ---------- */
  var css = document.createElement('style');
  css.textContent =
    '.ncw-seg{display:flex;gap:6px;margin:6px 0 10px}.ncw-seg button{flex:1;padding:10px 6px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:#cbd5e1;font:600 13px system-ui;cursor:pointer;transition:.15s}' +
    '.ncw-seg button.on{background:linear-gradient(135deg,#8b5cf6,#38bdf8);color:#05070a;border-color:transparent}' +
    '.ncw-recv{margin:4px 0 12px;padding:14px;border-radius:14px;background:linear-gradient(135deg,rgba(139,92,246,.14),rgba(56,189,248,.12));border:1px solid rgba(255,255,255,.08)}' +
    '.ncw-recv small{display:block;color:#94a3b8;font:500 12px system-ui}.ncw-recv b{display:block;margin:4px 0 2px;font:800 22px ui-monospace,Menlo,monospace;color:#47dcff;word-break:break-all}' +
    '.ncw-max{background:none;border:0;color:#c8ff3d;font:600 12px system-ui;cursor:pointer;padding:0;margin-left:8px}' +
    '.ncw-ov{position:fixed;inset:0;z-index:100001;background:rgba(3,6,12,.82);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:16px;animation:ncwIn .25s ease}' +
    '@keyframes ncwIn{from{opacity:0}to{opacity:1}}' +
    '.ncw-card{width:100%;max-width:380px;background:#12161d;color:#fff;border:1px solid rgba(255,255,255,.08);border-radius:22px;padding:28px 24px;text-align:center;font-family:system-ui}' +
    '.ncw-card h3{margin:18px 0 6px;font-size:19px}.ncw-card p{margin:0;color:#94a3b8;font-size:13.5px;line-height:1.45}' +
    '.ncw-swap{display:flex;align-items:center;justify-content:center;gap:14px;height:84px}' +
    '.ncw-coin{width:64px;height:64px;border-radius:50%;display:flex;align-items:center;justify-content:center;font:800 15px system-ui;color:#05070a}' +
    '.ncw-arrow{width:46px;height:2px;background:linear-gradient(90deg,#8b5cf6,#38bdf8);position:relative;overflow:visible}' +
    '.ncw-arrow:after{content:"";position:absolute;top:-4px;left:0;width:10px;height:10px;border-radius:50%;background:#c8ff3d;box-shadow:0 0 12px #c8ff3d;animation:ncwDot 1s linear infinite}' +
    '@keyframes ncwDot{from{left:0}to{left:36px}}' +
    '.ncw-coin.a{background:linear-gradient(135deg,#34d399,#10b981);animation:ncwPulse 1.4s ease-in-out infinite}.ncw-coin.b{background:linear-gradient(135deg,#8b5cf6,#38bdf8);animation:ncwPulse 1.4s ease-in-out .35s infinite}' +
    '@keyframes ncwPulse{50%{transform:scale(1.1)}}' +
    '.ncw-steps{margin:20px 0 4px;text-align:left}.ncw-st{display:flex;align-items:center;gap:12px;padding:8px 0;color:#64748b;font-size:13.5px;transition:.3s}' +
    '.ncw-st i{width:22px;height:22px;border-radius:50%;border:2px solid rgba(255,255,255,.15);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-style:normal;font-size:12px;transition:.3s}' +
    '.ncw-st.act{color:#fff}.ncw-st.act i{border-color:#47dcff;border-top-color:transparent;animation:ncwSpin .8s linear infinite}' +
    '.ncw-st.done{color:#cbd5e1}.ncw-st.done i{background:#10b981;border-color:#10b981;color:#05070a;animation:none}' +
    '@keyframes ncwSpin{to{transform:rotate(360deg)}}' +
    '.ncw-ok{width:76px;height:76px;margin:0 auto;border-radius:50%;background:rgba(16,185,129,.15);display:flex;align-items:center;justify-content:center;animation:ncwPop .5s cubic-bezier(.2,1.4,.4,1)}' +
    '@keyframes ncwPop{from{transform:scale(.3);opacity:0}to{transform:scale(1);opacity:1}}' +
    '.ncw-ok svg{width:38px;height:38px;stroke:#10b981;stroke-width:3;fill:none;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:40;stroke-dashoffset:40;animation:ncwDraw .5s .25s forwards}' +
    '@keyframes ncwDraw{to{stroke-dashoffset:0}}' +
    '.ncw-sum{margin:18px 0 6px;border-radius:14px;background:rgba(255,255,255,.04);padding:6px 14px;text-align:left}' +
    '.ncw-sum div{display:flex;justify-content:space-between;gap:14px;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.06);font-size:13px}.ncw-sum div:last-child{border:0}' +
    '.ncw-sum span{color:#94a3b8}.ncw-sum b{text-align:right;word-break:break-all}' +
    '.ncw-btn{display:block;width:100%;margin-top:16px;padding:14px;border:0;border-radius:12px;font:700 15px system-ui;cursor:pointer;background:linear-gradient(135deg,#8b5cf6,#38bdf8);color:#05070a}' +
    '.ncw-err{width:76px;height:76px;margin:0 auto;border-radius:50%;background:rgba(255,84,112,.15);display:flex;align-items:center;justify-content:center;font-size:34px;color:#ff5470}';
  document.head.appendChild(css);

  /* ---------- form enhancement ---------- */
  function updatePreview() {
    var box = $('ncwRecv'), inp = $('wdAmount'); if (!box || !inp) return;
    var c = coin(), v = parseFloat(inp.value) || 0, u = round2(toUsd(v));
    var rcv = fromUsd(u, 'COIN');
    var rate = priceUsd(c);
    box.innerHTML = '<small>' + (v > 0 ? 'You will receive ≈' : 'Enter amount to see conversion') + '</small>' +
      '<b>' + (v > 0 ? nf(rcv, dp(c)) + ' ' + c : '— ' + c) + '</b>' +
      '<small>' + (v > 0 ? 'Debited from balance: $' + nf(u, 2) + (cur === 'LOC' ? ' (' + nf(v, 2) + ' ' + locCode() + ')' : '') + ' · ' : '') +
      (c === 'USDT' || c === 'USDC' ? '1 ' + c + ' = $1.00' : '1 ' + c + ' = $' + nf(rate, 2) + ' (' + nf(rate * locRate(), 2) + ' ' + locCode() + ')') + '</small>';
  }
  function setCur(x) {
    cur = x;
    var seg = $('ncwSeg'); if (seg) [].forEach.call(seg.children, function (b) { b.classList.toggle('on', b.dataset.c === x); });
    var inp = $('wdAmount'); if (inp) { inp.placeholder = '0.00 ' + (x === 'COIN' ? coin() : x === 'LOC' ? locCode() : x); inp.step = x === 'COIN' && dp(coin()) === 8 ? '0.0001' : '0.01'; }
    updatePreview();
  }
  function syncCoinButton() { var g = $('ncwSeg'); if (!g) return; var b = g.querySelector('[data-c=COIN]'); if (b) b.textContent = coin(); var l = g.querySelector('[data-c=LOC]'); if (l) l.textContent = locCode(); }
  function enhance() {
    var f = $('wdFieldsCrypto'); if (!f || $('ncwSeg')) return;
    var wrap = document.createElement('div');
    wrap.innerHTML = '<label class="wd-label">Amount in <button type="button" class="ncw-max" id="ncwMax">Max</button></label>' +
      '<div class="ncw-seg" id="ncwSeg"><button type="button" data-c="USD" class="on">USD</button><button type="button" data-c="LOC">EUR</button><button type="button" data-c="COIN">ETH</button></div>' +
      '<div class="ncw-recv" id="ncwRecv"></div>';
    f.insertBefore(wrap, f.firstChild);
    $('ncwSeg').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) setCur(b.dataset.c); });
    $('ncwMax').addEventListener('click', function () {
      var pend = (S().withdrawals || []).filter(function (w) { return w.status === 'pending'; }).reduce(function (a, w) { return a + (Number(w.amount) || 0); }, 0);
      var avail = Math.max(0, (S().usd || 0) - pend), v = fromUsd(avail, cur);
      $('wdAmount').value = cur === 'COIN' ? v.toFixed(dp(coin())) : (Math.floor(v * 100) / 100).toFixed(2);
      updatePreview();
    });
    var amt = $('wdAmount'); if (amt) amt.addEventListener('input', function () { if ($('wdMethod').value === 'crypto') updatePreview(); });
    var cs = $('wdCryptoCoin');
    if (cs) cs.addEventListener('change', function () {
      var c = cs.value, n = $('wdCryptoNetwork');
      if (n) { if (c === 'ETH' && n.value !== 'ERC20' && n.value !== 'BEP20') n.value = 'ERC20'; if (c === 'BTC') n.value = 'BTC'; }
      syncCoinButton(); setCur(cur);
    });
    // default: ETH, as most clients withdraw to Ethereum
    if (cs && cs.value !== 'ETH') { cs.value = 'ETH'; var n0 = $('wdCryptoNetwork'); if (n0) n0.value = 'ERC20'; }
    syncCoinButton(); setCur('USD');
  }
  function tick() {
    var m = $('wdMethod'), isC = m && m.value === 'crypto';
    enhance(); syncCoinButton();
    var seg = $('ncwSeg'); if (seg) {
      if (!isC && cur !== 'USD') { cur = 'USD'; var inp = $('wdAmount'); if (inp) inp.placeholder = '0.00'; [].forEach.call(seg.children, function (b) { b.classList.toggle('on', b.dataset.c === 'USD'); }); }
    }
    if (isC) updatePreview();
  }
  setInterval(tick, 400);

  /* ---------- address validation ---------- */
  function addrOk(addr, net) {
    if (net === 'ERC20' || net === 'BEP20') return /^0x[0-9a-fA-F]{40}$/.test(addr);
    if (net === 'TRC20') return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(addr);
    if (net === 'BTC') return /^(bc1[0-9a-z]{25,60}|[13][1-9A-HJ-NP-Za-km-z]{25,34})$/.test(addr);
    return addr.length >= 10;
  }
  var NETN = { ERC20: 'Ethereum (ERC-20)', TRC20: 'Tron (TRC-20)', BEP20: 'BNB Chain (BEP-20)', BTC: 'Bitcoin', SOL: 'Solana', TON: 'TON' };

  /* ---------- overlay ---------- */
  var ov;
  function overlay(html) { if (!ov) { ov = document.createElement('div'); ov.className = 'ncw-ov'; document.body.appendChild(ov); } ov.innerHTML = '<div class="ncw-card">' + html + '</div>'; return ov; }
  function closeOv() { if (ov) { ov.remove(); ov = null; } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function short(a) { return a.length > 18 ? a.slice(0, 8) + '…' + a.slice(-6) : a; }
  function setStep(i, state) {
    var el = document.querySelector('[data-ncws="' + i + '"]'); if (!el) return;
    el.className = 'ncw-st ' + state; el.firstChild.textContent = state === 'done' ? '✓' : '';
  }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function submitCrypto() {
    var errEl = $('wdError');
    function showErr(m) { if (errEl) { errEl.textContent = m; errEl.style.display = 'block'; } }
    if (errEl) errEl.style.display = 'none';
    var v = parseFloat($('wdAmount').value) || 0, c = coin(), net = $('wdCryptoNetwork').value;
    var usd = round2(toUsd(v));
    var addr = ($('wdCryptoAddress').value || '').trim(), memo = (($('wdCryptoMemo') || {}).value || '').trim();
    var dest = ($('wdCryptoDest') || {}).value || 'external';
    if (!(v > 0) || usd < 1) return showErr('Minimum withdrawal is $1.00');
    if (usd > (S().usd || 0)) return showErr('Amount exceeds available balance');
    if (!addrOk(addr, net)) return showErr('Wallet address does not match the ' + (NETN[net] || net) + ' network. Check the address and network.');
    var rate = priceUsd(c), coinAmt = rate ? Math.floor(usd / rate * Math.pow(10, dp(c))) / Math.pow(10, dp(c)) : 0;
    var token = localStorage.getItem('session_token');
    if (!token) return showErr('Session expired. Please sign in again.');
    var details = { destination: dest, network: net, coin: c, address: addr, memo: memo, coinAmount: coinAmt.toFixed(dp(c)), rate: round2(rate), inputCurrency: cur === 'COIN' ? c : cur === 'LOC' ? locCode() : cur, inputAmount: String(v), localRate: Math.round(locRate() * 10000) / 10000 };

    overlay('<div class="ncw-swap"><div class="ncw-coin a">USD</div><div class="ncw-arrow"></div><div class="ncw-coin b">' + esc(c) + '</div></div>' +
      '<h3>Processing withdrawal</h3><p>$' + nf(usd, 2) + ' → ≈ ' + nf(coinAmt, dp(c)) + ' ' + esc(c) + '</p>' +
      '<div class="ncw-steps">' +
      '<div class="ncw-st act" data-ncws="0"><i></i>Converting USD to ' + esc(c) + '</div>' +
      '<div class="ncw-st" data-ncws="1"><i></i>Checking address ' + esc(short(addr)) + '</div>' +
      '<div class="ncw-st" data-ncws="2"><i></i>Sending to compliance review</div></div>');

    var req = fetch(WORKER + '?action=withdraw', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: token, amount: usd, method: 'crypto', details: details }) })
      .then(function (r) { return r.json(); }).catch(function () { return { ok: false, error: 'Connection error. Please try again.' }; });

    Promise.all([req, sleep(1300).then(function () { setStep(0, 'done'); setStep(1, 'act'); return sleep(1200); }).then(function () { setStep(1, 'done'); setStep(2, 'act'); return sleep(1100); })])
      .then(function (res) {
        var d = res[0];
        if (!d || !d.ok) {
          overlay('<div class="ncw-err">!</div><h3>Withdrawal failed</h3><p>' + esc((d && d.error) || 'Something went wrong') + '</p><button class="ncw-btn" id="ncwBack">Back</button>');
          $('ncwBack').onclick = closeOv; return;
        }
        setStep(2, 'done');
        var s = S(); if (!s.withdrawals) s.withdrawals = [];
        if (d.withdrawal && !s.withdrawals.some(function (w) { return w.id === d.withdrawal.id; })) s.withdrawals.unshift(d.withdrawal);
        try { if (typeof window.closeWithdraw === 'function') window.closeWithdraw(); if (typeof window.render === 'function') window.render(); } catch (e) {}
        return sleep(450).then(function () {
          overlay('<div class="ncw-ok"><svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg></div><h3>Request submitted</h3><p>Your withdrawal is under review. We will notify you once it is sent.</p>' +
            '<div class="ncw-sum"><div><span>Debited</span><b>$' + nf(usd, 2) + '</b></div><div><span>You receive</span><b>≈ ' + nf(coinAmt, dp(c)) + ' ' + esc(c) + '</b></div>' +
            '<div><span>Network</span><b>' + esc(NETN[net] || net) + '</b></div><div><span>To</span><b>' + esc(short(addr)) + '</b></div><div><span>Status</span><b style="color:#fbbf24">Under review</b></div></div>' +
            '<button class="ncw-btn" id="ncwDone">Done</button>');
          $('ncwDone').onclick = closeOv;
        });
      });
  }

  var orig;
  function mine() {
    var m = $('wdMethod');
    if (m && m.value === 'crypto') return submitCrypto();
    return typeof orig === 'function' ? orig.apply(this, arguments) : undefined;
  }
  function install() { if (window.submitWithdraw !== mine) { orig = window.submitWithdraw; window.submitWithdraw = mine; } }
  install(); setInterval(install, 1500);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && ov && ov.querySelector('#ncwDone,#ncwBack')) closeOv(); });
})();
