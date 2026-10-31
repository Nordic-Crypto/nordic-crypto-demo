/* ============================================================
   NORDIC CRYPTO — TRADE TERMINAL v3.0
   ------------------------------------------------------------
   • 24 markets (tradable list comes from the Worker: ?action=multiPrices)
   • Live prices / 24h stats / order book / trades: Binance public market data
     (WebSocket, automatic fallback to HTTPS polling). No simulated data.
   • TradingView chart (real-time), fallback: built-in candlestick chart from real klines
   • Orders: Market · Limit · Stop / Stop-Loss · Take-Profit · OCO (TP + SL),
     optional TP/SL attached to a market buy, Convert between any two coins
   • Orders are executed by the Worker (limit/stop/TP/OCO are filled by the Worker
     engine: while the terminal is open and by the minute cron when it is not)
   • Responsive: desktop 3-column terminal, phone single-column with tabs
   ============================================================ */
(function () {
  'use strict';
  if (window.__txLoaded) return;
  window.__txLoaded = true;

  /* ---------- helpers ---------- */
  function $(id) { return document.getElementById(id); }
  function q(s, r) { return (r || document).querySelector(s); }
  function qa(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function num(id) { var e = $(id); var v = e ? parseFloat(String(e.value).replace(',', '.')) : 0; return isFinite(v) ? v : 0; }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  var Q = lsGet('nc_tt_q') === 'USDC' ? 'USDC' : 'USDT';
  function qOf(sym) { return sym === 'USDT' ? (Q === 'USDC' ? 'USDC' : 'USD') : Q; }
  function applyQuote() {
    qa('.tx-qu').forEach(function (e) { e.textContent = Q; });
    qa('.tx-qsw button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-v') === Q); });
    if ($('txPair')) { $('txPair').textContent = T.coin + '/' + qOf(T.coin); $('txBookSym').textContent = T.coin + '/' + qOf(T.coin); }
    if ($('txAmtU') && T.side === 'buy') $('txAmtU').textContent = Q;
    renderMList();
    try { if (typeof calc === 'function') calc(); } catch (e) {}
    try { if (typeof renderBottom === 'function') renderBottom(); } catch (e) {}
  }
  function noop() {}
  function decOf(p) { p = Math.abs(p); return p >= 10 ? 2 : (p >= 1 ? 4 : (p >= 0.01 ? 5 : 8)); }
  function fP(n) { n = Number(n); if (!isFinite(n) || n <= 0) return '—'; var d = decOf(n); return '$' + n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }); }
  function fUsd(n) { n = Number(n) || 0; return (n < 0 ? '-' : '') + '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function fQty(n, sym) { n = Number(n) || 0; if (sym === 'USDT') return n.toFixed(2); var d = n >= 1000 ? 2 : (n >= 1 ? 4 : 6); return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: d }); }
  function fVol(n) { n = Number(n) || 0; if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B'; if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M'; if (n >= 1e3) return (n / 1e3).toFixed(2) + 'K'; return n.toFixed(2); }
  function fTime(ts) { var d = new Date(ts), n = Date.now(); return (n - ts) < 86400000 ? d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }); }
  function floorTo(n, d) { var f = Math.pow(10, d); return Math.floor(n * f + 1e-9) / f; }
  function S() { return window.st || {}; }
  function usdBal() { return Number(S().usd) || 0; }
  function coinBal(sym) { return Number(S()[String(sym).toLowerCase()]) || 0; }
  function glyph(sym) { return { BTC: '₿', ETH: 'Ξ', USDT: '₮', DOGE: 'Ð', LTC: 'Ł', XRP: '✕' }[sym] || sym.slice(0, sym.length > 3 ? 2 : 1); }

  /* ---------- state ---------- */
  var FALLBACK = [['BTC', 'Bitcoin', '#f7931a'], ['ETH', 'Ethereum', '#627eea'], ['USDT', 'Tether', '#26a17b'], ['SOL', 'Solana', '#9945ff'], ['BNB', 'BNB', '#f3ba2f']];
  var T = {
    open: false, built: false, coin: lsGet('nc_tt_coin') || 'BTC', coins: [], map: {},
    side: 'buy', otype: 'market', view: 'chart', tab: 'pos', hist: 'all', mtab: 'all',
    openOrders: [], orders: [], busy: false, fav: [], tvFailed: false, tvActive: false, seen: 0
  };
  try { T.fav = JSON.parse(lsGet('nc_tt_fav') || '[]') || []; } catch (e) { T.fav = []; }
  var LV = { ws: null, coin: null, price: {}, priceAt: {}, tickerAt: 0, depthAt: 0, tradeAt: 0, stats: null, trades: [], bids: [], asks: [], fail: 0, retryT: 0, pollT: 0, mode: '' };
  var TMR = { orders: 0, markets: 0, book: 0, trades: 0, calc: 0 };
  var TVN = 0, TV_CBS = [], TV_LOADING = false, TV_WATCH = 0;

  window.TT = { get open() { return T.open; }, get coin() { return T.coin; } };

  function coinMeta(sym) { return T.map[sym] || { symbol: sym, name: sym, usd: 0, chg: 0, color: '#5b6b82' }; }
  function livePx(sym) {
    var p = LV.price[sym];
    if (p > 0 && (Date.now() - (LV.priceAt[sym] || 0)) < 20000) return p;
    var m = T.map[sym]; if (m && m.usd > 0) return m.usd;
    if (sym === 'USDT') return 1;
    if (Array.isArray(window._exPricesCache)) { var c = window._exPricesCache.filter(function (x) { return x.symbol === sym; })[0]; if (c && c.usd > 0) return Number(c.usd); }
    return 0;
  }
  function workerUrl() { return window.WORKER_URL || ''; }
  function token() { return lsGet('session_token') || (typeof window.getSessionToken === 'function' ? window.getSessionToken() : ''); }
  function api(action, body) {
    body = body || {}; body.token = token();
    return fetch(workerUrl() + '?action=' + action, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(function (r) { return r.json(); });
  }
  function applyBalances(b) {
    if (!b || !window.st) return;
    Object.keys(b).forEach(function (k) { window.st[k] = b[k]; });
  }
  function refreshApp() {
    ['render', 'renderExchangeDash'].forEach(function (f) { try { if (typeof window[f] === 'function') window[f](); } catch (e) {} });
  }

  /* ---------- toast + confirm ---------- */
  function toast(msg, kind) {
    var el = $('txToast');
    if (!el) { el = document.createElement('div'); el.id = 'txToast'; document.body.appendChild(el); }
    el.textContent = msg; el.className = 'tx-toast ' + (kind || 'ok') + ' show';
    clearTimeout(el.__t); el.__t = setTimeout(function () { el.classList.remove('show'); }, kind === 'err' ? 4600 : 3000);
  }
  function confirmBox(title, rows, cls, note) {
    return new Promise(function (resolve) {
      var old = $('txConfirm'); if (old && old.parentNode) old.parentNode.removeChild(old);
      var ov = document.createElement('div'); ov.id = 'txConfirm'; ov.className = 'tx-ov';
      ov.innerHTML = '<div class="tx-box ' + cls + '" role="dialog" aria-modal="true"><div class="tx-box-t">' + esc(title) + '</div>' +
        rows.map(function (r) { return '<div class="tx-box-r"><span>' + esc(r[0]) + '</span><b>' + esc(r[1]) + '</b></div>'; }).join('') +
        (note ? '<div class="tx-box-n">' + esc(note) + '</div>' : '') +
        '<div class="tx-box-a"><button type="button" class="tx-b-cancel">Cancel</button><button type="button" class="tx-b-ok ' + cls + '">Confirm</button></div></div>';
      document.body.appendChild(ov);
      function done(v) { document.removeEventListener('keydown', key, true); if (ov.parentNode) ov.parentNode.removeChild(ov); resolve(v); }
      function key(e) { if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); done(false); } else if (e.key === 'Enter') { e.stopPropagation(); e.preventDefault(); done(true); } }
      document.addEventListener('keydown', key, true);
      ov.addEventListener('click', function (e) { if (e.target === ov) done(false); });
      q('.tx-b-cancel', ov).onclick = function () { done(false); };
      var ok = q('.tx-b-ok', ov); ok.onclick = function () { done(true); };
      setTimeout(function () { try { ok.focus(); } catch (e) {} }, 30);
    });
  }

  /* ============================================================
     DOM
     ============================================================ */
  function build() {
    var root = $('tradeTerminal');
    if (!root) return false;
    if (T.built) return true;
    root.className = 'txr';
    root.setAttribute('data-view', 'chart');
    root.innerHTML =
      '<div class="tx-shell">' +
      '<header class="tx-top">' +
        '<button class="tx-mkt" id="txMkt" data-a="mkt" type="button"><span id="txIco" class="tx-ci"></span><span class="tx-mkt-t"><b id="txPair">BTC/USD</b><small id="txName">Bitcoin</small></span><i>▾</i></button>' +
        '<div class="tx-price"><b id="txPrice">—</b><span class="tx-chg" id="txChg">—</span></div>' +
        '<div class="tx-stats" id="txStats">' +
          '<div><small>24h Open</small><b id="txO">—</b></div><div><small>24h High</small><b id="txH">—</b></div><div><small>24h Low</small><b id="txL">—</b></div>' +
          '<div><small>Close</small><b id="txC">—</b></div><div><small>24h Volume</small><b id="txV">—</b></div>' +
        '</div>' +
        '<div class="tx-top-r"><div class="tx-mode" title="Lite = simple view for beginners. Pro = full trading tools."><button type="button" data-a="mode" data-v="lite">Lite</button><button type="button" data-a="mode" data-v="pro">Pro</button></div><span class="tx-live" id="txLive" data-s="off"><i></i><em>CONNECTING</em></span><button class="tx-x" id="txClose" data-a="close" type="button" aria-label="Close">×</button></div>' +
      '</header>' +
      '<div class="tx-mkts" id="txMkts" hidden>' +
        '<div class="tx-mkts-in">' +
          '<div class="tx-search"><input id="txSearch" type="text" placeholder="Search coin…" autocomplete="off" spellcheck="false"></div>' +
          '<div class="tx-qsw"><span>Quote</span><button type="button" data-a="quote" data-v="USDT">USDT</button><button type="button" data-a="quote" data-v="USDC">USDC</button></div>' +
          '<div class="tx-mtabs"><button type="button" data-a="mtab" data-v="all" class="on">All</button><button type="button" data-a="mtab" data-v="fav">★ Favorites</button></div>' +
          '<div class="tx-mlist" id="txMList"></div>' +
        '</div>' +
      '</div>' +
      '<div class="tx-pm" id="txPm" hidden></div>' +
      '<nav class="tx-views"><button type="button" data-a="view" data-v="chart" class="on">Chart</button><button type="button" data-a="view" data-v="book">Order book</button><button type="button" data-a="view" data-v="trades">Trades</button></nav>' +
      '<main class="tx-main">' +
        '<section class="tx-col tx-col-l">' +
          '<div class="tx-card tx-chart" id="txChartCard"><div id="txTv" class="tx-tv"></div><canvas id="txFb" class="tx-fb" hidden></canvas><div class="tx-chart-note" id="txChartNote">Loading chart…</div></div>' +
          '<div class="tx-card tx-bottom">' +
            '<div class="tx-btabs" id="txTabs"><button type="button" data-a="tab" data-v="pos" class="on">Positions <em id="txCntPos">0</em></button><button type="button" data-a="tab" data-v="open">Open orders <em id="txCntOpen">0</em></button><button type="button" data-a="tab" data-v="hist">Order history</button><button type="button" data-a="tab" data-v="wallet">Wallet</button></div>' +
            '<div class="tx-bfilter" id="txFilter" hidden><button type="button" data-a="hist" data-v="all" class="on">All</button><button type="button" data-a="hist" data-v="filled">Filled</button><button type="button" data-a="hist" data-v="open">Open</button><button type="button" data-a="hist" data-v="cancelled">Cancelled</button></div>' +
            '<div class="tx-bbody" id="txBody"></div>' +
          '</div>' +
        '</section>' +
        '<section class="tx-col tx-col-m">' +
          '<div class="tx-card tx-book" id="txBookCard"><div class="tx-h">Order book <small id="txBookSym">BTC/USD</small></div><div class="tx-bh"><span>Price</span><span>Amount</span><span>Total</span></div><div class="tx-asks" id="txAsks"></div><div class="tx-mid" id="txMid"><b>—</b><small>Spread —</small></div><div class="tx-bids" id="txBids"></div></div>' +
          '<div class="tx-card tx-trades" id="txTradesCard"><div class="tx-h">Recent trades</div><div class="tx-bh"><span>Price</span><span>Amount</span><span>Time</span></div><div class="tx-tl" id="txTL"></div></div>' +
        '</section>' +
        '<section class="tx-col tx-col-r">' +
          '<div class="tx-card tx-form" id="txForm">' +
            '<div class="tx-sides"><button type="button" data-a="side" data-v="buy" class="on buy">Buy</button><button type="button" data-a="side" data-v="sell" class="sell">Sell</button><button type="button" data-a="side" data-v="convert" class="conv">Convert</button></div>' +
            '<div class="tx-guide" id="txGuide" hidden></div>' +
            '<div id="txFormTrade">' +
              '<div class="tx-types" id="txTypes"></div>' +
              '<div class="tx-avail"><span>Available</span><b id="txAvail">—</b><button type="button" class="tx-dep" data-a="deposit" id="txDep">Deposit</button></div>' +
              '<div class="tx-fld" data-g="pl"><label>Limit price</label><div class="tx-in"><input id="txPL" type="number" inputmode="decimal" step="any" placeholder="0.00"><em class="tx-qu">USDT</em><button type="button" class="tx-last" data-a="last" data-f="txPL">Last</button></div><div class="tx-chips" id="txChipL"></div></div>' +
              '<div class="tx-fld" data-g="ps"><label id="txPSL">Stop price</label><div class="tx-in"><input id="txPS" type="number" inputmode="decimal" step="any" placeholder="0.00"><em class="tx-qu">USDT</em><button type="button" class="tx-last" data-a="last" data-f="txPS">Last</button></div><div class="tx-chips" id="txChipS"></div></div>' +
              '<div class="tx-fld" data-g="pt"><label>Take-profit price</label><div class="tx-in"><input id="txPT" type="number" inputmode="decimal" step="any" placeholder="0.00"><em class="tx-qu">USDT</em><button type="button" class="tx-last" data-a="last" data-f="txPT">Last</button></div><div class="tx-chips" id="txChipT"></div></div>' +
              '<div class="tx-fld" data-g="amt"><label id="txAmtL">Amount</label><div class="tx-in"><input id="txAmt" type="number" inputmode="decimal" step="any" placeholder="0.00"><em id="txAmtU">USDT</em></div>' +
                '<input id="txRng" class="tx-rng" type="range" min="0" max="100" step="1" value="0"><div class="tx-chips pct"><button type="button" data-a="pct" data-v="25">25%</button><button type="button" data-a="pct" data-v="50">50%</button><button type="button" data-a="pct" data-v="75">75%</button><button type="button" data-a="pct" data-v="100">Max</button></div></div>' +
              '<div class="tx-att" data-g="att"><label class="tx-sw"><input type="checkbox" id="txAttOn"><span></span><b>Attach Take-profit / Stop-loss</b></label>' +
                '<div class="tx-att-in" id="txAttIn" hidden><div><label>Take-profit %</label><div class="tx-in sm"><input id="txAttTp" type="number" inputmode="decimal" step="any" value="5"><em>%</em></div></div><div><label>Stop-loss %</label><div class="tx-in sm"><input id="txAttSl" type="number" inputmode="decimal" step="any" value="3"><em>%</em></div></div></div></div>' +
              '<div class="tx-sum" id="txSum"></div>' +
              '<div class="tx-hint" id="txHint"></div>' +
              '<button type="button" class="tx-go buy" id="txGo" data-a="go">Buy BTC</button>' +
            '</div>' +
            '<div id="txFormConv" hidden>' +
              '<div class="tx-fld"><label>From</label><div class="tx-in"><select id="txCvFrom"></select></div><div class="tx-avail sm"><span>Balance</span><b id="txCvFromBal">—</b></div></div>' +
              '<div class="tx-fld"><label>Amount</label><div class="tx-in"><input id="txCvAmt" type="number" inputmode="decimal" step="any" placeholder="0.00"><em id="txCvAmtU">BTC</em></div><div class="tx-chips pct"><button type="button" data-a="cvpct" data-v="25">25%</button><button type="button" data-a="cvpct" data-v="50">50%</button><button type="button" data-a="cvpct" data-v="75">75%</button><button type="button" data-a="cvpct" data-v="100">Max</button></div></div>' +
              '<div class="tx-swap"><button type="button" data-a="swap" aria-label="Swap">⇅</button></div>' +
              '<div class="tx-fld"><label>To</label><div class="tx-in"><select id="txCvTo"></select></div><div class="tx-avail sm"><span>Balance</span><b id="txCvToBal">—</b></div></div>' +
              '<div class="tx-sum" id="txCvSum"></div><div class="tx-hint" id="txCvHint"></div>' +
              '<button type="button" class="tx-go conv" id="txCvGo" data-a="cvgo">Convert</button>' +
            '</div>' +
          '</div>' +
        '</section>' +
      '</main></div>';
    bind(root);
    T.built = true;
    return true;
  }

  function bind(root) {
    root.addEventListener('click', function (e) {
      var t = e.target.closest ? e.target.closest('[data-a]') : null;
      if (!t) { if (!e.target.closest('.tx-mkts-in') && !e.target.closest('#txMkt')) closeMkts(); return; }
      act(t.getAttribute('data-a'), t, e);
    });
    root.addEventListener('input', function (e) {
      var id = e.target && e.target.id;
      if (id === 'txRng') { rngToAmt(); return; }
      if (id === 'txSearch') { renderMList(); return; }
      if (id === 'txAttOn') { $('txAttIn').hidden = !e.target.checked; }
      if (id === 'txCvAmt' || id === 'txAmt' || id === 'txPL' || id === 'txPS' || id === 'txPT' || id === 'txAttOn' || id === 'txAttTp' || id === 'txAttSl') { if (id === 'txAmt') amtToRng(); calc(); if (id === 'txCvAmt') calcConv(); }
    });
    root.addEventListener('change', function (e) {
      var id = e.target && e.target.id;
      if (id === 'txCvFrom' || id === 'txCvTo') { fillConvSelects(true); calcConv(); }
    });
  }

  function act(a, el, ev) {
    var v = el.getAttribute('data-v');
    switch (a) {
      case 'close': closeTerminal(); break;
      case 'mkt': toggleMkts(); break;
      case 'mtab': T.mtab = v; qa('.tx-mtabs button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-v') === v); }); renderMList(); break;
      case 'quote': if (v !== Q) { Q = v; lsSet('nc_tt_q', Q); applyQuote(); } break;
      case 'pick': pickCoin(el.getAttribute('data-s')); closeMkts(); break;
      case 'fav': ev.stopPropagation(); toggleFav(el.getAttribute('data-s')); break;
      case 'view': setView(v); break;
      case 'side': setSide(v); break;
      case 'type': setType(v); break;
      case 'pct': pctAmt(Number(v) / 100); break;
      case 'last': { var f = $(el.getAttribute('data-f')); var p = livePx(T.coin); if (f && p > 0) { f.value = rnd(p); calc(); } break; }
      case 'chip': { var f2 = $(el.getAttribute('data-f')); var p2 = livePx(T.coin); if (f2 && p2 > 0) { f2.value = rnd(p2 * (1 + Number(v) / 100)); calc(); } break; }
      case 'go': submit(); break;
      case 'tab': setTab(v); break;
      case 'mode': setMode(v); break;
      case 'pos': openPos(el.getAttribute('data-s')); break;
      case 'pmclose': closePm(); break;
      case 'pmtrade': { var ps = T.pm; closePm(); if (ps) { setSide('buy'); pickCoin(ps); setView('chart'); } break; }
      case 'pmsell': pmSell(Number(v)); break;
      case 'pmset': pmSet(); break;
      case 'pmchip': { var inp = $(el.getAttribute('data-f')), pp = getPos(T.pm); if (inp && pp) inp.value = rnd(pp.mark * (1 + Number(v) / 100)); break; }
      case 'pmcancel': cancelOrder(el.getAttribute('data-id')); break;
      case 'hist': T.hist = v; qa('#txFilter button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-v') === v); }); renderBottom(true); break;
      case 'cancel': cancelOrder(el.getAttribute('data-id')); break;
      case 'sellcoin': setSide('sell'); pickCoin(el.getAttribute('data-s')); pctAmt(1); setView('chart'); try { $('txForm').scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e2) {} break;
      case 'bookpx': bookPick(Number(el.getAttribute('data-p'))); break;
      case 'deposit': closeTerminal(); { var d = $('exBtnDeposit') || $('btnAdd'); if (d) d.click(); } break;
      case 'cvpct': { var from = ($('txCvFrom') || {}).value; $('txCvAmt').value = pctVal(coinBal(from), Number(v) / 100, 8); calcConv(); break; }
      case 'swap': { var a1 = $('txCvFrom').value; $('txCvFrom').value = $('txCvTo').value; $('txCvTo').value = a1; fillConvSelects(true); calcConv(); break; }
      case 'cvgo': submitConvert(); break;
      case 'retrytv': T.tvFailed = false; tvLoad(); break;
    }
  }

  function rnd(p) { var d = decOf(p); return String(Number(p.toFixed(d))); }
  function pctVal(bal, pct, dec) { var v = pct >= 1 ? bal : bal * pct; return String(floorTo(v, dec)); }

  /* ============================================================
     OPEN / CLOSE
     ============================================================ */

  /* ============================================================
     LITE / PRO MODE, POSITIONS, POSITION DETAILS
     ============================================================ */
  var MODE = lsGet('nc_tt_mode') === 'pro' ? 'pro' : 'lite';
  function isLite() { return MODE === 'lite'; }
  function typesFor(side) { var a = TYPES[side]; return isLite() ? a.filter(function (x) { return x[0] === 'market' || x[0] === 'limit'; }) : a; }
  function setMode(m) {
    if (m !== 'lite' && m !== 'pro') return;
    MODE = m; lsSet('nc_tt_mode', m); applyMode();
    toast(m === 'lite' ? 'Lite mode — simple view with hints' : 'Pro mode — full trading tools', 'ok');
  }
  function applyMode() {
    var root = $('tradeTerminal'); if (!root) return;
    root.classList.toggle('tx-lite', isLite());
    qa('.tx-mode button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-v') === MODE); });
    if (isLite() && root.getAttribute('data-view') !== 'chart') setView('chart');
    if (T.side !== 'convert') setType(T.otype, true);
    guide(); renderBottom(true); if (T.pm) { var pm = $('txPm'); pm.__sym = null; renderPm(); }
  }
  function guide() {
    var g = $('txGuide'); if (!g) return;
    if (!isLite()) { g.hidden = true; return; }
    var c = T.coin, t = T.otype, txt, ttl;
    if (T.side === 'convert') { ttl = '🔁 Convert'; txt = 'Swap one coin for another instantly at the current rate. No waiting and no order book.'; }
    else if (T.side === 'buy') { ttl = '🟢 Buying ' + c; txt = t === 'limit' ? 'Limit order: you choose the price. The order waits and buys only when the price falls to your level. You can cancel it any time.' : 'Market order: buys ' + c + ' right now at the current price. Type how much ' + Q + ' you want to spend. Tip: tick "Attach" to add an automatic safety stop.'; }
    else { ttl = '🔴 Selling ' + c; txt = t === 'limit' ? 'Limit order: sells your ' + c + ' only when the price rises to the level you set.' : 'Market order: sells your ' + c + ' right now at the current price and you get ' + Q + ' back.'; }
    var k = ttl + txt; if (g.__k === k && !g.hidden) return; g.__k = k;
    g.innerHTML = '<b>' + esc(ttl) + '</b><span>' + esc(txt) + '</span>'; g.hidden = false;
  }

  function pnlCls(v) { return v == null ? '' : (v >= 0 ? 'up' : 'dn'); }
  function fPnl(v) { return v == null ? '—' : (v >= 0 ? '+' : '−') + fUsd(Math.abs(v)); }
  function fPct(v) { return v == null ? '' : (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(2) + '%'; }
  function posList() {
    var map = {}, fl = (T.orders || []).filter(function (o) { return o.status === 'filled'; }).sort(function (a, b) { return (a.filledAt || a.ts || 0) - (b.filledAt || b.ts || 0); });
    fl.forEach(function (o) {
      var sy = o.symbol; if (!sy) return;
      var x = map[sy] || (map[sy] = { q: 0, cost: 0, real: 0, fills: [] });
      var ex = Number(o.execPrice || o.price) || 0, q = qtyOf(o); if (!(q > 0) || !(ex > 0)) return;
      x.fills.push(o);
      if (o.type === 'buy') { x.q += q; x.cost += q * ex; }
      else { var avg = x.q > 1e-12 ? x.cost / x.q : 0, sq = Math.min(q, x.q); if (sq > 0) { x.real += (ex - avg) * sq; x.cost -= avg * sq; x.q -= sq; } }
    });
    var open = (T.openOrders || []).filter(function (o) { return o.status === 'open' && o.type === 'sell'; }), out = [];
    T.coins.forEach(function (c) {
      var sym = c.symbol; if (sym === 'USDT') return;
      var bal = coinBal(sym), mark = livePx(sym); if (!(bal > 0) || !(mark > 0) || bal * mark < 0.01) return;
      var x = map[sym] || { q: 0, cost: 0, real: 0, fills: [] };
      var entry = x.q > 1e-12 ? x.cost / x.q : 0, approx = entry > 0 && Math.abs(bal - x.q) / bal > 0.02;
      var cost = entry > 0 ? entry * bal : 0, value = bal * mark, pnl = entry > 0 ? value - cost : null;
      var sl = 0, tp = 0, ords = [];
      open.forEach(function (o) {
        if (o.symbol !== sym) return; ords.push(o);
        var a = Number(o.stopPrice) || (o.orderType === 'stop' ? Number(o.price) : 0), b = Number(o.tpPrice) || (o.orderType === 'tp' ? Number(o.price) : 0);
        if (a > 0 && (!sl || a > sl)) sl = a; if (b > 0 && (!tp || b < tp)) tp = b;
      });
      out.push({ sym: sym, c: c, bal: bal, mark: mark, entry: entry, approx: approx, cost: cost, value: value, pnl: pnl, pct: entry > 0 ? (mark / entry - 1) * 100 : null, real: x.real, sl: sl, tp: tp, ords: ords, fills: x.fills.slice(-6).reverse(), chg: Number(c.chg) || 0 });
    });
    out.sort(function (a, b) { return b.value - a.value; });
    T.posCache = out; set('txCntPos', String(out.length));
    return out;
  }
  function getPos(sym) { var l = posList(); for (var i = 0; i < l.length; i++) if (l[i].sym === sym) return l[i]; return null; }
  function posHtml() {
    var L = posList();
    if (!L.length) return '<div class="tx-empty">No open positions<br><small>Buy a coin — it appears here with entry price, profit/loss and protection</small></div>';
    var tv = 0, tp = 0, any = false;
    L.forEach(function (p) { tv += p.value; if (p.pnl != null) { tp += p.pnl; any = true; } });
    var h = '<div class="tx-psum"><div><small>Positions value</small><b>' + fUsd(tv) + '</b></div><div><small>Unrealized PnL</small><b class="' + (any ? pnlCls(tp) : '') + '">' + (any ? fPnl(tp) : '—') + '</b></div><div><small>Open positions</small><b>' + L.length + '</b></div></div>';
    return h + L.map(function (p) {
      return '<div class="tx-pos' + (T.flash === p.sym ? ' new' : '') + '" data-a="pos" data-s="' + p.sym + '">' +
        '<div class="tx-pos-c">' + ico(p.c) + '<span><b>' + p.sym + '</b><em>' + fQty(p.bal, p.sym) + '</em></span></div>' +
        '<div class="tx-pc"><small>Entry price</small><b>' + (p.entry > 0 ? fP(p.entry) + (p.approx ? '~' : '') : '—') + '</b></div>' +
        '<div class="tx-pc pro"><small>Mark price</small><b>' + fP(p.mark) + '</b></div>' +
        '<div class="tx-pc"><small>Value</small><b>' + fUsd(p.value) + '</b></div>' +
        '<div class="tx-pc tx-pp ' + pnlCls(p.pnl) + '"><small>PnL</small><b>' + fPnl(p.pnl) + '</b><em>' + fPct(p.pct) + '</em></div>' +
        '<div class="tx-pc tx-pr"><small>Protection</small><span>' + (p.sl ? '<i class="dn">SL ' + fP(p.sl) + '</i>' : '<i class="no">No stop-loss</i>') + (p.tp ? '<i class="up">TP ' + fP(p.tp) + '</i>' : '') + '</span></div>' +
        '<div class="tx-pc tx-pa"><button type="button" data-a="pos" data-s="' + p.sym + '">Details ›</button></div></div>';
    }).join('');
  }
  var _pt = 0;
  function posTick() { var n = Date.now(); if (n - _pt < 1000) return; _pt = n; if (T.tab === 'pos') renderBottom(); if (T.pm) renderPm(); }
  function revealBottom() { try { var b = document.querySelector('.tx-bottom'); if (b && innerWidth <= 900) b.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {} }
  function afterTrade(o) {
    if (o.otype === 'market') {
      T.flash = o.sym; setTab('pos');
      setTimeout(function () { if (T.flash === o.sym) { T.flash = null; renderBottom(true); } }, 4500);
    } else setTab('open');
    revealBottom();
  }

  function kv(l, v, cls) { return '<div class="tx-kv"><small>' + l + '</small><b class="' + (cls || '') + '">' + v + '</b></div>'; }
  function ladder(p) {
    var pts = [];
    if (p.sl > 0) pts.push({ k: 'Stop-loss', v: p.sl, c: 'dn' });
    if (p.entry > 0) pts.push({ k: 'Entry', v: p.entry, c: 'ent' });
    pts.push({ k: 'Now', v: p.mark, c: 'now' });
    if (p.tp > 0) pts.push({ k: 'Take-profit', v: p.tp, c: 'up' });
    var lo = Math.min.apply(null, pts.map(function (x) { return x.v; })), hi = Math.max.apply(null, pts.map(function (x) { return x.v; }));
    var pad = (hi - lo) * 0.12 || hi * 0.02; lo -= pad; hi += pad;
    var dots = pts.map(function (x) { return '<i class="tx-ld ' + x.c + '" style="left:' + ((x.v - lo) / (hi - lo) * 100).toFixed(2) + '%" title="' + x.k + ' ' + fP(x.v) + '"></i>'; }).join('');
    var leg = pts.slice().sort(function (a, b) { return a.v - b.v; }).map(function (x) { return '<span class="' + x.c + '"><i></i>' + x.k + ' <b>' + fP(x.v) + '</b></span>'; }).join('');
    return '<div class="tx-lad"><div class="tx-lad-bar">' + dots + '</div><div class="tx-lad-leg">' + leg + '</div></div>';
  }
  function openPos(sym) {
    if (!sym || !getPos(sym)) return;
    T.pm = sym; var pm = $('txPm'); pm.hidden = false; pm.__sym = null; renderPm();
  }
  function closePm() { T.pm = null; var pm = $('txPm'); if (pm) { pm.hidden = true; pm.innerHTML = ''; pm.__sym = null; } }
  function renderPm() {
    var pm = $('txPm'); if (!pm || !T.pm) return;
    var p = getPos(T.pm);
    if (!p) { closePm(); toast('Position closed', 'ok'); return; }
    if (pm.__sym !== p.sym) {
      pm.__sym = p.sym;
      pm.innerHTML = '<div class="tx-pm-bd" data-a="pmclose"></div><div class="tx-pm-sh" role="dialog" aria-modal="true">' +
        '<div class="tx-pm-h">' + ico(p.c) + '<span class="tx-pm-t"><b>' + p.sym + '/' + qOf(p.sym) + '</b><small>' + esc(p.c.name) + ' · Position</small></span><button type="button" class="tx-x" data-a="pmclose" aria-label="Close">×</button></div>' +
        '<div class="tx-pm-body"><div id="txPmLive"></div>' +
          '<div class="tx-pm-sec"><h4>Protect this position</h4><p class="tx-pm-n lite">Set a price where it sells automatically: a stop-loss limits a loss, a take-profit locks in a gain.</p>' +
            '<div class="tx-pm-g"><div><label>Stop-loss price</label><div class="tx-in sm"><input id="txPmSl" type="number" inputmode="decimal" step="any" placeholder="0.00"><em class="tx-qu">' + Q + '</em></div><div class="tx-chips">' + [-3, -5, -10].map(function (v) { return '<button type="button" data-a="pmchip" data-f="txPmSl" data-v="' + v + '">' + v + '%</button>'; }).join('') + '</div></div>' +
            '<div><label>Take-profit price</label><div class="tx-in sm"><input id="txPmTp" type="number" inputmode="decimal" step="any" placeholder="0.00"><em class="tx-qu">' + Q + '</em></div><div class="tx-chips">' + [3, 5, 10, 20].map(function (v) { return '<button type="button" data-a="pmchip" data-f="txPmTp" data-v="' + v + '">+' + v + '%</button>'; }).join('') + '</div></div></div>' +
            '<button type="button" class="tx-go conv" id="txPmSet" data-a="pmset">Set stop-loss / take-profit</button></div>' +
          '<div class="tx-pm-sec"><h4>Close position</h4><div class="tx-chips pct"><button type="button" data-a="pmsell" data-v="25">25%</button><button type="button" data-a="pmsell" data-v="50">50%</button><button type="button" data-a="pmsell" data-v="75">75%</button><button type="button" data-a="pmsell" data-v="100">Close all</button></div></div>' +
          '<div id="txPmOrd"></div><div id="txPmFills"></div></div>' +
        '<div class="tx-pm-ft"><button type="button" class="tx-go buy" data-a="pmtrade">Trade ' + p.sym + '</button></div></div>';
      var ps = pm.querySelector('#txPmSl'), pt = pm.querySelector('#txPmTp');
      if (p.sl > 0) ps.value = rnd(p.sl); if (p.tp > 0) pt.value = rnd(p.tp);
    }
    var lite = isLite(), s = (LV.coin === p.sym && LV.stats) ? LV.stats : null, c = pnlCls(p.pnl);
    var say = '';
    if (lite) {
      say = '<p class="tx-pm-say">You hold <b>' + fQty(p.bal, p.sym) + ' ' + p.sym + '</b>' + (p.entry > 0 ? ', bought at about <b>' + fP(p.entry) + '</b>' : '') + '. Right now it is worth <b>' + fUsd(p.value) + '</b>' +
        (p.pnl != null ? ' — that is a <b class="' + c + '">' + (p.pnl >= 0 ? 'profit' : 'loss') + ' of ' + fPnl(p.pnl) + ' (' + fPct(p.pct) + ')</b>' : '') + '. If you sell now you receive about <b>' + fUsd(p.value) + '</b>.</p>';
    }
    var slInfo = p.sl > 0 ? fP(p.sl) + ' <em class="dn">' + fPct((p.sl / p.mark - 1) * 100) + (p.entry > 0 ? ' · ' + fPnl((p.sl - p.entry) * p.bal) + ' vs entry' : '') + '</em>' : '<em class="warn">Not set</em>';
    var tpInfo = p.tp > 0 ? fP(p.tp) + ' <em class="up">' + fPct((p.tp / p.mark - 1) * 100) + (p.entry > 0 ? ' · ' + fPnl((p.tp - p.entry) * p.bal) + ' vs entry' : '') + '</em>' : '<em class="mut">Not set</em>';
    var grid = kv('Size', fQty(p.bal, p.sym) + ' ' + p.sym) + kv('Position value', fUsd(p.value)) + kv('Avg entry price', p.entry > 0 ? fP(p.entry) + (p.approx ? ' ~' : '') : '—') + kv('Mark price', fP(p.mark));
    if (!lite) grid += kv('Break-even', p.entry > 0 ? fP(p.entry) : '—') + kv('Cost basis', p.entry > 0 ? fUsd(p.cost) : '—') + kv('Realized PnL', fPnl(p.real), pnlCls(p.real)) + kv('24h change', (p.chg >= 0 ? '+' : '') + p.chg.toFixed(2) + '%', p.chg >= 0 ? 'up' : 'dn') +
      (s ? kv('24h High', fP(s.high)) + kv('24h Low', fP(s.low)) : '');
    var risk = '<div class="tx-pm-sec tx-risk"><h4>Risk &amp; liquidation</h4>' +
      '<div class="tx-rr"><span>Liquidation price</span><b class="ok">None <small>· spot, no leverage</small></b></div>' +
      '<div class="tx-rr"><span>Max possible loss</span><b>' + fUsd(p.entry > 0 ? p.cost : p.value) + ' <small>(what you paid)</small></b></div>' +
      '<div class="tx-rr"><span>Stop-loss</span><b>' + slInfo + '</b></div><div class="tx-rr"><span>Take-profit</span><b>' + tpInfo + '</b></div>' +
      ladder(p) + (lite ? '<p class="tx-pm-n">Spot trading has no liquidation: you own the real coins, so nobody can close your position by force. The most you can lose is what you paid. A stop-loss is your safety net — it sells for you if the price falls to your level.</p>' : '<p class="tx-pm-n">Spot position: no leverage and no margin calls. Risk is limited to cost basis; use a stop-loss to cap it.</p>') + '</div>';
    var live = '<div class="tx-pm-pnl ' + c + '"><small>Unrealized PnL</small><b>' + fPnl(p.pnl) + '</b><em>' + fPct(p.pct) + '</em></div>' + say + '<div class="tx-kvs">' + grid + '</div>' + risk;
    var L = $('txPmLive'); if (L && L.__h !== live) { L.__h = live; L.innerHTML = live; }
    var ord = p.ords.length ? '<div class="tx-pm-sec"><h4>Active orders</h4>' + p.ords.map(function (o) { return '<div class="tx-pm-o"><span><b>' + typeLabel(o) + '</b> ' + fQty(qtyOf(o), p.sym) + ' ' + p.sym + '</span><span>' + trigText(o) + '</span><button type="button" class="tx-cancel" data-a="pmcancel" data-id="' + esc(o.id) + '">Cancel</button></div>'; }).join('') + '</div>' : '';
    var O = $('txPmOrd'); if (O && O.__h !== ord) { O.__h = ord; O.innerHTML = ord; }
    var fl = p.fills.length ? '<div class="tx-pm-sec"><h4>Recent fills</h4>' + p.fills.map(function (o) { return '<div class="tx-pm-o"><span><span class="tx-side ' + o.type + '">' + (o.type === 'buy' ? 'BUY' : 'SELL') + '</span> ' + fQty(qtyOf(o), p.sym) + ' ' + p.sym + '</span><span>@ ' + fP(o.execPrice || o.price) + '</span><span class="mut">' + fTime(o.filledAt || o.ts) + '</span></div>'; }).join('') + '</div>' : '';
    var F = $('txPmFills'); if (F && F.__h !== fl) { F.__h = fl; F.innerHTML = fl; }
  }
  function pmSell(pct) {
    var p = getPos(T.pm); if (!p || !(pct > 0)) return;
    var qty = pct >= 100 ? floorTo(p.bal, 8) : floorTo(p.bal * pct / 100, 8); if (!(qty > 0)) return;
    var rows = [['Pair', p.sym + '/' + qOf(p.sym)], ['You sell', fQty(qty, p.sym) + ' ' + p.sym + (pct < 100 ? ' (' + pct + '%)' : ' (all)')], ['Price', '≈ ' + fP(p.mark)], ['You receive', '≈ ' + fUsd(qty * p.mark)]];
    if (p.entry > 0) rows.push(['Result vs entry', fPnl((p.mark - p.entry) * qty)]);
    confirmBox('Close ' + (pct < 100 ? pct + '% of ' : '') + p.sym + ' position', rows, 'sell', 'Market order: filled at the live price. Open stop-loss / take-profit orders for this coin stay active and sell whatever is left.').then(function (ok) {
      if (!ok) return;
      placeOrder({ side: 'sell', sym: p.sym, amt: qty, otype: 'market', px: p.mark, quiet: true }).catch(function (e) { toast(e && e.message ? e.message : 'Order failed', 'err'); });
    });
  }
  function pmSet() {
    var p = getPos(T.pm); if (!p) return;
    var sl = num('txPmSl'), tp = num('txPmTp'), mark = p.mark;
    if (!(sl > 0) && !(tp > 0)) { toast('Enter a stop-loss and/or take-profit price', 'err'); return; }
    if (sl > 0 && sl >= mark) { toast('Stop-loss must be below the current price (' + fP(mark) + ')', 'err'); return; }
    if (tp > 0 && tp <= mark) { toast('Take-profit must be above the current price (' + fP(mark) + ')', 'err'); return; }
    var o = { side: 'sell', sym: p.sym, amt: floorTo(p.bal, 8), px: mark, quiet: true };
    if (sl > 0 && tp > 0) { o.otype = 'oco'; o.pt = tp; o.ps = sl; } else if (sl > 0) { o.otype = 'stop'; o.ps = sl; } else { o.otype = 'tp'; o.pt = tp; }
    var old = p.ords.filter(function (x) { return x.orderType === 'stop' || x.orderType === 'tp' || x.orderType === 'oco'; });
    var rows = [['Position', fQty(p.bal, p.sym) + ' ' + p.sym]];
    if (sl > 0) rows.push(['Stop-loss (sell at ≤)', fP(sl) + ' (' + fPct((sl / mark - 1) * 100) + ')']);
    if (tp > 0) rows.push(['Take-profit (sell at ≥)', fP(tp) + ' (' + fPct((tp / mark - 1) * 100) + ')']);
    confirmBox('Protect ' + p.sym, rows, 'sell', old.length ? 'Your existing stop-loss / take-profit orders for ' + p.sym + ' will be replaced.' : 'The position is sold automatically when the price reaches your level.').then(function (ok) {
      if (!ok) return;
      var b = $('txPmSet'); if (b) b.disabled = true;
      var chain = Promise.resolve();
      old.forEach(function (x) { chain = chain.then(function () { return api('cancelOrder', { orderId: x.id }); }); });
      chain.then(function () { return placeOrder(o); }).catch(function (e) { toast(e && e.message ? e.message : 'Could not set protection', 'err'); }).then(function () { var bb = $('txPmSet'); if (bb) bb.disabled = false; });
    });
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && T.pm && !$('txConfirm')) { closePm(); } }, true);

  window.openTradeTerminalFull = function (sym, opts) {
    if (!build()) { console.warn('[TX] #tradeTerminal not found'); return; }
    var root = $('tradeTerminal');
    root.classList.add('on');
    try { applyQuote(); } catch (e) {}
    try { applyMode(); } catch (e) {}
    document.documentElement.classList.add('tx-lock');
    T.open = true; T.seen = 0;
    if (typeof sym === 'string' && /^[A-Z0-9]{2,10}$/.test(sym)) T.coin = sym;
    if (!T.coins.length) setCoins(FALLBACK.map(function (f) { return { symbol: f[0], name: f[1], usd: 0, chg: 0, color: f[2] }; }));
    loadMarkets().then(function () { pickCoin(T.coin, true); });
    pickCoin(T.coin, true);
    startTimers();
    refreshOrders(true);
    try { if (opts && opts.side && (opts.side === 'convert' || opts.side === 'buy' || opts.side === 'sell')) setSide(opts.side); } catch (e) {}
  };
  window.closeTradeTerminalFull = closeTerminal;

  function closeTerminal() {
    try { closePm(); } catch (e) {}
    var root = $('tradeTerminal');
    if (root) root.classList.remove('on');
    document.documentElement.classList.remove('tx-lock');
    T.open = false;
    closeMkts();
    liveStop(); tvDestroy();
    Object.keys(TMR).forEach(function (k) { clearInterval(TMR[k]); clearTimeout(TMR[k]); TMR[k] = 0; });
    refreshApp();
  }
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || !T.open) return;
    if ($('txConfirm')) return;
    var m = $('txMkts');
    if (m && !m.hidden) { closeMkts(); return; }
    closeTerminal();
  });

  function startTimers() {
    clearInterval(TMR.orders); clearInterval(TMR.markets);
    TMR.orders = setInterval(function () { if (T.open && !document.hidden) refreshOrders(false); }, 4000);
    TMR.markets = setInterval(function () { if (T.open && !document.hidden) refreshMarkets(); }, 8000);
  }

  /* ============================================================
     MARKETS
     ============================================================ */
  function setCoins(list) {
    T.coins = list; T.map = {};
    list.forEach(function (c) { T.map[c.symbol] = c; });
    if (!T.map[T.coin]) T.coin = list[0] ? list[0].symbol : 'BTC';
    renderMList(); fillConvSelects(false);
  }
  function loadMarkets() {
    return fetch(workerUrl() + '?action=multiPrices').then(function (r) { return r.json(); }).then(function (d) {
      if (!d || !d.ok || !d.coins || !d.coins.length) throw new Error('no prices');
      var prev = T.map;
      setCoins(d.coins.filter(function (c) { return c && c.symbol && c.usd > 0; }).map(function (c) {
        return { symbol: c.symbol, name: c.name || c.symbol, usd: Number(c.usd) || 0, chg: Number(c.change24h) || 0, color: c.icon || '#5b6b82', vol: Number(c.volume24h) || 0 };
      }));
      Object.keys(prev).forEach(function (k) { if (T.map[k] && prev[k].live) { T.map[k].usd = prev[k].usd; T.map[k].chg = prev[k].chg; T.map[k].live = true; } });
      refreshMarkets();
    }).catch(noop);
  }
  function refreshMarkets() {
    var syms = T.coins.map(function (c) { return c.symbol; }).filter(function (s) { return s !== 'USDT'; });
    if (!syms.length) return;
    var list = encodeURIComponent(JSON.stringify(syms.map(function (s) { return s + 'USDT'; })));
    fetch('https://api.binance.com/api/v3/ticker/24hr?symbols=' + list).then(function (r) { return r.json(); }).then(function (d) {
      if (!Array.isArray(d)) return;
      d.forEach(function (t) {
        var s = String(t.symbol).replace(/USDT$/, ''), c = T.map[s]; if (!c) return;
        c.usd = parseFloat(t.lastPrice) || c.usd; c.chg = parseFloat(t.priceChangePercent) || 0; c.vol = parseFloat(t.quoteVolume) || 0; c.live = true;
      });
      var m = $('txMkts'); if (m && !m.hidden) renderMList();
      if (!liveFresh('ticker')) paintHead();
    }).catch(noop);
  }
  function toggleMkts() { var m = $('txMkts'); if (!m) return; if (m.hidden) { m.hidden = false; $('txSearch').value = ''; renderMList(); setTimeout(function () { try { if (innerWidth > 900) $('txSearch').focus(); } catch (e) {} }, 30); } else closeMkts(); }
  function closeMkts() { var m = $('txMkts'); if (m) m.hidden = true; }
  function toggleFav(s) { var i = T.fav.indexOf(s); if (i >= 0) T.fav.splice(i, 1); else T.fav.push(s); lsSet('nc_tt_fav', JSON.stringify(T.fav)); renderMList(); }
  var ICO_SRC = [
    function (l) { return 'https://assets.coincap.io/assets/icons/' + l + '@2x.png'; },
    function (l) { return 'https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/svg/color/' + l + '.svg'; },
    function (l) { return 'https://s2.coinmarketcap.com/static/img/coins/64x64/' + ({btc:1,eth:1027,usdt:825,sol:5426,bnb:1839,xrp:52,ada:2010,doge:74,trx:1958,avax:5805,link:1975,dot:6636,ltc:2,bch:1831,xlm:512,atom:3794,uni:7083,near:6535,etc:1321,shib:5994,sui:20947,aave:7278,ton:11419,apt:21794}[l] || 0) + '.png'; }
  ];
  function icoImg(sym) {
    var l = String(sym || '').toLowerCase();
    if (!/^[a-z0-9]{2,10}$/.test(l)) return '';
    return '<img class="tx-cimg" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" data-l="' + l + '" data-i="0" src="' + ICO_SRC[0](l) + '">';
  }
  document.addEventListener('error', function (e) {
    var im = e.target; if (!im || im.tagName !== 'IMG' || !/\btx-cimg\b/.test(im.className)) return;
    var i = (+im.getAttribute('data-i') || 0) + 1, l = im.getAttribute('data-l');
    if (i < ICO_SRC.length) { im.setAttribute('data-i', i); im.src = ICO_SRC[i](l); } else if (im.parentNode) im.parentNode.removeChild(im);
  }, true);
  document.addEventListener('load', function (e) {
    var im = e.target; if (!im || im.tagName !== 'IMG' || !/\btx-cimg\b/.test(im.className)) return;
    if (im.naturalWidth < 8) { im.dispatchEvent(new Event('error')); return; }
    if (im.parentNode) im.parentNode.classList.add('ld');
  }, true);
  function ico(c) { return '<i class="tx-ci" style="--c:' + esc(c.color) + '">' + esc(glyph(c.symbol)) + icoImg(c.symbol) + '</i>'; }
  function renderMList() {
    var box = $('txMList'); if (!box) return;
    var term = String(($('txSearch') || {}).value || '').trim().toLowerCase();
    var rows = T.coins.filter(function (c) {
      if (T.mtab === 'fav' && T.fav.indexOf(c.symbol) < 0) return false;
      return !term || c.symbol.toLowerCase().indexOf(term) >= 0 || String(c.name).toLowerCase().indexOf(term) >= 0;
    });
    if (!rows.length) { box.innerHTML = '<div class="tx-empty">' + (T.mtab === 'fav' ? 'No favorites yet — tap ☆ next to a coin' : 'No markets found') + '</div>'; return; }
    box.innerHTML = rows.map(function (c) {
      var up = c.chg >= 0, fav = T.fav.indexOf(c.symbol) >= 0;
      return '<div class="tx-mrow' + (c.symbol === T.coin ? ' on' : '') + '" data-a="pick" data-s="' + c.symbol + '">' +
        '<button type="button" class="tx-star' + (fav ? ' on' : '') + '" data-a="fav" data-s="' + c.symbol + '" aria-label="Favorite">' + (fav ? '★' : '☆') + '</button>' + ico(c) +
        '<span class="tx-mn"><b>' + c.symbol + '<small>/' + qOf(c.symbol) + '</small></b><em>' + esc(c.name) + '</em></span>' +
        '<span class="tx-mp"><b>' + fP(c.usd) + '</b><em class="' + (up ? 'up' : 'dn') + '">' + (up ? '+' : '') + (Number(c.chg) || 0).toFixed(2) + '%</em></span></div>';
    }).join('');
  }

  function pickCoin(sym, force) {
    if (!sym) return;
    if (!T.map[sym]) sym = T.coins[0] ? T.coins[0].symbol : 'BTC';
    var changed = sym !== T.coin || force;
    var coinChanged = sym !== T.coin;
    T.coin = sym; lsSet('nc_tt_coin', sym);
    if (!changed) return;
    var m = coinMeta(sym);
    $('txIco').outerHTML = '<span id="txIco" class="tx-ci" style="--c:' + esc(m.color) + '">' + esc(glyph(sym)) + icoImg(sym) + '</span>';
    $('txPair').textContent = sym + '/' + qOf(sym); $('txName').textContent = m.name;
    $('txBookSym').textContent = sym + '/' + qOf(sym);
    if (coinChanged || force) { LV.bids = []; LV.asks = []; LV.trades = []; paintBook(); paintTrades(); }
    paintHead();
    if (coinChanged) { $('txAmt').value = ''; $('txRng').value = 0; }
    setType(T.otype, !coinChanged);
    renderMList();
    if (T.open && (coinChanged || !LV.ws)) { liveSwitch(sym); tvLoad(); }
    renderBottom(true);
  }

  /* ============================================================
     LIVE DATA (Binance public market data)
     ============================================================ */
  function liveFresh(kind) {
    var t = kind === 'depth' ? LV.depthAt : (kind === 'trade' ? LV.tradeAt : LV.tickerAt);
    return LV.coin === T.coin && !!t && (Date.now() - t) < (kind === 'trade' ? 30000 : 7000);
  }
  function liveStop() {
    clearTimeout(LV.retryT); clearInterval(LV.pollT); LV.pollT = 0; LV.mode = '';
    var ws = LV.ws; LV.ws = null;
    if (ws) { try { ws.onclose = null; ws.onmessage = null; ws.close(); } catch (e) {} }
    setLive();
  }
  function liveSwitch(coin) {
    liveStop();
    LV.coin = coin; LV.tickerAt = 0; LV.depthAt = 0; LV.tradeAt = 0; LV.stats = null; LV.fail = 0; LV.trades = []; LV.bids = []; LV.asks = [];
    if (coin === 'USDT') { LV.price.USDT = 1; LV.priceAt.USDT = Date.now() + 86400000; LV.stats = { open: 1, high: 1, low: 1, vol: 0, pct: 0 }; LV.tickerAt = Date.now() + 86400000; paintHead(); setLive(); return; }
    if (!T.open) return;
    liveRest(coin);
    liveOpen(coin);
  }
  function bsym(coin) { return coin.toLowerCase() + 'usdt'; }
  function liveOpen(coin) {
    var s = bsym(coin), ws;
    try { ws = new WebSocket('wss://stream.binance.com:9443/stream?streams=' + s + '@ticker/' + s + '@depth20@1000ms/' + s + '@trade'); } catch (e) { livePollStart(coin); return; }
    LV.ws = ws; var opened = false;
    ws.onopen = function () { opened = true; LV.fail = 0; clearInterval(LV.pollT); LV.pollT = 0; LV.mode = 'ws'; setLive(); };
    ws.onmessage = function (ev) { if (LV.ws !== ws || T.coin !== coin) return; try { onLive(JSON.parse(ev.data)); } catch (e) {} };
    ws.onerror = noop;
    ws.onclose = function () {
      if (LV.ws !== ws) return; LV.ws = null;
      if (!T.open || T.coin !== coin) return;
      LV.fail++; if (LV.fail >= 2) livePollStart(coin);
      clearTimeout(LV.retryT);
      LV.retryT = setTimeout(function () { if (T.open && T.coin === coin && !LV.ws) liveOpen(coin); }, Math.min(15000, 1500 * LV.fail));
    };
    setTimeout(function () { if (LV.ws === ws && !opened) livePollStart(coin); }, 6000);
  }
  function livePollStart(coin) {
    if (LV.pollT || !T.open) return; LV.mode = 'poll'; setLive();
    LV.pollT = setInterval(function () { if (!T.open || T.coin !== coin) { clearInterval(LV.pollT); LV.pollT = 0; return; } liveRest(coin); }, 3000);
  }
  function liveRest(coin) {
    var sym = bsym(coin).toUpperCase(), base = 'https://api.binance.com/api/v3/';
    function get(p) { return fetch(base + p).then(function (r) { return r.json(); }); }
    get('ticker/24hr?symbol=' + sym).then(function (d) { if (T.coin === coin && d && d.lastPrice) onLive({ stream: 'rest@ticker', data: { c: d.lastPrice, o: d.openPrice, P: d.priceChangePercent, h: d.highPrice, l: d.lowPrice, v: d.volume } }); }).catch(noop);
    get('depth?symbol=' + sym + '&limit=20').then(function (d) { if (T.coin === coin && d && d.bids) onLive({ stream: 'rest@depth20', data: { bids: d.bids, asks: d.asks } }); }).catch(noop);
    get('trades?symbol=' + sym + '&limit=30').then(function (d) {
      if (T.coin !== coin || !Array.isArray(d)) return;
      LV.trades = d.slice().reverse().map(function (t) { return { p: +t.price, q: +t.qty, s: t.isBuyerMaker ? 'sell' : 'buy', t: t.time }; });
      LV.tradeAt = Date.now(); schedTrades();
    }).catch(noop);
  }
  function onLive(m) {
    var d = m && m.data, st = (m && m.stream) || ''; if (!d) return;
    if (st.indexOf('@ticker') > 0) liveTicker(d); else if (st.indexOf('@depth') > 0) liveDepth(d); else if (st.indexOf('@trade') > 0) liveTrade(d);
  }
  function liveTicker(d) {
    var p = parseFloat(d.c); if (!(p > 0)) return;
    var prev = LV.price[LV.coin];
    LV.price[LV.coin] = p; LV.priceAt[LV.coin] = Date.now(); LV.tickerAt = Date.now();
    LV.stats = { open: parseFloat(d.o) || p, high: parseFloat(d.h) || p, low: parseFloat(d.l) || p, vol: parseFloat(d.v) || 0, pct: parseFloat(d.P) || 0 };
    var c = T.map[LV.coin]; if (c) { c.usd = p; c.chg = LV.stats.pct; c.live = true; }
    paintHead(prev); setLive(); schedCalc();
  }
  function liveDepth(d) {
    var b = d.bids || d.b, a = d.asks || d.a; if (!b || !a || !b.length || !a.length) return;
    function row(x) { var p = parseFloat(x[0]), qq = parseFloat(x[1]); return { p: p, q: qq, t: p * qq }; }
    LV.bids = b.slice(0, 16).map(row); LV.asks = a.slice(0, 16).map(row);
    LV.depthAt = Date.now(); schedBook();
  }
  function liveTrade(d) {
    LV.trades.unshift({ p: parseFloat(d.p), q: parseFloat(d.q), s: d.m ? 'sell' : 'buy', t: d.T || Date.now() });
    if (LV.trades.length > 40) LV.trades.length = 40;
    LV.tradeAt = Date.now(); schedTrades();
  }
  function schedBook() { if (TMR.book) return; TMR.book = setTimeout(function () { TMR.book = 0; paintBook(); }, 250); }
  function schedTrades() { if (TMR.trades) return; TMR.trades = setTimeout(function () { TMR.trades = 0; paintTrades(); }, 350); }
  function schedCalc() { if (TMR.calc) return; TMR.calc = setTimeout(function () { TMR.calc = 0; calc(); calcConv(); }, 400); }

  function setLive() {
    var el = $('txLive'); if (!el) return;
    var ok = liveFresh('ticker') && LV.coin !== 'USDT' ? (LV.mode === 'ws' ? 'live' : 'delayed') : (LV.coin === 'USDT' ? 'live' : 'off');
    el.setAttribute('data-s', ok);
    q('em', el).textContent = ok === 'live' ? 'LIVE' : (ok === 'delayed' ? 'DELAYED' : 'CONNECTING');
  }
  setInterval(function () { if (T.open) setLive(); }, 3000);

  function paintHead(prev) {
    if (!$('txPrice')) return;
    var sym = T.coin, p = livePx(sym), s = (LV.coin === sym && LV.stats) ? LV.stats : null, m = coinMeta(sym);
    var pe = $('txPrice'), txt = fP(p);
    if (pe.textContent !== txt) {
      pe.textContent = txt;
      if (prev && prev !== p) { pe.classList.remove('up', 'dn'); void pe.offsetWidth; pe.classList.add(p > prev ? 'up' : 'dn'); }
    }
    var pct = s ? s.pct : (Number(m.chg) || 0), ce = $('txChg');
    var ct = (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%';
    if (ce.textContent !== ct) ce.textContent = ct;
    ce.className = 'tx-chg ' + (pct >= 0 ? 'up' : 'dn');
    set('txO', s ? fP(s.open) : '—'); set('txH', s ? fP(s.high) : '—'); set('txL', s ? fP(s.low) : '—'); set('txC', p > 0 ? fP(p) : '—');
    set('txV', s ? fVol(s.vol) + ' ' + sym : '—');
    try { posTick(); } catch (e) {}
  }
  function set(id, v) { var e = $(id); if (e && e.textContent !== v) e.textContent = v; }

  function paintBook() {
    var A = $('txAsks'), B = $('txBids'); if (!A || !B) return;
    if (!LV.bids.length || !LV.asks.length || LV.coin !== T.coin) {
      var msg = LV.coin === 'USDT' ? 'Order book is not available for USDT' : 'Waiting for live order book…';
      A.innerHTML = '<div class="tx-empty">' + msg + '</div>'; B.innerHTML = ''; q('#txMid').innerHTML = '<b>' + fP(livePx(T.coin)) + '</b><small>Spread —</small>'; return;
    }
    var asks = LV.asks.slice(0, 14), bids = LV.bids.slice(0, 14);
    var ca = 0, asksC = asks.map(function (r) { ca += r.q; return ca; }), cb = 0, bidsC = bids.map(function (r) { cb += r.q; return cb; });
    var maxA = asksC[asksC.length - 1] || 1, maxB = bidsC[bidsC.length - 1] || 1;
    var ah = '';
    for (var i = asks.length - 1; i >= 0; i--) ah += bookRow(asks[i], 'ask', asksC[i] / maxA);
    var bh = '';
    for (var j = 0; j < bids.length; j++) bh += bookRow(bids[j], 'bid', bidsC[j] / maxB);
    A.innerHTML = ah; B.innerHTML = bh;
    var spread = asks[0].p - bids[0].p, mid = $('txMid'), last = livePx(T.coin);
    mid.innerHTML = '<b class="' + (last >= (mid.__l || 0) ? 'up' : 'dn') + '">' + fP(last) + '</b><small>Spread ' + (spread / bids[0].p * 100).toFixed(3) + '%</small>';
    mid.__l = last;
  }
  function bookRow(r, cls, w) {
    return '<div class="tx-br ' + cls + '" data-a="bookpx" data-p="' + r.p + '"><i style="width:' + (Math.max(2, w * 100)).toFixed(1) + '%"></i><span>' + fP(r.p).slice(1) + '</span><span>' + fQty(r.q, T.coin) + '</span><span>' + fVol(r.t) + '</span></div>';
  }
  function bookPick(p) {
    if (!(p > 0)) return;
    if (T.side === 'convert') return;
    if (T.otype === 'market') setType('limit');
    var f = T.otype === 'limit' ? 'txPL' : (T.otype === 'stop' ? 'txPS' : (T.otype === 'tp' ? 'txPT' : 'txPL'));
    var e = $(f); if (e && !e.closest('[hidden]')) { e.value = rnd(p); calc(); }
    setView('chart');
  }
  function paintTrades() {
    var el = $('txTL'); if (!el) return;
    if (!LV.trades.length || LV.coin !== T.coin) { el.innerHTML = '<div class="tx-empty">' + (LV.coin === 'USDT' ? 'Not available for USDT' : 'Waiting for live trades…') + '</div>'; return; }
    el.innerHTML = LV.trades.slice(0, 30).map(function (t) {
      return '<div class="tx-tr ' + t.s + '"><span>' + fP(t.p).slice(1) + '</span><span>' + fQty(t.q, T.coin) + '</span><span>' + new Date(t.t).toLocaleTimeString('en-GB') + '</span></div>';
    }).join('');
  }
  function setView(v) {
    T.view = v; var root = $('tradeTerminal'); root.setAttribute('data-view', v);
    qa('.tx-views button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-v') === v); });
    if (v === 'chart') setTimeout(function () { if (T.tvActive === false) fbDraw(); }, 30);
  }

  /* ============================================================
     CHART: TradingView + fallback (real klines)
     ============================================================ */
  function tvScript(cb) {
    if (window.TradingView && window.TradingView.widget) { cb(true); return; }
    TV_CBS.push(cb); if (TV_LOADING) return; TV_LOADING = true;
    var done = false;
    function fin(ok) { if (done) return; done = true; TV_LOADING = false; var l = TV_CBS.slice(); TV_CBS = []; l.forEach(function (f) { try { f(ok && !!(window.TradingView && window.TradingView.widget)); } catch (e) {} }); }
    var s = document.createElement('script'); s.src = 'https://s3.tradingview.com/tv.js'; s.async = true;
    s.onload = function () { fin(true); }; s.onerror = function () { fin(false); };
    document.head.appendChild(s); setTimeout(function () { fin(false); }, 10000);
  }
  function tvSym(c) { return c === 'USDT' ? 'KRAKEN:USDTUSD' : 'BINANCE:' + c + 'USDT'; }
  function tvLoad() {
    var host = $('txTv'); if (!host || !T.open) return;
    if (T.tvFailed) { fbShow(); return; }
    var coin = T.coin, note = $('txChartNote');
    host.hidden = false; $('txFb').hidden = true;
    note.hidden = false; note.textContent = 'Loading chart…';
    if (!(window.TradingView && window.TradingView.widget)) {
      tvScript(function (ok) { if (!ok) { tvFail(); } else if (T.open && T.coin === coin) tvLoad(); });
      return;
    }
    var id = 'txTvIn' + (++TVN), inner = document.createElement('div');
    inner.id = id; inner.className = 'tx-tv-in'; host.innerHTML = ''; host.appendChild(inner);
    try {
      new window.TradingView.widget({
        autosize: true, symbol: tvSym(coin), interval: '60', timezone: 'Etc/UTC', theme: 'dark', style: '1', locale: 'en',
        toolbar_bg: '#0a1019', backgroundColor: '#0a1019', gridColor: 'rgba(255,255,255,0.04)',
        enable_publishing: false, allow_symbol_change: false, save_image: false, withdateranges: true,
        hide_side_toolbar: window.innerWidth < 700, studies: ['Volume@tv-basicstudies'],
        overrides: {
          'mainSeriesProperties.candleStyle.upColor': '#12d18e', 'mainSeriesProperties.candleStyle.downColor': '#ff5470',
          'mainSeriesProperties.candleStyle.borderUpColor': '#12d18e', 'mainSeriesProperties.candleStyle.borderDownColor': '#ff5470',
          'mainSeriesProperties.candleStyle.wickUpColor': '#12d18e', 'mainSeriesProperties.candleStyle.wickDownColor': '#ff5470'
        },
        container_id: id
      });
    } catch (e) { tvFail(); return; }
    T.tvActive = true; $('txFb').hidden = true; host.hidden = false;
    clearTimeout(TV_WATCH);
    TV_WATCH = setTimeout(function () { if (T.open && T.tvActive && !host.querySelector('iframe')) tvFail(); else note.hidden = true; }, 12000);
    var chk = setInterval(function () { if (!T.open || host.querySelector('iframe')) { clearInterval(chk); if (host.querySelector('iframe')) note.hidden = true; } }, 400);
  }
  function tvFail() { T.tvFailed = true; T.tvActive = false; fbShow(); }
  function tvDestroy() { clearTimeout(TV_WATCH); var h = $('txTv'); if (h) h.innerHTML = ''; T.tvActive = false; }

  var FB = { coin: '', candles: [], at: 0 };
  function fbShow() {
    $('txTv').hidden = true; var cv = $('txFb'); cv.hidden = false; T.tvActive = false;
    var note = $('txChartNote'); note.hidden = false; note.innerHTML = 'TradingView unavailable — showing built-in chart · <a href="#" data-a="retrytv">retry</a>';
    fbLoad();
  }
  function fbLoad() {
    var coin = T.coin; if (coin === 'USDT') { FB.candles = []; fbDraw(); return; }
    fetch('https://api.binance.com/api/v3/klines?symbol=' + coin + 'USDT&interval=1h&limit=120').then(function (r) { return r.json(); }).then(function (d) {
      if (!Array.isArray(d) || T.coin !== coin) return;
      FB.coin = coin; FB.candles = d.map(function (k) { return { t: k[0], o: +k[1], h: +k[2], l: +k[3], c: +k[4], v: +k[5] }; }); fbDraw();
    }).catch(noop);
  }
  function fbDraw() {
    var cv = $('txFb'); if (!cv || cv.hidden || !T.open) return;
    var r = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    if (r.width < 10) return;
    cv.width = r.width * dpr; cv.height = r.height * dpr;
    var x = cv.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0);
    var w = r.width, h = r.height; x.fillStyle = '#0a1019'; x.fillRect(0, 0, w, h);
    var cs = FB.candles; if (!cs.length) return;
    var padR = 70, padB = 22, padT = 12, cw = (w - padR) / cs.length;
    var lo = Math.min.apply(null, cs.map(function (c) { return c.l; })), hi = Math.max.apply(null, cs.map(function (c) { return c.h; }));
    var pad = (hi - lo) * .06 || 1; lo -= pad; hi += pad;
    function Y(p) { return padT + (h - padT - padB) * (1 - (p - lo) / (hi - lo)); }
    x.font = '10px ui-monospace,monospace'; x.fillStyle = '#7f8da3'; x.strokeStyle = 'rgba(255,255,255,.05)'; x.textAlign = 'left';
    for (var i = 0; i <= 5; i++) { var pv = lo + (hi - lo) * i / 5, yy = Y(pv); x.beginPath(); x.moveTo(0, yy); x.lineTo(w - padR, yy); x.stroke(); x.fillText(fP(pv).slice(1), w - padR + 6, yy + 3); }
    cs.forEach(function (c, k) {
      var up = c.c >= c.o, col = up ? '#12d18e' : '#ff5470', cx = k * cw + cw / 2;
      x.strokeStyle = col; x.fillStyle = col; x.beginPath(); x.moveTo(cx, Y(c.h)); x.lineTo(cx, Y(c.l)); x.stroke();
      var top = Y(Math.max(c.o, c.c)), bh = Math.max(1, Math.abs(Y(c.o) - Y(c.c))); x.fillRect(k * cw + cw * .15, top, cw * .7, bh);
    });
    var last = livePx(T.coin), ly = Y(last);
    x.strokeStyle = 'rgba(200,255,77,.6)'; x.setLineDash([4, 4]); x.beginPath(); x.moveTo(0, ly); x.lineTo(w - padR, ly); x.stroke(); x.setLineDash([]);
    x.fillStyle = '#c8ff4d'; x.fillRect(w - padR + 2, ly - 9, padR - 4, 18); x.fillStyle = '#071002'; x.font = 'bold 10px ui-monospace,monospace'; x.fillText(fP(last).slice(1), w - padR + 6, ly + 3);
  }
  window.addEventListener('resize', function () { if (T.open && !T.tvActive) fbDraw(); });
  setInterval(function () { if (T.open && !T.tvActive && !($('txFb') || {}).hidden) fbDraw(); }, 2500);

  /* ============================================================
     ORDER FORM
     ============================================================ */
  var TYPES = {
    buy: [['market', 'Market'], ['limit', 'Limit'], ['stop', 'Stop']],
    sell: [['market', 'Market'], ['limit', 'Limit'], ['stop', 'Stop-Loss'], ['tp', 'Take-Profit'], ['oco', 'OCO']]
  };
  function setSide(s) {
    T.side = s;
    qa('.tx-sides button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-v') === s); });
    $('txFormTrade').hidden = s === 'convert'; $('txFormConv').hidden = s !== 'convert';
    if (s === 'convert') { fillConvSelects(false); calcConv(); return; }
    if (!typesFor(s).some(function (t) { return t[0] === T.otype; })) T.otype = 'market';
    var go = $('txGo'); go.className = 'tx-go ' + s;
    $('txAmt').value = ''; $('txRng').value = 0;
    setType(T.otype, true);
  }
  function setType(t, keep) {
    if (T.side === 'convert') return;
    if (!typesFor(T.side).some(function (x) { return x[0] === t; })) t = 'market';
    var changed = t !== T.otype; T.otype = t;
    $('txTypes').innerHTML = typesFor(T.side).map(function (x) { return '<button type="button" data-a="type" data-v="' + x[0] + '" class="' + (x[0] === t ? 'on' : '') + '">' + x[1] + '</button>'; }).join('');
    var show = { pl: t === 'limit', ps: t === 'stop' || t === 'oco', pt: t === 'tp' || t === 'oco', att: T.side === 'buy' && t === 'market', amt: true };
    qa('#txFormTrade [data-g]').forEach(function (g) { g.hidden = !show[g.getAttribute('data-g')]; });
    $('txPSL').textContent = T.side === 'buy' ? 'Stop price (buy when price rises to)' : 'Stop-loss price (trigger)';
    $('txAmtL').textContent = T.side === 'buy' ? 'Spend' : 'Amount';
    $('txAmtU').textContent = T.side === 'buy' ? Q : T.coin;
    var p = livePx(T.coin);
    var bs = T.side === 'buy';
    function chips(id, f, arr) { $(id).innerHTML = '<button type="button" data-a="chip" data-f="' + f + '" data-v="0">Last</button>' + arr.map(function (v) { return '<button type="button" data-a="chip" data-f="' + f + '" data-v="' + v + '">' + (v > 0 ? '+' : '') + v + '%</button>'; }).join(''); }
    chips('txChipL', 'txPL', bs ? [-1, -3, -5, -10] : [1, 3, 5, 10]);
    chips('txChipS', 'txPS', bs ? [1, 3, 5, 10] : [-1, -3, -5, -10]);
    chips('txChipT', 'txPT', [2, 5, 10, 20]);
    if (p > 0 && (changed || !keep || !$('txPL').value)) {
      $('txPL').value = rnd(p * (bs ? 0.99 : 1.01));
      $('txPS').value = rnd(p * (bs ? 1.03 : 0.97));
      $('txPT').value = rnd(p * 1.05);
    }
    $('txGo').className = 'tx-go ' + T.side;
    calc();
  }
  function pctAmt(pct) {
    if (T.side === 'buy') $('txAmt').value = pct >= 1 ? String(floorTo(usdBal(), 2)) : String(floorTo(usdBal() * pct, 2));
    else $('txAmt').value = pctVal(coinBal(T.coin), pct, 8);
    $('txRng').value = Math.round(pct * 100); calc();
  }
  function rngToAmt() { pctAmt(Number($('txRng').value) / 100); }
  function amtToRng() {
    var bal = T.side === 'buy' ? usdBal() : coinBal(T.coin), v = num('txAmt');
    $('txRng').value = bal > 0 ? Math.min(100, Math.round(v / bal * 100)) : 0;
  }

  // validation shared by calc() and submit(): returns {err, order}
  function readOrder() {
    var side = T.side, sym = T.coin, px = livePx(sym), t = T.otype, amt = num('txAmt'), buy = side === 'buy';
    var o = { side: side, sym: sym, otype: t, amt: amt, px: px, pl: num('txPL'), ps: num('txPS'), pt: num('txPT'), err: '' };
    if (!(px > 0)) { o.err = 'Price unavailable — please wait'; return o; }
    if (!(amt > 0)) { o.err = ''; o.empty = true; return o; }
    if (buy && amt < 10) o.err = 'Minimum purchase is $10';
    else if (buy && amt > usdBal() + 1e-9) o.err = 'Insufficient ' + Q + ' balance';
    else if (!buy && amt > coinBal(sym) + 1e-12) o.err = 'Insufficient ' + sym + ' balance';
    if (!o.err) {
      if (t === 'limit') { if (!(o.pl > 0)) o.err = 'Enter a limit price'; else if (buy ? o.pl >= px : o.pl <= px) o.err = buy ? 'Limit buy must be below the market price' : 'Limit sell must be above the market price'; }
      else if (t === 'stop') { if (!(o.ps > 0)) o.err = 'Enter a stop price'; else if (buy ? o.ps <= px : o.ps >= px) o.err = buy ? 'Stop buy must be above the market price' : 'Stop-loss must be below the market price'; }
      else if (t === 'tp') { if (!(o.pt > 0)) o.err = 'Enter a take-profit price'; else if (o.pt <= px) o.err = 'Take-profit must be above the market price'; }
      else if (t === 'oco') { if (!(o.pt > 0) || !(o.ps > 0)) o.err = 'Enter take-profit and stop-loss prices'; else if (!(o.pt > px && o.ps < px)) o.err = 'OCO: take-profit above and stop-loss below the market price'; }
      else if (t === 'market' && buy && $('txAttOn').checked) { if (!(num('txAttTp') > 0) && !(num('txAttSl') > 0)) o.err = 'Enter a take-profit and/or stop-loss %'; else if (num('txAttSl') >= 100) o.err = 'Stop-loss % must be below 100'; }
    }
    return o;
  }
  function calc() {
    try { guide(); } catch (e) {}
    if (!$('txSum') || T.side === 'convert') return;
    var o = readOrder(), buy = T.side === 'buy', sym = T.coin, px = o.px;
    $('txAvail').textContent = buy ? fUsd(usdBal()) : fQty(coinBal(sym), sym) + ' ' + sym;
    $('txDep').hidden = !(buy && usdBal() < 10);
    var rows = [], ref = px;
    if (o.otype === 'limit') ref = o.pl; else if (o.otype === 'stop') ref = o.ps; else if (o.otype === 'tp') ref = o.pt; else if (o.otype === 'oco') ref = o.pt;
    if (!(ref > 0)) ref = px;
    if (o.amt > 0 && px > 0) {
      if (buy) rows.push(['You receive', '≈ ' + fQty(o.amt / ref, sym) + ' ' + sym]);
      else rows.push(['You receive', '≈ ' + fUsd(o.amt * ref)]);
      rows.push([o.otype === 'market' ? 'Market price' : 'Trigger price', o.otype === 'oco' ? 'TP ' + fP(o.pt) + ' · SL ' + fP(o.ps) : fP(ref)]);
      if (o.otype === 'oco') {
        rows.push(['If take-profit', '+' + fUsd(o.amt * (o.pt - px))]);
        rows.push(['If stop-loss', fUsd(o.amt * (o.ps - px))]);
      } else if (o.otype === 'tp') rows.push(['Profit at trigger', '+' + fUsd(o.amt * (o.pt - px))]);
      else if (o.otype === 'stop' && !buy) rows.push(['Loss at trigger', fUsd(o.amt * (o.ps - px))]);
      if (o.otype === 'market' && buy && $('txAttOn').checked) {
        var tp = num('txAttTp'), sl = num('txAttSl'), qty = o.amt / px;
        if (tp > 0) rows.push(['Take-profit ' + tp + '%', fP(px * (1 + tp / 100)) + '  (+' + fUsd(o.amt * tp / 100) + ')']);
        if (sl > 0 && sl < 100) rows.push(['Stop-loss ' + sl + '%', fP(px * (1 - sl / 100)) + '  (−' + fUsd(o.amt * sl / 100) + ')']);
      }
    }
    $('txSum').innerHTML = rows.map(function (r) { return '<div><span>' + esc(r[0]) + '</span><b>' + esc(r[1]) + '</b></div>'; }).join('');
    $('txHint').textContent = o.err || '';
    var label = { market: '', limit: 'Limit ', stop: buy ? 'Stop ' : 'Stop-Loss ', tp: 'Take-Profit ', oco: 'OCO ' }[o.otype] || '';
    var go = $('txGo'); go.textContent = (o.otype === 'market' ? (buy ? 'Buy ' : 'Sell ') : (label + (buy ? 'Buy ' : 'Sell '))) + sym;
    go.classList.toggle('dim', !!o.err || !!o.empty);
  }

  function clientId() { return 'ct_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8); }

  function submit() {
    if (T.busy) return;
    var o = readOrder();
    if (o.empty) { toast('Enter an amount', 'err'); return; }
    if (o.err) { toast(o.err, 'err'); return; }
    var buy = o.side === 'buy', sym = o.sym, rows = [], title, kind = o.side;
    rows.push(['Pair', sym + '/' + qOf(sym)]);
    var tl = { market: 'Market', limit: 'Limit', stop: buy ? 'Stop' : 'Stop-Loss', tp: 'Take-Profit', oco: 'OCO (TP + SL)' }[o.otype];
    rows.push(['Order type', tl + ' ' + (buy ? 'buy' : 'sell')]);
    if (buy) rows.push(['You spend', fUsd(o.amt)]); else rows.push(['You sell', fQty(o.amt, sym) + ' ' + sym]);
    if (o.otype === 'market') rows.push(['Price', '≈ ' + fP(o.px)]);
    if (o.otype === 'limit') rows.push([buy ? 'Buy at or below' : 'Sell at or above', fP(o.pl)]);
    if (o.otype === 'stop') rows.push([buy ? 'Buy when price ≥' : 'Sell when price ≤', fP(o.ps)]);
    if (o.otype === 'tp') rows.push(['Sell when price ≥', fP(o.pt)]);
    if (o.otype === 'oco') { rows.push(['Take-profit (≥)', fP(o.pt)]); rows.push(['Stop-loss (≤)', fP(o.ps)]); }
    var ref = o.otype === 'limit' ? o.pl : (o.otype === 'stop' ? o.ps : (o.otype === 'tp' || o.otype === 'oco' ? o.pt : o.px));
    rows.push(['You receive', buy ? '≈ ' + fQty(o.amt / ref, sym) + ' ' + sym : '≈ ' + fUsd(o.amt * ref)]);
    var att = o.otype === 'market' && buy && $('txAttOn').checked, tp = num('txAttTp'), sl = num('txAttSl');
    if (att) { if (tp > 0) rows.push(['Then take-profit', '+' + tp + '%']); if (sl > 0) rows.push(['Then stop-loss', '-' + sl + '%']); }
    title = (buy ? 'Confirm buy ' : 'Confirm sell ') + sym;
    var note = o.otype === 'market' ? 'Market orders are filled at the live exchange price at the moment of execution.' : 'The order stays open until its price is reached. You can cancel it any time.';
    confirmBox(title, rows, kind, note).then(function (ok) {
      if (!ok) return;
      T.busy = true; setBusy(true);
      placeOrder(o, att ? { tp: tp, sl: sl } : null).catch(function (e) { toast(e && e.message ? e.message : 'Order failed', 'err'); }).then(function () { T.busy = false; setBusy(false); });
    });
  }
  function setBusy(b) { var g = $('txGo'); if (g) { g.disabled = b; g.classList.toggle('busy', b); } }

  function placeOrder(o, attach) {
    var buy = o.side === 'buy', body = { clientTradeId: clientId(), type: o.side, symbol: o.sym, amount: o.amt, orderType: o.otype };
    if (o.otype === 'market') body.price = o.px;
    else if (o.otype === 'limit') { body.price = o.pl; body.limitPrice = o.pl; }
    else if (o.otype === 'stop') { body.price = o.ps; body.stopPrice = o.ps; }
    else if (o.otype === 'tp') { body.price = o.pt; body.tpPrice = o.pt; }
    else if (o.otype === 'oco') { body.price = o.pt; body.tpPrice = o.pt; body.stopPrice = o.ps; }
    return api('trade', body).then(function (d) {
      if (!d || !d.ok) throw new Error((d && d.error) || 'Order failed');
      applyBalances(d.balances || { usd: d.usd, btc: d.btc, eth: d.eth });
      refreshApp();
      if (o.otype === 'market') {
        var ex = (d.trade && Number(d.trade.price) > 0) ? Number(d.trade.price) : o.px;
        var qty = buy ? o.amt / ex : o.amt;
        toast((buy ? 'Bought ' : 'Sold ') + fQty(qty, o.sym) + ' ' + o.sym + ' @ ' + fP(ex), 'ok');
        try { if (typeof window.playChime === 'function') window.playChime(); } catch (e) {}
        try { if (typeof window.addNotification === 'function') window.addNotification((buy ? 'Bought ' : 'Sold ') + fQty(qty, o.sym) + ' ' + o.sym + ' @ ' + fP(ex), buy ? '📈' : '📉'); } catch (e) {}
        if (attach && buy) return attachExit(o.sym, floorTo(qty, 8), ex, attach);
      } else {
        toast('Order placed — ' + ({ limit: 'Limit', stop: buy ? 'Stop' : 'Stop-Loss', tp: 'Take-Profit', oco: 'OCO' }[o.otype]) + ' ' + (buy ? 'buy ' : 'sell ') + o.sym, 'ok');
      }
    }).then(function () { clearForm(); return refreshOrders(true); }).then(function () { if (!o.quiet) afterTrade(o); });
  }
  function attachExit(sym, qty, ex, a) {
    var tp = a.tp > 0 ? ex * (1 + a.tp / 100) : 0, sl = a.sl > 0 && a.sl < 100 ? ex * (1 - a.sl / 100) : 0;
    var body = { clientTradeId: clientId(), type: 'sell', symbol: sym, amount: qty };
    if (tp && sl) { body.orderType = 'oco'; body.tpPrice = tp; body.stopPrice = sl; body.price = tp; }
    else if (tp) { body.orderType = 'tp'; body.tpPrice = tp; body.price = tp; }
    else if (sl) { body.orderType = 'stop'; body.stopPrice = sl; body.price = sl; }
    else return null;
    return api('trade', body).then(function (d) {
      if (!d || !d.ok) { toast('Bought, but TP/SL not set: ' + ((d && d.error) || 'error'), 'err'); return; }
      toast('Take-profit / stop-loss set', 'ok');
    }).catch(function () { toast('Bought, but TP/SL could not be set', 'err'); });
  }
  function clearForm() { $('txAmt').value = ''; $('txRng').value = 0; calc(); }

  /* ---------- convert ---------- */
  function fillConvSelects(keep) {
    var f = $('txCvFrom'), t = $('txCvTo'); if (!f || !t) return;
    var fv = keep ? f.value : (f.value || T.coin), tv = keep ? t.value : t.value;
    var opts = T.coins.map(function (c) { return '<option value="' + c.symbol + '">' + c.symbol + ' — ' + esc(c.name) + '</option>'; }).join('');
    if (f.__o !== opts) { f.innerHTML = opts; t.innerHTML = opts; f.__o = opts; }
    f.value = T.map[fv] ? fv : T.coin;
    if (!T.map[tv] || tv === f.value) tv = f.value === 'USDT' ? 'BTC' : 'USDT';
    t.value = tv;
  }
  function calcConv() {
    try { guide(); } catch (e) {}
    var f = $('txCvFrom'), t = $('txCvTo'); if (!f || T.side !== 'convert') return;
    var from = f.value, to = t.value, amt = num('txCvAmt'), pf = livePx(from), pt = livePx(to);
    $('txCvAmtU').textContent = from; $('txCvFromBal').textContent = fQty(coinBal(from), from) + ' ' + from; $('txCvToBal').textContent = fQty(coinBal(to), to) + ' ' + to;
    var rate = pt > 0 ? pf / pt : 0, err = '';
    if (from === to) err = 'Choose different coins'; else if (amt > coinBal(from) + 1e-12) err = 'Insufficient ' + from + ' balance'; else if (!(rate > 0)) err = 'Price unavailable';
    $('txCvSum').innerHTML = (rate > 0 ? '<div><span>Rate</span><b>1 ' + from + ' = ' + (rate >= 1 ? rate.toFixed(4) : rate.toFixed(8)) + ' ' + to + '</b></div>' : '') +
      (amt > 0 && rate > 0 ? '<div><span>You receive</span><b>≈ ' + fQty(amt * rate, to) + ' ' + to + '</b></div>' : '') + '<div><span>Fee</span><b class="up">Free</b></div>';
    $('txCvHint').textContent = err; $('txCvGo').classList.toggle('dim', !!err || !(amt > 0));
  }
  function submitConvert() {
    if (T.busy) return;
    var from = $('txCvFrom').value, to = $('txCvTo').value, amt = num('txCvAmt'), pf = livePx(from), pt = livePx(to);
    if (from === to) { toast('Choose different coins', 'err'); return; }
    if (!(amt > 0)) { toast('Enter an amount', 'err'); return; }
    if (amt > coinBal(from) + 1e-12) { toast('Insufficient ' + from + ' balance', 'err'); return; }
    if (!(pf > 0 && pt > 0)) { toast('Price unavailable', 'err'); return; }
    var rate = pf / pt;
    confirmBox('Confirm conversion', [['You convert', fQty(amt, from) + ' ' + from], ['Rate', '1 ' + from + ' = ' + (rate >= 1 ? rate.toFixed(4) : rate.toFixed(8)) + ' ' + to], ['You receive', '≈ ' + fQty(amt * rate, to) + ' ' + to], ['Fee', 'Free']], 'conv', 'Converted at the live exchange rate.').then(function (ok) {
      if (!ok) return; T.busy = true;
      api('trade', { clientTradeId: clientId(), type: 'convert', symbol: to, amount: amt, price: rate, orderType: 'market', sourceSymbol: from, targetSymbol: to }).then(function (d) {
        if (!d || !d.ok) throw new Error((d && d.error) || 'Convert failed');
        applyBalances(d.balances || { usd: d.usd, btc: d.btc, eth: d.eth }); refreshApp();
        toast('Converted ' + fQty(amt, from) + ' ' + from + ' → ' + to, 'ok');
        try { if (typeof window.playChime === 'function') window.playChime(); } catch (e) {}
        $('txCvAmt').value = ''; calcConv(); renderBottom(true); refreshOrders(true);
      }).catch(function (e) { toast(e.message || 'Convert failed', 'err'); }).then(function () { T.busy = false; });
    });
  }

  /* ============================================================
     ORDERS (open / history / wallet)
     ============================================================ */
  var _sig = {};
  function refreshOrders(force) {
    if (!token()) return Promise.resolve();
    return api('getOrders', { filter: 'all', limit: 200 }).then(function (d) {
      if (!d || !d.ok) return;
      T.orders = d.orders || []; T.openOrders = d.openOrders || T.orders.filter(function (o) { return o.status === 'open'; });
      if (window.st) window.st.openOrders = T.openOrders;
      if (d.balances) { var before = JSON.stringify(d.balances) !== _sig.bal; _sig.bal = JSON.stringify(d.balances); applyBalances(d.balances); if (before) { refreshApp(); calc(); calcConv(); } }
      (d.fills || []).forEach(function (f) {
        var lbl = f.trigger === 'stop' ? 'Stop-loss' : (f.trigger === 'tp' ? 'Take-profit' : 'Limit order');
        toast(lbl + ' filled: ' + (f.type === 'buy' ? 'bought ' : 'sold ') + fQty(f.qty, f.symbol) + ' ' + f.symbol + ' @ ' + fP(f.price), 'ok');
        try { if (typeof window.playChime === 'function') window.playChime(); } catch (e) {}
      });
      announceOffline();
      renderBottom(force);
      if (T.pm) { try { renderPm(); } catch (e) {} }
    }).catch(noop);
  }
  function announceOffline() {
    if (T.seen) return;
    var last = Number(lsGet('nc_tt_seen')) || 0, now = Date.now(); T.seen = now; lsSet('nc_tt_seen', String(now));
    if (!last) return;
    var n = T.orders.filter(function (o) { return o.status === 'filled' && o.filledAt > last; }).length;
    if (n) toast(n + ' order' + (n > 1 ? 's were' : ' was') + ' filled while you were away — see Order history', 'ok');
  }
  function setTab(v) {
    T.tab = v; qa('#txTabs button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-v') === v); });
    $('txFilter').hidden = v !== 'hist'; renderBottom(true);
  }
  function typeLabel(o) { return { market: 'Market', limit: 'Limit', stop: o.type === 'buy' ? 'Stop' : 'Stop-Loss', tp: 'Take-Profit', oco: 'OCO' }[o.orderType] || 'Market'; }
  function trigText(o) {
    var b = o.type === 'buy', t = o.orderType;
    if (t === 'limit') return (b ? '≤ ' : '≥ ') + fP(o.limitPrice || o.price);
    if (t === 'stop') return (b ? '≥ ' : '≤ ') + fP(o.stopPrice || o.price);
    if (t === 'tp') return '≥ ' + fP(o.tpPrice || o.price);
    if (t === 'oco') return 'TP ' + fP(o.tpPrice) + ' · SL ' + fP(o.stopPrice);
    return fP(o.price);
  }
  function qtyOf(o) {
    if (o.status === 'filled' && o.filled > 0) return o.filled;
    var p = Number(o.price) || livePx(o.symbol);
    return o.type === 'buy' ? (p > 0 ? Number(o.amount) / p : 0) : Number(o.amount);
  }
  function orderRow(o, open) {
    var pxNow = livePx(o.symbol), tgt = o.orderType === 'oco' ? Number(o.tpPrice) : (o.orderType === 'stop' ? Number(o.stopPrice || o.price) : Number(o.price));
    var dist = (open && pxNow > 0 && tgt > 0) ? ((tgt - pxNow) / pxNow * 100) : null;
    var st = o.status === 'filled' ? '<span class="tx-st ok">Filled</span>' : (o.status === 'open' ? '<span class="tx-st wait">Open</span>' : '<span class="tx-st off">' + (o.reason === 'insufficient_funds' ? 'Cancelled · no funds' : (o.reason === 'expired' ? 'Expired' : 'Cancelled')) + '</span>');
    var priceCell = o.status === 'filled' ? fP(o.execPrice || o.price) : trigText(o);
    return '<div class="tx-or"><div class="tx-or-a"><span class="tx-side ' + o.type + '">' + (o.type === 'buy' ? 'BUY' : 'SELL') + '</span><b>' + esc(o.symbol) + '</b><i class="tx-ty">' + typeLabel(o) + '</i></div>' +
      '<div><small>Amount</small><b>' + fQty(qtyOf(o), o.symbol) + ' ' + esc(o.symbol) + '</b></div>' +
      '<div><small>' + (o.status === 'filled' ? 'Filled at' : 'Trigger') + '</small><b>' + priceCell + '</b>' + (dist !== null ? '<em class="' + (dist >= 0 ? 'up' : 'dn') + '">' + (dist >= 0 ? '+' : '') + dist.toFixed(2) + '% from market</em>' : '') + '</div>' +
      '<div><small>Time</small><b>' + fTime(o.filledAt || o.ts) + '</b></div>' +
      '<div class="tx-or-e">' + (open ? '<button type="button" class="tx-cancel" data-a="cancel" data-id="' + esc(o.id) + '">Cancel</button>' : st) + '</div></div>';
  }
  function renderBottom(force) {
    var body = $('txBody'); if (!body) return;
    var open = (T.openOrders || []).filter(function (o) { return o.status === 'open'; });
    set('txCntOpen', String(open.length));
    var html = '';
    try { posList(); } catch (e) {}
    if (T.tab === 'pos') {
      html = posHtml();
    } else if (T.tab === 'open') {
      html = open.length ? open.map(function (o) { return orderRow(o, true); }).join('') : '<div class="tx-empty">No open orders<br><small>Limit, Stop-Loss, Take-Profit and OCO orders appear here</small></div>';
    } else if (T.tab === 'hist') {
      var list = (T.orders || []).filter(function (o) { return T.hist === 'all' || o.status === T.hist; }).slice(0, 100);
      html = list.length ? list.map(function (o) { return orderRow(o, false); }).join('') : '<div class="tx-empty">No orders yet</div>';
    } else html = walletHtml();
    if (!force && body.__html === html) return;
    body.__html = html;
    var st = body.scrollTop; body.innerHTML = html; body.scrollTop = st;
  }
  function walletHtml() {
    var rows = [], total = usdBal();
    T.coins.forEach(function (c) {
      var b = coinBal(c.symbol); if (!(b > 0)) return;
      var v = b * livePx(c.symbol); total += v;
      rows.push('<div class="tx-wr">' + ico(c) + '<span class="tx-wn"><b>' + c.symbol + '</b><em>' + esc(c.name) + '</em></span><span class="tx-wb"><b>' + fQty(b, c.symbol) + '</b><em>' + fUsd(v) + '</em></span><button type="button" class="tx-sell" data-a="sellcoin" data-s="' + c.symbol + '">Sell</button></div>');
    });
    var head = '<div class="tx-wtot"><span>Total balance</span><b>' + fUsd(total) + '</b></div><div class="tx-wr usd"><i class="tx-ci" style="--c:#2a7de1">$</i><span class="tx-wn"><b>' + Q + '</b><em>Cash</em></span><span class="tx-wb"><b>' + fUsd(usdBal()) + '</b><em>Available</em></span></div>';
    return head + (rows.length ? rows.join('') : '<div class="tx-empty">No crypto yet — buy your first coin</div>');
  }
  function cancelOrder(id) {
    if (!id) return;
    api('cancelOrder', { orderId: id }).then(function (d) {
      if (!d || !d.ok) throw new Error((d && d.error) || 'Cancel failed');
      toast('Order cancelled', 'ok'); refreshOrders(true);
    }).catch(function (e) { toast(e.message || 'Cancel failed', 'err'); });
  }

  /* ---------- public API (kept for older code) ---------- */
  window.loadOrderHistory = function () { return refreshOrders(true); };
  window.renderOpenOrders = function () { renderBottom(true); };
  window.cancelOrder = cancelOrder;
  window.refreshOpenOrders = function () { return refreshOrders(true); };
  try { console.log('%c[NordicCrypto] 📊 Trade Terminal v3.0 loaded', 'color:#c8ff4d;font-weight:bold;font-size:13px'); } catch (e) {}
})();
