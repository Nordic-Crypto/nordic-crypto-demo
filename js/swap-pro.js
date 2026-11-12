/* swap-pro.js v1 — Exchange: swap between USD and crypto, or crypto to crypto, at the live rate.
   Replaces the "Exchange: coming soon" toast. Uses the existing server trade action (buy / sell / convert, market price set by the server).
   Works as a centered card on desktop and a bottom sheet on phones. Never changes anything until the client taps Exchange. */
(function () {
  'use strict';
  if (window.__ncSwap) return; window.__ncSwap = 1;
  var WORKER = window.WORKER_URL || window.WORKER_LOGIN_URL || 'https://nordic-deposit-checker.otis-790.workers.dev';
  function $(id) { return document.getElementById(id); }
  function S() { return window.st || {}; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  var COINS = [['BTC', 'Bitcoin', '#f7931a'], ['ETH', 'Ethereum', '#627eea'], ['USDT', 'Tether', '#26a17b'], ['SOL', 'Solana', '#9945ff'], ['BNB', 'BNB', '#f3ba2f'], ['XRP', 'XRP', '#346aa9'], ['ADA', 'Cardano', '#3468d1'], ['DOGE', 'Dogecoin', '#c2a633'], ['TRX', 'TRON', '#eb0029'], ['AVAX', 'Avalanche', '#e84142'], ['LINK', 'Chainlink', '#2a5ada'], ['DOT', 'Polkadot', '#e6007a'], ['LTC', 'Litecoin', '#a6a9aa'], ['BCH', 'Bitcoin Cash', '#8dc351'], ['XLM', 'Stellar', '#14b6e7'], ['ATOM', 'Cosmos', '#6f7390'], ['UNI', 'Uniswap', '#ff007a'], ['NEAR', 'NEAR Protocol', '#00c08b'], ['ETC', 'Ethereum Classic', '#3ab83a'], ['SHIB', 'Shiba Inu', '#e42d04'], ['SUI', 'Sui', '#4ca2ff'], ['AAVE', 'Aave', '#b6509e'], ['TON', 'Toncoin', '#0098ea'], ['APT', 'Aptos', '#2dd8a7']];
  var META = { USD: ['US Dollar', '#2f9e6a'] }; COINS.forEach(function (c) { META[c[0]] = [c[1], c[2]]; });
  var ASSETS = ['USD'].concat(COINS.map(function (c) { return c[0]; }));

  var P = { USDT: 1 }, pTs = 0, pTimer = null, tick = null;
  var Z = { from: 'USD', to: 'BTC', amt: '', busy: false, picking: null, filt: '' };

  /* ───── formatting ───── */
  function nfix(n, d) { return Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }); }
  function fmt(v, sym) {
    v = Number(v) || 0; if (sym === 'USD') return '$' + nfix(v, 2);
    var a = Math.abs(v), d = a >= 1000 ? 4 : a >= 1 ? 6 : 8; var s = v.toFixed(d).replace(/\.?0+$/, ''); var p = s.split('.'); p[0] = Number(p[0]).toLocaleString('en-US'); return p.join('.') + ' ' + sym;
  }
  function pendingUsd() { return (S().withdrawals || []).filter(function (w) { return w && w.status === 'pending'; }).reduce(function (a, w) { return a + (Number(w.amount) || 0); }, 0); }
  function bal(sym) { var s = S(); return sym === 'USD' ? Math.max(0, (Number(s.usd) || 0) - pendingUsd()) : (Number(s[sym.toLowerCase()]) || 0); }
  function price(sym) { return sym === 'USD' ? 1 : P[sym] || 0; }
  function dec(sym) { return sym === 'USD' ? 2 : 8; }
  function quote() { var a = parseFloat(Z.amt) || 0, pf = price(Z.from), pt = price(Z.to); if (!(a > 0) || !pf || !pt) return 0; return a * pf / pt; }
  function icon(sym, sz) {
    var m = META[sym] || ['', '#64748b'], t = sym === 'USD' ? '$' : sym.slice(0, sym.length > 3 ? 2 : 1);
    return '<span class="sw-ic" style="--c:' + m[1] + ';width:' + (sz || 34) + 'px;height:' + (sz || 34) + 'px;font-size:' + Math.round((sz || 34) * (sym === 'USD' ? .5 : .4)) + 'px">' + esc(t) + '</span>';
  }

  /* ───── styles ───── */
  var css = document.createElement('style');
  css.textContent =
    '.sw-ov{position:fixed;inset:0;z-index:2147482000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(3,6,11,.72);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);animation:swFade .2s ease}' +
    '@keyframes swFade{from{opacity:0}to{opacity:1}}@keyframes swUp{from{opacity:0;transform:translateY(24px) scale(.98)}to{opacity:1;transform:none}}@keyframes swSheet{from{transform:translateY(100%)}to{transform:none}}@keyframes swSpin{to{transform:rotate(360deg)}}@keyframes swPulse{70%{box-shadow:0 0 0 7px rgba(52,211,153,0)}100%{box-shadow:0 0 0 0 rgba(52,211,153,0)}}@keyframes swDraw{to{stroke-dashoffset:0}}@keyframes swPop{0%{transform:scale(.6);opacity:0}60%{transform:scale(1.08)}100%{transform:scale(1);opacity:1}}@keyframes swShim{to{background-position:-200% 0}}' +
    '.sw{position:relative;width:100%;max-width:440px;max-height:94vh;overflow-y:auto;overflow-x:hidden;border-radius:26px;padding:20px 18px 18px;color:#e9f1fa;background:radial-gradient(120% 80% at 0 0,rgba(198,255,61,.09),transparent 55%),radial-gradient(100% 70% at 100% 0,rgba(139,92,246,.12),transparent 55%),#0d121b;border:1px solid rgba(255,255,255,.09);box-shadow:0 40px 90px -30px rgba(0,0,0,.9);animation:swUp .32s cubic-bezier(.2,.9,.3,1) both;font-family:inherit;-webkit-overflow-scrolling:touch}' +
    '.sw *{box-sizing:border-box}.sw-hd{display:flex;align-items:center;gap:10px;margin-bottom:14px}.sw-hd h2{margin:0;font-size:21px;font-weight:800;letter-spacing:-.01em;flex:1;background:none;-webkit-text-fill-color:currentColor;color:#fff}' +
    '.sw-live{display:inline-flex;flex-direction:row;align-items:center;white-space:nowrap;gap:6px;font-size:11px;color:#8fa6bd;padding:5px 9px;border-radius:99px;background:rgba(255,255,255,.05)}.sw-live>span{display:inline;margin:0}.sw-live i{display:inline-block;flex:none;width:7px;height:7px;border-radius:50%;background:#34d399;box-shadow:0 0 0 0 rgba(52,211,153,.6);animation:swPulse 1.8s infinite}.sw-live.old i{background:#fbbf24;animation:none}' +
    '.sw-x{width:34px;height:34px;border-radius:50%;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);color:#cfe0f1;font-size:19px;line-height:1;cursor:pointer}.sw-x:hover{background:rgba(255,255,255,.12)}' +
    '.sw-box{padding:14px 14px 12px;border-radius:18px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);transition:border-color .2s,box-shadow .2s}.sw-box.f:focus-within{border-color:rgba(198,255,61,.55);box-shadow:0 0 0 3px rgba(198,255,61,.1)}.sw-box.bad{border-color:#ff6b6b}' +
    '.sw-lb{display:flex;justify-content:space-between;font-size:11.5px;letter-spacing:.06em;text-transform:uppercase;color:#7f95ac;margin-bottom:8px}.sw-lb button{background:none;border:0;color:#c6ff3d;font-weight:700;font-size:11.5px;cursor:pointer;letter-spacing:.02em;text-transform:none;font-family:inherit;padding:0}' +
    '.sw-row{display:flex;align-items:center;gap:10px}.sw-row input{flex:1;min-width:0;background:none!important;border:0!important;box-shadow:none!important;outline:0!important;border-radius:0!important;height:auto!important;color:#fff;font-weight:700;font-size:28px;line-height:1.15;font-family:inherit;letter-spacing:-.02em;padding:0!important;width:100%}.sw-row input::placeholder{color:#475a6f}.sw-row .out{flex:1;min-width:0;font-size:28px;font-weight:700;letter-spacing:-.02em;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.sw-row .out.dim{color:#475a6f}' +
    '.sw-as{flex:none;display:flex;align-items:center;gap:8px;padding:6px 10px 6px 6px;border-radius:99px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:#fff;font-weight:700;font-size:14px;cursor:pointer;font-family:inherit;transition:.18s}.sw-as:hover{background:rgba(255,255,255,.13);transform:translateY(-1px)}.sw-as svg{opacity:.6}' +
    '.sw-ic{display:inline-flex;align-items:center;justify-content:center;border-radius:50%;background:linear-gradient(145deg,var(--c),color-mix(in srgb,var(--c) 55%,#000));color:#fff;font-weight:800;flex:none;box-shadow:0 0 0 2px rgba(255,255,255,.08) inset}' +
    '.sw-sub{display:flex;justify-content:space-between;gap:8px;margin-top:8px;font-size:12px;color:#7f95ac;min-height:18px}.sw-chips{display:flex;gap:6px;margin-top:10px}.sw-chips button{flex:1;padding:7px 0;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.03);color:#b9cadb;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;transition:.15s}.sw-chips button:hover{border-color:#c6ff3d;color:#c6ff3d}' +
    '.sw-flip{position:relative;z-index:2;display:flex;justify-content:center;height:0;margin:0}.sw-flip button{position:relative;top:-20px;width:42px;height:42px;border-radius:50%;border:4px solid #0d121b;background:linear-gradient(145deg,#d6ff5c,#a6e22e);color:#0a1204;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:transform .45s cubic-bezier(.3,1.5,.5,1),box-shadow .2s;box-shadow:0 8px 20px -8px #c6ff3d}.sw-flip button:hover{box-shadow:0 8px 26px -4px #c6ff3d}.sw-flip button.r{transform:rotate(180deg)}' +
    '.sw-gap{height:10px}.sw-info{margin-top:12px;padding:4px 14px;border-radius:16px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06)}.sw-info div{display:flex;justify-content:space-between;gap:10px;padding:9px 0;font-size:13px;border-bottom:1px dashed rgba(255,255,255,.07)}.sw-info div:last-child{border:0}.sw-info span{color:#7f95ac}.sw-info b{font-weight:600;text-align:right}' +
    '.sw-go{width:100%;margin-top:14px;padding:16px;border-radius:16px;border:0;font-weight:800;font-size:16px;letter-spacing:.01em;cursor:pointer;font-family:inherit;color:#0a1204;background:linear-gradient(135deg,#d6ff5c,#a6e22e);box-shadow:0 14px 30px -14px #c6ff3d;transition:transform .15s,filter .2s,opacity .2s;position:relative;overflow:hidden}.sw-go:hover:not(:disabled){transform:translateY(-2px)}.sw-go:disabled{background:rgba(255,255,255,.08);color:#7f95ac;box-shadow:none;cursor:not-allowed}.sw-go.ld{pointer-events:none}.sw-go.ld:after{content:"";position:absolute;left:50%;top:50%;width:20px;height:20px;margin:-10px;border-radius:50%;border:3px solid rgba(10,18,4,.25);border-top-color:#0a1204;animation:swSpin .7s linear infinite}.sw-go.ld span{opacity:0}' +
    '.sw-err{margin-top:10px;font-size:12.5px;color:#ff8a8a;min-height:0}' +
    '.sw-rec{margin-top:16px}.sw-rec h4{margin:0 0 8px;font-size:11.5px;letter-spacing:.08em;text-transform:uppercase;color:#7f95ac;font-weight:700}.sw-rec .it{display:flex;align-items:center;gap:10px;padding:9px 0;border-top:1px solid rgba(255,255,255,.06);font-size:13px}.sw-rec .it em{font-style:normal;margin-left:auto;color:#9fb3c8;text-align:right;font-size:12.5px}' +
    '.sw-pick{position:absolute;inset:0;z-index:5;background:#0d121b;border-radius:inherit;padding:18px;display:flex;flex-direction:column;animation:swUp .25s ease both}.sw-pick h3{margin:0 0 12px;font-size:18px;background:none;-webkit-text-fill-color:currentColor;color:#fff;display:flex;align-items:center;gap:10px}.sw-pick h3 span{flex:1}.sw-pick input{width:100%;padding:12px 14px;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);color:#fff;font-size:15px;outline:0;font-family:inherit;margin-bottom:8px}.sw-pick input:focus{border-color:#c6ff3d}.sw-list{flex:1;overflow-y:auto;margin:0 -6px;padding:0 6px;-webkit-overflow-scrolling:touch}.sw-opt{display:flex;align-items:center;gap:12px;width:100%;padding:10px 8px;border-radius:12px;border:0;background:none;color:#fff;cursor:pointer;font-family:inherit;text-align:left;transition:background .15s}.sw-opt:hover,.sw-opt.on{background:rgba(255,255,255,.07)}.sw-opt b{display:block;font-size:14px}.sw-opt small{display:block;font-size:12px;color:#7f95ac}.sw-opt em{margin-left:auto;font-style:normal;text-align:right;font-size:12.5px;color:#cfe0f1}.sw-opt.no{opacity:.35;pointer-events:none}' +
    '.sw-ok{text-align:center;padding:14px 0 4px;animation:swUp .4s ease both}.sw-ok .pair{display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:12px}.sw-ok .pair .sw-ic{animation:swPop .5s cubic-bezier(.3,1.4,.5,1) both}.sw-ok .pair .sw-ic+svg+.sw-ic{animation-delay:.18s}.sw-ok .ck{width:70px;height:70px;margin:2px auto 8px;display:block}.sw-ok .ck circle{stroke-dasharray:252;stroke-dashoffset:252;animation:swDraw .7s .05s ease forwards}.sw-ok .ck path{stroke-dasharray:60;stroke-dashoffset:60;animation:swDraw .45s .6s ease forwards}.sw-ok h3{margin:6px 0 2px;font-size:20px;background:none;-webkit-text-fill-color:currentColor;color:#fff}.sw-ok .big{font-size:30px;font-weight:800;margin:8px 0 2px;letter-spacing:-.02em;color:#c6ff3d;word-break:break-all}.sw-ok .sub{color:#8fa6bd;font-size:13px}.sw-ok .btns{display:flex;gap:10px;margin-top:16px}.sw-ok .btns button{flex:1;padding:14px;border-radius:14px;font-weight:700;font-size:14px;cursor:pointer;font-family:inherit}.sw-ok .b1{border:0;background:linear-gradient(135deg,#d6ff5c,#a6e22e);color:#0a1204}.sw-ok .b2{border:1px solid rgba(255,255,255,.14);background:transparent;color:#fff}' +
    '@media (max-width:560px){.sw-ov{align-items:flex-end;padding:0}.sw{max-width:none;border-radius:26px 26px 0 0;max-height:96vh;padding-bottom:calc(18px + env(safe-area-inset-bottom));animation:swSheet .32s cubic-bezier(.2,.9,.3,1) both}.sw-row input,.sw-row .out{font-size:26px}}' +
    'html[data-theme="light"] .sw{background:#fff;color:#0f172a;border-color:rgba(0,0,0,.1)}html[data-theme="light"] .sw-hd h2,html[data-theme="light"] .sw-row input,html[data-theme="light"] .sw-row .out,html[data-theme="light"] .sw-as,html[data-theme="light"] .sw-ok h3,html[data-theme="light"] .sw-pick h3,html[data-theme="light"] .sw-opt,html[data-theme="light"] .sw-pick input{color:#0f172a}html[data-theme="light"] .sw-box,html[data-theme="light"] .sw-info{background:#f1f5f9;border-color:rgba(0,0,0,.08)}html[data-theme="light"] .sw-pick{background:#fff}html[data-theme="light"] .sw-flip button{border-color:#fff}html[data-theme="light"] .sw-ok .big{color:#3f7d00}' +
    '@media (prefers-reduced-motion:reduce){.sw,.sw-ov,.sw-pick,.sw-ok *,.sw-live i{animation:none!important}.sw-ok .ck circle,.sw-ok .ck path{stroke-dashoffset:0!important}}';
  document.head.appendChild(css);

  /* ───── prices ───── */
  function loadPrices() {
    return fetch(WORKER + '?action=multiPrices').then(function (r) { return r.json(); }).then(function (d) {
      if (d && d.ok && Array.isArray(d.coins)) { d.coins.forEach(function (c) { if (c && c.usd > 0) P[String(c.symbol).toUpperCase()] = Number(c.usd); }); P.USDT = P.USDT || 1; pTs = Date.now(); }
    }).catch(function () {}).then(function () {
      var s = S(); if (!P.BTC && s.btcP) P.BTC = Number(s.btcP); if (!P.ETH && s.ethP) P.ETH = Number(s.ethP);
      var c = window._exPricesCache; if (Array.isArray(c)) c.forEach(function (x) { if (x && x.usd > 0 && !P[x.symbol]) P[x.symbol] = Number(x.usd); });
    });
  }

  /* ───── render ───── */
  var root = null;
  function open() {
    if (root) return; if (window.adminViewingEmail) { if (window.toast) toast('View-only mode: exchange is not available', true); return; }
    Z.amt = ''; Z.busy = false; Z.picking = null; Z.filt = '';
    var ha = bal('USD') > 0; Z.from = ha ? 'USD' : (bal('BTC') > 0 ? 'BTC' : (ASSETS.filter(function (a) { return bal(a) > 0; })[0] || 'USD')); Z.to = Z.from === 'BTC' ? 'USD' : (Z.from === 'USD' ? 'BTC' : 'USD');
    root = document.createElement('div'); root.className = 'sw-ov'; root.id = 'swOv';
    root.addEventListener('mousedown', function (e) { if (e.target === root) close(); });
    document.body.appendChild(root); document.body.style.overflow = 'hidden'; draw(true);
    loadPrices().then(function () { if (root) update(); });
    pTimer = setInterval(function () { loadPrices().then(function () { if (root) update(); }); }, 15000); tick = setInterval(function () { if (root) liveBadge(); }, 1000);
    document.addEventListener('keydown', esc_);
  }
  function esc_(e) { if (e.key === 'Escape') { if (Z.picking) { Z.picking = null; draw(); } else close(); } }
  function close() { if (!root) return; clearInterval(pTimer); clearInterval(tick); document.removeEventListener('keydown', esc_); root.remove(); root = null; document.body.style.overflow = ''; }

  var CHEV = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';
  var SWAPI = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 16V4M7 4L3 8M7 4l4 4M17 8v12M17 20l-4-4M17 20l4-4"/></svg>';
  function draw(first) {
    if (!root) return;
    var sy = root.querySelector('.sw') ? root.querySelector('.sw').scrollTop : 0;
    root.innerHTML = '<div class="sw" role="dialog" aria-label="Exchange">' +
      '<div class="sw-hd"><h2>Exchange</h2><span class="sw-live" id="swLive"><i></i><span>Live</span></span><button type="button" class="sw-x" data-sw="close" aria-label="Close">×</button></div>' +
      '<div class="sw-box f" id="swB1"><div class="sw-lb"><span>You pay</span><button type="button" data-sw="max">Max</button></div><div class="sw-row"><input id="swIn" inputmode="decimal" autocomplete="off" placeholder="0" value="' + esc(Z.amt) + '"><button type="button" class="sw-as" data-sw="pickFrom">' + icon(Z.from, 28) + Z.from + CHEV + '</button></div><div class="sw-sub"><span id="swUsd"></span><span id="swBal"></span></div>' +
      '<div class="sw-chips"><button type="button" data-p="25">25%</button><button type="button" data-p="50">50%</button><button type="button" data-p="75">75%</button><button type="button" data-p="100">Max</button></div></div>' +
      '<div class="sw-flip"><button type="button" data-sw="flip" aria-label="Swap sides">' + SWAPI + '</button></div><div class="sw-gap"></div>' +
      '<div class="sw-box"><div class="sw-lb"><span>You receive</span></div><div class="sw-row"><div class="out dim" id="swOut">0</div><button type="button" class="sw-as" data-sw="pickTo">' + icon(Z.to, 28) + Z.to + CHEV + '</button></div><div class="sw-sub"><span id="swUsd2"></span><span id="swBal2"></span></div></div>' +
      '<div class="sw-info" id="swInfo"></div><div class="sw-err" id="swErr"></div><button type="button" class="sw-go" id="swGo" data-sw="go"><span>Exchange</span></button><div id="swRec"></div></div>';
    var el = root.querySelector('.sw'); if (!first) el.style.animation = 'none'; el.scrollTop = sy;
    var inp = $('swIn'); inp.addEventListener('input', function () { var v = inp.value.replace(',', '.').replace(/[^0-9.]/g, ''), p = v.split('.'); if (p.length > 2) v = p[0] + '.' + p.slice(1).join(''); var d = dec(Z.from); if (p[1] && p[1].length > d) v = p[0] + '.' + p[1].slice(0, d); inp.value = v; Z.amt = v; update(); });
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
    if (first && window.matchMedia && !matchMedia('(pointer:coarse)').matches) setTimeout(function () { try { inp.focus(); } catch (e) {} }, 120);
    update(); liveBadge();
  }
  function liveBadge() { var e = $('swLive'); if (!e) return; if (!pTs) { e.className = 'sw-live old'; e.lastChild.textContent = 'Updating…'; return; } var a = Math.round((Date.now() - pTs) / 1000); e.className = 'sw-live' + (a > 60 ? ' old' : ''); e.lastChild.textContent = a < 5 ? 'Live rates' : 'Updated ' + (a < 60 ? a + 's' : Math.round(a / 60) + 'm') + ' ago'; }
  var recDone = '';
  function update() {
    if (!root || !$('swIn')) return; var a = parseFloat(Z.amt) || 0, pf = price(Z.from), pt = price(Z.to), q = quote(), have = bal(Z.from);
    var usd = a * pf; $('swUsd').textContent = a > 0 && pf ? '≈ $' + nfix(usd, 2) : ''; $('swBal').textContent = 'Available: ' + fmt(have, Z.from);
    var out = $('swOut'); out.textContent = q > 0 ? fmt(q, Z.to).replace(' ' + Z.to, '') : '0'; out.className = 'out' + (q > 0 ? '' : ' dim');
    $('swUsd2').textContent = q > 0 ? '≈ $' + nfix(q * pt, 2) : ''; $('swBal2').textContent = 'Balance: ' + fmt(bal(Z.to), Z.to);
    var rate = pf && pt ? pf / pt : 0;
    var over = a > have + 1e-12; $('swB1').classList.toggle('bad', over && a > 0);
    var info = '<div><span>Rate</span><b>' + (rate ? '1 ' + Z.from + ' ≈ ' + (Z.to === 'USD' ? '$' + nfix(rate, 2) : fmt(rate, Z.to)) : (pTs ? 'Price unavailable' : 'Loading…')) + '</b></div>' +
      '<div><span>' + (Z.to === 'USD' ? 'Inverse' : 'Price of ' + Z.to) + '</span><b>' + (Z.to === 'USD' ? (rate ? '1 USD = ' + fmt(1 / rate, Z.from) : '—') : (pt ? '$' + nfix(pt, pt < 1 ? 5 : 2) : '—')) + '</b></div><div><span>Fee</span><b style="color:#34d399">None</b></div><div><span>You will receive</span><b>' + (q > 0 ? fmt(q, Z.to) : '—') + '</b></div>';
    $('swInfo').innerHTML = info;
    var go = $('swGo'), why = ''; if (Z.from === Z.to) why = 'Choose two different assets'; else if (!(a > 0)) why = 'Enter an amount'; else if (!pf || !pt) why = 'Rates are updating…'; else if (over) why = 'Not enough ' + Z.from; else if (Z.from === 'USD' && usd < 1) why = 'Minimum is $1';
    go.disabled = !!why || Z.busy; go.className = 'sw-go' + (Z.busy ? ' ld' : ''); go.firstChild.textContent = why || 'Exchange ' + Z.from + ' → ' + Z.to;
    var rec = $('swRec'), tr = (S().trades || []).slice(0, 3), sig = JSON.stringify(tr.map(function (t) { return t.id; }));
    if (rec.__s !== sig) { rec.__s = sig; rec.innerHTML = tr.length ? '<div class="sw-rec"><h4>Recent</h4>' + tr.map(recItem).join('') + '</div>' : ''; }
  }
  function recItem(t) {
    var type = t.type, sym = t.symbol, from = type === 'buy' ? 'USD' : type === 'sell' ? sym : (t.sourceSymbol || sym), to = type === 'buy' ? sym : type === 'sell' ? 'USD' : (t.targetSymbol || '?'), when = new Date(t.ts || Date.now()).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    return '<div class="it">' + icon(from, 26) + '<span style="opacity:.5">→</span>' + icon(to, 26) + '<span>' + esc(from) + ' → ' + esc(to) + '</span><em>' + esc(when) + '</em></div>';
  }

  /* ───── picker ───── */
  function pickDraw() {
    var side = Z.picking, list = ASSETS.filter(function (a) { var q = Z.filt.toLowerCase(); return !q || a.toLowerCase().indexOf(q) > -1 || (META[a][0] || '').toLowerCase().indexOf(q) > -1; });
    if (side === 'from') list = list.filter(function (a) { return bal(a) > 0 || a === Z.from; });
    var box = root.querySelector('.sw'), old = box.querySelector('.sw-pick'); if (old) old.remove();
    var d = document.createElement('div'); d.className = 'sw-pick';
    d.innerHTML = '<h3><span>' + (side === 'from' ? 'You pay with' : 'You receive') + '</span><button type="button" class="sw-x" data-sw="pickClose">×</button></h3><input id="swQ" placeholder="Search coin" autocomplete="off" value="' + esc(Z.filt) + '"><div class="sw-list">' + (list.map(function (a) {
      var other = side === 'from' ? Z.to : Z.from, cur = side === 'from' ? Z.from : Z.to, b = bal(a), p = price(a);
      return '<button type="button" class="sw-opt' + (a === cur ? ' on' : '') + (a === other ? ' no' : '') + '" data-pick="' + a + '">' + icon(a, 36) + '<span><b>' + a + '</b><small>' + esc(META[a][0]) + '</small></span><em>' + (b > 0 ? fmt(b, a) : '') + (a !== 'USD' && p ? '<small style="display:block;color:#7f95ac">$' + nfix(p, p < 1 ? 4 : 2) + '</small>' : '') + '</em></button>';
    }).join('') || '<div style="padding:30px;text-align:center;color:#7f95ac">Nothing found</div>') + '</div>';
    box.appendChild(d); var q = $('swQ'); q.addEventListener('input', function () { Z.filt = q.value; var pos = q.selectionStart; pickDraw(); var n = $('swQ'); n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) {} });
    if (!matchMedia('(pointer:coarse)').matches) q.focus();
  }

  /* ───── actions ───── */
  document.addEventListener('click', function (e) {
    var t = e.target; if (!root || !root.contains(t)) return;
    var b = t.closest('[data-sw],[data-p],[data-pick]'); if (!b) return;
    if (b.hasAttribute('data-pick')) { var a = b.getAttribute('data-pick'); if (Z.picking === 'from') { if (a === Z.to) Z.to = Z.from; Z.from = a; } else { if (a === Z.from) Z.from = Z.to; Z.to = a; } Z.picking = null; Z.filt = ''; Z.amt = ''; draw(); return; }
    if (b.hasAttribute('data-p')) { var h = bal(Z.from) * Number(b.getAttribute('data-p')) / 100; var d = dec(Z.from); var v = Math.floor(h * Math.pow(10, d)) / Math.pow(10, d); Z.amt = v > 0 ? String(v) : ''; $('swIn').value = Z.amt; update(); return; }
    var k = b.getAttribute('data-sw');
    if (k === 'close') close(); else if (k === 'max') { var m = Math.floor(bal(Z.from) * Math.pow(10, dec(Z.from))) / Math.pow(10, dec(Z.from)); Z.amt = m > 0 ? String(m) : ''; $('swIn').value = Z.amt; update(); }
    else if (k === 'flip') { b.classList.toggle('r'); var f = Z.from; Z.from = Z.to; Z.to = f; Z.amt = ''; setTimeout(draw, 160); }
    else if (k === 'pickFrom' || k === 'pickTo') { Z.picking = k === 'pickFrom' ? 'from' : 'to'; Z.filt = ''; pickDraw(); }
    else if (k === 'pickClose') { Z.picking = null; draw(); }
    else if (k === 'go') go(); else if (k === 'again') { Z.amt = ''; draw(true); } else if (k === 'done') close();
  });

  function setErr(m) { var e = $('swErr'); if (e) e.textContent = m || ''; }
  function go(retry) {
    if (Z.busy || !root) return; var amt = parseFloat(Z.amt) || 0, pf = price(Z.from), pt = price(Z.to);
    if (!(amt > 0) || !pf || !pt || Z.from === Z.to || amt > bal(Z.from) + 1e-12) return;
    var token = typeof window.getSessionToken === 'function' ? window.getSessionToken() : localStorage.getItem('session_token'); if (!token) return setErr('Session expired. Please sign in again.');
    var from = Z.from, to = Z.to, body = { token: token, clientTradeId: 'sw_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9), orderType: 'market' }, recv = quote();
    if (from === 'USD') { body.type = 'buy'; body.symbol = to; body.amount = Math.round(amt * 100) / 100; body.price = pt; }
    else if (to === 'USD') { body.type = 'sell'; body.symbol = from; body.amount = amt; body.price = pf; }
    else { body.type = 'convert'; body.symbol = from; body.sourceSymbol = from; body.targetSymbol = to; body.amount = amt; body.price = pf / pt; }
    Z.busy = true; setErr(''); update();
    fetch(WORKER + '?action=trade', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(function (r) { return r.json(); }).then(function (r) {
      Z.busy = false;
      if (!r || !r.ok) {
        if (!retry && r && /price moved|updating/i.test(r.error || '')) { return loadPrices().then(function () { Z.busy = false; go(true); }); }
        update(); return setErr((r && r.error) || 'Exchange failed. Please try again.');
      }
      var s = window.st; if (s) { if (r.balances) Object.keys(r.balances).forEach(function (k) { s[k] = r.balances[k]; }); else { if (typeof r.usd === 'number') s.usd = r.usd; } if (r.trade) { if (!Array.isArray(s.trades)) s.trades = []; s.trades.unshift(r.trade); } }
      try { if (typeof window.render === 'function') window.render(); } catch (e) {}
      try { if (window.addNotification) addNotification('Exchanged ' + fmt(amt, from) + ' → ' + fmt(recv, to), '🔄'); } catch (e) {}
      success(from, to, amt, recv);
    }).catch(function () { Z.busy = false; update(); setErr('Connection error. Please try again.'); });
  }
  function success(from, to, amt, recv) {
    if (!root) return; var box = root.querySelector('.sw'); if (!box) return;
    box.innerHTML = '<div class="sw-ok"><div class="pair">' + icon(from, 52) + '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#c6ff3d" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>' + icon(to, 52) + '</div>' +
      '<svg class="ck" viewBox="0 0 84 84" fill="none"><circle cx="42" cy="42" r="40" stroke="#c6ff3d" stroke-width="4" transform="rotate(-90 42 42)"/><path d="M26 43l11 11 21-24" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      '<h3>Exchange complete</h3><div class="sub">You exchanged ' + esc(fmt(amt, from)) + '</div><div class="big" id="swBig">+0 ' + to + '</div><div class="sub">Added to your ' + to + ' balance</div>' +
      '<div class="btns"><button type="button" class="b2" data-sw="again">Exchange again</button><button type="button" class="b1" data-sw="done">Done</button></div></div>';
    var t0 = performance.now(); (function step(t) { var k = Math.min(1, (t - t0) / 900), e = 1 - Math.pow(1 - k, 3), el = $('swBig'); if (!el) return; el.textContent = '+' + (to === 'USD' ? '$' + nfix(recv * e, 2) : fmt(recv * e, to)); if (k < 1) requestAnimationFrame(step); else el.textContent = '+' + (to === 'USD' ? '$' + nfix(recv, 2) : fmt(recv, to)); })(t0);
    if (typeof window.playChime === 'function') try { window.playChime(); } catch (e) {}
  }

  /* ───── hook the Exchange buttons ───── */
  window.addEventListener('click', function (e) {
    var b = e.target && e.target.closest && e.target.closest('#btnExchangeV2,[data-t="btnExchangeV2"],[data-go="btnExchangeV2"]'); if (!b) return;
    e.stopImmediatePropagation(); e.preventDefault(); open();
  }, true);
  window.openExchange = open;
})();
