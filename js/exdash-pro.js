/* ============================================================
   NORDIC CRYPTO — EXCHANGE DASHBOARD PRO v1.0
   Real portfolio history, allocation donut, all holdings,
   live markets, activity feed. Renders into #dp (own markup).
   Hooks: window.renderExchangeDash (wrapped), renderExchangeChart/Coins (neutralised).
   ============================================================ */
(function () {
  'use strict';
  if (window.__dpPro) return; window.__dpPro = true;

  function $(id) { return document.getElementById(id); }
  function S() { return window.st || {}; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(v) { try { return window.fmtCurrency ? window.fmtCurrency(v) : '$' + Number(v).toFixed(2); } catch (e) { return '$' + Number(v).toFixed(2); } }
  function moneyS(v) { return money(v).replace(/\.00(?=\D*$)/, ''); }
  function sgn(v) { return v >= 0 ? '+' : '−'; }
  function pct(v) { return sgn(v) + Math.abs(v).toFixed(2) + '%'; }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function qty(n, sym) { n = Number(n) || 0; var d = sym === 'USDT' ? 2 : (n >= 1000 ? 2 : (n >= 1 ? 4 : 6)); return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: d }); }

  /* ---------- icons ---------- */
  function ic(p, s) { return '<svg viewBox="0 0 24 24" width="' + (s || 18) + '" height="' + (s || 18) + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>'; }
  var I = {
    dep: '<path d="M12 3v12m0 0l-4-4m4 4l4-4"/><path d="M5 21h14"/>',
    wd: '<path d="M12 21V9m0 0l-4 4m4-4l4 4"/><path d="M5 3h14"/>',
    zap: '<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>',
    swap: '<path d="M7 7h13m0 0l-4-4m4 4l-4 4"/><path d="M17 17H4m0 0l4-4m-4 4l4 4"/>',
    bank: '<path d="M3 21h18M5 21V10m4 11V10m6 11V10m4 11V10M3 10l9-6 9 6"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 012-2h9"/>',
    star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    up: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    wallet: '<path d="M3 7a2 2 0 012-2h13v4"/><path d="M3 7v11a2 2 0 002 2h16V9H5a2 2 0 01-2-2z"/><path d="M17 14h.01"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeoff: '<path d="M3 3l18 18"/><path d="M10.6 5.1A9.7 9.7 0 0112 5c6.4 0 10 7 10 7a17 17 0 01-3.2 4.1M6.6 6.6A17 17 0 002 12s3.6 7 10 7a9.7 9.7 0 004.2-1"/>',
    gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M5 12v8a1 1 0 001 1h12a1 1 0 001-1v-8M7.5 8a2.5 2.5 0 110-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 110 5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    chev: '<path d="M9 6l6 6-6 6"/>',
    pie: '<path d="M21 12A9 9 0 1112 3v9z"/><path d="M15 3.5A9 9 0 0120.5 9H15z"/>'
  };

  /* ---------- coin logos (same chain as terminal) ---------- */
  var CMC = { btc: 1, eth: 1027, usdt: 825, sol: 5426, bnb: 1839, xrp: 52, ada: 2010, doge: 74, trx: 1958, avax: 5805, link: 1975, dot: 6636, ltc: 2, bch: 1831, xlm: 512, atom: 3794, uni: 7083, near: 6535, etc: 1321, shib: 5994, sui: 20947, aave: 7278, ton: 11419, apt: 21794 };
  var SRC = [
    function (l) { return 'https://assets.coincap.io/assets/icons/' + l + '@2x.png'; },
    function (l) { return 'https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/svg/color/' + l + '.svg'; },
    function (l) { return CMC[l] ? 'https://s2.coinmarketcap.com/static/img/coins/64x64/' + CMC[l] + '.png' : ''; }
  ];
  var PAL = ['#f7931a', '#627eea', '#26a17b', '#9945ff', '#f3ba2f', '#3b82f6', '#ec4899', '#14b8a6', '#eab308', '#ef4444', '#8b5cf6', '#22c55e'];
  function coinIco(sym, color, size) {
    var l = String(sym || '').toLowerCase(), c = color && /^#[0-9a-f]{3,8}$/i.test(color) ? color : '#5b6b82';
    var img = /^[a-z0-9]{2,10}$/.test(l) ? '<img class="dp-cimg" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" data-l="' + l + '" data-i="0" src="' + SRC[0](l) + '">' : '';
    return '<i class="dp-coin" style="--c:' + c + ';' + (size ? 'width:' + size + 'px;height:' + size + 'px;' : '') + '">' + esc(String(sym).slice(0, sym.length > 3 ? 2 : 1)) + img + '</i>';
  }
  document.addEventListener('error', function (e) {
    var im = e.target; if (!im || im.tagName !== 'IMG' || !/\bdp-cimg\b/.test(im.className)) return;
    var i = (+im.getAttribute('data-i') || 0) + 1, l = im.getAttribute('data-l'), u = '';
    while (i < SRC.length && !(u = SRC[i](l))) i++;
    if (u) { im.setAttribute('data-i', i); im.src = u; } else if (im.parentNode) im.parentNode.removeChild(im);
  }, true);
  document.addEventListener('load', function (e) {
    var im = e.target; if (!im || im.tagName !== 'IMG' || !/\bdp-cimg\b/.test(im.className)) return;
    if (im.naturalWidth < 8) { im.dispatchEvent(new Event('error')); return; }
    if (im.parentNode) im.parentNode.classList.add('ld');
  }, true);

  /* ---------- state ---------- */
  var D = { tk: {}, tkAt: 0, rng: lsGet('nc_dp_rng') || '7', mt: 'movers', q: '', series: {}, seriesAt: {}, busy: {}, hide: lsGet('nc_dp_hide') === '1', built: false, lastSig: '' };
  if (['1', '7', '30'].indexOf(D.rng) < 0) D.rng = '7';

  function prices() {
    var L = window._exPricesCache, s = S();
    if (Array.isArray(L) && L.length) return L;
    return [{ symbol: 'BTC', name: 'Bitcoin', usd: s.btcP || 0, change24h: 0, icon: '#f7931a' }, { symbol: 'ETH', name: 'Ethereum', usd: s.ethP || 0, change24h: 0, icon: '#627eea' }];
  }
  function chgOf(c) { var t = D.tk[c.symbol]; return t ? t.chg : (Number(c.change24h) || 0); }
  function compute() {
    var s = S(), cash = Number(s.usd) || 0, hold = [], total = cash;
    prices().forEach(function (c) {
      var q = Number(s[String(c.symbol).toLowerCase()]) || 0, px = Number(c.usd) || 0;
      if (q > 0 && px > 0) { var v = q * px; total += v; hold.push({ sym: c.symbol, name: c.name || c.symbol, q: q, px: px, v: v, chg: chgOf(c), color: c.icon }); }
    });
    hold.sort(function (a, b) { return b.v - a.v; });
    return { cash: cash, hold: hold, total: total };
  }

  /* ---------- deposits / P&L ---------- */
  function flows() {
    var dep = 0, wd = 0;
    (S().txs || []).forEach(function (t) {
      if (!t || t.status !== 'Completed' || t.tradeId || /\b(buy|sell|convert)\b.*@/i.test(t.desc || '')) return;
      var a = Number(t.amt) || 0; if (a > 0) dep += a; else wd += -a;
    });
    return { dep: dep, wd: wd, net: dep - wd };
  }

  /* ---------- history (reconstructed from the ledger + Binance klines) ---------- */
  var RNG = { '1': { ms: 864e5, iv: '15m', ims: 9e5, n: 96, lb: '24h' }, '7': { ms: 7 * 864e5, iv: '1h', ims: 36e5, n: 168, lb: '7d' }, '30': { ms: 30 * 864e5, iv: '4h', ims: 144e5, n: 180, lb: '30d' } };
  function fetchJson(u, ms) {
    var ctl = window.AbortController ? new AbortController() : null, t = ctl ? setTimeout(function () { ctl.abort(); }, ms || 7000) : 0;
    return fetch(u, ctl ? { signal: ctl.signal } : undefined).then(function (r) { clearTimeout(t); return r.ok ? r.json() : null; }).catch(function () { clearTimeout(t); return null; });
  }
  function ledger() {
    var s = S(), cashEv = [], coinEv = [], ext = [];
    (s.txs || []).forEach(function (t) {
      if (!t || !t.ts || t.status !== 'Completed') return;
      var a = Number(t.amt) || 0; if (a) cashEv.push({ ts: Number(t.ts), a: a });
      if (a && !t.tradeId && !/\b(buy|sell|convert)\b.*@/i.test(t.desc || '')) ext.push({ ts: Number(t.ts), a: a });
      var m = /(buy|sell)\s+([0-9]*\.?[0-9]+)\s+([A-Z0-9]{2,10})\s+@/i.exec(t.desc || '');
      if (m) coinEv.push({ ts: Number(t.ts), sym: m[3].toUpperCase(), q: (m[1].toLowerCase() === 'buy' ? 1 : -1) * parseFloat(m[2]) });
    });
    return { cashEv: cashEv, coinEv: coinEv, ext: ext };
  }
  function buildSeries(rng) {
    var R = RNG[rng], now = Date.now(), s = S(), L = ledger(), cur = compute(), syms = {}, pxNow = {};
    prices().forEach(function (c) { pxNow[c.symbol] = Number(c.usd) || 0; });
    cur.hold.forEach(function (h) { syms[h.sym] = 1; });
    L.coinEv.forEach(function (e) { if (e.ts > now - R.ms) syms[e.sym] = 1; });
    var list = Object.keys(syms);
    return Promise.all(list.map(function (sy) {
      if (sy === 'USDT') return Promise.resolve([sy, null]);
      return fetchJson('https://api.binance.com/api/v3/klines?symbol=' + sy + 'USDT&interval=' + R.iv + '&limit=' + R.n, 7000).then(function (k) { return [sy, Array.isArray(k) && k.length > 3 ? k : null]; });
    })).then(function (res) {
      var K = {}; res.forEach(function (r) { K[r[0]] = r[1]; });
      var t0 = now - R.ms, step = R.ms / (R.n - 1), pts = [], real = true;
      function pxAt(sy, ts) {
        if (sy === 'USDT') return 1;
        var k = K[sy]; if (!k) { real = false; return pxNow[sy] || 0; }
        var o0 = Number(k[0][0]), i = Math.floor((ts - o0) / R.ims); i = Math.max(0, Math.min(k.length - 1, i));
        return parseFloat(k[i][4]);
      }
      for (var i = 0; i < R.n; i++) {
        var ts = t0 + i * step, cash = Number(s.usd) || 0, v;
        L.cashEv.forEach(function (e) { if (e.ts > ts) cash -= e.a; });
        v = Math.max(0, cash);
        list.forEach(function (sy) {
          var q = Number(s[sy.toLowerCase()]) || 0;
          L.coinEv.forEach(function (e) { if (e.sym === sy && e.ts > ts) q -= e.q; });
          if (q > 1e-12) v += q * pxAt(sy, ts);
        });
        var f = 0, fp = 0; L.ext.forEach(function (e) { if (e.ts > t0 && e.ts <= ts) { f += e.a; if (e.a > 0) fp += e.a; } });
        pts.push({ t: ts, v: v, f: f, fp: fp });
      }
      var lf = 0, lfp = 0; L.ext.forEach(function (e) { if (e.ts > t0) { lf += e.a; if (e.a > 0) lfp += e.a; } });
      pts[pts.length - 1] = { t: now, v: cur.total, f: lf, fp: lfp };
      return { pts: pts, real: real };
    });
  }
  function getSeries(rng, force) {
    var age = Date.now() - (D.seriesAt[rng] || 0);
    if (D.series[rng] && !force && age < 60000) return Promise.resolve(D.series[rng]);
    if (D.busy[rng]) return D.busy[rng];
    D.busy[rng] = buildSeries(rng).then(function (r) { D.series[rng] = r; D.seriesAt[rng] = Date.now(); D.busy[rng] = null; return r; }).catch(function () { D.busy[rng] = null; return D.series[rng] || null; });
    return D.busy[rng];
  }

  /* ---------- tickers (24h % from Binance) ---------- */
  function loadTickers() {
    var syms = prices().map(function (c) { return c.symbol; }).filter(function (x) { return x !== 'USDT' && x !== 'USDC'; });
    if (!syms.length) return Promise.resolve();
    var u = 'https://api.binance.com/api/v3/ticker/24hr?symbols=' + encodeURIComponent(JSON.stringify(syms.map(function (x) { return x + 'USDT'; })));
    return fetchJson(u, 7000).then(function (a) {
      if (!Array.isArray(a)) return;
      a.forEach(function (t) { var sy = String(t.symbol).replace(/USDT$/, ''); D.tk[sy] = { chg: parseFloat(t.priceChangePercent) || 0, px: parseFloat(t.lastPrice) || 0, vol: parseFloat(t.quoteVolume) || 0 }; });
      D.tkAt = Date.now();
    });
  }

  /* ---------- markup ---------- */
  function markup() {
    return '' +
      '<header class="dp-hero">' +
        '<div class="dp-hero-l"><div class="dp-chip"><i></i><span>Spot · Live</span><em id="dpUpd">—</em></div><h1 id="dpGreet">Welcome</h1><p>Portfolio, markets and activity — all in one place.</p></div>' +
        '<div class="dp-hero-r"><button type="button" class="dp-icobtn" id="dpEye" aria-label="Hide balances" title="Hide / show balances"></button>' +
          '<button type="button" class="dp-btn dep" id="exBtnDeposit">' + ic(I.dep) + '<span>Deposit</span></button>' +
          '<button type="button" class="dp-btn wd" id="exBtnWithdraw">' + ic(I.wd) + '<span>Withdraw</span></button>' +
          '<button type="button" class="dp-btn cv" id="dpBtnConvert">' + ic(I.swap) + '<span>Convert</span></button>' +
          '<button type="button" class="dp-btn tr" id="exBtnTrade">' + ic(I.zap) + '<span>Trade</span></button></div>' +
      '</header>' +
      '<section class="dp-grid">' +
        '<article class="dp-card dp-port">' +
          '<div class="dp-ph"><div><div class="dp-k">Total portfolio value</div><div class="dp-big dp-sens" id="dpBal">—</div>' +
            '<div class="dp-sub"><span class="dp-pill" id="dpChg">—</span><span class="dp-mut dp-sens" id="dpBtc"></span></div></div>' +
            '<div class="dp-seg" id="dpRange"><button type="button" data-r="1">24H</button><button type="button" data-r="7">7D</button><button type="button" data-r="30">30D</button></div></div>' +
          '<div class="dp-chart" id="dpChart"><div class="dp-skel"></div></div>' +
          '<div class="dp-kpis" id="dpKpis"></div>' +
        '</article>' +
        '<aside class="dp-card dp-mk"><div class="dp-mk-in">' +
          '<div class="dp-mh"><div><div class="dp-k">Markets</div><h3>Live prices</h3></div><span class="dp-live">LIVE</span></div>' +
          '<label class="dp-search">' + ic(I.search, 16) + '<input id="dpSearch" type="text" placeholder="Search coin…" autocomplete="off" spellcheck="false"></label>' +
          '<div class="dp-tabs" id="dpMt"><button type="button" data-v="movers" class="on">Top</button><button type="button" data-v="gain">Gainers</button><button type="button" data-v="lose">Losers</button><button type="button" data-v="fav">' + ic(I.star, 13) + ' Favs</button></div>' +
          '<div class="dp-mlist" id="dpMList"></div>' +
        '</div></aside>' +
      '</section>' +
      '<section class="dp-grid2">' +
        '<article class="dp-card dp-alloc"><div class="dp-ch"><div><div class="dp-k">Allocation</div><h3>Where your money is</h3></div></div><div id="dpAlloc"></div></article>' +
        '<article class="dp-card dp-hold"><div class="dp-ch"><div><div class="dp-k">Your holdings</div><h3>Assets</h3></div><button type="button" class="dp-link" id="dpTradeAll">Open terminal ' + ic(I.chev, 14) + '</button></div><div id="dpHold"></div></article>' +
      '</section>' +
      '<section class="dp-grid2 rev">' +
        '<article class="dp-card dp-act"><div class="dp-ch"><div><div class="dp-k">Activity</div><h3>Recent transactions</h3></div><button type="button" class="dp-link" id="dpAllTx">View all ' + ic(I.chev, 14) + '</button></div><div id="dpAct"></div></article>' +
        '<article class="dp-card dp-bank"><div class="dp-ch"><div class="dp-bank-t"><span class="dp-bank-i">' + ic(I.bank, 20) + '</span><div><div class="dp-k">Bank details</div><h3>Deposit / withdraw via IBAN</h3></div></div></div>' +
          '<div id="exIbanPending" class="dp-iban-pend"><div class="dp-spin"></div><b>Your IBAN is being generated…</b><span>Our team is issuing it. This usually takes a few minutes.</span></div>' +
          '<div id="exIbanReady" class="dp-iban" style="display:none">' +
            '<div class="dp-ir"><span>IBAN</span><b id="exMyIban">—</b></div><div class="dp-ir"><span>SWIFT / BIC</span><b id="exMySwift">—</b></div>' +
            '<div class="dp-ir"><span>Bank</span><b id="exMyBank">—</b></div><div class="dp-ir"><span>Country</span><b id="exMyCountry">—</b></div>' +
            '<button type="button" class="dp-btn dep sm" id="exCopyIban">' + ic(I.copy, 16) + '<span>Copy IBAN</span></button></div>' +
          '<div class="dp-sec">' + ic(I.shield, 16) + '<span>Funds are protected by segregated accounts and 2-step verification.</span></div></article>' +
      '</section>';
  }
  function legacyShim() {
    return '<div id="dpLegacy" style="display:none" aria-hidden="true">' +
      ['exGreeting', 'exName', 'exBalance', 'exBalanceBtc', 'exPnl24h', 'exTotalDeposits', 'exAssetsCount', 'exBtcAmt', 'exEthAmt', 'exBtcVal', 'exEthVal', 'exCoinsList', 'exPortfolioChart', 'exChartStart', 'exChartEnd', 'exRecentTx'].map(function (id) { return '<span id="' + id + '"></span>'; }).join('') + '</div>';
  }

  function build() {
    var root = $('exchangeDash'); if (!root) return false;
    if (D.built && $('dp') && root.contains($('dp'))) return true;
    root.innerHTML = '<div class="dp" id="dp">' + markup() + '</div>' + legacyShim();
    D.built = true; bind(root); applyHide(); return true;
  }

  /* ---------- binding ---------- */
  function openTerm(sym, side) {
    try { if (typeof window.openTradeTerminalFull === 'function') window.openTradeTerminalFull(sym || undefined, side ? { side: side } : undefined); else if (window.toast) window.toast('Trading terminal is loading…'); } catch (e) {}
  }
  function bind(root) {
    root.addEventListener('click', function (e) {
      var t = e.target.closest ? e.target : null; if (!t) return;
      var b;
      if ((b = t.closest('#dpEye'))) { D.hide = !D.hide; lsSet('nc_dp_hide', D.hide ? '1' : '0'); applyHide(); e.stopPropagation(); return; }
      if (t.closest('#exBtnDeposit')) { var d = $('btnAdd'); if (d) d.click(); else if (window.openModal) window.openModal('add'); e.stopPropagation(); return; }
      if (t.closest('#exBtnWithdraw')) { if (window.openWithdraw) window.openWithdraw(); e.stopPropagation(); return; }
      if (t.closest('#dpBtnConvert')) { openTerm(null, 'convert'); e.stopPropagation(); return; }
      if (t.closest('#exBtnTrade') || t.closest('#dpTradeAll')) { openTerm(); e.stopPropagation(); return; }
      if (t.closest('#exCopyIban')) { var iban = S().user && S().user.iban; if (iban && navigator.clipboard) navigator.clipboard.writeText(iban).then(function () { if (window.toast) window.toast('IBAN copied'); }); else if (window.toast) window.toast('IBAN not ready yet', true); e.stopPropagation(); return; }
      if ((b = t.closest('#dpRange button'))) { D.rng = b.getAttribute('data-r'); lsSet('nc_dp_rng', D.rng); renderChartArea(true); e.stopPropagation(); return; }
      if ((b = t.closest('#dpMt button'))) { D.mt = b.getAttribute('data-v'); qa('#dpMt button').forEach(function (x) { x.classList.toggle('on', x === b); }); renderMarkets(); e.stopPropagation(); return; }
      if ((b = t.closest('[data-fav]'))) { e.stopPropagation(); toggleFav(b.getAttribute('data-fav')); e.stopPropagation(); return; }
      if ((b = t.closest('[data-open]'))) { openTerm(b.getAttribute('data-open')); e.stopPropagation(); return; }
      if (t.closest('#dpAllTx')) { gotoTx(); e.stopPropagation(); return; }
    }, true);
    root.addEventListener('input', function (e) { if (e.target && e.target.id === 'dpSearch') { D.q = e.target.value.trim().toLowerCase(); renderMarkets(); } });
  }
  function qa(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function gotoTx() {
    var els = qa('aside *, nav *, .sb *, .sidebar *, [class*="side"] *').filter(function (el) { return el.children.length === 0 && el.textContent.trim() === 'Transactions'; });
    var el = els[0]; if (!el) return;
    var tgt = el.closest('[onclick],a,button,li,[data-pg],[data-page],.nav-item,div') || el; tgt.click();
  }
  function favs() { try { return JSON.parse(lsGet('nc_tt_fav') || '[]') || []; } catch (e) { return []; } }
  function toggleFav(sym) { var f = favs(), i = f.indexOf(sym); if (i >= 0) f.splice(i, 1); else f.push(sym); lsSet('nc_tt_fav', JSON.stringify(f)); renderMarkets(); }
  function applyHide() { var r = $('dp'); if (r) r.classList.toggle('hide', D.hide); var e = $('dpEye'); if (e) e.innerHTML = ic(D.hide ? I.eyeoff : I.eye, 18); }

  /* ---------- render: hero / balance / KPIs ---------- */
  function greet() {
    var h = new Date().getHours(), g = (h >= 5 && h < 12) ? 'Good morning' : (h >= 12 && h < 18) ? 'Good afternoon' : (h >= 18 && h < 23) ? 'Good evening' : 'Good night';
    var n = lsGet('user_name') || ''; if (n && n !== 'User') { n = n.split(' ')[0]; n = n.charAt(0).toUpperCase() + n.slice(1); } else n = '';
    return g + (n ? ', <span class="dp-grad">' + esc(n) + '</span>' : '');
  }
  function setText(id, v) { var e = $(id); if (e && e.textContent !== v) e.textContent = v; }
  function renderTop(cur) {
    var g = $('dpGreet'); if (g) { var h = greet(); if (g.__h !== h) { g.__h = h; g.innerHTML = h; } }
    setText('dpBal', money(cur.total));
    var btc = prices().filter(function (c) { return c.symbol === 'BTC'; })[0], bp = btc ? Number(btc.usd) : (S().btcP || 0);
    setText('dpBtc', bp > 0 ? '≈ ' + (cur.total / bp).toFixed(6) + ' BTC' : '');
    var d = new Date(); setText('dpUpd', 'Updated ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  }
  /* change excluding deposits / withdrawals (so a deposit is never shown as profit) */
  function adj(a, b) { var d = b.v - a.v - (b.f || 0), base = a.v + (b.fp || 0); return { d: d, p: base > 1 ? d / base * 100 : 0 }; }
  function seriesDelta(r) { if (!r || !r.pts || r.pts.length < 2) return null; var a = r.pts[0], b = r.pts[r.pts.length - 1], x = adj(a, b); return { d: x.d, p: x.p, a: a.v, b: b.v }; }
  function kpi(ico, label, val, sub, cls) { return '<div class="dp-kpi"><span class="dp-kico ' + (cls || '') + '">' + ic(ico, 17) + '</span><div><small>' + label + '</small><b class="dp-sens ' + (cls || '') + '">' + val + '</b>' + (sub ? '<em>' + sub + '</em>' : '') + '</div></div>'; }
  function renderKpis(cur) {
    var box = $('dpKpis'); if (!box) return;
    var s24 = seriesDelta(D.series['1']), fl = flows(), pnl = cur.total - fl.net, hasNet = fl.dep > 0;
    var open = (S().openOrders || []).filter(function (o) { return o && o.status === 'open'; }).length;
    var h = '';
    h += kpi(I.up, '24h change', s24 ? sgn(s24.d) + money(Math.abs(s24.d)) : '—', s24 ? pct(s24.p) : 'calculating…', s24 ? (s24.d >= 0 ? 'up' : 'dn') : '');
    h += kpi(I.zap, 'All-time P&amp;L', hasNet ? sgn(pnl) + money(Math.abs(pnl)) : '—', hasNet && fl.net > 0 ? pct(pnl / fl.net * 100) : '', hasNet ? (pnl >= 0 ? 'up' : 'dn') : '');
    h += kpi(I.wallet, 'Net deposited', money(Math.max(0, fl.net)), 'Deposits ' + moneyS(fl.dep) + (fl.wd ? ' · Withdrawn ' + moneyS(fl.wd) : ''), '');
    h += kpi(I.clock, 'Open orders', String(open), open ? 'waiting for price' : 'none active', '');
    if (box.__h !== h) { box.__h = h; box.innerHTML = h; }
  }
  function setChgPill(r) {
    var p = $('dpChg'); if (!p) return; var dl = seriesDelta(r), lb = RNG[D.rng].lb;
    if (!dl) { p.className = 'dp-pill'; p.textContent = '—'; return; }
    p.className = 'dp-pill ' + (dl.d >= 0 ? 'up' : 'dn'); p.innerHTML = '<span class="dp-sens">' + sgn(dl.d) + money(Math.abs(dl.d)) + '</span> <b>' + pct(dl.p) + '</b> <em>' + lb + '</em>';
  }

  /* ---------- chart ---------- */
  function renderChartArea(force) {
    qa('#dpRange button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-r') === D.rng); });
    var rng = D.rng;
    getSeries(rng, force).then(function (r) { if (rng !== D.rng) return; drawChart(r); setChgPill(r); renderKpis(compute()); });
    if (rng !== '1') getSeries('1').then(function () { renderKpis(compute()); });
  }
  function fmtT(ts, rng) { var d = new Date(ts); return rng === '1' ? d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }); }
  function drawChart(r) {
    var box = $('dpChart'); if (!box) return;
    if (!r || !r.pts || r.pts.length < 2) { box.innerHTML = '<div class="dp-empty-c">Chart unavailable right now</div>'; return; }
    var pts = r.pts, W = box.clientWidth || 640, H = box.clientHeight || 260, pl = 6, pr = 62, pt = 16, pb = 26;
    var mn = Infinity, mx = -Infinity; pts.forEach(function (p) { if (p.v < mn) mn = p.v; if (p.v > mx) mx = p.v; });
    if (mx - mn < Math.max(1e-9, mx * 0.0005)) { var m = mx || 1; mn = m * 0.98; mx = m * 1.02; } else { var pad = (mx - mn) * 0.14; var allPos = mn >= 0; mn -= pad; mx += pad; if (allPos && mn < 0) mn = 0; }
    var t0 = pts[0].t, t1 = pts[pts.length - 1].t;
    function X(t) { return pl + (t - t0) / (t1 - t0) * (W - pl - pr); }
    function Y(v) { return pt + (1 - (v - mn) / (mx - mn)) * (H - pt - pb); }
    var up = adj(pts[0], pts[pts.length - 1]).d >= 0, col = up ? '#24d68e' : '#ff5470';
    var line = pts.map(function (p, i) { return (i ? 'L' : 'M') + X(p.t).toFixed(1) + ',' + Y(p.v).toFixed(1); }).join('');
    var area = line + 'L' + X(t1).toFixed(1) + ',' + (H - pb) + 'L' + X(t0).toFixed(1) + ',' + (H - pb) + 'Z';
    var grid = '', lab = '';
    for (var i = 0; i < 4; i++) { var v = mn + (mx - mn) * (i / 3), y = Y(v); grid += '<line x1="' + pl + '" x2="' + (W - pr + 4) + '" y1="' + y.toFixed(1) + '" y2="' + y.toFixed(1) + '" class="g"/>'; lab += '<text x="' + (W - pr + 10) + '" y="' + (y + 4).toFixed(1) + '" class="yl dp-sens">' + esc(moneyS(v)) + '</text>'; }
    var xl = ''; for (var j = 0; j < 5; j++) { var tt = t0 + (t1 - t0) * (j / 4), anchor = j === 0 ? 'start' : (j === 4 ? 'end' : 'middle'); xl += '<text x="' + X(tt).toFixed(1) + '" y="' + (H - 7) + '" text-anchor="' + anchor + '" class="xl">' + esc(fmtT(tt, D.rng)) + '</text>'; }
    var last = pts[pts.length - 1];
    box.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="Portfolio value chart">' +
      '<defs><linearGradient id="dpG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + col + '" stop-opacity=".38"/><stop offset="1" stop-color="' + col + '" stop-opacity="0"/></linearGradient></defs>' +
      grid + '<path d="' + area + '" fill="url(#dpG)"/><path d="' + line + '" fill="none" stroke="' + col + '" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>' + lab + xl +
      '<circle cx="' + X(last.t).toFixed(1) + '" cy="' + Y(last.v).toFixed(1) + '" r="4.5" fill="' + col + '" class="pulse"/>' +
      '<g class="hv" style="display:none"><line class="vl" y1="' + pt + '" y2="' + (H - pb) + '"/><circle r="5" fill="#fff" stroke="' + col + '" stroke-width="3"/></g></svg>' +
      '<div class="dp-tip" style="display:none"></div>' + (r.real ? '' : '<div class="dp-note">Approximate — live price history unavailable</div>');
    var svg = box.firstChild, hv = svg.querySelector('.hv'), vl = hv.querySelector('.vl'), dot = hv.querySelector('circle'), tip = box.querySelector('.dp-tip');
    function move(ev) {
      var rc = svg.getBoundingClientRect(), cx = (ev.touches ? ev.touches[0].clientX : ev.clientX) - rc.left, f = Math.max(0, Math.min(1, (cx * (W / rc.width) - pl) / (W - pl - pr)));
      var tt = t0 + f * (t1 - t0), lo = 0, hi = pts.length - 1; while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (pts[mid].t <= tt) lo = mid; else hi = mid; }
      var p = (tt - pts[lo].t) < (pts[hi].t - tt) ? pts[lo] : pts[hi], px = X(p.t), py = Y(p.v);
      hv.style.display = ''; vl.setAttribute('x1', px); vl.setAttribute('x2', px); dot.setAttribute('cx', px); dot.setAttribute('cy', py);
      var ad = adj(pts[0], p), d0 = ad.d;
      tip.style.display = ''; tip.innerHTML = '<b class="dp-sens">' + esc(money(p.v)) + '</b><small>' + esc(new Date(p.t).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })) + '</small><em class="' + (d0 >= 0 ? 'up' : 'dn') + '"><span class="dp-sens">' + sgn(d0) + esc(money(Math.abs(d0))) + '</span> ' + pct(ad.p) + '</em>';
      var tw = tip.offsetWidth, left = px * (rc.width / W) - tw / 2; left = Math.max(4, Math.min(rc.width - tw - 4, left)); tip.style.left = left + 'px';
    }
    function leave() { hv.style.display = 'none'; tip.style.display = 'none'; }
    svg.addEventListener('mousemove', move); svg.addEventListener('mouseleave', leave); svg.addEventListener('touchstart', move, { passive: true }); svg.addEventListener('touchmove', move, { passive: true }); svg.addEventListener('touchend', leave);
  }

  /* ---------- markets ---------- */
  function renderMarkets() {
    var box = $('dpMList'); if (!box) return;
    var f = favs(), L = prices().filter(function (c) { return c.symbol !== 'USDC' && Number(c.usd) > 0; });
    if (D.q) L = L.filter(function (c) { return (c.symbol + ' ' + (c.name || '')).toLowerCase().indexOf(D.q) >= 0; });
    if (D.mt === 'fav') L = L.filter(function (c) { return f.indexOf(c.symbol) >= 0; });
    var arr = L.slice();
    if (D.mt === 'gain') arr.sort(function (a, b) { return chgOf(b) - chgOf(a); });
    else if (D.mt === 'lose') arr.sort(function (a, b) { return chgOf(a) - chgOf(b); });
    else if (D.mt === 'movers') arr.sort(function (a, b) { return Math.abs(chgOf(b)) - Math.abs(chgOf(a)); });
    if (D.mt === 'gain') arr = arr.filter(function (c) { return chgOf(c) >= 0; }); if (D.mt === 'lose') arr = arr.filter(function (c) { return chgOf(c) < 0; });
    var h = arr.length ? arr.map(function (c) {
      var ch = chgOf(c), on = f.indexOf(c.symbol) >= 0;
      return '<div class="dp-mr" data-open="' + esc(c.symbol) + '" role="button" tabindex="0"><button type="button" class="dp-star' + (on ? ' on' : '') + '" data-fav="' + esc(c.symbol) + '" aria-label="Favourite">' + ic(I.star, 15) + '</button>' + coinIco(c.symbol, c.icon, 34) +
        '<span class="dp-mn"><b>' + esc(c.name || c.symbol) + '</b><em>' + esc(c.symbol) + ' / ' + esc((S().currency || 'USD')) + '</em></span>' +
        '<span class="dp-mp"><b>' + esc(moneyP(c.usd)) + '</b><i class="dp-pill sm ' + (ch >= 0 ? 'up' : 'dn') + '">' + pct(ch) + '</i></span></div>';
    }).join('') : '<div class="dp-empty">' + (D.mt === 'fav' ? 'No favourites yet — tap ★ on a coin' : 'Nothing found') + '</div>';
    if (box.__h !== h) { var st = box.scrollTop; box.__h = h; box.innerHTML = h; box.scrollTop = st; }
  }
  function moneyP(usd) { usd = Number(usd) || 0; if (usd >= 1) return money(usd); var m = money(usd), k = parseFloat(money(1000).replace(/[^0-9.]/g, '')) / 1000 || 1, v = usd * k, d = v < 0.0001 ? 8 : (v < 0.01 ? 6 : 4); return m.replace(/[0-9][0-9.,]*/, v.toFixed(d)); }

  /* ---------- allocation + holdings ---------- */
  function renderAlloc(cur) {
    var box = $('dpAlloc'); if (!box) return;
    var segs = [], tot = cur.total || 0;
    if (cur.cash > 0.005) segs.push({ k: 'Cash', n: 'Cash (USD)', v: cur.cash, c: '#3b82f6' });
    cur.hold.forEach(function (h, i) { segs.push({ k: h.sym, n: h.name, v: h.v, c: (h.color && /^#/.test(h.color)) ? h.color : PAL[i % PAL.length] }); });
    if (!segs.length || tot <= 0) { box.innerHTML = '<div class="dp-empty">' + ic(I.pie, 26) + '<b>Nothing to show yet</b><span>Deposit funds and buy your first coin.</span></div>'; return; }
    var big = segs.slice(0, 7), rest = segs.slice(7); if (rest.length) big.push({ k: 'Other', n: rest.length + ' more', v: rest.reduce(function (a, s) { return a + s.v; }, 0), c: '#64748b' });
    var R = 54, C = 2 * Math.PI * R, off = 0, arcs = '';
    big.forEach(function (s) { var f = s.v / tot, len = Math.max(0, f * C - (big.length > 1 ? 2 : 0)); arcs += '<circle r="' + R + '" cx="70" cy="70" fill="none" stroke="' + s.c + '" stroke-width="16" stroke-dasharray="' + len.toFixed(2) + ' ' + (C - len).toFixed(2) + '" stroke-dashoffset="' + (-off).toFixed(2) + '" transform="rotate(-90 70 70)"/>'; off += f * C; });
    var leg = big.map(function (s) { var f = s.v / tot * 100; return '<div class="dp-lg"><i style="background:' + s.c + '"></i><span><b>' + esc(s.k) + '</b><em class="dp-sens">' + esc(money(s.v)) + '</em></span><strong>' + (f < 0.1 ? '<0.1' : f.toFixed(1)) + '%</strong></div>'; }).join('');
    var h = '<div class="dp-donut"><svg viewBox="0 0 140 140" width="172" height="172"><circle r="' + R + '" cx="70" cy="70" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="16"/>' + arcs + '</svg><div class="dp-dc"><small>Assets</small><b>' + cur.hold.length + (cur.cash > 0.005 ? '<i>+cash</i>' : '') + '</b></div></div><div class="dp-legend">' + leg + '</div>';
    if (box.__h !== h) { box.__h = h; box.innerHTML = h; }
  }
  function renderHold(cur) {
    var box = $('dpHold'); if (!box) return;
    if (!cur.hold.length && cur.cash <= 0.005) { box.innerHTML = '<div class="dp-empty">' + ic(I.wallet, 26) + '<b>Your portfolio is empty</b><span>Deposit funds to start trading.</span><button type="button" class="dp-btn dep sm" onclick="document.getElementById(\'exBtnDeposit\').click()">' + ic(I.dep, 15) + '<span>Deposit</span></button></div>'; return; }
    var tot = cur.total || 1, h = '<div class="dp-th"><span>Asset</span><span>Balance</span><span class="r">Price</span><span class="r">Value</span><span class="r">24h</span><span class="r">Share</span><span></span></div>';
    cur.hold.forEach(function (x) {
      var sh = x.v / tot * 100;
      h += '<div class="dp-tr" data-open="' + esc(x.sym) + '" role="button" tabindex="0"><span class="dp-ta">' + coinIco(x.sym, x.color, 38) + '<span><b>' + esc(x.name) + '</b><em>' + esc(x.sym) + '</em></span></span>' +
        '<span class="dp-tb dp-sens" data-l="Balance">' + qty(x.q, x.sym) + ' <i>' + esc(x.sym) + '</i></span>' +
        '<span class="r" data-l="Price">' + esc(moneyP(x.px)) + '</span><span class="r dp-sens strong" data-l="Value">' + esc(money(x.v)) + '</span>' +
        '<span class="r ' + (x.chg >= 0 ? 'up' : 'dn') + '" data-l="24h">' + pct(x.chg) + '</span>' +
        '<span class="r dp-share" data-l="Share"><em>' + sh.toFixed(1) + '%</em><u><s style="width:' + Math.min(100, sh).toFixed(1) + '%"></s></u></span>' +
        '<span class="dp-ta2"><button type="button" class="dp-mini" data-open="' + esc(x.sym) + '">Trade</button></span></div>';
    });
    h += '<div class="dp-tr cash"><span class="dp-ta"><i class="dp-coin" style="--c:#3b82f6;width:38px;height:38px">$</i><span><b>Cash</b><em>Available to trade</em></span></span><span class="dp-tb dp-sens" data-l="Balance">' + esc(money(cur.cash)) + '</span><span class="r" data-l="Price">—</span><span class="r dp-sens strong" data-l="Value">' + esc(money(cur.cash)) + '</span><span class="r" data-l="24h">—</span><span class="r dp-share" data-l="Share"><em>' + (cur.cash / tot * 100).toFixed(1) + '%</em><u><s style="width:' + Math.min(100, cur.cash / tot * 100).toFixed(1) + '%"></s></u></span><span class="dp-ta2"><button type="button" class="dp-mini dep" onclick="document.getElementById(\'exBtnDeposit\').click()">Deposit</button></span></div>';
    if (box.__h !== h) { box.__h = h; box.innerHTML = h; }
  }

  /* ---------- activity ---------- */
  function ago(ts) { try { return typeof window.timeAgo === 'function' ? window.timeAgo(ts) : new Date(ts).toLocaleString(); } catch (e) { return ''; } }
  function renderAct() {
    var box = $('dpAct'); if (!box) return;
    var txs = (S().txs || []).filter(function (t) { return t && t.ts; }).slice().sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); }).slice(0, 7);
    if (!txs.length) { box.innerHTML = '<div class="dp-empty">' + ic(I.list, 26) + '<b>No transactions yet</b><span>Your deposits and trades will appear here.</span></div>'; return; }
    var h = txs.map(function (t) {
      var a = Number(t.amt) || 0, m = /(buy|sell)\s+([0-9]*\.?[0-9]+)\s+([A-Z0-9]{2,10})\s+@/i.exec(t.desc || ''), kind, icon, title = t.desc || 'Transaction', sub = '';
      if (m) { kind = m[1].toLowerCase(); icon = coinIco(m[3].toUpperCase(), '', 40); title = (kind === 'buy' ? 'Bought ' : 'Sold ') + qty(parseFloat(m[2]), m[3]) + ' ' + m[3].toUpperCase(); sub = (t.desc || '').replace(/^.*?@\s*/, '@ '); }
      else if (t.type === 'bonus') { kind = 'bonus'; icon = '<i class="dp-ti gift">' + ic(I.gift, 18) + '</i>'; }
      else if (a >= 0) { kind = 'dep'; icon = '<i class="dp-ti up">' + ic(I.dep, 18) + '</i>'; }
      else { kind = 'wd'; icon = '<i class="dp-ti dn">' + ic(I.wd, 18) + '</i>'; }
      var stc = t.status === 'Completed' ? 'ok' : (/reject|fail|cancel/i.test(t.status || '') ? 'bad' : 'wait');
      return '<div class="dp-tx"><span class="dp-tic">' + icon + '</span><span class="dp-tt"><b>' + esc(title) + '</b><em>' + esc(ago(t.ts)) + (sub ? ' · ' + esc(sub) : '') + '</em></span><span class="dp-st ' + stc + '">' + esc(t.status || 'Completed') + '</span><span class="dp-ta3 dp-sens ' + (a >= 0 ? 'up' : 'dn') + '">' + (a >= 0 ? '+' : '−') + esc(money(Math.abs(a))) + '</span></div>';
    }).join('');
    if (box.__h !== h) { box.__h = h; box.innerHTML = h; }
  }

  /* ---------- main ---------- */
  function visible() { var r = $('exchangeDash'); return !!(r && r.offsetParent !== null); }
  function render() {
    if (!build()) return;
    var cur = compute();
    renderTop(cur); renderKpis(cur); renderMarkets(); renderAlloc(cur); renderHold(cur); renderAct();
    qa('#dpRange button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-r') === D.rng); });
    var fsig = D.rng + '|' + (S().txs || []).length + '|' + Math.round((Number(S().usd) || 0) * 100), force = fsig !== D.fsig; D.fsig = fsig;
    var cached = D.series[D.rng], box = $('dpChart');
    if (cached && !force) {
      cached.pts[cached.pts.length - 1] = { t: Date.now(), v: cur.total };
      var tsig = Math.round(cur.total * 100);
      if (tsig !== D.tsig && !(box && box.matches && box.matches(':hover'))) { D.tsig = tsig; drawChart(cached); setChgPill(cached); }
      renderKpis(cur);
    } else renderChartArea(force);
  }
  function tick() {
    if (!visible() || document.visibilityState === 'hidden') return;
    var go = function () { render(); };
    if (Date.now() - D.tkAt > 25000) loadTickers().then(go, go); else go();
  }

  function hook() {
    var o = window.renderExchangeDash;
    if (typeof o === 'function' && !o.__dp) {
      var w = function () { var r; try { r = o.apply(this, arguments); } catch (e) { try { console.error(e); } catch (e2) {} } try { render(); } catch (e3) { try { console.error(e3); } catch (e4) {} } return r; };
      w.__dp = true; window.renderExchangeDash = w;
    }
    window.renderExchangeChart = function () { renderChartArea(false); };
    window.renderExchangeCoins = function () { try { renderMarkets(); renderAlloc(compute()); renderHold(compute()); } catch (e) {} };
  }

  function init() {
    hook();
    if (!build()) { setTimeout(init, 400); return; }
    loadTickers().then(function () { render(); }, function () { render(); });
    setInterval(tick, 5000);
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') { D.tkAt = 0; tick(); } });
    var rz; window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(function () { if (visible() && D.series[D.rng]) drawChart(D.series[D.rng]); }, 150); });
    try { if (visible()) render(); } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 0); }); else setTimeout(init, 0);
  window.DashPro = { render: render, state: D, compute: compute };
})();
